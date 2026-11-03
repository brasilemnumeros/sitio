import { test, expect } from './apoio.js';

/**
 * O CURSOR LÊ PONTOS, NÃO A GRADE DO EIXO (2026-11-03).
 *
 * As âncoras MENSAIS do horizonte (`domain/horizonte.js`) entravam na grade de snap da lib: numa
 * série anual o cursor reportava um mês qualquer (mai/2008, set/2011…) e a caixa ficava em "—"
 * até o ponteiro chegar perto de janeiro. A prova aqui é o TEXTO da caixa (DOM), não o pixel:
 * o cabeçalho tem de ser a data de um PONTO, e o traço só pode aparecer onde a série não tem
 * dado naquela data.
 */
test.describe('valor sob o cursor em série esparsa', () => {
  test.skip(({ isMobile }) => isMobile, 'leitura de mouse: o celular não tem hover');

  const abrirAnual = async (page) => {
    await page.goto('/?series=pib-real-anual,populacao-variacao-anual');
    const grafico = page.getByTestId('grafico');
    await expect(grafico.locator('canvas').first()).toBeVisible();
    // Duas séries `ok` → duas linhas na legenda do gráfico.
    await expect(page.getByTestId('legenda-grafico').locator('li')).toHaveCount(2);
    return { grafico, caixa: page.getByTestId('caixa-cursor') };
  };

  test('no meio do gráfico a leitura é de janeiro, sem traço', async ({ page }) => {
    const { grafico, caixa } = await abrirAnual(page);
    const box = await grafico.boundingBox();

    // Meio do horizonte (≈2010): as DUAS séries têm ponto ali.
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await expect(caixa).toBeVisible();

    // Série anual carimba em 1º de janeiro; com o snap no ponto, o mês é sempre o mesmo.
    await expect(caixa.locator('p').first()).toHaveText(/^jan\/\d{4}$/);
    await expect(caixa.getByText('—')).toHaveCount(0);
  });

  test('sem ponto na data, a linha continua com traço — o snap não inventa valor', async ({
    page,
  }) => {
    const { grafico, caixa } = await abrirAnual(page);
    const box = await grafico.boundingBox();

    // Início do horizonte (≈1998): o PIB tem ponto; a População só começa em 2001.
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.5);
    await expect(caixa).toBeVisible();
    await expect(caixa.locator('p').first()).toHaveText(/^jan\/199\d$/);
    await expect(caixa.getByText('—')).toHaveCount(1);
  });
});

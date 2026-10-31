import { test, expect } from './apoio.js';

/**
 * O HORIZONTE DO EIXO X (decisão de 2026-10-29): sempre do início do FHC I (01/01/1995)
 * até o dia de hoje, independentemente das séries carregadas. A prova é o ESTADO que o
 * adapter ecoa para a store — não o pixel do canvas.
 *
 * `mvgr-nominal` começa em 2004: sem as âncoras do horizonte, o `fitContent` enquadraria
 * 2004→2025 e o teste falharia nas duas pontas.
 */
const janela = (page) =>
  page.evaluate(async () => {
    const { viewportStore } = await import('/src/stores/viewport.js');
    let v = null;
    viewportStore.subscribe((x) => {
      v = x;
    })();
    return v;
  });

test('o eixo cobre FHC I até hoje mesmo com uma série curta', async ({ page }) => {
  await page.goto('/?series=mvgr-nominal');
  await expect(page.getByTestId('grafico').locator('canvas').first()).toBeVisible();

  await expect
    .poll(async () => (await janela(page)).from, {
      message: 'a ponta esquerda tem de ser o início do FHC I, não o início da série',
      timeout: 20000,
    })
    .toBe('1995-01-01');

  const hoje = await page.evaluate(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
  );
  const j = await janela(page);
  expect(j.to, 'a ponta direita tem de ser o dia de hoje').toBe(hoje);
});

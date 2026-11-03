import { test, expect } from './apoio.js';

/**
 * ARRASTAR É PAN, A RODA É O ZOOM (2026-11-03).
 *
 * O eixo x é fixo (1995 → hoje), mas sem as pontas presas a lib "cabe" o arrasto para fora do
 * dado encolhendo o intervalo: medido num harness isolado, 31,9 anos → 25,9 num arrasto de
 * 200px. Somado ao eco da janela voltando para o gráfico, o gesto virava o MESMO zoom da roda.
 * Aqui a prova é a JANELA na store, não o pixel.
 */
async function janela(page) {
  return page.evaluate(async () => {
    const { viewportStore } = await import('/src/stores/viewport.js');
    let v = null;
    viewportStore.subscribe((x) => { v = x; })();
    return v;
  });
}

const duracaoAnos = (j) => (Date.parse(j.to) - Date.parse(j.from)) / (365.25 * 86400000);

/**
 * A janela depois que o enquadramento automático assentou.
 *
 * O adapter agenda o `fitContent` num `setTimeout` de 150 ms (a rajada de carga precisa
 * terminar antes), então ler a store mal a legenda aparece pega um estado intermediário — e o
 * arrasto do teste vira a "prova" de uma mudança que era o fit chegando. Duas leituras iguais
 * seguidas é o sinal de que parou.
 */
async function janelaEstavel(page) {
  let anterior = null;
  for (let i = 0; i < 40; i++) {
    const atual = await janela(page);
    if (anterior && atual && anterior.from === atual.from && anterior.to === atual.to) return atual;
    anterior = atual;
    await page.waitForTimeout(50);
  }
  throw new Error('a janela não estabilizou em 2 s');
}

async function arrastar(page, box, dx) {
  const cx = box.x + box.width * 0.5;
  const cy = box.y + box.height * 0.5;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(cx + (i * dx) / 10, cy);
    await page.waitForTimeout(15);
  }
  await page.mouse.up();
}

test.describe('gestos do gráfico', () => {
  test.skip(({ isMobile }) => isMobile, 'arrasto de mouse: o app usa toque no celular');

  test('no "Tudo" arrastar não muda a janela (e nunca o zoom)', async ({ page }) => {
    await page.goto('/?series=selic-meta,selic-over-acum-12m');
    await expect(page.getByTestId('legenda-grafico').locator('li')).toHaveCount(2);
    // A janela automática é o horizonte inteiro: é daqui que o arrasto tentava sair.
    await expect.poll(async () => (await janela(page)).from).toBe('1995-01-01');

    const antes = await janelaEstavel(page);
    const box = await page.getByTestId('grafico').boundingBox();
    await arrastar(page, box, 300);

    // Não há horizonte fora de 1995→hoje: o gesto não anda nem encolhe o intervalo.
    await expect.poll(async () => await janela(page)).toEqual(antes);
  });

  test('com janela escolhida, arrastar desloca sem mudar o zoom', async ({ page }) => {
    await page.goto('/?series=selic-meta,selic-over-acum-12m');
    await expect(page.getByTestId('legenda-grafico').locator('li')).toHaveCount(2);
    await expect.poll(async () => (await janela(page)).from).toBe('1995-01-01');

    await page.getByRole('button', { name: 'Janela de 10 anos' }).click();
    await expect.poll(async () => duracaoAnos(await janela(page))).toBeCloseTo(10, 0);

    const j0 = await janelaEstavel(page);
    const box = await page.getByTestId('grafico').boundingBox();
    await arrastar(page, box, 200);
    await expect.poll(async () => (await janela(page)).from).not.toBe(j0.from);

    const j1 = await janela(page);
    // Arrastar para a direita mostra o PASSADO (o conteúdo anda junto com o ponteiro).
    expect(Date.parse(j1.from), 'o arrasto tem de andar para trás no tempo').toBeLessThan(
      Date.parse(j0.from),
    );
    // O que NÃO pode acontecer: o intervalo mudar de tamanho (o defeito era a janela encolher).
    expect(duracaoAnos(j1)).toBeGreaterThan(duracaoAnos(j0) * 0.95);
    expect(duracaoAnos(j1)).toBeLessThan(duracaoAnos(j0) * 1.05);
  });
});

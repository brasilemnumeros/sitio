import { test, expect, abrirVazio, abrirGavetaDireita, abrirGavetaInferior } from './apoio.js';

/**
 * A BARRA SUPERIOR do terminal (T6) — marca, busca, as cinco janelas, o chip do preset e a
 * saída para o conteúdo.
 *
 * O `page` de `apoio.js` já falha o teste se algum `console.error`/exceção escapar.
 */
test('a barra superior traz marca, busca, cinco janelas e o chip do preset', async ({ page }, testInfo) => {
  await page.goto('/');
  const topo = page.getByTestId('barra-superior');
  await expect(topo).toContainText('Brasil em Números');
  await expect(topo.getByRole('button', { name: 'Buscar indicador…' })).toBeVisible();
  for (const nome of ['Janela de 1 ano', 'Janela de 5 anos', 'Janela de 10 anos', 'Janela de 30 anos', 'Janela completa']) {
    await expect(topo.getByRole('button', { name: nome })).toBeVisible();
  }
  await expect(page.getByTestId('preset-chip')).not.toHaveText('Personalizado');
  // a marca é identidade, não link para si mesma
  await expect(topo.getByRole('link', { name: /Brasil em Números/ })).toHaveCount(0);
  // e há uma saída para o conteúdo (escondida no mobile, onde o topo é só marca+busca+janela)
  if (testInfo.project.name === 'desktop') {
    await expect(topo.getByRole('link', { name: 'Artigos' })).toHaveAttribute('href', '/blog');
  }
});

/**
 * O PRESET DO DIA (§8.4) — a home não abre vazia. O conjunto é determinístico por DATA em
 * `America/Sao_Paulo` (nada de `Math.random`), e vira link copiável: a URL recebe `?series=`
 * com os ids curados do dia.
 */
test('/ abre com o preset do dia (não vazia)', async ({ page }) => {
  await page.goto('/');
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li').first()).toBeVisible();
  await expect(page.getByTestId('preset-chip')).not.toHaveText('Personalizado');
  // o preset escreve a URL UMA vez: o link do dia é copiável
  await expect
    .poll(() => new URL(page.url()).searchParams.get('series'))
    .toMatch(/^[^,]+(,[^,]+)*$/);
});

/**
 * A PRECEDÊNCIA — `?series=` sempre vence o preset. E um link com ids válidos NÃO duplica: os
 * itens entram uma vez só, e recarregar não soma de novo.
 */
test('?series= vence o preset e não duplica', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m');
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(1);
  await expect(page.getByTestId('preset-chip')).toHaveText('Personalizado');
  await page.reload();
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(1);
});

test('escolher outro preset SUBSTITUI o conjunto e reescreve a URL', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'o chip do preset é escondido no topo de 30px');
  await page.goto('/');
  await abrirGavetaDireita(page);
  const chip = page.getByTestId('preset-chip');
  const atual = (await chip.textContent()).trim();
  await chip.click();
  const menu = page.getByTestId('menu-presets');
  const opcoes = menu.getByRole('menuitem');
  const nomes = await opcoes.allTextContents();
  const indice = nomes.findIndex((n) => !n.includes(atual) && !n.startsWith('Do dia'));
  expect(indice, 'precisa haver outro preset nomeado no menu').toBeGreaterThanOrEqual(0);
  await opcoes.nth(indice).click();
  await expect(page.locator('[data-bloco="chips"] li').first()).toBeVisible();
  await expect(chip).not.toHaveText('Personalizado');
  await expect.poll(() => new URL(page.url()).searchParams.get('series')).not.toBeNull();
});

test('trocar de preset duas vezes em sequência não duplica séries', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'o chip do preset é escondido no topo de 30px');
  await page.goto('/');
  await abrirGavetaDireita(page);
  const chip = page.getByTestId('preset-chip');
  await chip.click();
  await page.getByTestId('menu-presets').getByRole('menuitem').nth(0).click();
  const ids = () => page.locator('[data-bloco="chips"] li').count();
  await expect.poll(ids).toBeGreaterThan(0);
  const primeira = await ids();
  await chip.click();
  await page.getByTestId('menu-presets').getByRole('menuitem').nth(2).click();
  await expect.poll(ids).toBeGreaterThan(0);
  const segunda = await ids();
  expect(segunda).toBeLessThanOrEqual(10);
  const naUrl = new URL(page.url()).searchParams.get('series').split(',').filter(Boolean);
  expect(naUrl).toHaveLength(segunda);
  expect(primeira).toBeGreaterThan(0);
});

/**
 * UTM — o preset entra MESMO numa visita de campanha, e a chave da campanha sobrevive: o app
 * escreve `series` sem apagar o resto da query (`replaceState`, não `location = …`).
 */
test('?utm_source sem series recebe preset e preserva a chave', async ({ page }) => {
  await page.goto('/?utm_source=teste');
  await expect.poll(() => new URL(page.url()).searchParams.get('utm_source')).toBe('teste');
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li').first()).toBeVisible();
});

/**
 * A ÚLTIMA SÉRIE SAI COM A GAVETA INFERIOR ABERTA — o painel de mandatos/matriz desmonta no
 * mesmo quadro em que `mostrarCasca` cai. Nada pode lançar (o fixture de `page` acusa), e a
 * alça continua no lugar, DESABILITADA: a moldura não pula.
 *
 * ⚠ Com o `inert` (T9) as duas gavetas não ficam abertas ao mesmo tempo pelo caminho do
 * produto, então o esvaziamento vem da store — é o mesmo estado, sem abrir uma camada por baixo
 * da outra. O caminho de remoção pela UI é coberto em `exemplo.spec.js`.
 */
test('remover a última série com a gaveta inferior aberta não lança', async ({ page }) => {
  await page.goto('/');
  await abrirGavetaInferior(page);
  await page.evaluate(async () => {
    const { seriesStore, removerSerie } = await import('/src/stores/series.js');
    let itens = [];
    seriesStore.subscribe((x) => (itens = x.itens))();
    for (const item of itens) removerSerie(item.id);
  });
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Comparação por mandato/ })).toBeDisabled();
});

/**
 * `?series=` SÓ COM ID INVÁLIDO não cai no preset: a query vence, e o resultado é o estado
 * inicial — o mesmo de `abrirVazio` em `apoio.js`.
 */
test('?series= só com id inválido abre o estado inicial (sem preset)', async ({ page }) => {
  await abrirVazio(page);
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(0);
  // sem série em cena o chip não é um preset: mostra a palavra-âncora do menu ("Presets"),
  // que é o affordance — não "Personalizado", que descreve um conjunto escolhido à mão.
  await expect(page.getByTestId('preset-chip')).toHaveText('Presets');
});

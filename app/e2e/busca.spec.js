import { test, expect, abrirApp, abrirBusca } from './apoio.js';

/**
 * A BUSCA (§1.1) — o caminho: abrir a modal, filtrar, escolher um indicador, o chip aparecer,
 * e ESC fechar. O foco está no que só o navegador exercita: o foco automático no campo, a regra
 * ÚNICA de teclado (§12.1 — ⏎ abre a ficha, ⏎ confirma, Esc volta) e a montagem do chip pela
 * store (§8).
 */
test('abrir · filtrar · escolher · chip aparece · ESC fecha', async ({ page }) => {
  await abrirApp(page);

  // abre — a modal é um role="dialog" com rótulo próprio (§1.1)
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  const modal = page.getByRole('dialog', { name: 'Buscar indicadores' });
  await expect(modal).toBeVisible();

  // o campo ganha foco automático (§12.1, por efeito — não pelo atributo `autofocus`)
  const campo = page.getByRole('searchbox');
  await expect(campo).toBeFocused();

  // filtra — "IPCA" colapsa a cascata numa lista só (o ramo `buscando`)
  await campo.fill('IPCA');
  const resultados = page.getByRole('list', { name: 'Resultados da busca' });
  await expect(resultados).toBeVisible();
  const linhas = resultados.getByRole('listitem');
  await expect(linhas.first()).toBeVisible();
  const n = await linhas.count();
  expect(n).toBeGreaterThan(0);
  // todo resultado contém "IPCA" no nome — a busca é por nome/id sem acento (catalog.js)
  for (let i = 0; i < n; i++) {
    await expect(linhas.nth(i)).toContainText(/ipca/i);
  }

  // ⏎ com o foco no campo ABRE a ficha do primeiro resultado (§12.1 — tocar não adiciona)
  await campo.press('Enter');
  const ficha = page.locator('[data-bloco="ficha"]');
  await expect(ficha).toContainText(/IPCA/);
  const adicionar = ficha.getByRole('button', { name: 'Adicionar' });
  await expect(adicionar).toBeVisible();

  // ⏎ de novo, com a ficha aberta, CONFIRMA o Adicionar. O chip aparece na faixa de séries.
  await campo.press('Enter');
  const chips = page.locator('[data-bloco="chips"]');
  await expect(chips.locator('li')).toHaveCount(1);
  await expect(chips.locator('li')).toContainText(/ipca/i);

  // ESC — com ficha aberta, a primeira ESCOLHA fecha só a ficha (a coluna volta ao vazio)…
  await campo.press('Escape');
  await expect(ficha).toContainText(/Escolha um indicador/);
  // …e o chip permanece (fechar a ficha não toca nas séries)
  await expect(chips.locator('li')).toHaveCount(1);

  // …o segundo ESC fecha a MODAL
  await campo.press('Escape');
  await expect(modal).toBeHidden();
  // e a série continua no gráfico — o app não é desmontado ao fechar a busca
  await expect(chips.locator('li')).toHaveCount(1);
});

test('busca sem resultado diz por quê (§9 — nada vazio em silêncio)', async ({ page }) => {
  await abrirApp(page);
  await abrirBusca(page);

  await page.getByRole('searchbox').fill('zzzznaoexiste');
  await expect(page.getByText(/Nenhum indicador para/)).toBeVisible();
});

test('clique fora fecha a modal (o overlay é um <button>, R31)', async ({ page }) => {
  await abrirApp(page);
  await abrirBusca(page);
  // clica no canto superior do overlay — fora da caixa do diálogo (que é `top-16`), senão
  // o próprio diálogo intercepta o clique e o alvo fica "obscured".
  await page
    .getByRole('button', { name: 'Fechar a busca' })
    .click({ position: { x: 24, y: 24 } });
  await expect(page.getByRole('dialog', { name: 'Buscar indicadores' })).toBeHidden();
});

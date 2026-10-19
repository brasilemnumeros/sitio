import { test, expect } from './apoio.js';

/**
 * O PERMALINK do app (`?indicators=`) pelo CAMINHO DO PRODUTO — não pelo harness.
 *
 * Hoje ~11 links dos posts usam `?indicators=<ids>`; sem esta fatia a migração entraria
 * com REGRESSÃO (o app novo ignoraria a query). Aqui o dado vem do catálogo REAL servido
 * em dev (o middleware reescreve o `datafile` para `/dados/...`), e as séries são
 * restauradas UMA A UMA, como o produto faz — semear a store pelo console criaria outro
 * nó no grafo de módulos e o app não veria o estado (AGENTS.md).
 *
 * O `page` de `apoio.js` já falha o teste se algum `console.error`/exceção escapar.
 */

const SELIC = 'selic-meta-acum-12m';
const IPCA = 'ipca-acum-12m';

const chips = (page) => page.locator('[data-bloco="chips"] li');

test('?indicators=<id> restaura UMA série', async ({ page }) => {
  await page.goto(`/?indicators=${SELIC}`);
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page).first()).toContainText(/selic/i);
});

test('?indicators=<id1>,<id2> restaura DUAS séries, na ordem da query', async ({ page }) => {
  await page.goto(`/?indicators=${SELIC},${IPCA}`);
  await expect(chips(page)).toHaveCount(2);
  await expect(chips(page).nth(0)).toContainText(/selic/i);
  await expect(chips(page).nth(1)).toContainText(/ipca/i);
});

test('id desconhecido é ignorado sem erro; a URL fica com o que restaurou', async ({ page }) => {
  await page.goto(`/?indicators=nao-existe,${SELIC}`);
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page).first()).toContainText(/selic/i);
  // a URL é normalizada (store → URL): o id desconhecido sai do link copiável
  await expect.poll(() => new URL(page.url()).searchParams.get('indicators')).toBe(SELIC);
});

test('adicionar série pela UI atualiza a URL — o link é copiável (replaceState)', async ({
  page,
}) => {
  await page.goto(`/?indicators=${SELIC}`);
  await expect(chips(page)).toHaveCount(1);

  // adiciona a segunda pela BUSCA (§1.1), não pelo console
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  const campo = page.getByRole('searchbox');
  await campo.fill('IPCA');
  await campo.press('Enter');
  await page.locator('[data-bloco="ficha"]').getByRole('button', { name: 'Adicionar' }).click();
  await expect(chips(page)).toHaveCount(2);

  // a URL passa a listar as DUAS séries, sem poluir o histórico (replaceState)
  await expect
    .poll(() => new URL(page.url()).searchParams.get('indicators'))
    .toBe(`${SELIC},${IPCA}`);
});

import { test, expect, abrirGavetaConfig } from './apoio.js';

/**
 * O PERMALINK do app (`?series=`) pelo CAMINHO DO PRODUTO — não pelo harness.
 *
 * Hoje 12 links dos posts usam `?series=<ids>`; sem esta fatia a migração entraria
 * com REGRESSÃO (o app novo ignoraria a query). Aqui o dado vem do catálogo REAL embutido
 * (as séries são buscadas na base `/dados/...`, servida pelo middleware em dev), e as séries
 * são restauradas UMA A UMA, como o produto faz — semear a store pelo console criaria outro
 * nó no grafo de módulos e o app não veria o estado (AGENTS.md).
 *
 * O `page` de `apoio.js` já falha o teste se algum `console.error`/exceção escapar.
 */

const SELIC = 'selic-meta';
const IPCA = 'ipca-acum-12m';

const chips = (page) => page.locator('[data-bloco="chips"] li');

test('sem query: entra com o PRESET do dia e o escreve em ?series=', async ({ page }) => {
  await page.goto('/');

  // A home sem chave não abre vazia: o preset do dia entra pelo caminho do produto e o
  // gráfico é desenhado (canvas do lightweight-charts dentro do container). Os chips moram
  // na gaveta de configurações, então ela abre primeiro.
  await abrirGavetaConfig(page);
  await expect(chips(page).first()).toBeVisible();
  const grafico = page.getByTestId('grafico');
  await expect(grafico).toBeVisible();
  expect(await grafico.locator('canvas').count()).toBeGreaterThan(0);

  // E o preset vira link copiável: a URL passa a ter `series` com pelo menos um id.
  await expect
    .poll(() => new URL(page.url()).searchParams.get('series'))
    .toMatch(/^[^,]+(,[^,]+)*$/);
});

test('?series=<id> restaura UMA série', async ({ page }) => {
  await page.goto(`/?series=${SELIC}`);
  await abrirGavetaConfig(page);
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page).first()).toContainText(/selic/i);
});

test('?series=<id1>,<id2> restaura DUAS séries, na ordem da query', async ({ page }) => {
  await page.goto(`/?series=${SELIC},${IPCA}`);
  await abrirGavetaConfig(page);
  await expect(chips(page)).toHaveCount(2);
  await expect(chips(page).nth(0)).toContainText(/selic/i);
  await expect(chips(page).nth(1)).toContainText(/ipca/i);
});

test('id desconhecido é ignorado sem erro; a URL fica com o que restaurou', async ({ page }) => {
  await page.goto(`/?series=nao-existe,${SELIC}`);
  await abrirGavetaConfig(page);
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page).first()).toContainText(/selic/i);
  // a URL é normalizada (store → URL): o id desconhecido sai do link copiável
  await expect.poll(() => new URL(page.url()).searchParams.get('series')).toBe(SELIC);
});

test('adicionar série pela UI atualiza a URL — o link é copiável (replaceState)', async ({
  page,
}) => {
  await page.goto(`/?series=${SELIC}`);
  await abrirGavetaConfig(page);
  await expect(chips(page)).toHaveCount(1);
  // fecha a gaveta: no celular ela cobre a barra superior, onde fica a busca
  await page.getByRole('button', { name: 'Fechar séries' }).click();
  await expect(page.getByTestId('gaveta-config')).toBeHidden();

  // adiciona a segunda pela BUSCA (§1.1), não pelo console
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  const campo = page.getByRole('searchbox');
  await campo.fill('IPCA');
  await campo.press('Enter');
  await page.locator('[data-bloco="ficha"]').getByRole('button', { name: 'Adicionar' }).click();
  await expect(chips(page)).toHaveCount(2);

  // a URL passa a listar as DUAS séries, sem poluir o histórico (replaceState)
  await expect
    .poll(() => new URL(page.url()).searchParams.get('series'))
    .toBe(`${SELIC},${IPCA}`);
});

/**
 * O "TENTAR DE NOVO" NÃO PODE PERDER O LINK (fix round 1, 2026-11-01).
 *
 * Com o catálogo quebrado na entrada, `iniciarPermalink` sai cedo: nada de `?series=` aplicado e
 * nada de assinatura store→URL. Sem uma retomada, o retry do catálogo devolvia a lista e deixava
 * o gráfico VAZIO com a URL ainda pedindo as séries — quem clicou em "Tentar de novo" esperava
 * justamente ver o próprio link de volta.
 *
 * ⚠ 200 fora do contrato, não 500: qualquer 4xx/5xx põe o Chromium para logar
 * `Failed to load resource` e a fixture de `apoio.js` reprova (ver `busca.spec.js`).
 */
test('catálogo quebrado na entrada: "Tentar de novo" restaura o ?series= do link', async ({
  page,
}) => {
  await page.route('**/catalogo.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"versao":2,"grupos":{},"indicadores":[]}',
    }),
  );
  await page.goto(`/?series=${SELIC},${IPCA}`);

  // erro na tela E o link intacto: sem catálogo nada é resolvido nem reescrito
  await expect(page.getByRole('alert')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('series')).toBe(`${SELIC},${IPCA}`);

  // o catálogo volta a responder e a pessoa tenta de novo
  await page.unroute('**/catalogo.json');
  await page.getByRole('button', { name: 'Tentar de novo' }).click();

  // as DUAS séries do link entraram (a ordem é a da query, como no boot)
  await abrirGavetaConfig(page);
  const linhas = page.getByTestId('legenda-series').locator('li');
  await expect(linhas).toHaveCount(2);
  await expect(linhas.first()).toContainText(/selic/i);
  await expect(linhas.nth(1)).toContainText(/ipca/i);

  // e a assinatura store→URL existe depois da retomada: o link segue sendo o do usuário
  await expect
    .poll(() => new URL(page.url()).searchParams.get('series'))
    .toBe(`${SELIC},${IPCA}`);
});

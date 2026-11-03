import { test, expect, abrirApp, abrirVazio, abrirBusca } from './apoio.js';

/**
 * A BUSCA (§1.1) — o caminho: abrir a modal, filtrar, escolher um indicador, o chip aparecer,
 * e ESC fechar. O foco está no que só o navegador exercita: o foco automático no campo, a regra
 * ÚNICA de teclado (§12.1 — ⏎ abre a ficha, ⏎ confirma, Esc volta) e a montagem do chip pela
 * store (§8).
 */
test('abrir · filtrar · escolher · chip aparece · ESC fecha', async ({ page }) => {
  // do estado VAZIO: a home abre com o preset do dia, e somar a ele daria 3 chips em vez de 1
  await abrirVazio(page);

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
  // a ficha mostra a atribuição da série (`fonte`, não `source`)
  await expect(ficha).toContainText('Fonte');
  await expect(ficha).toContainText('IBGE');
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

/**
 * §9 — OS ESTADOS DO CATÁLOGO (2026-11-01). O catálogo passou a vir por HTTP, então existe uma
 * janela em que a home está de pé e NÃO há lista nenhuma. Antes destes, a busca abria com a
 * cascata vazia (zero grupos, "Escolha um grupo.") e o convite "Selic × IPCA" do estado inicial
 * ficava inerte: nada dizia por quê (§9 — o vazio sempre diz por quê).
 */

test('mostra spinner enquanto o catálogo carrega — e ele some quando a lista chega', async ({
  page,
}) => {
  // A rota fica PRESA até o teste liberar: sem janela de tempo (um `setTimeout` fixo vira flake
  // em runner lento, porque o relógio começa no mount, não no `goto`).
  let liberar;
  const catalogoPreso = new Promise((resolve) => (liberar = resolve));
  await page.route('**/catalogo.json', async (route) => {
    await catalogoPreso;
    await route.continue();
  });

  await abrirApp(page);
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  // ⚠ `role="status"` NÃO tem nome acessível derivado do conteúdo (medido: o `getByRole` com
  //    `name` casa 0 elementos), então a asserção é ROLE + TEXTO, dentro do diálogo: é o que um
  //    leitor de tela anuncia. O `page` inteiro casaria também o esqueleto da home.
  const modal = page.getByRole('dialog', { name: 'Buscar indicadores' });
  const status = modal.getByRole('status');
  await expect(status).toContainText(/Carregando indicadores/);
  // o campo de busca nasce junto: a pessoa pode digitar enquanto a lista não chegou
  await expect(page.getByRole('searchbox')).toBeVisible();

  // O spinner GIRA de verdade — a classe `animate-spin` no DOM sem regra no CSS seria um
  // círculo parado, e nenhum teste pegaria (o CSS é um arquivo à parte, ver `casca.spec.js`).
  const giro = modal.locator('[data-coluna="carregando"] span[aria-hidden="true"]');
  await expect(giro).toHaveCSS('animation-name', 'spin');

  // libera o catálogo: o spinner SAI e a cascata assume (é a transição que interessa)
  liberar();
  await expect(status).toHaveCount(0);
  await expect(page.getByRole('searchbox')).toBeVisible();
});

/**
 * O catálogo INVÁLIDO, servido com 200 — e não 500, de propósito.
 *
 * 🔴 Medido em 2026-11-01: qualquer 4xx/5xx faz o Chromium logar
 * `Failed to load resource: … 500` como `console.error`, e a fixture de `apoio.js` reprova o
 * teste com razão (o guarda é contra erro silencioso). É a MESMA escolha que `casca.spec.js`
 * documenta para a série corrompida. O caminho `HTTP <status>` da mensagem já tem prova na
 * unidade (`src/data/catalog.test.js`); aqui o alvo é a TELA: mensagem crua do validador e
 * recuperação pelo "Tentar de novo".
 */
const catálogoForaDoContrato = (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"versao":2,"grupos":{},"indicadores":[]}',
  });

test('erro ao carregar o catálogo é visível e tem "Tentar de novo"', async ({ page }) => {
  await page.route('**/catalogo.json', catálogoForaDoContrato);
  await abrirApp(page);
  // a mensagem é a CRUA do validador (§9): o contrato é `versao: 1`, não "erro desconhecido"
  await expect(page.getByRole('alert')).toContainText(/versao 2; esperado 1/);

  // e a recuperação: sem a rota quebrada, o retry passa por `loading` e chega em `ready`
  await page.unroute('**/catalogo.json');
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
  // Sem `?series=` na URL, a regra de sempre vale no retry: o PRESET DO DIA entra (o gráfico
  // monta). É a prova de que a retomada do permalink rodou e não escreveu a URL vazia.
  await expect(page.getByTestId('grafico')).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('series')).not.toBeNull();
});

test('o mesmo erro aparece DENTRO da busca, e o retry de lá carrega a lista', async ({ page }) => {
  await page.route('**/catalogo.json', catálogoForaDoContrato);
  await abrirApp(page);
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  const modal = page.getByRole('dialog', { name: 'Buscar indicadores' });
  // sem catálogo a cascata não existe: a modal diz o que houve em vez de abrir vazia
  await expect(modal.getByRole('alert')).toContainText('Não foi possível carregar a lista');
  await expect(modal.getByRole('alert')).toContainText(/versao 2; esperado 1/);

  await page.unroute('**/catalogo.json');
  await modal.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(modal.getByRole('alert')).toBeHidden();
  // a lista chegou à modal: digitar volta a encontrar indicador
  await page.getByRole('searchbox').fill('IPCA');
  await expect(
    page.getByRole('list', { name: 'Resultados da busca' }).getByRole('listitem').first(),
  ).toBeVisible();
});

/**
 * TECLADO (§12.1) — 2026-11-01: as setas têm de ACENDER o item que movem, e ⏎ abre a ficha dele.
 *
 * 🔴 A regressão que este teste existe para pegar: `emMobile()` decidia pelo `display` do próprio
 * elemento, mas no desktop quem está oculto é o CONTÊINER (`md:hidden`) — o filho continua
 * `display: block`. Resultado: o desktop caía no ramo do celular, com lista vazia, e ␣↓ não fazia
 * nada (a ficha de ⏎ abria o item errado). Nenhum teste pegava, porque os specs só usavam ⏎/Esc.
 */
test('as setas andam nas categorias, → entra nos itens e a ficha acompanha', async ({
  page,
}, testInfo) => {
  // Só desktop: no celular a coluna dos grupos não existe (ela vira a fileira de chips), e o
  // caminho do teclado lá é outro — este teste mede a CASCATA de três colunas.
  test.skip(testInfo.project.name !== 'desktop', 'cascata de 3 colunas é do desktop');
  await abrirVazio(page);
  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  const ficha = page.locator('[data-bloco="ficha"]');
  const ACESO = /dark:bg-slate-700/;
  const botao = (nome) => page.getByRole('button', { name: nome, exact: true });

  // ␣↓ anda nas CATEGORIAS (não entra nos itens) e a ficha continua vazia.
  await expect(botao(/🏦 Política Monetária/)).toHaveClass(ACESO);
  await campo.press('ArrowDown');
  await expect(botao(/📈 Inflação/)).toHaveClass(ACESO);
  await expect(botao(/IPCA \(%\)/)).not.toHaveClass(ACESO);
  await expect(ficha).toContainText('Escolha um indicador');

  // ␣→ entra nos itens da categoria acesa, no primeiro — e a ficha JÁ mostra ele.
  await campo.press('ArrowRight');
  await expect(botao('IPCA (%)')).toHaveClass(ACESO);
  await expect(ficha).toContainText('IPCA (%)');

  // ␣↓ anda entre os itens e a ficha TROCA junto (2026-11-01, a pedido do usuário).
  await campo.press('ArrowDown');
  await expect(botao('IGP-M (%)')).toHaveClass(ACESO);
  await expect(ficha).toContainText('IGP-M (%)');

  // ⏎ confirma a ação da ficha (adicionar), como no clique — a ficha já estava aberta.
  await campo.press('Enter');
  await expect(ficha.getByRole('button', { name: 'Remover do gráfico' })).toBeVisible();
  await expect(page.getByTestId('legenda-grafico')).toContainText(/IGP-M/i);

  // ␣← com a ficha fechada devolve a seleção à categoria.
  await campo.press('Escape');
  await campo.press('ArrowLeft');
  await expect(botao(/📈 Inflação/)).toHaveClass(ACESO);
});

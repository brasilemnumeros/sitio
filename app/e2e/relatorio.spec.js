import { test, expect, abrirGavetaConfig } from './apoio.js';

/**
 * O RELATO DE ERRO DE DADO — o caminho que termina numa issue do repositório `dados`.
 *
 * O dado vem do catálogo REAL servido pelo middleware local, como nos outros specs. O que se
 * prova aqui é o contrato do link: destino, label, contexto (série, janela, permalink) e os
 * portões (sem série, sem texto). Nada navega para o GitHub: o `href` é lido, não clicado.
 */

const SELIC = 'selic-meta';
const IPCA = 'ipca-acum-12m';

const abrirRelato = async (page) => {
  await page.getByTestId('botao-reportar').click();
  await expect(page.getByTestId('dialogo-relatar')).toBeVisible();
};

test('sem série carregada o botão fica desabilitado', async ({ page }) => {
  await page.goto('/?series=nao-existe');
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  await expect(page.getByTestId('botao-reportar')).toBeDisabled();
});

test('com série abre o diálogo já com a série do gráfico', async ({ page }) => {
  await page.goto(`/?series=${SELIC}`);
  await abrirRelato(page);
  await expect(page.getByTestId('relato-serie')).toHaveValue(SELIC);
  await expect(page.getByTestId('relato-abrir')).toHaveAttribute('aria-disabled', 'true');
});

test('o link só habilita com o relato e leva o contexto todo', async ({ page }) => {
  await page.goto(`/?series=${SELIC},${IPCA}&utm_source=teste`);
  await abrirRelato(page);
  const abrir = page.getByTestId('relato-abrir');
  await expect(abrir).not.toHaveAttribute('href', /.+/);

  await page.getByTestId('relato-serie').selectOption(IPCA);
  await page.getByTestId('relato-texto').fill('O valor de mai/2026 está errado.');
  await page.getByTestId('relato-valor-visto').fill('4,72%');
  await expect(abrir).toHaveAttribute('aria-disabled', 'false');

  const url = new URL(await abrir.getAttribute('href'));
  expect(url.origin + url.pathname).toBe('https://github.com/brasilemnumeros/dados/issues/new');
  expect(url.searchParams.get('labels')).toBe('erro-de-dado');
  expect(url.searchParams.get('title')).toContain('IPCA');
  const body = url.searchParams.get('body');
  expect(body).toContain(`\`${IPCA}\``);
  expect(body).toContain(`?series=${SELIC}%2C${IPCA}`);
  expect(body).toContain('Aparece no site: 4,72%');
  expect(body).not.toContain('utm_source');
});

test('série escondida continua no link', async ({ page }) => {
  await page.goto(`/?series=${SELIC},${IPCA}`);
  await page.getByRole('button', { name: /^Esconder IPCA/ }).click();
  await abrirRelato(page);
  await page.getByTestId('relato-texto').fill('Conferir.');
  const body = new URL(await page.getByTestId('relato-abrir').getAttribute('href')).searchParams.get(
    'body'
  );
  expect(body).toContain(`?series=${SELIC}%2C${IPCA}`);
});

test('a janela visível vai no corpo da issue', async ({ page }) => {
  await page.goto(`/?series=${SELIC}`);
  await page.getByRole('button', { name: 'Janela de 5 anos' }).click();
  await abrirRelato(page);
  await page.getByTestId('relato-texto').fill('Conferir.');
  const body = new URL(await page.getByTestId('relato-abrir').getAttribute('href')).searchParams.get(
    'body'
  );
  expect(body).toMatch(/janela visível: 20\d\d-\d\d a 20\d\d-\d\d/);
  expect(body).not.toContain('janela visível: não informada');
});

test('Esc fecha o relato e não a gaveta aberta atrás', async ({ page }, testInfo) => {
  // No celular a gaveta é folha FIXA e cobre o trilho: não há como abrir o relato com ela aberta.
  // A guarda vale nos dois, mas o cenário só existe no desktop.
  test.skip(testInfo.project.name !== 'desktop', 'no celular a gaveta cobre o trilho');
  await page.goto(`/?series=${SELIC}`);
  // A gaveta de configurações ABERTA é o que dá sentido à guarda de `Esc` na `App`: sem ela,
  // fechar o diálogo fecharia a gaveta no mesmo gesto (o teste antigo passava sem provar nada).
  await abrirGavetaConfig(page);
  const botao = page.getByTestId('botao-reportar');
  await botao.click();
  await expect(page.getByTestId('dialogo-relatar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dialogo-relatar')).toBeHidden();
  await expect(page.getByTestId('gaveta-config')).toBeVisible();
  await expect(botao).toBeFocused();
});

test('relato longo avisa que será encurtado', async ({ page }) => {
  await page.goto(`/?series=${SELIC}`);
  await abrirRelato(page);
  await page.getByTestId('relato-texto').fill('ç'.repeat(2000));
  await expect(page.getByTestId('relato-cortado')).toBeVisible();
  const href = await page.getByTestId('relato-abrir').getAttribute('href');
  expect(href.length).toBeLessThanOrEqual(6000);
});

test('no celular o diálogo cabe na tela', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'medida do celular');
  await page.goto(`/?series=${SELIC}`);
  await abrirRelato(page);
  const caixa = await page.getByTestId('dialogo-relatar').boundingBox();
  const vp = page.viewportSize();
  expect(caixa.y).toBeGreaterThanOrEqual(0);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(vp.height);
});

/**
 * O `gtag` só existe DEPOIS do consentimento (o `Analytics.astro` o cria ali). Aqui ele é
 * semeado antes da app carregar, que é o estado de quem já aprovou — e o array prova o que
 * saiu, sem rede.
 */
const semearGtag = (page) =>
  page.addInitScript(() => {
    window.__eventos = [];
    window.gtag = (...args) => window.__eventos.push(args);
  });

test('os eventos saem pelo gtag quando há consentimento', async ({ page }) => {
  await semearGtag(page);
  await page.goto(`/?series=${SELIC}`);
  await page.getByTestId('botao-reportar').click();
  await expect
    .poll(() => page.evaluate(() => window.__eventos))
    .toEqual([['event', 'report_opened', { series_count: 1 }]]);

  await page.getByTestId('relato-texto').fill('Conferir.');
  await page.getByTestId('relato-periodo').fill('mai/2026');
  await page.route('https://github.com/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  await page.getByTestId('relato-abrir').dispatchEvent('click');

  const eventos = await page.evaluate(() => window.__eventos);
  expect(eventos).toHaveLength(2);
  expect(eventos[1]).toEqual([
    'event',
    'report_issue_opened',
    { series_id: SELIC, series_count: 1, has_period: true, has_source: false },
  ]);
});

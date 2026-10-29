import { test as base, expect } from '@playwright/test';

/**
 * O caminho de navegação compartilhado por todas as fatias destes E2E.
 *
 * `zero erro de console` é a asserção que mais importa aqui: os três defeitos que reabriram a §10.7
 * eram SILENCIOSOS — a página renderizava sem Tailwind, sem o eixo duplo, e o gráfico lançava num
 * `setVisibleRange` sobre área vazia SEM quebrar a tela. Nenhum deles derruba o build. Um
 * `console.error` ou uma exceção não capturada é o único sinal que sobra. Por isso toda `page`
 * deste pacote falha o teste no fim se algo foi logado como erro.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const erros = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') erros.push(`console.error: ${msg.text()}`);
    });
    page.on('pageerror', (err) => erros.push(`pageerror (exceção não capturada): ${err.message}`));

    await use(page);

    expect(erros, `Erros de console/exceção durante o percurso:\n${erros.join('\n')}`).toEqual([]);
  },
});

export { expect };

/** Abre a app e espera o catálogo carregar (o botão de busca é o marcador estável do shell). */
export async function abrirApp(page) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Buscar indicador…' }).first()).toBeVisible();
}

/** O atalho de primeiro uso da §9.1 — resolve "Selic × IPCA" por ID no catálogo carregado. */
export async function carregarExemplo(page) {
  await page.getByRole('button', { name: 'Selic × IPCA' }).click();
  // duas séries `ok` → dois itens na legenda
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(2);
}

/**
 * A home VAZIA, de propósito: `?series=` só com id inválido cai no `EstadoInicial` — NÃO no
 * preset do dia (a query sempre vence). É o ponto de partida dos cenários que precisam do
 * atalho "Selic × IPCA" ou de afirmar a ausência de casca.
 */
export async function abrirVazio(page) {
  await page.goto('/?series=nao-existe');
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
}

/** Abre a gaveta direita SE ainda não estiver aberta (o trilho é o gatilho). */
export async function abrirGavetaDireita(page) {
  const gaveta = page.getByTestId('gaveta-direita');
  if (!(await gaveta.isVisible())) {
    await page.getByRole('button', { name: /^Configurações do gráfico/ }).click();
  }
  await expect(gaveta).toBeVisible();
}

/** Abre a gaveta inferior SE ainda não estiver aberta. Exige série (sem ela a alça é inerte). */
export async function abrirGavetaInferior(page) {
  const gaveta = page.getByTestId('gaveta-inferior');
  if (!(await gaveta.isVisible())) {
    await page.getByRole('button', { name: /Comparação por mandato/ }).click();
  }
  await expect(gaveta).toBeVisible();
}

/** Abre a modal de busca pelo botão do topo (posição 1 da §1). */
export async function abrirBusca(page) {
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Buscar indicadores' })).toBeVisible();
}

/** Adiciona uma série pelo caminho REAL da §1.1 — busca por nome, ⏎ abre a ficha, ⏎ confirma,
 *  Esc fecha a ficha, Esc fecha a modal. Devolve quando a modal fechou. */
export async function adicionarPorBusca(page, termo) {
  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  await campo.fill(termo);
  await campo.press('Enter'); // ⏎ abre a ficha do primeiro resultado
  await campo.press('Enter'); // ⏎ de novo confirma o "Adicionar"
  await campo.press('Escape'); // fecha a ficha (a modal continua)
  await campo.press('Escape'); // fecha a modal
  await expect(page.getByRole('dialog', { name: 'Buscar indicadores' })).toBeHidden();
}

/** Falha se a página rolar em qualquer eixo (a home é uma moldura de viewport). */
export async function semTransbordo(page) {
  const m = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
    vw: window.innerWidth,
    vh: window.innerHeight,
  }));
  expect(m.w, `transbordo horizontal (${m.w} > ${m.vw})`).toBeLessThanOrEqual(m.vw + 1);
  expect(m.h, `transbordo vertical (${m.h} > ${m.vh})`).toBeLessThanOrEqual(m.vh + 1);
}

/** Caixas da moldura, em px, para asserções de geometria. */
export async function medirCaixas(page) {
  return page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, bottom: b.bottom };
    };
    return {
      topo: r('[data-testid="barra-superior"]'),
      grafico: r('[data-testid="grafico"]'),
      minimapa: r('[data-testid="minimapa"]'),
      trilho: r('[data-testid="trilho-direito"]'),
      direita: r('[data-testid="gaveta-direita"]'),
      inferior: r('[data-testid="barra-inferior"]'),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
}

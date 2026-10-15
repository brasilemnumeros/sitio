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

/** Abre a modal de busca pelo botão do topo (posição 1 da §1). */
export async function abrirBusca(page) {
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Buscar indicadores' })).toBeVisible();
}

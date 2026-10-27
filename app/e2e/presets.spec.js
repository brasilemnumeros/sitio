import { test, expect } from './apoio.js';

/**
 * A BARRA SUPERIOR do terminal (T6) — marca, busca, as cinco janelas, o chip do preset e a
 * saída para o conteúdo. Parcial de propósito: os cenários de entrada (preset do dia,
 * precedência de `?series=`, troca de preset) chegam na T10, quando as gavetas existirem.
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

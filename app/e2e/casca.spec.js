import { test, expect, abrirApp } from './apoio.js';

/**
 * A CASCA (§1, §10.3). Não basta afirmar que o app montou — há dois defeitos silenciosos que só
 * uma tela pega, e este arquivo existe para pegá-los por CSS computado, sem depender de olho:
 *
 *  1. TAILWIND AUSENTE. O `vite dev` devolve `index.html` (HTML) para `../assets/css/main.dist.css`,
 *     porque o arquivo está fora da raiz do Vite. O `<link>` "existe", o download "dá 200" e a
 *     página renderiza em Times New Roman cru — sem ninguém perceber. A classe-canário `bg-[#0e1117]`
 *     (§10.3) é o que prova que o Tailwind COMPILOU e APLICOU.
 *  2. TEMA. A decisão de 2026-10-15 fixou o app em TEMA ESCURO: `<html class="dark">`. Se o `dark`
 *     sumir, as 143 variantes `dark:` dos componentes e o `html.dark body` do CSS deixam de casar —
 *     tudo vira claro, em silêncio.
 */
test('a casca carrega, o Tailwind aplicou (classe-canário) e o tema é escuro', async ({ page }) => {
  await abrirApp(page);

  // 1 · a página montou: o <main> da §1 existe com o botão de busca.
  const main = page.locator('main');
  await expect(main).toBeVisible();

  // 2 · O CANÁRIO. A cor computada do <main> tem de ser o fundo do app (#0e1117 = rgb(14,17,23)).
  //     Sem Tailwind, esta classe não vira regra e o fundo fica transparente/herdado — o teste cai.
  await expect(main).toHaveCSS('background-color', 'rgb(14, 17, 23)');

  // 3 · TEMA ESCURO. O `dark` no <html> é o que ativa as variantes `dark:` — afirmar por classe,
  //     não pelo `<link>`.
  const temDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  expect(temDark, 'o <html> deve ter a classe "dark"').toBe(true);

  // 4 · o corpo computa escuro de verdade (não só o atributo existe). O `html.dark body` do CSS
  //     pinta um fundo escuro; clareza aqui significaria o CSS do tema não chegou.
  const corCorpo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const [r, g, b] = (corCorpo.match(/\d+/g) ?? []).map(Number);
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  expect(
    luminancia,
    `fundo do <body> deveria ser escuro (luminância baixa), veio ${corCorpo}`,
  ).toBeLessThan(80);

  // 5 · ordem da §1: os seis blocos aparecem, e o do gráfico vem antes dos filtros/trilho/matriz.
  await expect(page.locator('[data-bloco="chips"]')).toHaveCount(1);
  await expect(page.locator('[data-bloco="filtros"]')).toHaveCount(1);
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(1);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(1);
  const ordem = await page.evaluate(() =>
    [...document.querySelectorAll('[data-bloco]')].map((el) => el.dataset.bloco),
  );
  expect(ordem.indexOf('chips')).toBeLessThan(ordem.indexOf('filtros'));
  expect(ordem.indexOf('filtros')).toBeLessThan(ordem.indexOf('trilho'));
  expect(ordem.indexOf('trilho')).toBeLessThan(ordem.indexOf('comparacao'));

  await page.screenshot({ path: 'e2e/.artefatos/casca-tema-escuro.png', fullPage: true });
});

test('o dado local carrega: o catálogo traz os 7 grupos', async ({ page }) => {
  await abrirApp(page);
  // O middleware serve `/indicators.json` do repo local com o `datafile` reescrito (vite.config.js).
  // Se o catálogo não carregasse, a cascata da busca viria sem grupos.
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  const grupos = page.getByRole('list', { name: 'Grupos' });
  await expect(grupos.getByRole('listitem')).toHaveCount(7);
});

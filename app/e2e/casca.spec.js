import { test, expect, abrirApp, carregarExemplo } from './apoio.js';

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

  // 5 · §9.1 / ADR 0001 (2026-10-17) — DIVULGAÇÃO PROGRESSIVA: sem série não há o que controlar,
  //     então os blocos 4/5/6 NÃO existem. Era o defeito que a decisão corrige: três controles
  //     mortos (filtros desabilitados, trilho inerte, painel-promessa) já na abertura.
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  await expect(page.locator('[data-bloco="filtros"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  // a captura registra o ABRIR MINIMALISTA (só busca + exemplo), já em tema escuro.
  await page.screenshot({ path: 'e2e/.artefatos/casca-tema-escuro.png', fullPage: true });

  // 6 · ordem da §1: com série, os blocos aparecem e o do gráfico vem antes dos filtros/trilho/matriz.
  await carregarExemplo(page);
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
});

/**
 * §9.1 / ADR 0001 (2026-10-17) — A OUTRA METADE da regra `mostrarCasca`. Sem ela, bastava
 * `itens.length > 0`: o shell apareceria assim que a série fosse ADICIONADA, ainda carregando,
 * e o `Esqueleto` perderia a função. Este teste segura a rede para o app ficar em
 * `todosCarregando` de forma determinística — é o único jeito de olhar essa janela.
 */
test('com série carregando o shell ainda não existe; ele aparece quando o dado resolve', async ({
  page,
}) => {
  await abrirApp(page);

  // segura TODO /dados/** por 2,5s — janela de sobra para afirmar o estado de carregamento.
  await page.route('**/dados/**', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });

  // dispara o exemplo: as duas séries entram com status `carregando`
  await page.getByRole('button', { name: 'Selic × IPCA' }).click();

  // AINDA CARREGANDO: o ESQUELETO ocupa o lugar do gráfico (§9.2) e o shell 4/5/6 NÃO existe.
  await expect(page.locator('[data-bloco="esqueleto"]')).toBeVisible();
  await expect(page.locator('[data-bloco="filtros"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  // O DADO RESOLVE: o esqueleto sai e o shell aparece — a transição que a regra descreve.
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(2, {
    timeout: 15000,
  });
  await expect(page.locator('[data-bloco="esqueleto"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="filtros"]')).toHaveCount(1);
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(1);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(1);

  await page.unroute('**/dados/**');
});

test('o dado local carrega: o catálogo traz os 7 grupos', async ({ page }, testInfo) => {
  await abrirApp(page);
  // O middleware serve `/indicators.json` do repo local com o `datafile` reescrito (vite.config.js).
  // Se o catálogo não carregasse, a cascata da busca viria sem grupos.
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  // O controle dos grupos tem DUAS realizações (§12.1): a coluna 1 da cascata (desktop, uma
  // lista) e a fileira de chips (celular, um `role="group"` — a coluna está `md:block`, logo
  // fora da árvore de acessibilidade no celular). A pergunta é a mesma — os 7 grupos do
  // `indicators.json` chegaram —, só muda de onde se lê.
  if (testInfo.project.name === 'mobile') {
    // chips: "Todos" + um por grupo
    await expect(page.getByRole('group', { name: 'Grupos' }).getByRole('button')).toHaveCount(8);
  } else {
    const grupos = page.getByRole('list', { name: 'Grupos' });
    await expect(grupos.getByRole('listitem')).toHaveCount(7);
  }
});

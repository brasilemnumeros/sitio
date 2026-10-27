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

/**
 * ⚠ ALCANCE: o harness deste E2E serve o APP em dev (`app/index.html` do `vite dev`) —
 * a `/` do ASTRO NUNCA passa por aqui. O que o teste prova é o lado do APP: nenhum
 * componente do app (nem um erro de mount/hidratação) pode renderizar a casca do site
 * — nem o `nav` do topo, nem o rodapé (a barra inferior do app é um
 * `<footer data-testid="barra-inferior">` e fica EXCLUÍDA da proibição), nem o botão
 * de feedback (`#feedback-btn`), nem o toast de convite para artigos (`#toast-artigos`).
 *
 * A outra metade — a casca no HTML da `/` publicada (`Home.astro` vs `Base.astro`) —
 * o navegador deste harness não vê; quem guarda é o BUILD, por
 * `scripts/testar-home.sh` (na cadeia do `verificar`), que grepa o `dist/index.html`.
 */
test('no app não há casca do site: sem nav, footer, feedback nem toast', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav')).toHaveCount(0);
  // A barra inferior do app é um `<footer>`; o que não pode existir é o rodapé do site.
  await expect(page.locator('footer:not([data-testid="barra-inferior"])')).toHaveCount(0);
  await expect(page.locator('#feedback-btn')).toHaveCount(0);
  await expect(page.locator('#toast-artigos')).toHaveCount(0);
});

/**
 * §Moldura (T5) — a home é um TERMINAL de altura fixa. A página não rola: quem rola são as
 * gavetas (T7/T8). `?series=nao-existe` cai no estado vazio de propósito (sem série, sem
 * preset), que é onde a moldura costuma estourar: o `EstadoInicial` tem padding e o
 * `<main>` antigo crescia com o conteúdo.
 */
test('a home ocupa o viewport e não rola', async ({ page }) => {
  await page.goto('/?series=nao-existe');
  const medida = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    altura: window.innerHeight,
  }));
  expect(medida.scroll).toBeLessThanOrEqual(medida.altura + 1);
  await expect(page.getByTestId('barra-superior')).toBeVisible();
  await expect(page.getByTestId('barra-inferior')).toBeVisible();
  await expect(page.getByTestId('trilho-direito')).toBeVisible();

  // §Conteúdo longo — a medidas do estado são FECHADAS: nada do miolo atravessa o topo do
  // footer. `ErroTotal` não tem marcador próprio (R29); o `<button>` "Tentar de novo" é o
  // ÚLTIMO bloco de texto dele, então é ele que mede o fim do conteúdo.
  const fim = (alvo) =>
    alvo.evaluate((el) => {
      const footer = document.querySelector('[data-testid="barra-inferior"]').getBoundingClientRect();
      const caixa = el.getBoundingClientRect();
      return { bottom: caixa.bottom, footerY: footer.top, altura: caixa.height };
    });

  // 1 · estado vazio: a caixa inteira do EstadoInicial termina antes do footer.
  const inicial = page.locator('[data-bloco="inicial"]');
  await expect(inicial).toBeVisible();
  const fimVazio = await fim(inicial);
  expect(fimVazio.bottom).toBeLessThanOrEqual(fimVazio.footerY + 1);

  // 2 · erro total com IDs REAIS e dado corrompido — 200 com JSON sem forma (`data` fora de
  //     lista), NÃO 500: a falha fica no `item.error` e o console do navegador fica limpo
  //     (a fixture de `apoio.js` falha o teste com qualquer error.logado).
  await page.route('**/dados/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":"não é uma lista"}' }),
  );
  // janela CURTA de propósito: com 900px o erro cabe solto e o estouro não aparece — o
  // guardião precisa exercitar o caso em que o conteúdo é maior que a área do gráfico.
  await page.setViewportSize({ width: 480, height: 160 });
  await page.goto('/?series=selic-meta-acum-12m,ipca-acum-12m');
  await expect(page.getByRole('alert')).toBeVisible();
  const botaoTentar = page.getByRole('button', { name: 'Tentar de novo' });
  await expect(botaoTentar).toBeVisible();
  // o conteúdo rola DENTRO da área: o fim dele (o botão) chega e fica ACIMA do footer —
  // o defeito que este teste prende pintava o motivo por cima da barra inferior.
  await botaoTentar.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  const fimErro = await fim(botaoTentar);
  expect(fimErro.bottom).toBeLessThanOrEqual(fimErro.footerY + 1);
  const medidaErro = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    altura: window.innerHeight,
  }));
  expect(medidaErro.scroll).toBeLessThanOrEqual(medidaErro.altura + 1);
  await page.unroute('**/dados/**');
});

/**
 * §Moldura (T5) — o gráfico é o dono da tela. A prova é GEOMÉTRICA e proporcional: 60% do
 * viewport é o piso que separa "terminal" de "pilha de blocos com um canvas de 480px".
 */
test('com série, o gráfico ocupa a maior parte da altura', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('grafico').locator('canvas').first()).toBeVisible();
  const { grafico, janela } = await page.evaluate(() => ({
    grafico: document.querySelector('[data-testid="grafico"]').getBoundingClientRect().height,
    janela: window.innerHeight,
  }));
  expect(grafico / janela).toBeGreaterThan(0.6);
});

/**
 * §Gaveta direita (T7) — séries, cores e eixos num lugar fixo. A gaveta é um SEGUNDO `<aside>`,
 * separado do trilho de 34px: o trilho não some (é o gatilho) e o painel entra em fluxo ao lado
 * do gráfico. `hidden` — e não `translate` — é o que a mantém fora da árvore de acessibilidade
 * quando fechada; um painel só deslocado continuaria focável por TAB.
 */
test('a gaveta direita abre, mostra as três seções e fecha com Esc', async ({ page }) => {
  await page.goto('/');
  const gatilho = page.getByRole('button', { name: 'Séries e eixos' });
  await expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  await gatilho.click();
  const gaveta = page.getByTestId('gaveta-direita');
  await expect(gaveta).toBeVisible();
  const secoes = await gaveta.locator('[data-secao]').evaluateAll((els) => els.map((e) => e.dataset.secao));
  expect(secoes).toEqual(['series', 'cores', 'eixos']);
  await expect(gaveta.locator('[data-bloco="chips"]')).toHaveCount(1);
  await expect(gaveta.getByTestId('legenda-series')).toHaveCount(1);
  await expect(gaveta.getByRole('button', { name: /esq\.|dir\./ }).first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
  await expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  await expect(gatilho).toBeFocused();
});

/**
 * §Gaveta direita (T7) — os três atalhos do trilho. Com a gaveta fechada só o gatilho principal
 * aparece; aberta, os três ficam visíveis e cada um rola até a sua seção (não troca de painel).
 */
test('fechada, o trilho mostra só o gatilho; aberta, mostra os três atalhos', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Cores', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eixos', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Séries e eixos' }).click();
  await expect(page.getByTestId('gaveta-direita')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cores', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eixos', exact: true })).toBeVisible();
  // Os atalhos rolam DENTRO da gaveta e não mudam de seção: o painel continua único.
  await page.getByRole('button', { name: 'Eixos', exact: true }).click();
  await expect(page.getByTestId('gaveta-direita')).toBeVisible();
  await expect(page.getByTestId('gaveta-direita').locator('[data-secao="eixos"]')).toBeInViewport();
});

/**
 * §Estados (T7) — com erro PARCIAL e a gaveta fechada, quem avisa é o gatilho (o chip de erro
 * está dentro da gaveta). Sem o ponto de atenção, uma série quebrada ficaria invisível.
 */
test('com série em erro, o gatilho da gaveta avisa com ponto de atenção', async ({ page }) => {
  // 200 com JSON sem forma — a falha fica no `item.error` e o console segue limpo (`apoio.js`).
  await page.route('**/dados/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":"não é uma lista"}' }),
  );
  await page.goto('/?series=selic-meta-acum-12m,ipca-acum-12m');
  const gatilho = page.getByRole('button', { name: 'Séries e eixos' });
  await expect(gatilho).toHaveAttribute('aria-label', /há séries com erro/);
  const ponto = gatilho.locator('span[aria-hidden="true"]').last();
  await expect(ponto).toBeVisible();
  // O ponto é VERMELHO de verdade — a classe é `bg-red-500` e ela precisa estar COMPUTADA (o
  // CSS do Tailwind é um arquivo à parte; uma classe no DOM sem regra deixaria o ponto invisível).
  await expect(ponto).toHaveClass(/bg-red-500/);
  await expect(ponto).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(page.getByTestId('gaveta-direita')).toBeHidden();
  await page.unroute('**/dados/**');
});

/**
 * §Moldura (T7) — abrir a gaveta ENCOLHE o gráfico, não o empurra para fora. A prova é dupla:
 * a largura do gráfico cai, e o documento não ganha rolagem horizontal (a moldura é `h-dvh`).
 */
test('abrir a gaveta direita encolhe o gráfico sem estourar a moldura', async ({ page }) => {
  await page.goto('/');
  // O `preset-chip` do topo é `max-md:hidden` — no celular ele nunca fica visível. Quem prova que
  // o dado chegou (e o gráfico montou) é o próprio gráfico, nos dois projetos.
  await expect(page.getByTestId('grafico')).toBeVisible();
  const largura = () => page.getByTestId('grafico').evaluate((el) => el.getBoundingClientRect().width);
  const semGaveta = await largura();
  await page.getByRole('button', { name: 'Séries e eixos' }).click();
  await expect(page.getByTestId('gaveta-direita')).toBeVisible();
  await expect.poll(largura).toBeLessThan(semGaveta);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

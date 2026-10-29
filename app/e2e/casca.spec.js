import {
  test,
  expect,
  abrirApp,
  abrirVazio,
  carregarExemplo,
  abrirGavetaDireita,
  abrirGavetaInferior,
} from './apoio.js';

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

  // 5 · §9.1 / ADR 0001 (2026-10-17) — DIVULGAÇÃO PROGRESSIVA. A home abre com o PRESET do dia;
  //     o estado vazio é explícito (`?series=` inválido). Sem série, o topo continua no lugar
  //     (§1 — é permanente), mas os filtros ficam DESABILITADOS, e o conteúdo das gavetas não é
  //     montado (a alça da inferior fica inerte).
  await abrirVazio(page);
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  const filtros = page.locator('[data-bloco="filtros"]');
  await expect(filtros).toHaveCount(1);
  await expect(filtros.getByRole('button', { name: 'Janela de 5 anos' })).toBeDisabled();
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  // a captura registra o ABRIR MINIMALISTA (só busca + exemplo), já em tema escuro.
  await page.screenshot({ path: 'e2e/.artefatos/casca-tema-escuro.png', fullPage: true });

  // 6 · com série, os blocos aparecem DENTRO das gavetas (a página não é mais uma pilha).
  await carregarExemplo(page);
  await expect(filtros.getByRole('button', { name: 'Janela de 5 anos' })).toBeEnabled();
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"]')).toHaveCount(1);
  await expect(page.getByTestId('legenda-series')).toHaveCount(1);
  // o "×" fecha; a gaveta inferior só abre com a direita fechada (o resto fica inerte — §Teclado)
  await page.getByRole('button', { name: 'Fechar séries' }).click();
  await abrirGavetaInferior(page);
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(1);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(1);
  // a estrutura é a das gavetas, não a ordem antiga de blocos na página
  await expect(page.getByTestId('gaveta-inferior').locator('[data-bloco="trilho"]')).toHaveCount(1);
  await expect(
    page.getByTestId('gaveta-inferior').locator('[data-bloco="comparacao"]'),
  ).toHaveCount(1);
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
  await abrirVazio(page);

  // segura TODO /dados/** por 2,5s — janela de sobra para afirmar o estado de carregamento.
  await page.route('**/dados/**', async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });

  // dispara o exemplo: as duas séries entram com status `carregando`
  await page.getByRole('button', { name: 'Selic × IPCA' }).click();

  // AINDA CARREGANDO: o ESQUELETO ocupa o lugar do gráfico (§9.2), os filtros existem mas estão
  // desabilitados, e o conteúdo das gavetas NÃO é montado.
  await expect(page.locator('[data-bloco="esqueleto"]')).toBeVisible();
  const filtros = page.locator('[data-bloco="filtros"]');
  await expect(filtros).toHaveCount(1);
  await expect(filtros.getByRole('button', { name: 'Janela de 5 anos' })).toBeDisabled();
  await expect(page.locator('[data-bloco="trilho"]')).toHaveCount(0);
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  // O DADO RESOLVE: o esqueleto sai e o shell aparece — a transição que a regra descreve.
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(2, {
    timeout: 15000,
  });
  await expect(page.locator('[data-bloco="esqueleto"]')).toHaveCount(0);
  await expect(filtros.getByRole('button', { name: 'Janela de 5 anos' })).toBeEnabled();
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
 * separado do trilho de 44px: o trilho não some (é o gatilho) e o painel entra em fluxo ao lado
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
 * §Gaveta direita (T7) — os atalhos do trilho. Com a gaveta fechada só o gatilho principal
 * aparece; aberta, os TRÊS botões rolam até a sua seção — inclusive o principal, que não pode
 * fechar a gaveta (fechar é o "×" do cabeçalho ou `Esc`). A prova é `scrollTop > 0`: sem o
 * `bind:this` do painel os atalhos eram botões mortos e o teste passava sem rolar nada.
 */
test('fechada, o trilho mostra só o gatilho; aberta, os três atalhos rolam até a seção', async ({
  page,
}, testInfo) => {
  // SEIS séries de propósito: com uma só o conteúdo da gaveta cabe na caixa e não há o que
  // rolar — `scrollTop` ficaria 0 por não existir rolagem, e o teste passaria sem provar nada.
  await page.goto(
    '/?series=selic-meta-acum-12m,ipca-acum-12m,igpm-acum-12m,mvgr-nominal,mvgr-real,homicidios-anual',
  );
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Cores', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Eixos', exact: true })).toHaveCount(0);

  const gatilho = page.getByRole('button', { name: 'Séries e eixos' });
  const gaveta = page.getByTestId('gaveta-direita');
  await gatilho.click();
  await expect(gaveta).toBeVisible();
  await expect(gaveta.locator('[data-secao="series"]')).toBeVisible();

  // No celular a folha de 88% cobre o PRÓPRIO trilho: os atalhos (Cores/Eixos) não são
  // alcançáveis com ela aberta — a folha tem cabeçalho e seções próprios. No desktop o trilho
  // fica do lado de fora, e é ele que rola a vista.
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('button', { name: 'Cores', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eixos', exact: true })).toBeVisible();

    // Janela curta: o topo (44px) e a barra inferior (36px) são fixos, então a gaveta fica com o
    // resto e passa a rolar.
    const { width } = page.viewportSize();
    await page.setViewportSize({ width, height: 320 });
    await expect
      .poll(() => gaveta.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(20);

    await page.getByRole('button', { name: 'Eixos', exact: true }).click();
    await expect.poll(() => gaveta.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect(gaveta.locator('[data-secao="eixos"]')).toBeInViewport();
    const noFim = await gaveta.evaluate((el) => el.scrollTop);

    // O botão principal NÃO fecha com a gaveta aberta: ele leva à seção das séries, como os vizinhos.
    await gatilho.click();
    await expect(gaveta).toBeVisible();
    await expect(gatilho).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => gaveta.evaluate((el) => el.scrollTop)).toBeLessThan(noFim);
    await expect(gaveta.locator('[data-secao="series"]')).toBeInViewport();
  }

  // O caminho de fechar com o MOUSE é o "×" do cabeçalho (o `Esc` continua valendo).
  await page.getByRole('button', { name: 'Fechar séries' }).click();
  await expect(gaveta).toBeHidden();
  await expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  await expect(gatilho).toBeFocused();
});

/**
 * §Moldura (T7) — abrir e fechar a gaveta é só GEOMETRIA. Se algum caminho da gaveta chamasse
 * `resetarJanela`/`limparSelecao`, o usuário perderia a janela e o mandato por um clique de UI.
 * A leitura é pelas STORES (mesmo caminho de `trilho.spec.js`/`minimapa.spec.js`), não pelo pixel.
 */
test('abrir e fechar a gaveta não mexe na janela de tempo nem no mandato', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('grafico')).toBeVisible();

  const filtros = page.locator('[data-bloco="filtros"]');
  const preset = filtros.getByRole('button', { name: 'Janela de 10 anos' });
  await preset.click();
  await expect(preset).toHaveAttribute('aria-pressed', 'true');

  const estado = () =>
    page.evaluate(async () => {
      const { viewportStore } = await import('/src/stores/viewport.js');
      const { mandateStore } = await import('/src/stores/mandate.js');
      let viewport = null;
      viewportStore.subscribe((x) => (viewport = x))();
      let mandato = null;
      mandateStore.subscribe((x) => (mandato = x.selecionado))();
      return { viewport, mandato };
    });

  const antes = await estado();
  expect(antes.viewport.from, 'a janela precisa ter sido escolhida de fato').not.toBeNull();

  /** Duração da janela em anos — o que o preset "10a" realmente promete. */
  const anos = (v) => (Date.parse(v.to) - Date.parse(v.from)) / (365.25 * 24 * 60 * 60 * 1000);
  const anosAntes = anos(antes.viewport);

  const gatilho = page.getByRole('button', { name: 'Séries e eixos' });
  const fechar = page.getByRole('button', { name: 'Fechar séries' });

  // 1 · ida e volta com a JANELA escolhida.
  await gatilho.click();
  await expect(page.getByTestId('gaveta-direita')).toBeVisible();
  await fechar.click();
  await expect(page.getByTestId('gaveta-direita')).toBeHidden();

  // ⚠ Igualdade EXATA não serve aqui, e o motivo é medido: ao mudar a largura do pane, o adapter
  // ecoa para a store a faixa LÓGICA que a lib mantém — a borda esquerda anda ~1 mês. Isso
  // acontece em QUALQUER resize (medido: 2015-08-01 → 2017-03-01 ao estreitar o viewport em
  // 180px, SEM tocar na gaveta), não é a gaveta zerando nada. O invariante do usuário é outro:
  // a janela continua sendo a de 10 anos, com a MESMA ponta direita, e o preset segue aceso.
  const depois = await estado();
  expect(depois.viewport.to, 'a ponta direita da janela não pode andar').toBe(antes.viewport.to);
  expect(Math.abs(anos(depois.viewport) - anosAntes)).toBeLessThan(0.5);
  expect(depois.mandato).toBe(antes.mandato);
  await expect(preset).toHaveAttribute('aria-pressed', 'true');

  // 2 · com um MANDATO escolhido. O trilho de mandatos chega na T8; até lá quem escolhe é a
  // store, pelo mesmo import sem `?query` que as outras specs usam.
  await page.evaluate(async () => {
    const { mandateStore, selecionarMandato } = await import('/src/stores/mandate.js');
    let m = null;
    mandateStore.subscribe((x) => (m = x))();
    if (m.mandatos.length > 0) selecionarMandato(m.mandatos[0].id);
  });
  const comMandato = await estado();
  expect(comMandato.mandato, 'o mandato precisa ter sido escolhido de fato').not.toBeNull();

  await gatilho.click();
  await expect(page.getByTestId('gaveta-direita')).toBeVisible();
  await page.keyboard.press('Escape'); // o outro caminho de fechar também não pode zerar nada
  await expect(page.getByTestId('gaveta-direita')).toBeHidden();
  const depoisComMandato = await estado();
  expect(depoisComMandato.mandato, 'o mandato escolhido continua escolhido').toBe(
    comMandato.mandato,
  );
  expect(depoisComMandato.viewport.to).toBe(comMandato.viewport.to);
  expect(Math.abs(anos(depoisComMandato.viewport) - anos(comMandato.viewport))).toBeLessThan(0.5);
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
test('abrir a gaveta direita encolhe o gráfico sem estourar a moldura', async ({ page }, testInfo) => {
  // No celular a gaveta é uma FOLHA sobre o gráfico (§Mobile), não uma coluna em fluxo: ela não
  // encolhe nada. A geometria de lá é afirmada em `mobile.spec.js` (folha de 88%).
  test.skip(testInfo.project.name !== 'desktop', 'no celular a gaveta é folha lateral');
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

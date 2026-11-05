import {
  test,
  expect,
  abrirVazio,
  carregarExemplo,
  abrirGavetaInferior,
  escolherMandato,
  mandatoEmCena,
} from './apoio.js';

/** A janela visível, lida da STORE — o mesmo caminho de `minimapa.spec.js`. ⚠ `import` sem
 *  `?query`: com query o Vite cria outro nó no grafo e o estado lido não é o do app. */
async function janela(page) {
  return page.evaluate(async () => {
    const { viewportStore } = await import('/src/stores/viewport.js');
    let v = null;
    viewportStore.subscribe((x) => { v = x; })();
    return v;
  });
}

const anoDe = (iso) => Number(String(iso).slice(0, 4));

/** Os ids vêm de `app/src/data/governos/federal.json` (dado versionado no sitio). */
const LULA_I = 'federal-2003-lula';
const LULA_II = 'federal-2007-lula';
const LULA_III = 'federal-2023-lula';

/**
 * O MANDATO COMO ATALHO DE JANELA (§3, emenda de 2026-10-19) e a MATRIZ de comparação (§4).
 *
 * ⚠ O TRILHO de mandatos (`MandateRail`, `[data-bloco="trilho"]`) saiu em 2026-10-30: era um
 * TERCEIRO seletor para o mesmo estado, dentro de uma gaveta que nasce recolhida. O controle
 * ficou com o chip da barra superior (desktop) e a faixa do minimapa; os dois têm spec próprio em
 * `mandato.spec.js`. Aqui a escolha é feita por `aplicarMandato` (ver `apoio.escolherMandato`), e
 * o que se afirma é a JANELA — não o pixel do seletor.
 *
 * A identificação do governo é por TEXTO (`Lula III · PT`), nunca por cor de partido (§7.3.4); os
 * rótulos são afirmados LITERALMENTE onde ainda são DOM: o cabeçalho da matriz.
 */
const ROTULOS = [
  'FHC I · PSDB',
  'FHC II · PSDB',
  'Lula I · PT',
  'Lula II · PT',
  'Dilma I · PT',
  'Dilma II · PT',
  'Temer · MDB',
  'Bolsonaro · PL',
  'Lula III · PT',
];

test('escolher um mandato FILTRA o período dele e limpar volta ao intervalo completo', async ({
  page,
}) => {
  await abrirVazio(page);
  await carregarExemplo(page); // §9.1 — a casca só existe com série

  // A janela de REPOUSO (o fit do exemplo) depende da largura do gráfico: no celular o fit é
  // mais estreito que no desktop, então o teste guarda a referência em vez de fixar um ano.
  // Espera o fit assentar (o debounce do adapter) antes de fotografar o repouso.
  await expect
    .poll(async () => {
      const j = await janela(page);
      return j.from ? (Date.parse(j.to) - Date.parse(j.from)) / 86400000 : 0;
    }, { timeout: 20000 })
    .toBeGreaterThan(365 * 20);
  const repouso = await janela(page);

  const filtros = page.locator('[data-bloco="filtros"]');

  await escolherMandato(page, LULA_I);
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBe(LULA_I);

  // a janela vai para o MANDATO — 2003-01 → 2006-12
  await expect.poll(async () => anoDe((await janela(page)).from), {
    message: 'a ponta esquerda tem de cair no mandato da Lula I',
    timeout: 20000,
  }).toBeGreaterThanOrEqual(2002);
  const j = await janela(page);
  expect(anoDe(j.from)).toBeLessThanOrEqual(2003);
  expect(anoDe(j.to)).toBeGreaterThanOrEqual(2006);
  expect(anoDe(j.to)).toBeLessThanOrEqual(2007);

  // ⚠ Um dono por vez: com o mandato na janela, NENHUM preset relativo acende (a duração de um
  // mandato de 4 anos fica a 1,0 do "5a", fora da tolerância de 0,5 — mas isto não depende disso).
  for (const nome of ['Janela de 1 ano', 'Janela de 5 anos', 'Janela de 10 anos']) {
    await expect(filtros.getByRole('button', { name: nome })).toHaveAttribute('aria-pressed', 'false');
  }

  await page.screenshot({ path: 'e2e/.artefatos/mandato-janela-lula-i.png', fullPage: true });

  // de novo no MESMO mandato LIMPA (§3: um clique, um efeito — limpar, não dar zoom) e volta ao
  // intervalo completo
  await escolherMandato(page, LULA_I);
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBeNull();
  await expect
    .poll(async () => anoDe((await janela(page)).from), { timeout: 20000 })
    .toBe(anoDe(repouso.from));
  const recuado = await janela(page);
  expect((Date.parse(recuado.to) - Date.parse(recuado.from)) / 86400000).toBeGreaterThan(365 * 20);
});

test('o mandato EM CURSO filtra até a última data disponível (a janela tem ponta direita)', async ({
  page,
}) => {
  await abrirVazio(page);
  await carregarExemplo(page);
  await expect(page.getByTestId('grafico')).toBeVisible();

  await escolherMandato(page, LULA_III);
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBe(LULA_III);

  // ⚠ Sem a última data o `to` sairia NULO e o adapter manteria a borda direita ATUAL — o filtro
  // ficaria amarrado à janela anterior. A guarda é a ponta direita ser recente e não nula.
  await expect.poll(async () => (await janela(page)).to, { timeout: 20000 }).not.toBeNull();
  const j = await janela(page);
  expect(anoDe(j.from)).toBe(2023);
  expect(anoDe(j.to)).toBeGreaterThanOrEqual(2025);
});

test('escolher um preset DESMARCA o mandato (um dono da janela por vez)', async ({ page }) => {
  await abrirVazio(page);
  await carregarExemplo(page);
  await expect(page.getByTestId('grafico')).toBeVisible();

  await escolherMandato(page, LULA_II);
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBe(LULA_II);

  const dezAnos = page.locator('[data-bloco="filtros"]').getByRole('button', { name: 'Janela de 10 anos' });
  await dezAnos.click();

  // o preset assume a janela e a seleção do mandato sai — senão a tela diria duas coisas
  await expect(dezAnos).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBeNull();
});

/**
 * 🔴 UM INTERVALO INVERTIDO NÃO PODE CHEGAR À LIB. Em DEV ela lança `right should be >= left`; no
 * build de PRODUÇÃO as asserções são REMOVIDAS e o gráfico desenha errado, em SILÊNCIO — a
 * armadilha que o AGENTS registra. O caminho foi encontrado AQUI, em 2026-10-19: o preset declarava
 * só a ponta esquerda e o adapter preenchia a direita com a janela ATUAL — que, com um mandato
 * escolhido, está no PASSADO (`from = 2015-10`, `to = 2006-12`).
 *
 * A FONTE está corrigida (o preset declara as duas pontas). Esta guarda vive no ADAPTER — a última
 * linha antes da lib — e cobre qualquer chamador: um pedido de UMA ponta continua sendo preenchido
 * com o que está na tela, e é essa combinação que pode inverter.
 */
test('a janela invertida não chega à lib (onde a produção não tem asserção para avisar)', async ({
  page,
}) => {
  await abrirVazio(page);
  await carregarExemplo(page);
  await expect(page.getByTestId('grafico')).toBeVisible();

  // leva a janela para o PASSADO pelo caminho do produto (é o estado em que a inversão nasce)
  await escolherMandato(page, LULA_I);
  await expect.poll(async () => anoDe((await janela(page)).to), { timeout: 20000 }).toBeLessThan(2010);

  // ...e pede SÓ a ponta esquerda, no FUTURO: o `to` herdado (2006) cairia antes do `from` (2025).
  await page.evaluate(async () => {
    const { definirJanela } = await import('/src/stores/viewport.js');
    definirJanela({ from: '2025-06-01' }, { escolhaDoUsuario: true });
  });
  await page.waitForTimeout(300);

  // ⚠ A asserção que importa é a do fixture de `page`: sem a guarda sai
  // "pageerror (exceção não capturada): Assertion failed: right should be >= left".
  // O que sobra para afirmar aqui é que o app NÃO quebrou: "Tudo" ainda devolve o intervalo.
  const tudo = page.locator('[data-bloco="filtros"]').getByRole('button', { name: 'Janela completa' });
  await tudo.click();
  // A largura do gráfico limita o enquadramento da lib: no celular "Tudo" não chega a 1996.
  // O invariante é a janela VOLTAR a ser longa (a máxima que aquele gráfico consegue).
  await expect
    .poll(async () => {
      const j = await janela(page);
      return j.from ? (Date.parse(j.to) - Date.parse(j.from)) / 86400000 : 0;
    }, { timeout: 20000 })
    .toBeGreaterThan(365 * 20);
});

/**
 * O PAINEL DE COMPARAÇÃO (§4, posição 6) — dentro da gaveta inferior. A matriz aparece quando há
 * série, com os estados de célula EM TEXTO (§9.4): nada de símbolo — "—" faria concluir que falta
 * dado que existe.
 *
 * No celular (2026-11-05) a matriz dá lugar a uma lista por indicador: o nome do governo continua
 * sendo o lugar onde a ordem cronológica é afirmada, agora numa linha por mandato.
 */
test('a comparação aparece com série e traz os estados de célula por texto', async ({
  page,
}, testInfo) => {
  await abrirVazio(page);

  // §9.1 — sem série o painel não existe (divulgação progressiva): não fica mudo porque não está lá.
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  await carregarExemplo(page);
  await abrirGavetaInferior(page);

  const painel = page.locator('[data-bloco="comparacao"]');

  if (testInfo.project.name === 'mobile') {
    const lista = painel.locator('[data-bloco="comparacao-lista"]');
    await expect(lista).toBeVisible();

    const cartoes = lista.locator('[data-cartao-indicador]');
    await expect(cartoes).toHaveCount(2);

    // uma linha por mandato, na ordem cronológica (§7.3.6)
    const linhas = cartoes.first().locator('[data-linha-mandato]');
    await expect(linhas).toHaveCount(ROTULOS.length);
    for (let i = 0; i < ROTULOS.length; i++) {
      await expect(linhas.nth(i)).toContainText(ROTULOS[i]);
    }

    // o mandato em curso é o último, está parcial e leva o marcador de hachura
    await expect(linhas.last()).toHaveAttribute('data-em-curso', 'true');
    await expect(linhas.last()).toHaveAttribute('data-estado', 'parcial');
    await expect(linhas.last()).toContainText(/parcial \d{2}\/\d{4}–\d{2}\/\d{4}/);

    // os outros estados continuam em TEXTO, não em símbolo
    const semCobertura = lista.locator('[data-estado="sem-cobertura"]');
    expect(await semCobertura.count()).toBeGreaterThan(0);
    await expect(semCobertura.first()).toContainText(/série começa em \d{4}-\d{2}/);
    const parciais = lista.locator('[data-estado="parcial"]');
    expect(await parciais.count()).toBeGreaterThan(0);
    await expect(parciais.first()).toContainText(/parcial \d{2}\/\d{4}–\d{2}\/\d{4}/);
  } else {
    // cabeçalho: a coluna do indicador + uma por mandato (9), na ordem cronológica (§7.3.6)
    const tabela = painel.getByRole('table');
    await expect(tabela).toBeVisible();
    const cabecalhos = painel.getByRole('columnheader');
    await expect(cabecalhos).toHaveCount(ROTULOS.length + 1);
    await expect(cabecalhos.first()).toHaveText('Indicador');
    for (let i = 0; i < ROTULOS.length; i++) {
      await expect(cabecalhos.nth(i + 1)).toHaveText(ROTULOS[i]);
    }

    // duas linhas de dados (Selic e IPCA)
    await expect(tabela.locator('tbody tr')).toHaveCount(2);

    // ao menos uma célula SEM cobertura diz POR QUÊ, com a data real (a Selic começa em 1999-03,
    // depois do FHC I) — texto, não símbolo
    const semCobertura = painel.locator('[data-estado="sem-cobertura"]');
    expect(await semCobertura.count()).toBeGreaterThan(0);
    await expect(semCobertura.first()).toContainText(/série começa em \d{4}-\d{2}/);

    // ao menos uma célula PARCIAL — o mandato em curso (fim null) nunca é "completo" (§7.3.5), e o
    // período real usado é verboso de propósito
    const parciais = painel.locator('[data-estado="parcial"]');
    expect(await parciais.count()).toBeGreaterThan(0);
    await expect(parciais.first()).toContainText(/parcial \d{2}\/\d{4}–\d{2}\/\d{4}/);
  }

  await page.screenshot({ path: 'e2e/.artefatos/comparacao-matriz.png', fullPage: true });
});

/**
 * A lista não pode trocar a rolagem horizontal da matriz por uma rolagem horizontal do cartão: o
 * nome mais longo do catálogo e uma tela de 320px são o pior caso.
 */
test('a lista cabe em 320px com o nome longo, sem rolagem horizontal', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'geometria de celular');
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/?series=mvgr-nominal,mvgr-real');
  await abrirGavetaInferior(page);

  const lista = page.locator('[data-bloco="comparacao-lista"]');
  const nome = lista.locator('[data-cartao-indicador] h3').first();
  await expect(nome).toContainText(/MVG-R — valor mediano de garantia/);

  // O documento é só a primeira barreira: a lista vive num `overflow-y:auto` e um filho largo
  // nunca chegaria ao `documentElement`. O `scrollWidth` da própria lista e o do nome (que pode
  // ser clipado pelo cartão) são as medidas que denunciam `nowrap` ou token sem quebra.
  const transbordo = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(transbordo, 'a página rola na horizontal').toBeLessThanOrEqual(1);
  const sobraLista = await lista.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(sobraLista, 'a lista rola na horizontal').toBeLessThanOrEqual(1);
  const sobraNome = await nome.evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(sobraNome, 'o nome longo não quebrou linha').toBeLessThanOrEqual(1);
});

/**
 * Cada cartão é uma série: a unidade exibida tem de ser a dela, não a do vizinho. O caso misto
 * (%, R$) é o que pega um cabeçalho que leia a unidade "da comparação" em vez da linha.
 */
test('cada cartão mostra a unidade da própria série', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'lista de celular');
  await page.goto('/?series=selic-meta,mvgr-nominal');
  await abrirGavetaInferior(page);

  const cartoes = page.locator('[data-bloco="comparacao-lista"] [data-cartao-indicador]');
  await expect(cartoes.nth(0).locator('header')).toContainText('%');
  await expect(cartoes.nth(1).locator('header')).toContainText('R$');
});

/**
 * A GAVETA INFERIOR (T8) — a matriz vive numa gaveta, e a barra de 36px é a ALÇA dela. `Esc` fecha
 * — a prioridade ENTRE camadas é da T9, aqui a gaveta só respeita quem já tratou a tecla.
 *
 * ⚠ Sem `carregarExemplo`: a `/` já entra com o preset do dia (os ids curados do dia), então a
 * casca existe e a alça nasce habilitada. O teste NÃO afirma o conteúdo do preset — só a forma
 * da barra —, então o dia que muda não apodrece o teste.
 */
test('a gaveta inferior abre com a comparação, e a alça diz o que abre', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const alca = page.getByRole('button', { name: /Comparação por mandato/ });
  await expect(alca).toHaveAttribute('aria-expanded', 'false');
  // A alça diz o que abre E conta o que está em cena: `N séries · M eixos` no canto direito da
  // barra. Ele chegou a sair em 2026-10-28 para liberar o canto para a atribuição do TradingView,
  // mas a atribuição foi para o canto da BARRA SUPERIOR e o resumo voltou — sem ele a barra vira
  // um rótulo solto e some a única leitura de quantas séries/eixos estão no gráfico.
  await expect(alca).toContainText('Comparação por mandato');
  expect(await alca.innerText()).toMatch(/\d+ s[ée]ries? · \d+ eixos?/);

  await alca.click();
  const gaveta = page.getByTestId('gaveta-inferior');
  await expect(gaveta).toBeVisible();
  await expect(gaveta.locator('[data-bloco="comparacao"]')).toBeVisible();
  // §7.3.4 / decisão de 2026-10-30 — a gaveta é LEITURA: nenhum seletor de mandato dentro dela.
  await expect(gaveta.locator('[data-bloco="trilho"]')).toHaveCount(0);
  if (testInfo.project.name === 'mobile') {
    // A barra sai de cena aberta (2026-11-05): o controle visível é o cabeçalho da folha.
    await expect(page.getByTestId('grabber-comparacao')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Comparação por mandato' })).toBeVisible();
  } else {
    await expect(alca).toHaveAttribute('aria-expanded', 'true');
  }

  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
  await expect(alca).toHaveAttribute('aria-expanded', 'false');
});

/**
 * LIMPAR FILTROS (2026-10-30, a pedido do usuário) — o botão do trilho é FIXO: sem filtro em cena
 * ele fica desabilitado (nunca escondido — a mesma língua da alça da gaveta inferior e dos filtros
 * de tempo), e com filtro devolve janela + mandato ao padrão pelo caminho único
 * (`aplicarMandato(null)`).
 *
 * A DICA de primeiro uso aponta para ele na primeira vez que um filtro entra em cena, e sai no
 * primeiro gesto. Ela espera 600ms antes de aparecer: no carregamento a janela nasce recortada por
 * ~150ms (o adapter ainda não devolveu o fit) e a dica disparava sem ninguém ter filtrado nada.
 */
test('o limpar filtros é fixo no trilho, desabilita sem filtro e devolve o estado inicial', async ({
  page,
}) => {
  await abrirVazio(page);
  await carregarExemplo(page);
  await expect(page.getByTestId('grafico')).toBeVisible();

  const limpar = page.getByTestId('limpar-filtros');
  await expect(limpar).toBeVisible();
  await expect(limpar).toBeDisabled(); // sem filtro: presente e inerte

  // filtra pela janela de 10 anos — o caminho da barra superior
  await page
    .locator('[data-bloco="filtros"]')
    .getByRole('button', { name: 'Janela de 10 anos' })
    .click();
  await expect(limpar).toBeEnabled();
  // a dica de primeiro uso aponta para o botão
  await expect(page.getByRole('status')).toContainText('Limpar os filtros');

  await limpar.click();
  await expect(limpar).toBeDisabled();
  await expect(page.getByRole('status')).toHaveCount(0); // o gesto tira a dica do caminho
  // e a janela volta a cobrir o horizonte inteiro (o contrato, não o pixel)
  await expect
    .poll(async () => {
      const j = await janela(page);
      return j.from ? (Date.parse(j.to) - Date.parse(j.from)) / 86400000 : 0;
    }, { timeout: 20000 })
    .toBeGreaterThan(365 * 25);
});

/**
 * O ARRASTO da alça (mobile, §T8) fecha a gaveta e devolve o foco — e o `click` que o navegador
 * dispararia na soltura NÃO pode reabrir. O caso ruim é o dedo que sai de baixo da alça: o
 * `pointerup` chega, o `click` não. Antes, `arrasteFechou` ficava preso em `true` e engolia o
 * PRÓXIMO toque (a gaveta nunca mais abria). `dispatchEvent` entrega só os dois eventos de
 * ponteiro e reproduz exatamente esse buraco.
 */
test('arrastar a alça para baixo fecha a gaveta, devolve o foco e não engole o toque seguinte', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const alca = page.getByRole('button', { name: /Comparação por mandato/ });
  await alca.click();
  // No mobile a barra (e a alça) sai de cena aberta; o `aria-expanded` continua no mesmo botão,
  // então a leitura é por CSS e não por papel — papel só acha o que está visível.
  const alcaAberta = page.locator(
    '[data-testid="barra-inferior"] button[aria-controls="gaveta-inferior"]',
  );
  await expect(alcaAberta).toHaveAttribute('aria-expanded', 'true');

  // No celular a barra sai de cena aberta; quem carrega o gesto é o grabber do topo. No desktop
  // a alça continua sendo o alvo (a barra permanece).
  const alvo =
    testInfo.project.name === 'mobile' ? page.getByTestId('grabber-comparacao') : alca;
  await alvo.dispatchEvent('pointerdown', { clientY: 100, pointerId: 1 });
  await alvo.dispatchEvent('pointerup', { clientY: 260, pointerId: 1 });
  await expect(alcaAberta).toHaveAttribute('aria-expanded', 'false');
  // O foco volta para a alça, que é o gatilho — mesmo caminho de `Esc`/`×`.
  await expect(alca).toBeFocused();

  await alca.click();
  await expect(alcaAberta).toHaveAttribute('aria-expanded', 'true');
});

/**
 * §Mobile — todo controle tem alvo ≥ 44×44px. O "×" e o grabber são os dois caminhos de fechar a
 * folha; o alvo do gesto não pode ser uma tira de 20px.
 */
test('os alvos de fechar a gaveta têm 44px no celular', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'geometria de celular');
  await page.goto('/');
  await abrirGavetaInferior(page);

  for (const alvo of [
    page.getByRole('button', { name: 'Fechar comparação' }),
    page.getByTestId('grabber-comparacao'),
  ]) {
    const caixa = await alvo.boundingBox();
    expect(caixa.width, 'alvo de toque estreito').toBeGreaterThanOrEqual(44);
    expect(caixa.height, 'alvo de toque baixo').toBeGreaterThanOrEqual(44);
  }
});

/**
 * Dois riscos da gaveta mobile: o arrasto dentro da lista não pode fechar (só o grabber fecha), e
 * a troca de largura tem de trocar a forma sem deixar as duas visíveis ao mesmo tempo.
 */
test('arrasto na lista não fecha, e ao alargar a tela a matriz aparece', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'geometria de celular');
  await page.goto('/');
  const gaveta = page.getByTestId('gaveta-inferior');
  await abrirGavetaInferior(page);

  const linha = page.locator('[data-bloco="comparacao-lista"] [data-linha-mandato]').first();
  await linha.dispatchEvent('pointerdown', { clientY: 100, pointerId: 1 });
  await linha.dispatchEvent('pointerup', { clientY: 260, pointerId: 1 });
  await expect(gaveta).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('[data-bloco="comparacao"] table')).toBeVisible();
  await expect(page.getByTestId('grabber-comparacao')).toBeHidden();
});

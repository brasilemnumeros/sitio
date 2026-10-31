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

/** Os ids vêm de `dados/governos/federal.json` (dado versionado, não do catálogo). */
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
 * O cabeçalho da matriz é, desde 2026-10-30, o ÚNICO lugar (nos dois viewports) onde os nove
 * rótulos de governo aparecem como DOM — por isso a ordem cronológica é afirmada aqui, literal.
 */
test('a matriz aparece com série e traz os estados de célula por texto', async ({ page }) => {
  await abrirVazio(page);

  // §9.1 — sem série o painel não existe (divulgação progressiva): não fica mudo porque não está lá.
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  await carregarExemplo(page);
  await abrirGavetaInferior(page);

  const painel = page.locator('[data-bloco="comparacao"]');

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

  await page.screenshot({ path: 'e2e/.artefatos/comparacao-matriz.png', fullPage: true });
});

/**
 * A GAVETA INFERIOR (T8) — a matriz vive numa gaveta, e a barra de 36px é a ALÇA dela. `Esc` fecha
 * — a prioridade ENTRE camadas é da T9, aqui a gaveta só respeita quem já tratou a tecla.
 *
 * ⚠ Sem `carregarExemplo`: a `/` já entra com o preset do dia (os ids curados do dia), então a
 * casca existe e a alça nasce habilitada. O teste NÃO afirma o conteúdo do preset — só a forma
 * da barra —, então o dia que muda não apodrece o teste.
 */
test('a gaveta inferior abre com a matriz, e a alça diz o que abre', async ({ page }) => {
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
  await expect(alca).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
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
}) => {
  await page.goto('/');
  const alca = page.getByRole('button', { name: /Comparação por mandato/ });
  await alca.click();
  await expect(alca).toHaveAttribute('aria-expanded', 'true');

  await alca.dispatchEvent('pointerdown', { clientY: 100, pointerId: 1 });
  await alca.dispatchEvent('pointerup', { clientY: 260, pointerId: 1 });
  await expect(alca).toHaveAttribute('aria-expanded', 'false');
  // O foco volta para a alça, que é o gatilho — mesmo caminho de `Esc`/`×`.
  await expect(alca).toBeFocused();

  await alca.click();
  await expect(alca).toHaveAttribute('aria-expanded', 'true');
});

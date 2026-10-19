import { test, expect, abrirApp, carregarExemplo } from './apoio.js';

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

/**
 * O TRILHO DE MANDATOS (§3, posição 5). É um SELETOR de largura igual, desacoplado do eixo do
 * tempo — e a identificação é por TEXTO (`Lula III · PT`), nunca por cor de partido (§7.3.4).
 *
 * O DESTAQUE em si é desenhado no CANVAS (`adapter.destacarMandato` → primitiva de faixas): não se
 * afirma por pixel. Afirma-se o que é DOM — o `aria-pressed` que o clique liga — e captura-se a tela
 * para o canvas. O rótulo, sim, é DOM e é afirmado LITERALMENTE (o teste tem de morder se um
 * rótulo mudar).
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

test('o trilho tem 9 botões, um por governo, com o rótulo por texto', async ({ page }) => {
  await abrirApp(page);
  await carregarExemplo(page); // §9.1 — o trilho só existe com série (divulgação progressiva)

  const trilho = page.locator('[data-bloco="trilho"]');
  const caixas = trilho.getByRole('button');
  await expect(caixas).toHaveCount(9);

  // rótulos LITERAIS e na ordem cronológica (§7.3.6)
  for (let i = 0; i < ROTULOS.length; i++) {
    await expect(caixas.nth(i)).toHaveText(ROTULOS[i]);
  }

  // nenhum aceso no início (o store começa com `selecionado: null`)
  await expect(caixas.first()).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: 'e2e/.artefatos/trilho-sem-selecao.png', fullPage: true });
});

test('clicar num mandato destaca (aria-pressed) e clicar de novo limpa', async ({ page }) => {
  await abrirApp(page);
  await carregarExemplo(page); // com série, o destaque também desenha a faixa no canvas

  const trilho = page.locator('[data-bloco="trilho"]');
  const lulaTerceiro = trilho.getByRole('button', { name: 'Lula III · PT' });

  await lulaTerceiro.click();
  await expect(lulaTerceiro).toHaveAttribute('aria-pressed', 'true');
  // os demais seguem apagados — a seleção é única
  await expect(trilho.getByRole('button', { name: 'FHC I · PSDB' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );

  // a captura registra a FAIXA desenhada no canvas (o canvas não se afirma por pixel)
  await page.screenshot({ path: 'e2e/.artefatos/trilho-lula-iii-destacado.png', fullPage: true });

  // §3 — um clique, um efeito: clicar de novo LIMPA (não dá zoom)
  await lulaTerceiro.click();
  await expect(lulaTerceiro).toHaveAttribute('aria-pressed', 'false');
});

/**
 * O MANDATO É UM ATALHO DE JANELA (emenda de 2026-10-19, §3). Antes, clicar só realçava a faixa e
 * o trilho era um SELETOR puro; agora o mesmo clique ENQUADRA o gráfico no período do governo e
 * declara a autoria da janela (§8.1), para que o fit automático não a desfaça. A §2 tinha
 * rejeitado "o mandato vira o enquadramento" por competir com o zoom pelo mesmo estado — a §8.1,
 * que veio depois, é o que tornou isso seguro; o usuário decidiu reverter.
 */
test('clicar num mandato FILTRA o período dele e clicar de novo volta ao intervalo completo', async ({
  page,
}) => {
  await abrirApp(page);
  await carregarExemplo(page); // §9.1 — os blocos 4/5/6 só existem com série

  const trilho = page.locator('[data-bloco="trilho"]');
  const filtros = page.locator('[data-bloco="filtros"]');
  const lulaI = trilho.getByRole('button', { name: 'Lula I · PT' });

  // ⚠ NÃO se afirma o `aria-pressed` do "Tudo" aqui: com o exemplo no intervalo completo o botão
  // deveria acender, e num viewport ESTREITO ele fica apagado por um defeito PRÉ-EXISTENTE (o
  // `fitContent` arredonda o `barSpacing` e a borda esquerda ecoa em 1996-02 contra o dado de
  // 1995-12 → `tudoAtivo` falso; medido com e sem esta mudança, 2026-10-19). Está registrado em
  // AGENTS.md/Aberto. Aqui se afirma o CONTRATO: a janela.

  await lulaI.click();
  await expect(lulaI).toHaveAttribute('aria-pressed', 'true');

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
  for (const nome of ['Janela de 1 ano', 'Janela de 5 anos', 'Janela de 10 anos', 'Janela de 30 anos']) {
    await expect(filtros.getByRole('button', { name: nome })).toHaveAttribute('aria-pressed', 'false');
  }

  await page.screenshot({ path: 'e2e/.artefatos/trilho-filtra-lula-i.png', fullPage: true });

  // clicar de novo LIMPA e volta ao intervalo completo
  await lulaI.click();
  await expect(lulaI).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => anoDe((await janela(page)).from), { timeout: 20000 }).toBeLessThan(2000);
  const recuado = await janela(page);
  expect((Date.parse(recuado.to) - Date.parse(recuado.from)) / 86400000).toBeGreaterThan(365 * 20);
});

test('o mandato EM CURSO filtra até a última data disponível (a janela tem ponta direita)', async ({
  page,
}) => {
  await abrirApp(page);
  await carregarExemplo(page);

  const trilho = page.locator('[data-bloco="trilho"]');
  await trilho.getByRole('button', { name: 'Lula III · PT' }).click();

  // ⚠ Sem a última data o `to` sairia NULO e o adapter manteria a borda direita ATUAL — o filtro
  // ficaria amarrado à janela anterior. A guarda é a ponta direita ser recente e não nula.
  await expect.poll(async () => (await janela(page)).to, { timeout: 20000 }).not.toBeNull();
  const j = await janela(page);
  expect(anoDe(j.from)).toBe(2023);
  expect(anoDe(j.to)).toBeGreaterThanOrEqual(2025);
});

test('escolher um preset DESMARCA o mandato (um dono da janela por vez)', async ({ page }) => {
  await abrirApp(page);
  await carregarExemplo(page);

  const trilho = page.locator('[data-bloco="trilho"]');
  const lulaII = trilho.getByRole('button', { name: 'Lula II · PT' });
  await lulaII.click();
  await expect(lulaII).toHaveAttribute('aria-pressed', 'true');

  const dezAnos = page.locator('[data-bloco="filtros"]').getByRole('button', { name: 'Janela de 10 anos' });
  await dezAnos.click();

  // o preset assume a janela e o realce do mandato sai — senão a tela diria duas coisas
  await expect(dezAnos).toHaveAttribute('aria-pressed', 'true');
  await expect(lulaII).toHaveAttribute('aria-pressed', 'false');
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
  await abrirApp(page);
  await carregarExemplo(page);

  // leva a janela para o PASSADO pelo caminho do produto (é o estado em que a inversão nasce)
  const lulaI = page.locator('[data-bloco="trilho"]').getByRole('button', { name: 'Lula I · PT' });
  await lulaI.click();
  await expect(lulaI).toHaveAttribute('aria-pressed', 'true');
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
  await expect.poll(async () => anoDe((await janela(page)).from), { timeout: 20000 }).toBeLessThan(2000);
});

/**
 * O PAINEL DE COMPARAÇÃO (§4, posição 6) — sempre visível, largura total. A matriz aparece quando
 * há série, com os estados de célula EM TEXTO (§9.4): nada de símbolo — "—" faria concluir que
 * falta dado que existe.
 */
test('a matriz aparece com série e traz os estados de célula por texto', async ({ page }) => {
  await abrirApp(page);

  // §9.1 — sem série o painel não existe (divulgação progressiva): não fica mudo porque não está lá.
  await expect(page.locator('[data-bloco="comparacao"]')).toHaveCount(0);

  await carregarExemplo(page);

  const painel = page.locator('[data-bloco="comparacao"]');

  // cabeçalho: a coluna do indicador + uma por mandato (9)
  const tabela = painel.getByRole('table');
  await expect(tabela).toBeVisible();
  await expect(painel.getByRole('columnheader')).toHaveCount(10);
  await expect(painel.getByRole('columnheader', { name: 'FHC I · PSDB' })).toBeVisible();
  await expect(painel.getByRole('columnheader', { name: 'Lula III · PT' })).toBeVisible();

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

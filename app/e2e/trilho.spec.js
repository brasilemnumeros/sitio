import { test, expect, abrirApp, carregarExemplo } from './apoio.js';

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

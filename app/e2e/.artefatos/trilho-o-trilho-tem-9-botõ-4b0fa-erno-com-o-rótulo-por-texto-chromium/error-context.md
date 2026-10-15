# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: trilho.spec.js >> o trilho tem 9 botões, um por governo, com o rótulo por texto
- Location: e2e/trilho.spec.js:24:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-bloco="trilho"]').getByRole('button').first()
Expected: "FHC I · PSDB"
Received: "FHC I x PSDB"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" locator('[data-bloco="trilho"]').getByRole('button').first() with timeout 5000ms
  - waiting for locator('[data-bloco="trilho"]').getByRole('button').first()
    14 × locator resolved to <button type="button" aria-pressed="false" class="w-full rounded border px-2 py-1 text-xs leading-tight font-medium transition-colors border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 svelte-1bryzn0">…</button>
       - unexpected value "FHC I x PSDB"

```

```yaml
- button "FHC I x PSDB"
```

# Test source

```ts
  1   | import { test, expect, abrirApp, carregarExemplo } from './apoio.js';
  2   | 
  3   | /**
  4   |  * O TRILHO DE MANDATOS (§3, posição 5). É um SELETOR de largura igual, desacoplado do eixo do
  5   |  * tempo — e a identificação é por TEXTO (`Lula III · PT`), nunca por cor de partido (§7.3.4).
  6   |  *
  7   |  * O DESTAQUE em si é desenhado no CANVAS (`adapter.destacarMandato` → primitiva de faixas): não se
  8   |  * afirma por pixel. Afirma-se o que é DOM — o `aria-pressed` que o clique liga — e captura-se a tela
  9   |  * para o canvas. O rótulo, sim, é DOM e é afirmado LITERALMENTE (o teste tem de morder se um
  10  |  * rótulo mudar).
  11  |  */
  12  | const ROTULOS = [
  13  |   'FHC I · PSDB',
  14  |   'FHC II · PSDB',
  15  |   'Lula I · PT',
  16  |   'Lula II · PT',
  17  |   'Dilma I · PT',
  18  |   'Dilma II · PT',
  19  |   'Temer · MDB',
  20  |   'Bolsonaro · PL',
  21  |   'Lula III · PT',
  22  | ];
  23  | 
  24  | test('o trilho tem 9 botões, um por governo, com o rótulo por texto', async ({ page }) => {
  25  |   await abrirApp(page);
  26  | 
  27  |   const trilho = page.locator('[data-bloco="trilho"]');
  28  |   const caixas = trilho.getByRole('button');
  29  |   await expect(caixas).toHaveCount(9);
  30  | 
  31  |   // rótulos LITERAIS e na ordem cronológica (§7.3.6)
  32  |   for (let i = 0; i < ROTULOS.length; i++) {
> 33  |     await expect(caixas.nth(i)).toHaveText(ROTULOS[i]);
      |                                 ^ Error: expect(locator).toHaveText(expected) failed
  34  |   }
  35  | 
  36  |   // nenhum aceso no início (o store começa com `selecionado: null`)
  37  |   await expect(caixas.first()).toHaveAttribute('aria-pressed', 'false');
  38  |   await page.screenshot({ path: 'e2e/.artefatos/trilho-sem-selecao.png', fullPage: true });
  39  | });
  40  | 
  41  | test('clicar num mandato destaca (aria-pressed) e clicar de novo limpa', async ({ page }) => {
  42  |   await abrirApp(page);
  43  |   await carregarExemplo(page); // com série, o destaque também desenha a faixa no canvas
  44  | 
  45  |   const trilho = page.locator('[data-bloco="trilho"]');
  46  |   const lulaTerceiro = trilho.getByRole('button', { name: 'Lula III · PT' });
  47  | 
  48  |   await lulaTerceiro.click();
  49  |   await expect(lulaTerceiro).toHaveAttribute('aria-pressed', 'true');
  50  |   // os demais seguem apagados — a seleção é única
  51  |   await expect(trilho.getByRole('button', { name: 'FHC I · PSDB' })).toHaveAttribute(
  52  |     'aria-pressed',
  53  |     'false',
  54  |   );
  55  | 
  56  |   // a captura registra a FAIXA desenhada no canvas (o canvas não se afirma por pixel)
  57  |   await page.screenshot({ path: 'e2e/.artefatos/trilho-lula-iii-destacado.png', fullPage: true });
  58  | 
  59  |   // §3 — um clique, um efeito: clicar de novo LIMPA (não dá zoom)
  60  |   await lulaTerceiro.click();
  61  |   await expect(lulaTerceiro).toHaveAttribute('aria-pressed', 'false');
  62  | });
  63  | 
  64  | /**
  65  |  * O PAINEL DE COMPARAÇÃO (§4, posição 6) — sempre visível, largura total. A matriz aparece quando
  66  |  * há série, com os estados de célula EM TEXTO (§9.4): nada de símbolo — "—" faria concluir que
  67  |  * falta dado que existe.
  68  |  */
  69  | test('a matriz aparece com série e traz os estados de célula por texto', async ({ page }) => {
  70  |   await abrirApp(page);
  71  | 
  72  |   // sem série: o painel diz por quê (§9), não fica mudo
  73  |   const painel = page.locator('[data-bloco="comparacao"]');
  74  |   await expect(painel).toContainText(/Adicione um indicador/);
  75  | 
  76  |   await carregarExemplo(page);
  77  | 
  78  |   // cabeçalho: a coluna do indicador + uma por mandato (9)
  79  |   const tabela = painel.getByRole('table');
  80  |   await expect(tabela).toBeVisible();
  81  |   await expect(painel.getByRole('columnheader')).toHaveCount(10);
  82  |   await expect(painel.getByRole('columnheader', { name: 'FHC I · PSDB' })).toBeVisible();
  83  |   await expect(painel.getByRole('columnheader', { name: 'Lula III · PT' })).toBeVisible();
  84  | 
  85  |   // duas linhas de dados (Selic e IPCA)
  86  |   await expect(tabela.locator('tbody tr')).toHaveCount(2);
  87  | 
  88  |   // ao menos uma célula SEM cobertura diz POR QUÊ, com a data real (a Selic começa em 1999-03,
  89  |   // depois do FHC I) — texto, não símbolo
  90  |   const semCobertura = painel.locator('[data-estado="sem-cobertura"]');
  91  |   expect(await semCobertura.count()).toBeGreaterThan(0);
  92  |   await expect(semCobertura.first()).toContainText(/série começa em \d{4}-\d{2}/);
  93  | 
  94  |   // ao menos uma célula PARCIAL — o mandato em curso (fim null) nunca é "completo" (§7.3.5), e o
  95  |   // período real usado é verboso de propósito
  96  |   const parciais = painel.locator('[data-estado="parcial"]');
  97  |   expect(await parciais.count()).toBeGreaterThan(0);
  98  |   await expect(parciais.first()).toContainText(/parcial \d{2}\/\d{4}–\d{2}\/\d{4}/);
  99  | 
  100 |   await page.screenshot({ path: 'e2e/.artefatos/comparacao-matriz.png', fullPage: true });
  101 | });
  102 | 
```
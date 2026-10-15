# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: trilho.spec.js >> clicar num mandato destaca (aria-pressed) e clicar de novo limpa
- Location: e2e/trilho.spec.js:41:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-bloco="trilho"]').getByRole('button', { name: 'Lula III · PT' })

```

# Page snapshot

```yaml
- main [ref=e3]:
  - button "Buscar indicador…" [ref=e4]
  - list "Séries selecionadas" [ref=e6]:
    - listitem [ref=e7]:
      - textbox "Cor da série Taxa Selic Meta (%)" [ref=e8] [cursor=pointer]: "#6351ca"
      - generic [ref=e9]: Taxa Selic Meta (%)
      - button "Remover Taxa Selic Meta (%)" [ref=e10]: ×
    - listitem [ref=e11]:
      - textbox "Cor da série IPCA (%)" [ref=e12] [cursor=pointer]: "#00fddc"
      - generic [ref=e13]: IPCA (%)
      - button "Remover IPCA (%)" [ref=e14]: ×
  - table [ref=e17] [cursor=pointer]:
    - row [ref=e18]:
      - cell [ref=e19]
      - cell [ref=e23]:
        - link "Charting by TradingView" [ref=e27]:
          - /url: https://www.tradingview.com/?utm_medium=lwc-link&utm_campaign=lwc-chart&utm_source=localhost/
      - cell [ref=e32]
    - row [ref=e36]:
      - cell [ref=e37]
      - cell [ref=e40]
      - cell [ref=e44]
  - table [ref=e49]:
    - row [ref=e50]:
      - cell
      - cell [ref=e51]:
        - link "Charting by TradingView" [ref=e55] [cursor=pointer]:
          - /url: https://www.tradingview.com/?utm_medium=lwc-link&utm_campaign=lwc-chart&utm_source=localhost/
      - cell
  - list [ref=e60]:
    - listitem [ref=e61]:
      - generic [ref=e62] [cursor=pointer]:
        - textbox "Cor da série Taxa Selic Meta (%)" [ref=e63]: "#6351ca"
        - generic [ref=e64]: Taxa Selic Meta (%)
      - button "esq." [ref=e65]
      - button "Remover Taxa Selic Meta (%) do gráfico" [ref=e66]: ✕
    - listitem [ref=e67]:
      - generic [ref=e68] [cursor=pointer]:
        - textbox "Cor da série IPCA (%)" [ref=e69]: "#00fddc"
        - generic [ref=e70]: IPCA (%)
      - button "esq." [ref=e71]
      - button "Remover IPCA (%) do gráfico" [ref=e72]: ✕
  - generic [ref=e73]:
    - generic [ref=e74]: Janela de tempo
    - group "Janela de tempo do gráfico" [ref=e75]:
      - button "Janela de 1 ano" [ref=e76]: 1a
      - button "Janela de 5 anos" [ref=e77]: 5a
      - button "Janela de 10 anos" [ref=e78]: 10a
      - button "Janela de 30 anos" [pressed] [ref=e79]: 30a
      - button "Janela completa" [ref=e80]: Tudo
  - generic [ref=e81]:
    - generic [ref=e82]: Mandato
    - list "Selecionar mandato" [ref=e83]:
      - listitem [ref=e84]:
        - button "FHC I x PSDB" [ref=e85]
      - listitem [ref=e87]:
        - button "FHC II x PSDB" [ref=e88]
      - listitem [ref=e90]:
        - button "Lula I x PT" [ref=e91]
      - listitem [ref=e93]:
        - button "Lula II x PT" [ref=e94]
      - listitem [ref=e96]:
        - button "Dilma I x PT" [ref=e97]
      - listitem [ref=e99]:
        - button "Dilma II x PT" [ref=e100]
      - listitem [ref=e102]:
        - button "Temer x MDB" [ref=e103]
      - listitem [ref=e105]:
        - button "Bolsonaro x PL" [ref=e106]
      - listitem [ref=e108]:
        - button "Lula III x PT" [ref=e109]
  - region "Comparação por mandato" [ref=e111]:
    - heading "Comparação por mandato" [level=2] [ref=e112]
    - table [ref=e114]:
      - rowgroup [ref=e115]:
        - row [ref=e116]:
          - columnheader "Indicador" [ref=e117]
          - columnheader "FHC I · PSDB" [ref=e118]
          - columnheader "FHC II · PSDB" [ref=e120]
          - columnheader "Lula I · PT" [ref=e122]
          - columnheader "Lula II · PT" [ref=e124]
          - columnheader "Dilma I · PT" [ref=e126]
          - columnheader "Dilma II · PT" [ref=e128]
          - columnheader "Temer · MDB" [ref=e130]
          - columnheader "Bolsonaro · PL" [ref=e132]
          - columnheader "Lula III · PT" [ref=e134]
      - rowgroup [ref=e136]:
        - row [ref=e137]:
          - rowheader "Taxa Selic Meta (%)" [ref=e138]
          - cell "série começa em 1999-03" [ref=e142]
          - cell [ref=e143]:
            - text: "-20,96%"
            - emphasis [ref=e144]: parcial 03/1999–12/2002
          - cell "-11,90%" [ref=e145]
          - cell "-2,44%" [ref=e146]
          - cell "0,76%" [ref=e147]
          - cell "2,34%" [ref=e148]
          - cell "-7,75%" [ref=e149]
          - cell "7,25%" [ref=e150]
          - cell [ref=e151]:
            - text: 1,25%
            - emphasis [ref=e152]: parcial 01/2023–10/2025
        - row [ref=e153]:
          - rowheader "IPCA (%)" [ref=e154]
          - cell [ref=e158]:
            - text: "-18,76%"
            - emphasis [ref=e159]: parcial 12/1995–12/1998
          - cell "10,26%" [ref=e160]
          - cell "-10,53%" [ref=e161]
          - cell "2,81%" [ref=e162]
          - cell "0,39%" [ref=e163]
          - cell "1,71%" [ref=e164]
          - cell [ref=e165]:
            - text: "-4,82%"
            - emphasis [ref=e166]: parcial 06/2016–12/2018
          - cell "1,94%" [ref=e167]
          - cell [ref=e168]:
            - text: "-0,42%"
            - emphasis [ref=e169]: parcial 01/2023–06/2025
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
  33  |     await expect(caixas.nth(i)).toHaveText(ROTULOS[i]);
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
> 48  |   await lulaTerceiro.click();
      |                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
# Tarefa 3 (fatia 05) — `stores/mandate.js`, `stores/axes.js`, `stores/viewport.js`

**Status: CONCLUÍDA.** Commit `3c72dfe` — `feat(stores): mandato, eixos e janela visivel`,
branch `feat/camada-de-graficos`. `npm test` → **13 arquivos verdes, 103 testes**.

## O que foi entregue

Transcritos do brief, verbatim:

- `app/src/stores/mandate.js` — `mandateStore`, `carregarMandatos`, `selecionarMandato`,
  `limparSelecao`, `mandatoSelecionado`. `writable` interno + `{ subscribe }` público,
  ações nomeadas apenas. **Não importa `series.js`** (R27); o Δ por mandato continua sendo
  `deltaNoMandato(series, mandato)`, composto por quem lê os dois store.
- `app/src/stores/axes.js` — `axesStore`, `recalcularEixos`, `moverParaEixo`. Só dois eixos
  (`left`/`right`); um terceiro valor é ignorado em silêncio.
- `app/src/stores/viewport.js` — `viewportStore`, `definirJanela` (única escrita, é o
  callback do adapter — §8.1), `resetarJanela`. Campos ausentes viram `null`.

Mais os três testes: `mandate.test.js`, `axes.test.js`, `viewport.test.js`.

## Evidência RED → GREEN

Baseline antes de começar: **10 arquivos, 92 testes** verdes.

1. **RED (módulos ausentes)** — testes escritos, stores ainda não existiam:
   `Test Files 3 failed | 10 passed (13)` — `Cannot find module './mandate.js'` etc.

2. **RED nº 2 — no lugar ERRADO (investigado, não "ajustado no escuro").** Com os stores
   prontos, `mandate` (4) e `viewport` (3) ficaram verdes, mas `axes.test.js` quebrou os
   três casos com um **`TypeError` dentro de `seriesSpan`** (`scales.js:14`,
   `Cannot read properties of undefined (reading 'map')`) — **não** uma falha de asserção.
   O caminho sob teste nunca chegou a ser exercido: as fixtures do brief declaram a série
   com o campo `pontos`, mas a forma **canônica** da série (fatia 02) usa `data`
   (`validate.js` §Series; `scales.js`/`mandates.js` leem `series.data`).

3. **Correção das fixtures** (só o fixture; as três stores saíram exatamente como o brief):

   | no brief | corrigido | porquê |
   |---|---|---|
   | campo `pontos` | `data` | forma canônica da série (fatia 02) — `pontos` não existe no domínio |
   | 1 ponto por série | 2 pontos | `seriesSpan` é max−min; **1 ponto ⇒ span 0**, e uma série de span 0 nunca dispara aviso — o teste 2 não teria como ir para a direita |

   O intent do brief foi preservado: `grande` com span **1e11** × `pequeno` com span **1**
   → razão 1e11 > `AMPLITUDE_LIMIT_ILEGIVEL` → veredito `ilegivel` (o assert aceita
   `['avisa','ilegivel']`), `contra === grande`, `id === 'p'`.

   > Isso é o cenário que o próprio brief avisa: *"um RED na primeira asserção pode
   > significar que o caminho sob teste nunca foi exercido"*. Aqui o RED nem era asserção
   > — era crash no domínio, prova de que a fixture estava fora do contrato.

4. **Bônus forçado pelo ambiente:** os três arquivos de teste do brief usam `it`/`expect`
   **globais**, mas o `vite.config.js` **não** liga `test.globals`, e os 10 testes
   existentes importam `{ it, expect }` de `'vitest'` explicitamente. Adicionei essa linha
   — é a convenção do repo, não invenção. Sem ela o RED é `ReferenceError: it is not defined`.

5. **GREEN:** `NODE_ENV=development npm test` → **Test Files 13 passed (13) / Tests 103 passed (103)**.

## Verificação de propósito (sabotagem no ponto exato)

Cada store foi sabotado no ponto que o teste deve pegar — todos falharam **na asserção certa**:

| sabotagem | teste que pegou | asserção |
|---|---|---|
| `axes`: guard de `EIXOS` removido | "só existem dois eixos" | `expected 'meio' to be 'left'` |
| `axes`: `recalcularEixos` joga tudo na esquerda | "a série incompatível vai para a direita" | `expected 'left' to be 'right'` |
| `mandate`: não ordena | "carrega ordenado (em curso por último)" | `expected ['lula-3','bolsonaro','lula-1'] to deeply equal ['lula-1','bolsonaro','lula-3']` |
| `mandate`: não engole a falha | "governos fora do ar NÃO derrubam o app" | teste cai (throw) |
| `viewport`: `to` ausente vira `undefined` | "campos ausentes viram null" | `expected {to: undefined} to deeply equal {to: null}` |

## Critérios de aceite (fatia 05) tocados por esta tarefa

- `grep -rn "window\." app/src/stores/` → **vazio**.
- `.set(`/`.update(` fora de `stores/` (`grep … src/stores/` excluído) → **vazio**.
- `mandate.js` não importa `series.js` (R27) → **confirmado**.
- Nenhum store importa `lightweight-charts` → **confirmado**.
- `viewport` só escrito por `definirJanela` (§8.1) → **confirmado**.

## Desvio declarado

Único desvio do brief: **as fixtures de `axes.test.js` e a linha de import do `vitest`**
(os três arquivos). As stores saíram byte a byte do brief. Justificativa acima — sem a
correção o `axes.test.js` é impossível de ficar verde (crash no domínio, não asserção).
Nada mais foi tocado: `sitio/docs/`, `sitio/assets/`, `_layouts/` e dependências intactos.

## Rodada de correção 1/5

Tarefa aprovada com **0 Critical / 0 Important** e três achados **Minor**, todos dobrados.
Nenhuma lógica de store foi alterada — os três são de import, comentário e teste.

### Achado 1 — `axes.js`: import ocioso

`import { writable, get } from 'svelte/store'` importava `get`, que o módulo nunca usa
(só há `store.set`/`store.update`). Corrigido para `import { writable } from 'svelte/store'`.

### Achado 2 — `viewport.js`: comentário que mentia

O comentário dizia que `definirJanela` era *"A ÚNICA escrita deste store"* — falso, porque
`resetarJanela` é uma segunda escrita. O comportamento está certo (as duas são ações
nomeadas, nenhuma alcançável de fora de `stores/`); era o **comentário** que exagerava.
Redação corrigida para *"A única escrita que o ADAPTER chama (§8.1) … (`resetarJanela` é a
outra escrita …)"*.

### Achado 3 — `mandate.test.js`: teste do R27 provava por proxy

O teste antigo conferia que `celulaDe` não existe e que `seriesStore` não é exportado —
mas um módulo poderia **importar** `series.js` sem exportar nada disso e ainda passar. O
R27 proíbe o **import**, então o teste novo lê o **fonte** de `mandate.js` com `readFileSync`
e assere que não há `from '...stores/'` nem `series.js`. Teste-proxy substituído.

### Prova de que o teste novo MORDE (sabotagem no ponto exato)

Como o R27 proíbe o *import*, a sabotagem foi acrescentar exatamente isso a `mandate.js`:
`import './series.js';`, e rodar só o arquivo de teste.

**Sabotado — falha na linha 47 (a asserção certa, a do `series.js`):**

```
❯ src/stores/mandate.test.js:47:21
     45|   const fonte = readFileSync(new URL('./mandate.js', import.meta.url),…
     46|   expect(fonte).not.toMatch(/from\s+['"][^'"]*stores\//);   // nenhum …
     47|   expect(fonte).not.toMatch(/\bseries\.js\b/);              // nem por…
       |                     ^
     48| });
     Test Files  1 failed (1)
          Tests  1 failed | 3 passed (4)
```

O RED caiu na linha **47** — a segunda asserção, a que trava o `series.js` —, não na
primeira. O caminho sob teste foi exercido: o teste viu o import proibido. Um RED na
primeira asserção (linha 46) significaria caminho não exercido.

**Revertido (import removido) — verde:**

```
     Test Files  1 passed (1)
          Tests  4 passed (4)
```

### Suíte completa após a rodada

`cd sitio/app && NODE_ENV=development npm test` → **13 arquivos verdes, 103 testes**.
Nenhum teste foi perdido nem acrescentado: o proxy saiu, o teste real entrou (4 em
`mandate.test.js`, os mesmos de antes). `grep` de aceite segue limpo; só
`app/src/stores/mandate.test.js`, `app/src/stores/axes.js` e `app/src/stores/viewport.js`
foram tocados.

## Rodada de correção 2/5

O teste do R27 na rodada 1 usava **regex sobre o texto inteiro** (`from\s+['"][^'"]*stores\/` e
`\bseries\.js\b`). A re-revisão mostrou que **as duas escapam** de três formas que o Vite resolve
normalmente — o teste passava com a evasão no lugar. Corrigido apenas `mandate.test.js`; a
implementação e os demais arquivos não foram tocados.

### O que mudou

Em vez de casar padrões no texto, o teste **extrai os especificadores de import**
(`from '…'`, `import '…'`, `require('…')`) e assere que nenhum menciona `series`, com
`/series/i` — pega com ou sem extensão e sem se importar com a caixa. Mantida a asserção
`expect(especificadores.length).toBeGreaterThan(0)`: um extrator que não acha nada faria o
teste passar **vazio**, que é exatamente o defeito que este teste existe para evitar.

```js
const especificadores = [
  ...fonte.matchAll(/(?:from|require\s*\(|^[ \t]*import)\s*\(?\s*['"]([^'"]+)['"]/gm),
].map((m) => m[1]);
expect(especificadores.length).toBeGreaterThan(0);
expect(especificadores.filter((e) => /series/i.test(e))).toEqual([]);
```

As cinco formas de evasão (as três que o regex antigo deixava passar, mais extensão explícita e
caixa), conferidas contra o extrator:

```
PEGA  ["./series"]           <- import { seriesStore } from './series';   (sem extensão)
PEGA  ["../stores/series"]   <- import '../stores/series';               (efeito colateral)
PEGA  ["./series"]           <- const x = require('./series');           (CommonJS)
PEGA  ["../stores/series.js"]<- import { seriesStore } from '../stores/series.js';
PEGA  ["../stores/SERIES"]   <- import { seriesStore } from '../stores/SERIES';  (caixa)
```

O regex antigo não pegava **nenhuma** das três primeiras: `./series` não contém `stores/` nem
`series.js`.

### Prova de que o teste novo MORDE (sabotagem no ponto exato)

Sabotagem: acrescentado a `mandate.js` um `import { seriesStore } from './series';`
(**sem extensão** — a forma que o teste antigo deixava passar), rodando só o arquivo.

**Sabotado — falha na linha 58 (a asserção dos especificadores), não na primeira:**

```
 ❯ src/stores/mandate.test.js (4 tests | 1 failed) 17ms
   × R27 — não importa series.js, verificado NO FONTE e não por proxy

 FAIL  src/stores/mandate.test.js > R27 — não importa series.js, verificado NO FONTE e não por proxy
AssertionError: expected [ './series' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "./series",
+ ]

 ❯ src/stores/mandate.test.js:58:60
     57|   expect(especificadores.length).toBeGreaterThan(0);
     58|   expect(especificadores.filter((e) => /series/i.test(e))).toEqual([]);
       |                                                            ^

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

O Red caiu exatamente na asserção dos especificadores (linha 58) — o extrator **viu** o import
proibido. `especificadores.length` (linha 57) passou: o extrator achou o import; foi o filtro de
`/series/i` que o pegou.

**Revertido (import removido) — verde:**

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

### Suíte completa após a rodada

`cd sitio/app && NODE_ENV=development npm test` → **13 arquivos verdes, 103 testes**.
Só `app/src/stores/mandate.test.js` foi tocado nesta rodada.

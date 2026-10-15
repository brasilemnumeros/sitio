# Fatia 05 — Tarefa 2: `stores/series.js`

**Arquivos:** `sitio/app/src/stores/series.js`, `sitio/app/src/stores/series.test.js`
**Consome:** `loadSeries` de `src/data/series.js` (fatia 01), `PALETA_PADRAO` de `src/domain/color.js`.
**Produz:** `LIMITE_SERIES=10`, `seriesStore`, `adicionarSerie`, `removerSerie`,
`tentarNovamente`, `atingiuLimite`, `motivoDoLimite`, `corDe`, `definirCor`, `restaurarCor`,
`limparSeries`.

## TDD — evidência RED → GREEN

Código transcrito literalmente do brief (`task-2-brief.md`).
Comando: `cd sitio/app && NODE_ENV=development npx vitest run src/stores/series.test.js`.

### RED — Passo 2 (antes da implementação)

```
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/stores/series.test.js [ src/stores/series.test.js ]
Error: Cannot find module './series.js' imported from
/Users/lucas/Workspace/brasilemnumeros/sitio/app/src/stores/series.test.js
 ❯ src/stores/series.test.js:3:1

 Test Files  1 failed (1)
      Tests  no tests
```

### GREEN — Passo 4 (após a implementação)

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  568ms
```

### Suíte completa — `NODE_ENV=development npm test`

```
 Test Files  10 passed (10)
      Tests  90 passed (90)
   Duration  1.11s
```

## Nota de execução — correção necessária num teste do brief

O teste do brief usava `vi.fn(...)` (no caso R26) **sem importar `vi`**, e o
`vite.config.js` deste app **não** liga `globals: true` (`test: { environment: 'node',
include: ['src/**/*.test.js'] }`). Transcrito ao pé da letra, o arquivo quebraria com
`vi is not defined`. Correção mínima e alinhada à convenção dos outros testes do repo
(`src/data/*.test.js` importam `vi` explicitamente): acrescentei `vi` à lista de imports
de `vitest`. **Nenhuma outra alteração** foi feita no conteúdo do teste — em particular o
espião `vi.fn(okSerie('b'))` e a asserção `toHaveBeenCalledWith('https://x/b.json')` (R26)
seguem exatamente como no brief.

Não foi preciso mexer no `vite.config.js` (evita ligar globals para toda a suíte).

## R26 — a URL é guardada, não adivinhada

Confirmado pelo teste: o item guarda `url: entry.datafile` ao adicionar, e
`tentarNovamente` reusa `item.url` (o `fetchImpl` recebe `https://x/b.json`). Nada é
reconstruído a partir do id.

## Notas de domínio

- Domínio puro: só importa `svelte/store`, `../data/series.js` e `../domain/color.js`;
  sem `window`/`document`.
- Toda escrita passa por `escrever` (update interno) ou pelas ações nomeadas; nenhum
  módulo de fora de `stores/` chama `.set(`/`.update(`.
- `LIMITE_SERIES = 10` vem da PALETA (10 cores sem ciclo); no limite, `adicionarSerie`
  não adiciona nem remove nada.

## Commit

`feat(stores): selecao de series, carga por serie e o limite de 10 pela paleta`

---

## Rodada de correção 1/5 — R28 (unidade vinda da série nos dois caminhos)

**Achado (Important):** `adicionarSerie` gravava `unit: series.unit` no sucesso, mas
`tentarNovamente` gravava só `status/series/error` — **sem `unit`**. Efeito: a **mesma**
série ficava com unidade diferente conforme tivesse chegado pelo add ou por uma
retentativa. Depois da retentativa o item ficava com a unidade transitória do catálogo,
contra o §6. Classe do defeito: *dois caminhos para o mesmo estado, e só um faz a coisa
toda*.

**Correção:** `tentarNovamente` passa a gravar `unit: series.unit` no caminho de sucesso —
idêntico a `adicionarSerie`. `adicionarSerie`, o limite e a paleta **não** foram tocados.

### Dois testes novos (transcritos do brief 2)

1. `a retentativa também pega a unidade da SÉRIE, não a do catálogo (§6, R28)` — usa
   **unidades de propósito diferentes** (catálogo `number`/``/0 × série `percentage`/`%`/2):
   com `entrada()`/`okSerie()` (mesma unidade) o teste passaria sem provar nada.
2. `o override de cor sobrevive à remoção de outra série — a chave é o id (§1)` —
   `definirCor('b', …)` → `removerSerie('a')` → `corDe('b')` continua o override (a cor não
   é por posição).

### RED → GREEN — teste 1 (R28), com o probe ligado

Com a linha de sucesso de `tentarNovamente` **sem** `unit` (probe `/* RED-PROBE */`),
`tentarNovamente` deixa a unidade do catálogo no item:

```
FAIL  src/stores/series.test.js > seriesStore > a retentativa também pega a unidade da SÉRIE, não a do catálogo (§6, R28)
AssertionError: expected { type: 'number', symbol: '', …(1) } to deeply equal { type: 'percentage', …(2) }
❯ src/stores/series.test.js:57:44
    57|     expect(get(seriesStore).itens[0].unit).toEqual(daSerie);      // agora a da SÉRIE
 Test Files  1 failed | 9 passed (10)
      Tests  1 failed | 91 passed (92)
```

Com o `unit: series.unit` restaurado → **GREEN**:

```
 Test Files  10 passed (10)
      Tests  92 passed (92)
   Duration  1.01s
```

### RED → GREEN — teste 2 (override de cor)

Este teste é **guarda de regressão** de comportamento já correto (`reindexarCores` preserva
os overrides por id): passa desde a primeira execução e **não** exigiu mudança de código.
Ele falharia se a cor voltasse a ser por posição — que é exatamente o que ele trava. Não há
um RED legítimo a capturar para ele; registrado aqui honestamente em vez de inventar um.

### Correção de execução necessária no brief (higiene de teste)

O teste do brief **não** zera o cache de `loadSeries`. Esse cache é um `Map` por URL no
módulo `src/data/series.js` e, como o vitest não roda cada teste num registro de módulos
novo, um sucesso de um teste vaza para o próximo. O teste R26 já cacheava
`https://x/b.json` (sucesso), e o teste R28 usa a **mesma** URL — então o `adicionarSerie`
de R28 batia no cache e tinha sucesso, deixando o item já com a unidade da série **antes**
da retentativa. Resultado: sem o conserto o R28 falhava na **primeira** asserção
(`:51`) e nunca chegava a exercer a retentativa — ou seja, não provava o R28. Correção
mínima: `import { clearSeriesCache } from '../data/series.js'` e `beforeEach(() =>
{ limparSeries(); clearSeriesCache(); })`. Nada mais do arquivo foi alterado.
Com isso o R28 passa a falhar onde deve (`:57`, a retentativa) e o RED é genuíno.

### Verificação final

```
cd sitio/app && NODE_ENV=development npm test
 Test Files  10 passed (10)
      Tests  92 passed (92)
   Duration  1.01s
```

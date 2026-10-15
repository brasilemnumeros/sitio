# Relatório — Fatia 01: Contrato de dados (`data/`)

- **Branch:** `feat/camada-de-graficos`
- **Commits:** `22d781d` (T1) · `ea51685` (T2) · `3b6e8a7` (T3)
- **Alvo:** `sitio/app/src/data/`
- **Data:** 2026-10-14

## O que foi entregue

Três módulos da camada `data/`, com testes, na ordem TDD (RED → GREEN) e commits:

| módulo | arquivo | o que faz |
|---|---|---|
| T1 | `src/data/validate.js` (+ `validate.test.js`) | Contrato canônico de série. `SchemaError`, `UNIT_TYPES`, `GRANULARITIES`, `ISO_DATE`, `validateUnit`, `validateSeries`. Recusa `schema !== 1` em voz alta, exige `value` numérico, descarta `rate`, confere `id` contra `expectedId`. |
| T2 | `src/data/series.js` (+ `series.test.js`) | `loadSeries(url, {expectedId, fetchImpl})` com cache por URL; `clearSeriesCache()`. Falha **não** fica no cache — a próxima chamada refaz a rede (§9.3). |
| T3 | `src/data/catalog.js` (+ `catalog.test.js`) | `validateCatalog(raw)` / `loadCatalog({url, fetchImpl})`. Normaliza cada indicador para `{id, name, group, datafile, chartType, unit, yAxisTitle}`; valida grupo, `chartType`, `datafile`. |

Todos os dois testes de cada módulo vieram dos briefs, literalmente. Sem `window`, sem DOM, sem Svelte, sem `console.log` — confirmado por `grep` em `src/data/` (nenhuma ocorrência).

## Verificação (saída real, não estimada)

```
$ cd sitio/app && NODE_ENV=development npm test
 Test Files  4 passed (4)
      Tests  23 passed (23)
   Duration  721ms
```

O teste do catálogo real passou:

```
✓ src/data/catalog.test.js > loadCatalog > o catálogo REAL do site valida (sitio/indicators.json)
```

Isto é, `validateCatalog(JSON.parse(readFileSync('sitio/indicators.json')))` aceita **13 indicadores e 7 grupos**, conferido por `toHaveLength` em teste — não por inspeção.

> Nota de ambiente (R11): todo `npm test`/`npx vitest` foi rodado com `NODE_ENV=development`, conforme o briefing. As dependências já estavam instaladas; nada foi reinstalado.

## Critérios de aceite da fatia

- [x] `npm test` verde — 23 testes, 4 arquivos.
- [x] `validateSeries` recusa `schema !== 1` citando a versão recebida e a esperada (`schema 2 não suportado; este app entende o schema 1`).
- [x] `validateSeries` exige `value` numérico e ignora `rate` (normaliza para `{date, value}`).
- [x] `validateSeries` confere `id` contra `expectedId` quando dado.
- [x] `loadSeries`: uma chamada de rede por URL em sucesso; falha não é memorizada (segunda tentativa refaz a rede).
- [x] `validateCatalog` aceita o `sitio/indicators.json` real — 13 indicadores, 7 grupos — verificado por teste.
- [x] `validateCatalog` **não exige** `unit` no indicador; ausente vira `null`.
- [x] Nenhuma dependência de navegador (`environment: 'node'`).
- [x] Nada em `window`; nenhum `console.log` de debug.

## DESVIO — os briefs eram internamente inconsistentes (precisa de revisão)

**O brief de T1 e o de T3 não podem ambos estar corretos como escritos.** O `validateUnit`
do brief (T1, linhas 158–163) exige `symbol` não-vazio e `decimals` inteiro presente. O
brief de T3 (linhas 90–96) exige, por teste, que o `sitio/indicators.json` **real** valide.
Mas o arquivo real não satisfaz o `validateUnit` do brief:

```
indicators[7] caged-total-mensal     unit = {"type":"number","symbol":""}
indicators[8] populacao-total-anual  unit = {"type":"number","symbol":""}
```

Ambos têm `symbol` **vazio** e **sem `decimals`**. Com o código literal do brief, o teste
T3 falha com `SchemaError: indicators[7].unit.symbol ausente ou vazio` — ou seja, o próprio
critério de aceite ("o catálogo REAL valida") é inalcançável.

**Decisão tomada** (mínima, e a que preserva o contrato único): relaxar `validateUnit` para

1. aceitar `symbol` vazio — é o valor **natural** de uma unidade `number` (contagem:
   população, empregos); não é campo ausente nem inválido; e
2. assumir `decimals = 0` quando ausente — correto para contagens; se presente, continua
   obrigado a ser inteiro ≥ 0.

`type` desconhecido, `symbol` não-textual e `decimals` inválido continuam recusados em voz
alta. O `catalog.js` permanece **exatamente** como o brief o escreveu (consome
`validateUnit`), então a divergência é de duas linhas em `validate.js`, não de interface.

**Por que assim, e não o contrário (deixar `validateUnit` estrito e afrouxar só o
catálogo):** manter um validador só, e porque `symbol: ""` é legítimo para `number` mesmo
no contrato canônico — os arquivos de série publicados por `dados/` (fatia 11) para
`caged`/`populacao` também terão `symbol` vazio. O brief simplesmente errou ao exigir
símbolo não-vazio para todas as unidades.

**Alternativa rejeitada:** fazer o catálogo validar a unidade transicional de forma própria
e deixar `validateUnit` intacto. Criaria dois validadores divergentes para o mesmo tipo
(`Unit`) e violaria a interface declarada em T3 ("Consome: `SchemaError`, `validateUnit`").

**Escala do desvio:** 2 linhas em `sitio/app/src/data/validate.js` (commit `3b6e8a7`),
documentadas em comentário no próprio código. Nenhum teste dos briefs foi alterado.

Se o arquiteto preferir manter `validateUnit` estrito, o caminho é o inverso (normalizar a
unidade transicional no `catalog.js`); os testes atuais continuam passando das duas
formas, exceto que aquela exige editar `catalog.js` em vez de `validate.js`.

## Fora desta fatia (de propósito, conforme os briefs)

- Validação das séries **reais** de `dados/` — elas ainda publicam `rate` e não têm
  `schema`/`unit`; migram para `value`/schema 1 na fatia 11. O teste de integração contra
  os 13 arquivos reais é critério de aceite da fatia 11.
- Nenhuma mudança em `sitio/indicators.json` — a remoção de `unit`/`source` é da fatia 11.

## Estado do repo

- Árvore limpa (`git status --short` vazio).
- `fire` não disparado; nada em `window`; custo zero.

---

# Rodada de correção 1/5

**Commit:** `2efd1e8` — `fix(app): validateUnit volta a estrito e o catalogo preserva o registro (R16 emendado)`
**Arquivos tocados:** `app/src/data/validate.js`, `app/src/data/catalog.js`, `app/src/data/catalog.test.js`

## O que mudou

### 1. `validateUnit` voltou a ser **estrito** (reversão da relaxação — R16 emendado)

O desvio da rodada anterior (aceitar `symbol` vazio; `decimals` ausente virar `0`) foi **revertido**.
`validate.js` volta ao código literal do brief T1: `symbol` deve ser texto **não-vazio** e `decimals`
inteiro **≥ 0 obrigatório**.

Motivo (ruling): `validateUnit` é o caminho **canônico** via `validateSeries`; ali um `percentage` sem
símbolo ou sem casas declaradas é defeito de verdade, e relaxar o validador para acomodar dado de
transição enfraquece o contrato que fica.

```js
export function validateUnit(unit, where = 'unit') {
  if (unit === null || typeof unit !== 'object' || Array.isArray(unit)) {
    throw new SchemaError(`${where}: ausente ou não é objeto`);
  }
  if (!UNIT_TYPES.has(unit.type)) {
    throw new SchemaError(`${where}.type "${unit.type}" desconhecido`);
  }
  if (typeof unit.symbol !== 'string' || unit.symbol === '') {
    throw new SchemaError(`${where}.symbol ausente ou vazio`);
  }
  if (!Number.isInteger(unit.decimals) || unit.decimals < 0) {
    throw new SchemaError(`${where}.decimals deve ser inteiro ≥ 0`);
  }
  return { type: unit.type, symbol: unit.symbol, decimals: unit.decimals };
}
```

### 2. `validateCatalog` **não valida mais `unit`** e **preserva o registro** (achado Important)

`catalog.js` deixou de importar/chamar `validateUnit` (§6: unidade não pertence ao `indicators.json`;
o registro real traz unidades de transição malformadas que não podem derrubar a leitura do catálogo).
E, em vez de montar um objeto com whitelist, ele **preserva o registro** (`...ind`, depois sobrescreve
só os campos validados) — é o mesmo conserto que resolve o achado de que `description` e `yAxisMax`
eram descartados em silêncio (`yAxisMax: 100` existe em `sitio/indicators.json:210`,
`proporcao-homicidios-armas-fogo-anual`).

```js
return {
  ...ind,
  id: ind.id,
  name: ind.name,
  group: ind.group,
  datafile: ind.datafile,
  chartType: ind.chartType,
  yAxisTitle: typeof ind.yAxisTitle === 'string' ? ind.yAxisTitle : null,
};
```

### 3. Testes de `catalog.test.js` atualizados ao brief T3 vigente

Adicionados os dois testes que provam a regra nova — `NÃO valida unit` (unidade malformada,
`{ type: 'banana', symbol: 42 }`, não derruba o catálogo) e `PRESERVA os campos de apresentação`
(`description` e `yAxisMax: 100` sobrevivem). Removido o teste antigo `aceita indicador SEM unit`
(esperava `unit: null`, contrato que não vale mais).

> Os testes de `validateUnit` (`validate.test.js`) **não** foram alterados — o brief T1 já traz o
> conjunto estrito. Nenhum arquivo fora de `app/src/data/` foi tocado; `sitio/indicators.json` intocado.

## Verificação

### Suíte completa, verde (pós-correção)

```
$ cd sitio/app && NODE_ENV=development npm test
 Test Files  4 passed (4)
      Tests  24 passed (24)
   Duration  474ms
```

O teste do catálogo real continua verde: `validateCatalog(sitio/indicators.json)` aceita **13
indicadores e 7 grupos** — agora sem validar `unit` e preservando os campos de apresentação.

### Prova de que os testes **não são vazios** (falha sem a implementação)

Para cada módulo, o arquivo de implementação foi **temporariamente movido para fora**
(`mv src/data/<mod>.js /tmp/<mod>.js.bak`), o teste daquele módulo rodado, a saída de falha
capturada, o arquivo **restaurado**, e a suíte reconferida verde. Os três arquivos foram restaurados
antes de passar ao próximo; `git status --short` final mostra **apenas** os três arquivos desta
correção.

**validate.js:**

```
$ mv src/data/validate.js /tmp/validate.js.bak
$ NODE_ENV=development npx vitest run src/data/validate.test.js

 FAIL  src/data/validate.test.js [ src/data/validate.test.js ]
Error: Cannot find module './validate.js' imported from .../app/src/data/validate.test.js
 ❯ src/data/validate.test.js:2:1

 Test Files  1 failed (1)
      Tests  no tests
```

**series.js:**

```
$ mv src/data/series.js /tmp/series.js.bak
$ NODE_ENV=development npx vitest run src/data/series.test.js

 FAIL  src/data/series.test.js [ src/data/series.test.js ]
Error: Cannot find module './series.js' imported from .../app/src/data/series.test.js
 ❯ src/data/series.test.js:2:1

 Test Files  1 failed (1)
      Tests  no tests
```

**catalog.js:**

```
$ mv src/data/catalog.js /tmp/catalog.js.bak
$ NODE_ENV=development npx vitest run src/data/catalog.test.js

 FAIL  src/data/catalog.test.js [ src/data/catalog.test.js ]
Error: Cannot find module './catalog.js' imported from .../app/src/data/catalog.test.js
 ❯ src/data/catalog.test.js:4:1

 Test Files  1 failed (1)
      Tests  no tests
```

Em cada caso, com o arquivo restaurado, a execução volta a verde — está provado que a suíte de cada
módulo **falha sem a implementação** e **passa com ela**, isto é, os testes não são vazios.

## Estado do repo (após a correção)

- Árvore limpa (`git status --short` vazio), cabeça em `2efd1e8` na branch `feat/camada-de-graficos`.
- Nenhum arquivo movido deixado para trás (`/tmp/*.js.bak` removidos pela restauração).
- Nada em `window`; nenhum `console.log`; sem dependências de navegador.

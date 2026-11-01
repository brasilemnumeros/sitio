# Catálogo embutido e sem duplicação — plano

**Goal:** renomear `indicators.json` → `app/src/data/indicadores.json`, importá-lo no bundle e
remover dos registros o que já é dono da série.

**Spec:** `docs/specs/2026-11-01-governos-no-sitio-design.md` (seção "Segunda rodada").

## Global Constraints

- Contrato de URL das **páginas** intacto (ADR 0002). A rota `/indicators.json` deixa de
  existir — ela não está no contrato.
- A série real é a fonte de `unit`/`granularity`; o catálogo não os duplica.
- Falha em voz alta: `arquivo` ausente/malformado, grupo inexistente ou `escala` divergente
  da série reprovam teste/build.
- Mudanças alheias na árvore (tour) não entram em commit.

### Task 1: Catálogo novo, validação e distintivo da busca

**Files:** `app/src/data/indicadores.json` (novo), `app/src/data/catalog.js`,
`app/src/data/catalog.test.js`, `app/src/stores/catalog.js`, `app/src/stores/catalog.test.js`,
`app/src/components/SearchModal.svelte`, `app/src/main.js` (se importar o catálogo).

- `arquivo` relativo (`familia/arquivo.json`), normatizado para `datafile` = `${base}/${arquivo}`.
- `escala` ∈ {percentage, currency, number}; `SearchModal.distintivo` lê `ind.escala`.
- Saem `granularity`, `yAxisTitle`, `yAxisMax`, `unit`.
- `loadCatalog` vira `catalogoEmbutido()`; `carregarCatalogo` síncrona.

### Task 2: Base de dados e limpeza das cópias

**Files:** `app/vite.config.js` (`__BASE_DADOS__` de volta), `package.json` (`DADOS_LOCAL=1` no
`dev`), `app/vite-plugins/dados-locais.js` (sem rota de catálogo e sem opção `catalogo`),
`astro.config.mjs`, `scripts/preparar-publico.sh`, `scripts/testar-publico.sh` (restaura a
guarda da URL do Pages, remove `dist/indicators.json`).

### Task 3: Testes e documentação

- `integracao.test.js`: lê `arquivo`, compara `escala` × `serie.unit.type`, 13 séries.
- `AGENTS.md`/spec: catálogo em `app/src/data/indicadores.json`, importado; nunca `public/`.
- Comentários de e2e que citam `/indicators.json`.

### Task 4: Verificação

`npm run build`, `npm --prefix app test`, `npm --prefix app run test:e2e`,
`npm run test:analytics`.

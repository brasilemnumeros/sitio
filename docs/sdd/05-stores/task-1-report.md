# Fatia 05 — Tarefa 1: `stores/catalog.js`

**Arquivos:** `sitio/app/src/stores/catalog.js`, `sitio/app/src/stores/catalog.test.js`
**Consome:** `loadCatalog` de `src/data/catalog.js` (fatia 01).
**Produz:** `catalogStore`, `carregarCatalogo({url, fetchImpl})`, `buscarIndicadores(termo)`,
`indicadoresDoGrupo(groupId)`.

## TDD — evidência RED → GREEN

Código transcrito literalmente do brief (`task-1-brief.md`). Comando:
`cd sitio/app && NODE_ENV=development npx vitest run src/stores/catalog.test.js`
(ambiente R11: `NODE_ENV=production` na máquina + `omit=dev`, então todo comando npm
precisa de `NODE_ENV=development` na frente).

### RED — Passo 2 (antes da implementação)

```
 ❯ src/stores/catalog.test.js (0 test)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/stores/catalog.test.js [ src/stores/catalog.test.js ]
Error: Cannot find module './catalog.js' imported from
/Users/lucas/Workspace/brasilemnumeros/sitio/app/src/stores/catalog.test.js
 ❯ src/stores/catalog.test.js:3:1

 Test Files  1 failed (1)
      Tests  no tests
```

Falha exatamente como o brief previu: `Failed to resolve import "./catalog.js"`.

### GREEN — Passo 4 (após a implementação)

```
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  460ms
```

Os quatro testes passam: idle inicial, carga→`ready` com 2 indicadores, `HTTP 500`→`status:'error'`,
e busca insensível a caixa/acento (`taxa selic` → 1, `ÍPCA` → `ipca-acum-12m`, `''` → 2).

## Notas

- Transcrição fiel do brief. Único ajuste necessário: nenhum — o teste da tarefa 1 já importa
  tudo o que usa de `vitest`.
- Domínio puro: `catalog.js` importa só `svelte/store` e `../data/catalog.js`; sem `window`/`document`.
- Ação nomeada `carregarCatalogo` é a única via de escrita; o store é privado por convenção
  (o teste o reinicia com `.set(`, dentro de `stores/`).

## Commit

`feat(stores): catalogo de indicadores com status e busca por digitacao`

# Fatia 06 — Tarefa 1: a conversão pura (`chart/points.js`)

**Status: CONCLUÍDA.** Commit `a8a31bca19a2326ee280ccd26cf21b56ef3ce73b`
— `feat(chart): conversao pura para o formato da lib, testada sem DOM`.
Branch `feat/camada-de-graficos`.

## Arquivos

- Criado: `sitio/app/src/chart/points.js` (puro — não importa `svelte`, `fetch`,
  `window` nem `document`; nada de estado em `window`).
- Criado: `sitio/app/src/chart/points.test.js`.

Transcritos literalmente do brief (`task-1-brief.md`, linhas 37–101). Nada inventado.

## Passo 0 — a dependência

`app/package.json` já declara `"lightweight-charts": "^5.2.1"` (confirmado por grep).
Nenhuma instalação foi necessária — só conferência. Esta tarefa **não importa** a
biblioteca de propósito: é a única parte do gráfico testável sem DOM (§10.7).

## Timestamps conferidos por cálculo

Medidos no Node antes de rodar os testes:

```
1078099200  = Date.parse('2004-03-01T00:00:00Z') / 1000
1080777600  = Date.parse('2004-04-01T00:00:00Z') / 1000
```

Batem com os números do brief. Nenhuma divergência; o teste não precisou de ajuste.

## Evidência RED → GREEN

**RED** (antes de implementar, `points.js` inexistente):

```
❯ src/chart/points.test.js (0 test)

 FAIL  src/chart/points.test.js [ src/chart/points.test.js ]
Error: Cannot find module './points.js' imported from .../app/src/chart/points.test.js
 ❯ src/chart/points.test.js:1:1

 Test Files  1 failed | 13 passed (14)
      Tests  103 passed (103)
```

O RED é exatamente o esperado no brief (Passo 2): `Cannot find module './points.js'` —
o caminho sob teste nunca foi exercido, nenhum teste da suíte nova rodou.

**GREEN** (após implementar):

```
 Test Files  14 passed (14)
      Tests  108 passed (108)
```

5 testes novos (4 de `paraPontosDaBiblioteca` + 1 de `paraISO`); o total subiu de 103
para 108.

## Comando

```
cd sitio/app && NODE_ENV=development npm test
```

Linha final: `Tests  108 passed (108)` em `Test Files  14 passed (14)`.

## Commit

Um só commit, com `git add` dos arquivos exatos
(`app/src/chart/points.js app/src/chart/points.test.js`). `package.json` e
`package-lock.json` **não** apareceram como modificados e **não** foram incluídos. Sem
`git add -A`. Nada em `sitio/docs/`, no site Jekyll ou em dependências foi tocado.

## Desvios do brief

Um só, e é uma correção do próprio brief: o Passo 5 sugere incluir `app/package.json`
e `app/package-lock.json` no `git add`. Como a dependência já estava instalada e
commitada pelo controlador, esses arquivos não mudaram — não há o que commitar. O
commit saiu com os dois arquivos de código, como a instrução da tarefa manda.

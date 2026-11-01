# Governos no `sitio` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mover `governos/` do repo `dados` para o `sitio` e embutir o registro federal no bundle do app, eliminando o `fetch` e o acoplamento entre os repos.

**Architecture:** `federal.json` e `index.json` passam para `app/src/data/governos/`. O store `mandate.js` importa o JSON em vez de buscar por HTTP; `carregarMandatos` fica síncrona e aceita o dado por parâmetro (fixtures nos testes). Some `__BASE_DADOS__`, cujo único consumidor era esse fetch. Uma guarda do build prova que o mandato está no bundle e que ninguém voltou a apontar para a URL antiga.

**Tech Stack:** Svelte 5, Vite, Vitest, Playwright, Bash (guardas de build).

**Spec:** `docs/specs/2026-11-01-governos-no-sitio-design.md`

## Global Constraints

- Formato dos mandatos **não muda**: `schema: 1`, `inicio`/`fim` de exercício efetivo, sem sobreposição, `emCurso`/`fim: null` no mandato atual, nenhuma cor de partido.
- Caminho das **séries** não muda: `datafile` do catálogo, middleware `dados-locais.js`, `DADOS_DIR` e checkout do CI continuam iguais.
- Nenhuma URL publicada nova; contrato de URL da ADR 0002 intacto.
- Falha em voz alta: dado ausente ou URL antiga no bundle reprovam o build.
- **Ordem de publicação:** o commit de remoção no repo `dados` só vai ao ar depois do deploy do `sitio`. Push é decisão do usuário.
- Árvore de trabalho do `sitio` tem mudanças alheias em `app/e2e/tour.spec.js`, `app/package.json` e `app/package-lock.json`: **não** incluir esses arquivos em nenhum commit deste plano.
- Servidor de dev do site (porta 4321) pode estar em uso pelo usuário: nunca encerrar; depois de `npm run build`, restaurar o artefato de dev com `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico`.

## Review Focus

- Mandato importado com `fim: null` e `emCurso: true` (Lula III): a janela deve ir até a última data da série, não até "hoje" cego.
- Fronteira Dilma II → Temer (2016-05-11 / 2016-05-12): um dia de sobreposição muda a faixa e a célula do painel.
- Dado importado ausente ou JSON inválido: o build tem de falhar, não gerar app sem faixa.
- Registro com mandato repetido ou fora de ordem: `ordenarMandatos` continua devendo pôr o mandato em curso por último.
- Bundle publicado ainda citando `github.io/dados/governos`: a guarda tem de reprovar.

---

### Task 1: Trazer os JSONs e embutir o registro no store

**Files:**
- Create: `app/src/data/governos/federal.json`
- Create: `app/src/data/governos/index.json`
- Modify: `app/src/stores/mandate.js:1-25`
- Modify: `app/vite.config.js:28-45`
- Modify: `app/src/domain/mandates.medicao.test.js:6-8`
- Test: `app/src/stores/mandate.test.js`, `app/src/stores/filtros.test.js`

**Interfaces:**
- Consumes: `ordenarMandatos(mandatos)` de `app/src/domain/mandates.js`.
- Produces: `carregarMandatos({ dados = federal } = {}): void` (síncrona) em `app/src/stores/mandate.js`.

- [ ] **Step 1: Copiar os arquivos do repo irmão para o `sitio`**

```bash
mkdir -p app/src/data/governos
cp ../dados/governos/federal.json app/src/data/governos/federal.json
cp ../dados/governos/index.json app/src/data/governos/index.json
```

Conferir que o conteúdo é idêntico (`diff` dos dois arquivos contra `../dados/governos/`).

- [ ] **Step 2: Escrever os testes do store com fixture (falham antes da mudança)**

Em `app/src/stores/mandate.test.js`: substituir `okGovernos`/`fetchImpl` por
`carregarMandatos({ dados: GOVERNOS })` (sem `await`) em todos os casos; **remover** o teste
`governos fora do ar NÃO derrubam o app`; acrescentar:

```js
it('o registro REAL embutido tem 9 mandatos, sem sobreposição e sem cor de partido', () => {
  carregarMandatos();
  const { mandatos } = get(mandateStore);
  expect(mandatos).toHaveLength(9);
  for (let i = 1; i < mandatos.length; i++) {
    const anterior = mandatos[i - 1];
    if (anterior.fim === null) continue;
    expect(mandatos[i].inicio > anterior.fim).toBe(true);
  }
  for (const m of mandatos) expect(m).not.toHaveProperty('cor');
});
```

Em `app/src/stores/filtros.test.js`, trocar o bloco `fetchImpl`/`setTimeout` por
`carregarMandatos({ dados: { mandatos: [{ id: 'lula-1', rotulo: 'Lula I', partido: 'PT', inicio: '2003-01-01', fim: '2006-12-31' }] } })` seguido direto de `selecionarMandato('lula-1')`.

Em `app/src/domain/mandates.medicao.test.js`, ler
`new URL('../data/governos/federal.json', import.meta.url)` em vez de `dados/governos/federal.json`.

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd app && npm test -- src/stores/mandate.test.js src/stores/filtros.test.js`
Expected: FAIL — `carregarMandatos` ainda busca por HTTP e ignora `dados`.

- [ ] **Step 4: Implementar o import em `app/src/stores/mandate.js`**

```js
import federal from '../data/governos/federal.json';
```

`carregarMandatos({ dados = federal } = {})` vira síncrona e faz
`store.set({ mandatos: ordenarMandatos(dados.mandatos ?? []), selecionado: null })`; o
`try/catch` e `URL_GOVERNOS` saem. Comentário explica que o dado é versionado no `sitio` e
entra no bundle (falha de build em vez de 404 silencioso).

- [ ] **Step 5: Remover `__BASE_DADOS__` do `app/vite.config.js`**

Apagar o bloco `define` inteiro e atualizar o comentário do topo: em dev o middleware serve
**as séries**; governos não passam mais por URL.

- [ ] **Step 6: Rodar a suíte de unidade inteira**

Run: `cd app && npm test`
Expected: PASS (inclui `mandates.medicao.test.js` lendo o arquivo novo).

- [ ] **Step 7: Commit**

```bash
git add app/src/data/governos app/src/stores/mandate.js app/src/stores/mandate.test.js \
  app/src/stores/filtros.test.js app/src/domain/mandates.medicao.test.js app/vite.config.js
git commit -m "feat(app): governos versionados no sitio e embutidos no bundle"
```

---

### Task 2: ~~Guarda do build, comentários do CI e do E2E~~ (descartada pelo usuário)

O usuário dispensou a guarda nova e a prova de falha. A guarda antiga do
`testar-publico.sh` (`grep 'https://brasilemnumeros.github.io/dados'` no bundle) **deixa de
funcionar**, porque o app não busca mais nada no Pages. Ainda assim ela passa: a string
continua no bundle? Não — verificar na Task 5; se falhar, o mínimo é remover o grep morto.
Comentários de workflow/E2E entram como ajuste de uma linha na Task 3.

---

### Task 3: ADR 0003 e documentação do `sitio`

**Files:**
- Create: `docs/adr/0003-governos-no-sitio.md`
- Modify: `AGENTS.md` (linha 15, tabela de dados do app, seção ADR)
- Modify: `docs/specs/2026-10-14-camada-de-graficos-design.md` §7 (nota datada)
- Modify: `docs/specs/2026-10-18-migracao-astro-design.md` (somente se citar caminho como atual)

**Interfaces:**
- Consumes: decisão aprovada em `docs/specs/2026-11-01-governos-no-sitio-design.md`.
- Produces: nada em código.

- [ ] **Step 1: Escrever a ADR 0003**

Formato das ADRs existentes: contexto, decisão, consequências. Conteúdo: emenda o **D5** da
ADR 0001 — o registro de mandatos passa a ser dado versionado **no `sitio`**
(`app/src/data/governos/`) e é embutido no bundle; sigla + logo, sem cor de partido,
continua; o repo `dados` deixa de ter `governos/`. Registrar a ordem de publicação e a
alternativa descartada (arquivo estático + `fetch`).

- [ ] **Step 2: Atualizar o `AGENTS.md` do `sitio`**

- "Dados **não** vivem aqui" → séries vêm do `dados`; **governos vivem aqui**.
- Linha de dados do mapa: `app/src/data/governos/`.
- Seção de ADR: acrescentar a 0003 e dizer que ela emenda o D5.

- [ ] **Step 3: Nota nas specs antigas**

Em `docs/specs/2026-10-14-camada-de-graficos-design.md` §7, nota datada
(2026-11-01): os caminhos `dados/governos/...` passaram para `app/src/data/governos/`,
mesmo schema. `docs/plans/` fica intocado (histórico).

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0003-governos-no-sitio.md AGENTS.md \
  docs/specs/2026-10-14-camada-de-graficos-design.md docs/specs/2026-10-18-migracao-astro-design.md
git commit -m "docs(adr): governos passam a morar no sitio (emenda o D5)"
```

---

### Task 4: Remover `governos/` do repo `dados`

**Files:**
- Delete: `../dados/governos/federal.json`, `../dados/governos/index.json`
- Modify: `../dados/AGENTS.md` (seção "`governos/` (schema diferente)")

**Interfaces:**
- Consumes: `sitio` já publicado com o bundle novo.
- Produces: nada.

- [ ] **Step 1: Remover os arquivos e atualizar o `AGENTS.md` do `dados`**

> Ruling do usuário (2026-11-01): remover e commitar já; o momento do push é decisão dele.
> O risco é conhecido: até o deploy do `sitio`, a home publicada fica sem faixa.

```bash
cd ../dados && git rm -r governos/
```

Trocar a seção de `governos/` por uma linha: o registro de mandatos mora no repo `sitio`
(`app/src/data/governos/`), com o schema descrito lá; este repo guarda só as séries.

- [ ] **Step 2: Validar o parse dos JSONs restantes**

Run: `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('*/*.json')]"`
Expected: sem saída (sucesso).

- [ ] **Step 3: Commit (push só depois, decisão do usuário)**

```bash
git add -A AGENTS.md governos
git commit -m "chore(dados): remove governos, agora versionados no sitio"
```

Corpo do commit registra a ordem: publicado no `sitio` em <data>, por isso a remoção aqui é segura.

---

### Task 5: Verificação final

**Files:** nenhum.

**Interfaces:**
- Consumes: tudo.
- Produces: evidência.

- [ ] **Step 1: Cadeia completa**

```bash
npm run build
```

- [ ] **Step 2: Testes do app**

```bash
cd app && npm test && npm run test:e2e
```

- [ ] **Step 3: Gate de analytics**

```bash
npm run test:analytics
```

- [ ] **Step 4: Restaurar o artefato de dev se o servidor do usuário estiver no ar**

```bash
DADOS_LOCAL=1 npm run build:app && npm run preparar-publico
```

- [ ] **Step 5: Conferir a árvore**

`git status` no `sitio` não deve mostrar arquivos deste trabalho pendentes; as mudanças do
tour (`app/e2e/tour.spec.js`, `app/package*.json`) continuam intocadas e sem commit.

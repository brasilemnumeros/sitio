# Fatia 06 — O permalink do app (`?indicators=`)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** abrir `/?indicators=<ids>` restaura as séries; mudar as séries atualiza a URL, para que
o link seja copiável. É o que impede a publicação de entrar com **regressão**: hoje ~11 links dos
posts funcionam no site publicado (o app legado lia a query) e o app novo ignora.

**Arquitetura:** um **parser puro** (`app/src/permalink.js`) separa a leitura da query da resolução
contra o catálogo — assim o parser é testável sem DOM nem rede. A integração (`app/src/permalink-init.js`)
liga o parser ao `catalogStore` (resolver id → entrada) e ao `seriesStore` (adicionar), e escreve de
volta com `history.replaceState`.

**Stack:** Svelte 5 · os stores existentes (`seriesStore`, `catalogStore`) · vitest (node) + Playwright.

**Spec:** §5 (D4, D13) · **ADR:** 0002 (decisão 4) · `docs/specs/2026-10-17-plano-de-tagueamento.md` §3.

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **Toca só `sitio/app/`.** Não depende do Astro; pode correr em paralelo às fatias 01–05.
- **A suíte existente não muda.** Testes desta fatia são **novos** — não contam como violação do
  "suíte intacta" (spec §10.3).
- **`clearSeriesCache()` no `beforeEach`** de todo teste que use `loadSeries` (`AGENTS.md`) — sem
  isso o teste passa (ou falha) pelo motivo errado.
- **Não criar laço de eco.** A escrita na URL é **unidirecional** (store → `replaceState`); a leitura
  acontece **uma vez**, na inicialização. Ler de volta o que se escreveu é o defeito conhecido do
  `adapter.js:79` (`e2e/minimapa.spec.js` tem o registro) — não repeti-lo aqui.
- **Verificar pelo caminho do produto**, não pelo harness: o app carrega série **uma a uma**
  (`adicionarSerie` faz um `store.set` por série). Um `fitContent`/laço que só passa no harness não
  prova nada (`AGENTS.md`).

---

### Tarefa 1: o parser puro

**Arquivos:**

- Criar: `app/src/permalink.js`
- Test: `app/src/permalink.test.js`

**Interfaces:**

- Produz: `lerIds(search: string): string[]` e `escreverSearch(ids: string[], searchAtual?: string): string`.
  - `lerIds` recebe a query **sem** o `?` (`'indicators=selic,ipca'`).
  - Devolve **ids únicos**, **na ordem da query**, **no máximo `LIMITE_SERIES` (10)**.
  - Filtra vazios. **Não** conhece o catálogo (id inexistente é problema da T2).

- [ ] **Passo 1: escrever o teste que falha**

`app/src/permalink.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { lerIds, escreverSearch } from './permalink.js';

describe('lerIds', () => {
  it('lê a lista separada por vírgula', () => {
    expect(lerIds('indicators=selic,ipca')).toEqual(['selic', 'ipca']);
  });
  // Review Focus 1 — id repetido
  it('deduplica mantendo a primeira ocorrência', () => {
    expect(lerIds('indicators=selic,ipca,selic')).toEqual(['selic', 'ipca']);
  });
  it('ignora espaços e entradas vazias', () => {
    expect(lerIds('indicators= selic , ,ipca ')).toEqual(['selic', 'ipca']);
  });
  it('query ausente devolve lista vazia', () => {
    expect(lerIds('')).toEqual([]);
    expect(lerIds('outra=coisa')).toEqual([]);
  });
  // Review Focus 2 — mais de 10 ids
  it('corta em 10 ids (LIMITE_SERIES)', () => {
    const muitos = Array.from({ length: 15 }, (_, i) => `s${i}`).join(',');
    expect(lerIds(`indicators=${muitos}`)).toHaveLength(10);
  });
});

describe('escreverSearch', () => {
  it('escreve a lista e preserva outras chaves', () => {
    expect(escreverSearch(['selic'], 'utm=x')).toBe('utm=x&indicators=selic');
  });
  it('sem séries, remove a chave', () => {
    expect(escreverSearch([], 'indicators=selic&utm=x')).toBe('utm=x');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/permalink.test.js`
Expected: FAIL — `permalink.js` não existe (`Cannot find module`).

- [ ] **Passo 3: implementar `app/src/permalink.js`**

Usar `URLSearchParams` para parsear/reescrever; o corte em 10 importa `LIMITE_SERIES` de
`stores/series.js` (**não** repetir o número).

- [ ] **Passo 4: rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/permalink.test.js`
Expected: PASS (todos os casos).

- [ ] **Passo 5: commit**

```bash
git add app/src/permalink.js app/src/permalink.test.js
git commit -m "feat(app): parser puro do permalink (?indicators=)"
```

---

### Tarefa 2: a integração com os stores

**Arquivos:**

- Criar: `app/src/permalink-init.js`
- Modificar: `app/src/stores/catalog.js` (adicionar `indicadorPorId`)
- Modificar: `app/src/main.js` (chamar `iniciarPermanlink()`)
- Test: `app/src/permalink-init.test.js`

**Interfaces:**

- Consome: `lerIds`/`escreverSearch` (T1), `catalogStore` + `indicadorPorId(id)` (novo, em
  `stores/catalog.js`), `adicionarSerie(entry, {fetchImpl})`, `seriesStore`, `limparSeries()`.
- Produz: `iniciarPermanlink({ window?: Window, fetchImpl? } = {})` — lê a query na entrada
  (resolvendo contra o catálogo, **ignorando** id desconhecido, respeitando o limite), e assina
  `seriesStore` para `replaceState`.

- [ ] **Passo 1: escrever o teste que falha**

`app/src/permalink-init.test.js` — com um `window`/`history` **falso** e um `fetchImpl` de fixture
(URLs `data:` evitam limpar `app/public/`, `AGENTS.md`):

```js
// casos obrigatórios
// 1. ?indicators=selic,ipca → two series in the store, na ordem da query
// 2. id desconhecido ('indicators=nao-existe,selic') → uma série só, sem lançar  (Review Focus 1)
// 3. 15 ids → exatamente 10 séries na store                                   (Review Focus 2)
// 4. adicionar série → history.replaceState chamado com a lista nova
// 5. sem query → store vazia, nenhum replaceState espúrio
```

`beforeEach`: `clearSeriesCache()` (`AGENTS.md`).

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/permalink-init.test.js`
Expected: FAIL — módulo inexistente.

- [ ] **Passo 3: implementar `iniciarPermanlink` e `indicadorPorId`**

`iniciarPermanlink` espera o catálogo carregar (`carregarCatalogo`), resolve cada id com
`indicadorPorId`, e chama `adicionarSerie` **em série** (uma a uma — é o caminho do produto). Depois
assina `seriesStore` e escreve a URL com `replaceState` (**nunca** `pushState`, para não poluir o
histórico).

- [ ] **Passo 4: rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/permalink-init.test.js`
Expected: PASS.

- [ ] **Passo 5: rodar a suíte inteira (nada quebrou)**

Run: `cd app && NODE_ENV=development npm test`
Expected: **126 + os novos**, todos verdes. Se um teste **antigo** mudou de resultado, é regressão.

- [ ] **Passo 6: commit**

```bash
git add app/src/permalink-init.js app/src/permalink-init.test.js app/src/stores/catalog.js app/src/main.js
git commit -m "feat(app): permalink ligado aos stores, sem laço de eco"
```

---

### Tarefa 3: o E2E do caminho real

**Arquivos:**

- Criar: `app/e2e/permalink.spec.js`
- Modificar: `app/src/App.svelte` (se necessário, para o estado inicial com a query)

**Interfaces:**

- Consome: `iniciarPermanlink` (T2) pelo `main.js`.
- Produz: um E2E que **prova o caminho do produto**, não o harness.

- [ ] **Passo 1: escrever o E2E**

`app/e2e/permalink.spec.js`: abrir `/?indicators=selic` no dev server do app e esperar **uma** série
renderizada (o chip/traço); abrir `/?indicators=selic,ipca` e esperar **duas**; adicionar uma série
pela UI (se houver) e conferir que a URL mudou.

> **Cuidado:** não usar o harness para semear a store — semear pelo console cria **outro nó** no grafo
> de módulos e o app não vê o estado (`AGENTS.md`).

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npm run test:e2e -- permalink`
Expected: FAIL — a `/` do app ainda não lê a query.

- [ ] **Passo 3: garantir a inicialização**

Confirmar que `main.js` chama `iniciarPermanlink()` **antes** de (ou junto de) o `mount`, e que o
`catalogStore` recebe o catálogo (com o `datafile` local em dev).

- [ ] **Passo 4: rodar e ver passar**

Run: `cd app && NODE_ENV=development npm run test:e2e -- permalink`
Expected: PASS.

- [ ] **Passo 5: rodar o E2E inteiro**

Run: `cd app && NODE_ENV=development npm run test:e2e`
Expected: os 12 E2E antigos continuam no mesmo estado (os 3 `fixme` do minimapa **seguem** `fixme` —
não é desta fatia).

- [ ] **Passo 6: commit**

```bash
git add app/e2e/permalink.spec.js app/src/App.svelte
git commit -m "test(app): E2E do permalink pelo caminho do produto"
```

## Critérios de aceite (fatia 06)

- [ ] `/?indicators=selic,ipca` restaura **duas** séries; `?indicators=selic` restaura **uma**.
- [ ] Id **desconhecido** é ignorado sem erro; id **repetido** não duplica (Review Focus 1).
- [ ] **15 ids** → exatamente **10** séries, com o mesmo `motivoDoLimite()` (Review Focus 2).
- [ ] Mudar as séries **atualiza** a URL (`replaceState`), e o link é copiável.
- [ ] Nenhum `pushState`; a leitura da query acontece **uma vez** (sem laço de eco).
- [ ] Os **126** testes antigos seguem verdes, sem edição; os novos passam.
- [ ] O E2E usa o **caminho do produto** (não semeia a store pelo console).

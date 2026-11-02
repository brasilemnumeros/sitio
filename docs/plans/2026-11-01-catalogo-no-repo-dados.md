# Catálogo no repo `dados` (busca em runtime) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fazer o catálogo de indicadores morar no repo `dados` (`indicadores/catalogo.json`) e o app buscá-lo em runtime, para que publicar um indicador não exija editar nem rebuildar o sitio.

**Architecture:** o catálogo deixa de ser embutido no bundle e passa a ser um arquivo publicado ao lado das séries, validado por três camadas (hook/CI do `dados`, `validateCatalog` no app, teste de integração do sitio). O app ganha estados de carregando/erro para a lista; a home só mostra o estado vazio depois que o catálogo chega.

**Tech Stack:** Svelte 5 (runes), Svelte stores, Vite, Vitest, Playwright, Astro, Python 3 (`validar.py`, pytest), GitHub Actions.

**Spec:** `docs/specs/2026-11-01-catalogo-no-repo-dados-design.md`

## Global Constraints

- Dois repositórios: `sitio` (este) e `dados` (irmão em `../dados`, ou `./dados` no CI, apontado por `DADOS_DIR`).
- Node 26; `NODE_ENV=development` é obrigatório nos comandos do app nesta máquina.
- Comentários e textos de interface em **português**; nomes de código em inglês só quando seguem API externa.
- **Falha em voz alta:** nenhuma lista vazia, nenhum fallback silencioso. Erro mostra a mensagem crua.
- E2E reprova com **qualquer** `console.error` ou exceção não capturada (`app/e2e/apoio.js`).
- Classe Tailwind nova exige `npm run css` antes do E2E (o dev server serve `assets/css/main.dist.css`).
- **Nunca** editar `public/assets/js/app/app.js` nem `app.css` (artefato gerado).
- Não rodar dois E2E ao mesmo tempo; conferir a porta 5173 antes (`lsof -nP -iTCP:5173 -sTCP:LISTEN`).
- `versao` do catálogo é `1`; chaves em português (`nome`, `grupo`, `escala`, `descricao`, `arquivo`).

## Review Focus

1. **`catalogo.json` com `versao` diferente de 1** → `SchemaError` na tela, nunca lista vazia nem catálogo parcial.
2. **Catálogo ausente (404) ou rede fora** → erro visível com "Tentar de novo" na home **e** na busca; o permalink do usuário não é reescrito.
3. **Resposta que não é JSON** (HTML do fallback do dev server, página de erro do proxy) → mensagem que cite o defeito, não `Unexpected token '<'` solto.
4. **`?series=` com id que não existe no catálogo** → o id é ignorado sem lançar e sem apagar a URL do usuário.
5. **Duas chamadas de `carregarCatalogo` (mount + permalink)** → um único request; a segunda espera a primeira em vez de disparar outra.

---

### Task 1: `dados` — catálogo publicado e conferência cruzada

**Files:**
- Create: `../dados/indicadores/catalogo.json`
- Modify: `../dados/scripts/validar.py`
- Test: `../dados/tests/test_validar.py`

**Interfaces:**
- Consumes: nada (primeira tarefa).
- Produces: `indicadores/catalogo.json` com `{versao, grupos, indicadores[]}`; em `validar.py`, `validar_catalogo(raiz: Path) -> list[str]` devolvendo mensagens de erro (lista vazia = ok). Cada mensagem começa pelo código da regra: `K1` arquivo declarado que não existe, `K2` série no disco sem entrada, `K3` `id` da entrada ≠ `id` da série ≠ nome do arquivo, `K4` `escala` ≠ `unidade.tipo`, `K5` `grupo` inexistente em `grupos`, `K6` `versao` diferente de 1.

- [ ] **Step 1: Escrever os testes que falham**

Em `../dados/tests/test_validar.py`, usando `tmp_path` e a fixture `serie()` já existente, um teste por regra:

```python
def test_catalogo_ok(tmp_path):
    montar_raiz(tmp_path)  # helper: cria indicadores/<fam>/<id>.json + catalogo.json coerentes
    assert validar_catalogo(tmp_path) == []

def test_catalogo_arquivo_inexistente(tmp_path):
    montar_raiz(tmp_path, catalogo_arquivo="selic/nao-existe.json")
    assert any(e.startswith("K1") for e in validar_catalogo(tmp_path))

def test_catalogo_serie_sem_entrada(tmp_path):
    montar_raiz(tmp_path, omitir_entrada=True)
    assert any(e.startswith("K2") for e in validar_catalogo(tmp_path))

def test_catalogo_id_divergente(tmp_path):
    montar_raiz(tmp_path, catalogo_id="outro-id")
    assert any(e.startswith("K3") for e in validar_catalogo(tmp_path))

def test_catalogo_escala_divergente(tmp_path):
    montar_raiz(tmp_path, catalogo_escala="moeda")
    assert any(e.startswith("K4") for e in validar_catalogo(tmp_path))

def test_catalogo_grupo_inexistente(tmp_path):
    montar_raiz(tmp_path, catalogo_grupo="nao-existe")
    assert any(e.startswith("K5") for e in validar_catalogo(tmp_path))

def test_catalogo_versao_desconhecida(tmp_path):
    montar_raiz(tmp_path, catalogo_versao=2)
    assert any(e.startswith("K6") for e in validar_catalogo(tmp_path))
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ../dados && python3 -m pytest tests/test_validar.py -q`
Expected: FAIL — `ImportError: cannot import name 'validar_catalogo'` (ou `NameError`).

- [ ] **Step 3: Criar `indicadores/catalogo.json`**

Mover as 13 entradas de `sitio/app/src/data/indicadores.json` **sem mudar nenhuma chave nem texto**, mantendo a ordem dos grupos e dos indicadores. O `arquivo` de cada entrada é o caminho relativo a `indicadores/` (ex.: `selic/selic-meta-acum-12m.json`).

- [ ] **Step 4: Implementar `validar_catalogo` em `validar.py`**

```python
def validar_catalogo(raiz: Path) -> list[str]:
    """K1…K6 — o catálogo e o disco descrevem o MESMO conjunto de séries."""
```

Regras: ler `raiz/"indicadores"/"catalogo.json"` (ausente → `["K1: catalogo.json ausente"]`); `versao != 1` → `K6`; cada `arquivo` declarado tem de existir **e** casar com `<familia>/<id>.json`, com `id` da entrada igual ao nome do arquivo; `escala` tem de ser igual a `unidade.tipo` lido do JSON da série; `grupo` tem de existir em `grupos`; toda série encontrada por `_series_da_raiz` tem de ter entrada (`K2`). Chamar `validar_catalogo` em `validar_todos` e no `main()` (a falha entra no mesmo relatório das séries).

- [ ] **Step 5: Rodar tudo e ver passar**

Run: `cd ../dados && python3 -m pytest -q && python3 scripts/validar.py`
Expected: PASS nos testes; `validar.py` sem falhas nos 13 arquivos e no catálogo novo.

- [ ] **Step 6: Commit (repo `dados`)**

```bash
cd ../dados
git add indicadores/catalogo.json scripts/validar.py tests/test_validar.py
git commit -m "feat(catalogo): catalogo publicado ao lado das series, com conferencia cruzada"
```

---

### Task 2: `dados` — CI para PRs

**Files:**
- Create: `../dados/.github/workflows/validar.yml`
- Modify: `../dados/AGENTS.md`

**Interfaces:**
- Consumes: `scripts/validar.py` e `pytest` da Task 1.
- Produces: check obrigatório `validar` em PR (branch protection é configuração do GitHub, fora do repo).

- [ ] **Step 1: Criar o workflow**

```yaml
name: validar
on:
  pull_request:
  push:
    branches: [main]
jobs:
  validar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: python3 scripts/validar.py
      - run: python3 -m pytest -q
```

(Se `requirements.txt` não fixar a versão do Python, a `3.12` acima é escolha do implementador; o que importa é não divergir do que roda local.)

- [ ] **Step 2: Verificar o YAML e o comando local**

Run: `cd ../dados && python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/validar.yml'))" && python3 scripts/validar.py && python3 -m pytest -q`
Expected: sem erro de parse; validador e testes verdes (é o mesmo par de comandos do workflow).

- [ ] **Step 3: Documentar em `AGENTS.md` do `dados`**

Substituir "ainda não há CI nem build" pela descrição do workflow e registrar que **indicador novo entra por PR** e que o gate é `validar.py` + `pytest`.

- [ ] **Step 4: Commit (repo `dados`)**

```bash
cd ../dados
git add .github/workflows/validar.yml AGENTS.md
git commit -m "ci: valida contrato e catalogo em todo PR"
```

---

### Task 3: `sitio` — o app busca o catálogo em runtime

**Files:**
- Modify: `app/src/data/catalog.js`
- Modify: `app/src/stores/catalog.js`
- Delete: `app/src/data/indicadores.json`
- Test: `app/src/data/catalog.test.js`, `app/src/stores/catalog.test.js`, `app/src/permalink-init.test.js`

**Interfaces:**
- Consumes: `validateCatalog(raw, {base})` (já existe, inalterada); `validateSeries`/`SchemaError` de `./validate.js`.
- Produces:
  - `urlDoCatalogo(base = __BASE_DADOS__): string` → `${base sem / final}/catalogo.json`
  - `buscarCatalogo({ url = urlDoCatalogo(), fetchImpl = fetch } = {}): Promise<{grupos, indicadores}>` — valida com `validateCatalog`; falha de rede → `Error('falha de rede ao buscar o catálogo', {cause})`; `!ok` → `Error('HTTP <status> ao buscar o catálogo')`.
  - `carregarCatalogo({ dados, fetchImpl, url } = {}): Promise<void>` — idempotente (`loading`/`ready` não refazem); transição `idle→loading→ready|error`.
  - `recarregarCatalogo(opcoes = {}): Promise<void>` — ignora o estado atual e refaz (`loading` → `ready|error`).

- [ ] **Step 1: Escrever os testes que falham**

`app/src/data/catalog.test.js` — **manter** todos os testes de `validateCatalog` (inclusive o de `versao: 2`, que cobre o Review Focus 1) e trocar só o teste do catálogo embutido (13 indicadores/7 grupos) pelos novos:

```js
it('monta a URL a partir da base, sem barra dupla', () => {
  expect(urlDoCatalogo('https://x/dados/indicadores/')).toBe('https://x/dados/indicadores/catalogo.json');
});

it('busca, valida e resolve o datafile contra a base', async () => {
  const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => catalogoMinimo }));
  const c = await buscarCatalogo({ url: 'https://x/dados/indicadores/catalogo.json', fetchImpl });
  expect(c.indicadores[0].datafile).toBe('https://x/dados/indicadores/selic/selic-meta-acum-12m.json');
});

it('HTTP de erro vira mensagem com o status', async () => {
  const fetchImpl = vi.fn(async () => ({ ok: false, status: 404 }));
  await expect(buscarCatalogo({ url: 'u', fetchImpl })).rejects.toThrow(/HTTP 404/);
});

it('corpo que não é JSON não vira lista vazia', async () => {
  const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => { throw new SyntaxError('Unexpected token <'); } }));
  await expect(buscarCatalogo({ url: 'u', fetchImpl })).rejects.toThrow(/Unexpected token/);
});
```

`app/src/stores/catalog.test.js`:

```js
it('vai de loading a ready numa passada', async () => { /* status 'loading' observado, depois 'ready' */ });
it('falha vira status error com a mensagem crua', async () => { /* fetch 500 → error, error.message com HTTP 500 */ });
it('não dispara dois requests quando chamado duas vezes', async () => { /* fetchImpl chamado 1x */ });
it('recarregarCatalogo refaz mesmo depois de ready', async () => { /* 2x */ });
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/data/catalog.test.js src/stores/catalog.test.js src/permalink-init.test.js`
Expected: FAIL — `urlDoCatalogo is not a function` / `buscarCatalogo is not a function`.

- [ ] **Step 3: Implementar `catalog.js` e a store**

Em `app/src/data/catalog.js`: remover `import bruto from './indicadores.json'` e `catalogoEmbutido()`; adicionar `urlDoCatalogo` e `buscarCatalogo` (assinaturas no bloco Interfaces). Em `app/src/stores/catalog.js`: `carregarCatalogo` deixa de ser síncrona e passa a usar `buscarCatalogo` quando `dados` não é injetado; adicionar `recarregarCatalogo`. Nenhuma escrita em store fora dessas duas ações (§8).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/data src/stores src/permalink-init.test.js`
Expected: PASS (inclui `permalink-init.test.js`, que injeta `dados` e continua funcionando).

- [ ] **Step 5: Apagar o catálogo embutido**

```bash
git rm app/src/data/indicadores.json
```
Rodar `npm run build:app` (com `DADOS_LOCAL=1`) só para provar que nada mais importa o arquivo.

- [ ] **Step 6: Commit**

```bash
git add app/src/data/catalog.js app/src/data/catalog.test.js app/src/stores/catalog.js app/src/stores/catalog.test.js
git commit -m "feat(catalogo): app busca o catalogo na base de dados, nao no bundle"
```

---

### Task 4: `sitio` — estados de carregando e erro na home e na busca

**Files:**
- Modify: `app/src/App.svelte`
- Modify: `app/src/components/SearchModal.svelte`
- Modify: `app/src/data/exemplo.js` (novo — ver Interfaces)
- Test: `app/e2e/busca.spec.js`

**Interfaces:**
- Consumes: `catalogStore`, `recarregarCatalogo` (Task 3); `ErroTotal` (props `titulo`, `motivo`, `aoTentarNovamente`).
- Produces: `EXEMPLO_IDS` exportado de `app/src/data/exemplo.js` (usado pela Task 5).

- [ ] **Step 1: Mover `EXEMPLO_IDS` para um módulo**

Em `app/src/data/exemplo.js`: `export const EXEMPLO_IDS = ['selic-meta', 'ipca-acum-12m'];` com o comentário de §9.1 que hoje está em `App.svelte:141-143`. `App.svelte` passa a importar.

- [ ] **Step 2: Escrever os E2E que falham**

Em `app/e2e/busca.spec.js`:

```js
test('mostra spinner enquanto o catálogo carrega', async ({ page }) => {
  await page.route('**/catalogo.json', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  await expect(page.getByRole('status', { name: /Carregando indicadores/ })).toBeVisible();
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('erro ao carregar o catálogo é visível e tem "Tentar de novo"', async ({ page }) => {
  await page.route('**/catalogo.json', (route) => route.fulfill({ status: 500, body: '' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(/HTTP 500/);
  await page.unroute('**/catalogo.json');
  await page.getByRole('button', { name: 'Tentar de novo' }).click();
  await expect(page.getByRole('alert')).toBeHidden();
});
```

O `test` importado deve ser o de `./apoio.js` (é ele que reprova `console.error`).

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx playwright test e2e/busca.spec.js --config playwright.config.js`
Expected: FAIL nos dois testes (nenhum `role=status` de carregando; a home mostra o estado vazio em vez de erro).

- [ ] **Step 4: Implementar os estados**

`App.svelte` — derivar `let catalogoPronto = $derived($catalogStore.status === 'ready')` e `let catalogoFalhou = $derived($catalogStore.status === 'error')`, e na área do gráfico, **antes** do `{#if itens.length === 0}`:

```svelte
{#if catalogoFalhou}
  <ErroTotal titulo="Não foi possível carregar a lista de indicadores" motivo={$catalogStore.error} aoTentarNovamente={recarregarCatalogo} />
{:else if !catalogoPronto}
  <Esqueleto />
{:else if itens.length === 0}
```

`SearchModal.svelte` — no contêiner `flex min-h-0 flex-1`, **antes** do `{#if buscando}`:

```svelte
{#if $catalogStore.status === 'error'}
  <div class="min-h-0 flex-1 overflow-y-auto p-4">
    <ErroTotal titulo="Não foi possível carregar a lista" motivo={$catalogStore.error} aoTentarNovamente={recarregarCatalogo} />
  </div>
{:else if $catalogStore.status !== 'ready'}
  <div data-coluna="carregando" class="flex min-h-0 flex-1 items-center justify-center gap-2 p-6 text-sm text-slate-500 dark:text-slate-400" aria-busy="true">
    <span class="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" aria-hidden="true"></span>
    <span role="status">Carregando indicadores…</span>
  </div>
{:else if buscando}
```

- [ ] **Step 5: Regenerar o CSS e rodar**

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/busca.spec.js --config playwright.config.js`
Expected: PASS nos dois testes novos (spinner com o rótulo acessível; erro com HTTP 500 e recuperação).

- [ ] **Step 6: Rodar a suíte inteira do E2E**

Run: `cd app && NODE_ENV=development npx playwright test --config playwright.config.js`
Expected: PASS. Se algum spec quebrar por timing, corrigir com `expect(locator)` — **nunca** com `waitForTimeout`.

- [ ] **Step 7: Commit**

```bash
git add app/src/App.svelte app/src/components/SearchModal.svelte app/src/data/exemplo.js app/e2e/busca.spec.js
git commit -m "feat(catalogo): estados de carregando e erro na home e na busca"
```

---

### Task 5: `sitio` — a camada 4 de validação (integração por `DADOS_DIR`)

**Files:**
- Modify: `app/src/data/integracao.test.js`
- Modify: `.github/workflows/github-pages.yml`

**Interfaces:**
- Consumes: `indicadores/catalogo.json` (Task 1), `EXEMPLO_IDS` (Task 4), `PRESETS` de `app/src/data/presets.js`.
- Produces: nada consumido por tarefas seguintes.

- [ ] **Step 1: Escrever os testes que falham**

Em `app/src/data/integracao.test.js`:

```js
function raizDados() {
  const env = process.env.DADOS_DIR;
  return env ? path.resolve(process.cwd(), env) : fileURLToPath(new URL('../../../../dados', import.meta.url));
}

it('o catálogo e o disco concordam: nenhuma série órfã ou declarada a menos', () => { /* conjunto de arquivo == conjunto do catálogo */ });
it('toda entrada do catálogo tem escala igual a unidade.tipo da série', () => { /* K4 */ });
it('todo id que o site conhece existe no catálogo', () => {
  // PRESETS (todos os indicadores), EXEMPLO_IDS e os ?series= dos posts em ../../../src/content/posts/*.md
});
```

O teste dos posts lê `new URL('../../../src/content/posts/', import.meta.url)` e extrai os ids de cada `?series=`/`series=` do corpo e do front matter, quebrando por `,`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/data/integracao.test.js`
Expected: FAIL — `integracao.test.js` ainda lê `./indicadores.json` (arquivo removido na Task 3): `ENOENT`.

- [ ] **Step 3: Reescrever a leitura do catálogo**

Trocar `REGISTRO` (`./indicadores.json`) por `join(raizDados(), 'indicadores', 'catalogo.json')`; tirar os `toHaveLength(13)` e derivar as contagens do próprio catálogo. Manter os testes de contrato que já existem (13 séries válidas, sem mês repetido).

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/data/integracao.test.js`
Expected: PASS.

- [ ] **Step 5: Fazer o CI alimentar `DADOS_DIR`**

Em `.github/workflows/github-pages.yml`, no passo "Testes do app":

```yaml
      - name: Testes do app
        env:
          DADOS_DIR: ../dados/
        run: npm ci --prefix app && npm test --prefix app
```

- [ ] **Step 6: Provar os dois layouts**

Run (local, repo irmão): `cd app && NODE_ENV=development npx vitest run src/data/integracao.test.js`
Run (layout do CI): `cd app && DADOS_DIR=../../dados NODE_ENV=development npx vitest run src/data/integracao.test.js`
Expected: PASS nos dois.

- [ ] **Step 7: Commit**

```bash
git add app/src/data/integracao.test.js .github/workflows/github-pages.yml
git commit -m "test(catalogo): integracao le o dados por DADOS_DIR e confere os ids do site"
```

---

### Task 6: `sitio` — documentação e rastros do catálogo embutido

**Files:**
- Modify: `docs/contrato-de-indicadores.md`
- Modify: `AGENTS.md`
- Modify: `app/vite-plugins/dados-locais.js`
- Modify: `scripts/preparar-publico.sh`
- Modify: `app/src/data/presets.js` (comentário que cita `indicadores.json`)

**Interfaces:**
- Consumes: o desenho final das Tasks 1–5.
- Produces: nada de código.

- [ ] **Step 1: Atualizar a seção "Catálogo × série" do contrato**

Registrar: onde o catálogo mora (`dados/indicadores/catalogo.json`), as chaves, a regra de corte ("apresentação antes do dado"), as regras `K1…K6` do validador e a nota de compatibilidade — **mudar `versao` exige deploy coordenado do sitio**.

- [ ] **Step 2: Atualizar `AGENTS.md`**

Trocar as três menções a "catálogo embutido" (linhas ~18, ~38, ~133 e a armadilha ~256) pelo catálogo remoto; acrescentar nas armadilhas: "catálogo que não carrega **não** é lista vazia — é erro na tela".

- [ ] **Step 3: Corrigir comentários que mentem**

`app/vite-plugins/dados-locais.js` (parágrafo "O CATÁLOGO não passa por aqui desde 2026-11-01"), `scripts/preparar-publico.sh` (comentário sobre `app/src/data/indicadores.json`) e `app/src/data/presets.js` (comentário "ids do `indicadores.json`").

- [ ] **Step 4: Verificar que não sobrou rastro**

Run: `grep -rn "indicadores.json" --include='*.js' --include='*.svelte' --include='*.sh' --include='*.md' app scripts AGENTS.md docs/contrato-de-indicadores.md`
Expected: nenhum resultado em código vivo (só em `docs/plans/` e ADRs antigas, que são histórico).

- [ ] **Step 5: Commit**

```bash
git add docs/contrato-de-indicadores.md AGENTS.md app/vite-plugins/dados-locais.js scripts/preparar-publico.sh app/src/data/presets.js
git commit -m "docs(catalogo): catalogo remoto no contrato e no guia"
```

---

### Task 7: `sitio` — cadeia completa verde

**Files:** nenhum (verificação).

- [ ] **Step 1: Rodar a cadeia inteira**

Run: `npm run build && cd app && NODE_ENV=development npm test && npm run test:e2e && cd .. && npm run test:analytics`
Expected: tudo verde. `npm run build` exige o repo `dados` presente (teste de integração) — é o novo contrato do build.

- [ ] **Step 2: Restaurar o artefato de dev se havia dev server aberto**

Se `lsof -nP -iTCP:4321 -sTCP:LISTEN` ou `:5173` mostrar processo do usuário, rodar `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico` e pedir para recarregar a página (ver AGENTS.md, "armadilhas").

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "chore: cadeia de build e testes verde com o catalogo remoto"
```

---

### Task 8: Publicação (só com aval explícito do usuário)

**Files:** nenhum.

- [ ] **Step 1: Publicar o `dados`** — push do `main` (o remote está no layout anterior à migração) e conferir `https://brasilemnumeros.github.io/dados/indicadores/catalogo.json` → **200**.
- [ ] **Step 2: Ligar branch protection** — exigir o check `validar` para mergear em `main` (configuração do GitHub).
- [ ] **Step 3: Destravar o deploy do sitio** — push do `main` do `sitio` e conferir o workflow verde; a home publicada deve sair da lista e carregar o preset.
- [ ] **Step 4: Provar ponta a ponta** — adicionar uma entrada no `catalogo.json` de um indicador já publicado, abrir a home, e ver a lista refletir (em até ~10 min, janela do cache do Pages).

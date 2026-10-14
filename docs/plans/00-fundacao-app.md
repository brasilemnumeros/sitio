# Fatia 00 — Fundação do app (Vite + Svelte + Vitest)

> **Para quem executa:** sub-skill obrigatória: use `superpowers:subagent-driven-development`
> (recomendada) ou `superpowers:executing-plans` para tocar esta fatia tarefa a tarefa.
> Os passos usam caixa (`- [ ]`) para marcação.

**Objetivo:** um projeto autocontido em `sitio/app/` — Vite + Svelte 5 + Vitest — que
builda para `sitio/assets/js/app/app.js` e `app.css` com **nome fixo**, e roda em
`vite dev` com um shell mínimo, sem tocar no resto do site.

**Arquitetura:** projeto npm próprio dentro de `sitio/app/` (separado do
`package.json` do site, que declara só Tailwind e Prettier — §10.1). Build em modo
aplicação com entrada única e nomes de saída fixos; saída gitignored e construída no
CI. Testes com Vitest, ambiente `node` — nenhuma camada desta fatia precisa de
navegador.

**Stack:** Node 24+ (o CI usa 24; a máquina de dev aqui tem 26), Vite, Svelte 5,
`@sveltejs/vite-plugin-svelte`, Vitest.

**Spec:** `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` (§8, §10.1, §10.4,
§10.7) · **ADR:** `sitio/docs/adr/0001-camada-de-graficos-como-app-isolado.md` (D1, D2)

## Restrições globais

Herdadas da spec e válidas para **toda** tarefa desta fatia:

- Custo zero: nenhuma dependência paga, nenhuma chave de API, nenhum host.
- Saída com **nome fixo** (`app.js`, `app.css`), sem hash de conteúdo — troca
  eficiência de cache por não acoplar o HTML a um manifest (§10.1).
- `sitio/app/src/` **não pode** entrar no `.gitignore` (o Tailwind v4 não varre pasta
  ignorada — §10.3). Só o **artefato de build** (`assets/js/app/`) é ignorado.
- Nada em `window` (§8).
- Nenhuma fatia toca o legado; ele sai na fatia 10.
- `package.json` do app é **separado** do `package.json` do site.

---

### Tarefa 1: Projeto npm autocontido em `sitio/app/`

**Arquivos:**
- Criar: `sitio/app/package.json`
- Criar: `sitio/app/vite.config.js`
- Criar: `sitio/app/index.html`
- Modificar: `sitio/.gitignore`

**Interfaces:**
- Consome: nada.
- Produz: o diretório `sitio/app/` como raiz de um projeto Node ESM, com os scripts
  `dev`, `build`, `test`, `test:watch`.

- [ ] **Passo 1: instalar as dependências com os resolvedores (não escrever versões à mão)**

```bash
cd sitio/app 2>/dev/null || mkdir -p sitio/app && cd sitio/app
npm init -y
npm pkg set type=module name=brasil-em-numeros-app version=0.0.0 private=true
npm pkg set scripts.dev=vite scripts.build="vite build" scripts.test="vitest run" scripts.test:watch=vitest
npm install --save-dev vite @sveltejs/vite-plugin-svelte svelte vitest
```

Isso resolve as versões correntes e grava `package-lock.json` — que é **commitado**. Não
fixar versões manualmente neste passo.

- [ ] **Passo 2: escrever `sitio/app/vite.config.js`**

```js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    // Artefato publicado em sitio/assets/js/app/ (gitignored) — §10.1
    outDir: '../assets/js/app',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Nome fixo: o HTML não precisa de manifest para descobrir o nome gerado.
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
  test: {
    // §10.7 — só unidade, sem navegador por ora.
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

- [ ] **Passo 3: escrever o shell de desenvolvimento `sitio/app/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Brasil em Números — app (dev)</title>
    <!-- CSS do site, gerado pelo Tailwind CLI a partir de sitio/ (§10.4):
         npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css -->
    <link rel="stylesheet" href="../assets/css/main.dist.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Passo 4: ignorar só o artefato de build; manter `sitio/app/src/` versionado**

Acrescentar ao final de `sitio/.gitignore`:

```
# Artefato de build do app (fatia 00) — src/ NÃO é ignorado (§10.3)
assets/js/app/
app/.vite
```

- [ ] **Passo 5: conferir que o `src/` não ficou ignorado**

Run: `cd sitio && git check-ignore -v app/src/main.js; echo "exit=$?"`
Esperado: **sem saída** e `exit=1` (não está ignorado). Se imprimir uma regra e
`exit=0`, a regra está errada — corrigir o Passo 4 antes de seguir.

- [ ] **Passo 6: commitar**

```bash
cd sitio
git add app/package.json app/package-lock.json app/vite.config.js app/index.html .gitignore
git commit -m "feat(app): projeto Vite+Svelte autocontido com build de saida fixa"
```

---

### Tarefa 2: Shell Svelte + a constante de schema

**Arquivos:**
- Criar: `sitio/app/src/main.js`
- Criar: `sitio/app/src/App.svelte`
- Criar: `sitio/app/src/domain/schema.js`
- Teste: `sitio/app/src/domain/schema.test.js`

**Interfaces:**
- Consome: nada.
- Produz:
  - `src/main.js` — monta `App` no elemento `#app`.
  - `src/domain/schema.js` → `export const SCHEMA_VERSION = 1`.
  - `src/App.svelte` — componente raiz (cresce nas fatias 07–09).

- [ ] **Passo 1: escrever o teste que falha**

`sitio/app/src/domain/schema.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION } from './schema.js';

describe('contrato de schema', () => {
  it('declara a versão 1 — o único schema que este app entende (§6)', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
```

- [ ] **Passo 2: rodar o teste e vê-lo falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./schema.js"`.

- [ ] **Passo 3: implementação mínima**

`sitio/app/src/domain/schema.js`:

```js
/** Versão do schema de série que este app entende (spec §6). */
export const SCHEMA_VERSION = 1;
```

- [ ] **Passo 4: rodar o teste e vê-lo passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — 1 teste.

- [ ] **Passo 5: montar o shell Svelte**

`sitio/app/src/main.js`:

```js
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app') });

export default app;
```

`sitio/app/src/App.svelte`:

```svelte
<script>
  import { SCHEMA_VERSION } from './domain/schema.js';
</script>

<main class="mx-auto max-w-5xl p-4">
  <h1 class="text-lg font-semibold">Brasil em Números — camada de gráficos</h1>
  <p class="text-sm opacity-70">schema v{SCHEMA_VERSION} · esqueleto em construção</p>
</main>
```

- [ ] **Passo 6: commitar**

```bash
cd sitio
git add app/src
git commit -m "feat(app): shell Svelte e a constante de versao do schema"
```

---

### Tarefa 3: Provar build e dev loop

**Arquivos:**
- Nenhum arquivo novo; verificação do que as tarefas 1–2 produziram.

**Interfaces:**
- Consome: os scripts de `sitio/app/package.json`.
- Produz: a evidência de que o pipeline funciona — exigida por
  `superpowers:verification-before-completion`.

- [ ] **Passo 1: gerar o CSS do site (o dev server depende dele)**

```bash
cd sitio
npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css
```

Esperado: `main.dist.css` (re)gerado sem erro.

- [ ] **Passo 2: rodar o build de produção**

Run: `cd sitio/app && npm run build`
Esperado: `../assets/js/app/app.js` e `../assets/js/app/app.css` criados. Conferir:

```bash
ls -la ../assets/js/app/
```

Esperado: exatamente os nomes `app.js` e `app.css` — **sem hash**.

- [ ] **Passo 3: confirmar que o artefato está ignorado pelo git**

Run: `cd sitio && git status --porcelain assets/js/app/`
Esperado: **vazio** (nada rastreado).

- [ ] **Passo 4: subir o dev server e ver o shell**

Run: `cd sitio/app && npm run dev`
Esperado: servidor em `http://localhost:5173`; abrir e ver o `<h1>` e a linha
`schema v1 · esqueleto em construção`. (Encerrar depois com Ctrl-C.)

- [ ] **Passo 5: commitar**

Nada a commitar nesta tarefa (é verificação). Se algum ajuste de config foi necessário,
commitar com `chore(app): ...`.

---

## Critérios de aceite da fatia 00

Todos verificáveis por comando, não por opinião:

- [ ] `cd sitio/app && npm ci && npm test` → **1 teste passa**, zero falhas.
- [ ] `cd sitio/app && npm run build` → cria `sitio/assets/js/app/app.js` e `app.css`,
      com **nome fixo** (nenhum hash).
- [ ] `cd sitio/app && npm run dev` → serve o shell; `App.svelte` renderiza a linha
      `schema v1`.
- [ ] `cd sitio && git status --porcelain assets/js/app/` → vazio (artefato ignorado).
- [ ] `cd sitio && git check-ignore app/src/main.js` → sem saída, exit 1 (`src/`
      versionado — §10.3).
- [ ] O `package.json` de `sitio/app/` é distinto do `package.json` de `sitio/`, e
      nenhum dos dois foi alterado em dependências do outro.
- [ ] Nenhuma linha de código usa `window` para estado.

## Auto-revisão (feita ao escrever este plano)

- **Cobertura da spec:** §8 (estrutura de camadas) → o `src/domain/` nasce aqui; §10.1
  (Vite, fonte em `sitio/app/`, `package.json` próprio, saída de nome fixo) → tarefa 1;
  §10.4 (`vite dev` com recarga) → tarefa 3; §10.7 (Vitest, ambiente node) → tarefa 2.
  A **classe-canário** e o CI são §10.2/§10.3 e moram na fatia 10 — deliberadamente
  fora desta.
- **Sem placeholders:** todo passo tem o conteúdo exato (arquivos escritos por inteiro,
  comandos com saída esperada). As versões são resolvidas por `npm install`, não
  inventadas.
- **Consistência de nomes:** `SCHEMA_VERSION` é definido aqui e consumido pela fatia 01
  (`validateSeries`) — mesmo identificador nos dois planos.

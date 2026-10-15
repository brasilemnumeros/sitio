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

Run: `NODE_ENV=development npm run build` (dentro de `sitio/app`; ver ruling R11 sobre o
`NODE_ENV` desta máquina)
Esperado: **apenas** `../assets/js/app/app.js`, com nome fixo e **sem hash** — e **nenhum**
`index.html` (R13). Conferir:

```bash
ls -la ../assets/js/app/
```

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
- [ ] `npm run build` → cria **`sitio/assets/js/app/app.js`**, com **nome fixo** (nenhum
      hash) e **sem `index.html`** no `outDir` (R13). O app não emite CSS próprio: ele usa
      o `main.dist.css` do site.
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

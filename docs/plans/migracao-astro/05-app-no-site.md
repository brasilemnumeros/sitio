# Fatia 05 — O app dentro do site

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a `/` do site inclui o app (o artefato já construído), o **catálogo** e as séries são
servidos em dev pelo **mesmo** middleware (extraído, não copiado), e o **canário** do Tailwind passa
a guardar o CSS do `dist/` do Astro.

**Arquitetura:** o app é construído por Vite em `app/` e sai em `assets/js/app/app.js` (nome fixo). O
site só **inclui** esse artefato por `<div id="app">` + `<script>`. O middleware de dado local vira um
módulo único (`app/vite-plugins/dados-locais.js`) usado pelos **dois** configs — `app/vite.config.js`
e `astro.config.mjs`.

**Stack:** Vite 8 (o do app) · `@tailwindcss/vite` no Astro · o middleware existente.

**Spec:** §5 (D2, D7, D9) · **ADR:** 0002 (decisões 2, 7).

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **🔴 O token do canário não pode aparecer em texto varrido pelo Tailwind** (inclusive `docs/`).
  Escrevê-lo literalmente numa doc cria um segundo produtor e **cega** o canário. Este plano **não**
  escreve o token; ele é montado por partes, como o script já faz.
- **`__BASE_DADOS__` e o plugin NÃO saem de `app/vite.config.js`.** Levá-los para o
  `astro.config.mjs` quebra os testes de `stores/mandate.js` com `ReferenceError` — e o fetch de
  governos **engole** o erro (`catch { store.set(inicial) }`), então o sintoma seria **trilho vazio,
  sem erro**.
- **A suíte do app fica intacta**: nenhum teste existente pode precisar de mudança nesta fatia.
- **Ordem do build: app primeiro, site depois.**

---

### Tarefa 1: o artefato e o catálogo na raiz do `dist/`

**Arquivos:**

- Modificar: `app/vite.config.js` (outDir — se necessário)
- Criar: `scripts/preparar-publico.sh` (copia o artefato e o `indicators.json` para `public/`)
- Modificar: `astro.config.mjs` (se necessário)
- Modificar: `src/pages/index.astro` (o `<script>` do app)

**Interfaces:**

- Consome: `app/vite.config.js` → `../assets/js/app/app.js` (nome fixo, já existe).
- Produz: `dist/assets/js/app/app.js` e `dist/indicators.json`, ambos na raiz do `dist/`.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-publico.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
falha=0
for f in dist/indicators.json dist/assets/js/app/app.js; do
  [ -f "$f" ] || { echo "publico: falta $f" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
echo "publico ok"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `NODE_ENV=development npm run build && bash scripts/testar-publico.sh`
Expected: FAIL — nenhum dos dois está no `dist/`.

- [ ] **Passo 3: decidir o mecanismo e implementar**

Duas saídas; escolher **uma** e registrar no `progress.md`:
(a) `public/indicators.json` é um **symlink/cópia** do `sitio/indicators.json`, e o artefato do app
vai para `public/assets/js/app/` por um passo `prebuild` que roda o build do app; ou
(b) `scripts/preparar-publico.sh` copia os dois para `public/` (gitignored) antes do `astro build`.

**A cópia publicada mantém o `datafile` do Pages** — a reescrita para `/dados/` é **só em dev**.

- [ ] **Passo 4: rodar e ver passar**

Run: `NODE_ENV=development bash scripts/preparar-publico.sh && npm run build && bash scripts/testar-publico.sh`
Expected: `publico ok`.

- [ ] **Passo 5: incluir o app na `/`**

`src/pages/index.astro` usa `Base.astro` com `shell: 'app'` e o `<script src="/assets/js/app/app.js">`
com o cache-busting `?v=` (o mesmo padrão do Jekyll).

- [ ] **Passo 6: commit**

```bash
git add app/vite.config.js scripts/preparar-publico.sh scripts/testar-publico.sh astro.config.mjs src/pages/index.astro
git commit -m "feat(astro): app e catálogo na raiz do dist, e a / incluindo o app"
```

---

### Tarefa 2: o middleware de dado local — uma implementação, dois servidores

**Arquivos:**

- Criar: `app/vite-plugins/dados-locais.js`
- Modificar: `app/vite.config.js` (passa a importar o módulo extraído)
- Modificar: `astro.config.mjs` (usa o mesmo módulo)
- Test: `app/src/data/integracao.test.js` (existente — **não** mudar; serve de guarda)

**Interfaces:**

- Produz: `export function dadosLocais(): Plugin` — serve `/indicators.json` (com o `datafile`
  reescrito) e `/dados/**` do repo local, **404 em voz alta** quando não existe. O CSS sai daqui (o
  Tailwind agora é compilado pelo Astro).
- Consome: `DADOS_DIR`, `../indicators.json`.

- [ ] **Passo 1: rodar a suíte antes de mexer (linha de base)**

Run: `cd app && NODE_ENV=development npm test`
Expected: **126 testes verdes** — este é o número que não pode mudar.

- [ ] **Passo 2: extrair o middleware, sem mudar o comportamento**

Mover a função `servirArquivosDoSite()` (menos o ramo do CSS) para
`app/vite-plugins/dados-locais.js`, renomeada para `dadosLocais()`. `app/vite.config.js` passa a
importá-la. **O ramo do `main.dist.css` é removido** (o arquivo deixa de existir).

- [ ] **Passo 3: usar o mesmo módulo no `astro.config.mjs`**

Em `vite.plugins`, além do `tailwindcss()`, incluir `dadosLocais()`. **O caminho relativo muda**:
o módulo vive em `app/vite-plugins/`, e o `DADOS_DIR` default (`../../dados/`) foi escrito para a
raiz do Vite do app — o middleware precisa receber a base de quem o usa, ou resolver a partir do
próprio arquivo. Escolher a forma e **registrar**; um caminho errado não falha, só **nunca casa**
(o dev server responde HTML).

- [ ] **Passo 4: rodar a suíte de novo**

Run: `cd app && NODE_ENV=development npm test`
Expected: **126 verdes**, o mesmo número (nenhum teste tocado).

- [ ] **Passo 5: verificar no `astro dev` que o dado local chega**

Run: `NODE_ENV=development npm run dev &` e então
`curl -sI http://localhost:4321/indicators.json | head -1` e
`curl -sI http://localhost:4321/dados/selic/selic.json | head -1`
Expected: `200` com `Content-Type: application/json` (não `text/html` — isto é o teste do §10.7).

- [ ] **Passo 6: commit**

```bash
git add app/vite-plugins/dados-locais.js app/vite.config.js astro.config.mjs
git commit -m "refactor(dev): middleware de dado local único, usado pelo app e pelo Astro"
```

---

### Tarefa 3: o canário repontado e o build que falha em voz alta

**Arquivos:**

- Modificar: `scripts/checar-canario.sh` (alvo novo)
- Criar: `scripts/verificar-css-do-app.sh` (opcional, se o canário precisar de um pré-passo)
- Modificar: `package.json` (script do build que encadeia app → site → canário)

**Interfaces:**

- Consome: o CSS emitido em `dist/assets/*.css` (nome com hash).
- Produz: um comando que **falha** (exit 1) se o CSS do `dist/` não contiver o token do canário —
  a única forma de a varredura perdida virar barulhenta.

- [ ] **Passo 1: repontar o canário para o `dist/`**

`CSS` deixa de ser `assets/css/main.dist.css` e passa a ser **o primeiro** `dist/assets/*.css`
(glob). **Não escrever o token no arquivo** — a montagem por partes do script atual permanece.

- [ ] **Passo 2: o teste do próprio canário — sabotar de propósito**

Com o build verde, **remover temporariamente** a classe do `app/src/App.svelte`, rebuildar e rodar o
canário.
Run: `NODE_ENV=development npm run build && bash scripts/checar-canario.sh`
Expected: **FAIL (exit 1)**. Depois restaurar a classe. Uma sabotagem que **passa** significa que o
canário está guardando o caminho errado — e um canário que não falha é decorativo.

- [ ] **Passo 3: encadear no script de build**

`package.json` (raiz de `sitio/`): `build` = app → `preparar-publico` → `astro build` → canário →
`testar-*` (URLs, feed, sitemap, público, meta). Falha em qualquer um **falha o build**.

- [ ] **Passo 4: rodar o build completo**

Run: `NODE_ENV=development npm run build`
Expected: todas as verificações `ok`, `canário OK`.

- [ ] **Passo 5: commit**

```bash
git add scripts/checar-canario.sh package.json
git commit -m "feat(build): canário repontado ao CSS do Astro e build que falha em voz alta"
```

## Critérios de aceite (fatia 05)

- [ ] `dist/indicators.json` e `dist/assets/js/app/app.js` existem.
- [ ] A suíte do app tem **126 verdes**, com **zero** teste alterado (`git diff --stat app/src/**/*.test.js` vazio).
- [ ] `curl -I` de `/indicators.json` e `/dados/selic/selic.json` no `astro dev` devolve
      `application/json` — **não** `text/html`.
- [ ] O canário fica **verde** no build normal e **vermelho** quando a classe é removida do app.
- [ ] O token do canário **não** aparece em nenhum arquivo que o Tailwind varra
      (`grep -rn` pelo token em `docs/` e `src/` = 0 fora do próprio script, montado por partes).
- [ ] **O tema da `/`** está resolvido (item aberto da spec §8) — decisão do usuário, **antes** de
      fechar esta fatia.

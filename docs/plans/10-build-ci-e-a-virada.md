# Fatia 10 — Build, CI e a virada (§10)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** o app publicado pelo CI, o `/` virando o shell do app, o legado apagado, a
**classe-canário** que falha o build se o Tailwind parar de varrer o app, e a atribuição
obrigatória do TradingView.

**Arquitetura:** o app é construído por Vite em `sitio/app/` e sai com nome fixo em
`sitio/assets/js/app/` (gitignored, como o `main.dist.css` já é). O Jekyll serve o shell.

**Stack:** GitHub Actions + Vite + Tailwind CLI v4 + `jekyll-build-pages`.

**Spec:** `...design.md` §10 (completa), §11 · **ADR:** D1, D3, D6

## Restrições globais

- **Deploy é CI-only** (`AGENTS.md`). Não publicar à mão.
- **Custo zero é invariante** (D6) — Actions é grátis em repo público.
- **Saída com nome fixo**, cacheada pelo `?v={{ site.time | date: '%s' }}` que o projeto
  já usa em todo script (§10.1).
- **`sitio/app/src` NÃO pode entrar no `.gitignore`** — o Tailwind v4 não varre pasta
  ignorada e a falha é **silenciosa** (§10.3). Daí o canário.
- **Sem fase de convivência** (§6, §10.6): a virada é **um commit**; não há flag, nem
  `index.html` carregando os dois caminhos.
- **Ordem de deploy entre os repos** (§6): `dados` publica `value` → o app entra →
  `rate` sai. Não inverter.

---

### Tarefa 1: A classe-canário e o script que falha o build

**Arquivos:**
- Modificar: `sitio/app/src/App.svelte` (acrescentar a classe-canário)
- Criar: `sitio/scripts/checar-canario.sh`
- Modificar: `sitio/package.json` (script `canario`)

**Interfaces:**
- Consome: o `main.dist.css` gerado pelo Tailwind.
- Produz: um comando que **falha** (exit 1) se a classe exclusiva do app não estiver no
  CSS — a única forma de a falha silenciosa da §10.3 virar barulhenta.

- [ ] **Passo 1: escolher e aplicar a classe-canário**

Usar uma classe utilitária com valor **arbitrário e exclusivo do app**, usada **em um
único lugar** — assim ela só existe no CSS se o Tailwind varreu `sitio/app/src`:

Em `App.svelte`, no `<main>`: `class="... bg-[#0e1117]"` — o fundo do app, que não existe
em nenhum template Jekyll.

- [ ] **Passo 2: escrever o script**

`sitio/scripts/checar-canario.sh`:

```bash
#!/usr/bin/env bash
# Falha o build se a classe exclusiva do app não estiver no CSS gerado.
# Motivo (§10.3): o Tailwind v4 NÃO varre pasta no .gitignore, e a falha é silenciosa —
# a UI perde estilo e nada acusa erro. Mesmo princípio da §9: nenhum vazio silencioso.
set -euo pipefail
CSS="assets/css/main.dist.css"
CANARIO='bg-\[\#0e1117\]'

if [[ ! -f "$CSS" ]]; then
  echo "canário: $CSS não existe — rode o Tailwind antes." >&2
  exit 1
fi

if ! grep -qF "$CANARIO" "$CSS"; then
  echo "canário FALHOU: a classe exclusiva do app não está em $CSS." >&2
  echo "O Tailwind não está varrendo sitio/app/src (pasta ignorada? .gitignore?)." >&2
  exit 1
fi

echo "canário OK: o Tailwind varreu o app."
```

- [ ] **Passo 3: provar que o canário falha de verdade**

Run (dentro de `sitio/`):
```bash
npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css
bash scripts/checar-canario.sh   # esperado: canário OK
echo "app/src" >> .gitignore      # ← sabotagem temporária
npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css
bash scripts/checar-canario.sh   # esperado: FALHOU, exit 1
git checkout .gitignore           # desfazer a sabotagem
```

**Esperado:** o canário passa na primeira e **falha** na segunda. Um canário que nunca
falhou não é um canário — esta prova é o critério de aceite (§10.7).

- [ ] **Passo 4: commitar**

```bash
cd sitio && git add app/src/App.svelte scripts/checar-canario.sh
git commit -m "feat(build): classe-canario que falha o build se o Tailwind parar de varrer o app"
```

---

### Tarefa 2: O pipeline do CI (§10.2, §10.7)

**Arquivos:**
- Modificar: `sitio/.github/workflows/github-pages.yml`

**Interfaces:**
- Consome: os scripts de `sitio/app/` e de `sitio/`.
- Produz: a ordem — `checkout` → Node → `npm ci` em `sitio/` → `npm ci && vite build` em
  `sitio/app/` → Tailwind da raiz de `sitio/` → **canário** → `jekyll-build-pages` →
  upload e deploy. **Os testes rodam ANTES do build** (§10.7).

- [ ] **Passo 1: reescrever o job de build**

Substituir o bloco `build` de `.github/workflows/github-pages.yml`:

```yaml
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: |
            package-lock.json
            app/package-lock.json

      # Falhar rápido: as contas que erram calado são testadas antes de gastar o build (§10.7)
      - name: Testes do app
        run: npm ci --prefix app && npm test --prefix app

      - name: Build do app (Vite, saída de nome fixo)
        run: npm ci --prefix app && npm run build --prefix app

      - name: CSS do site (Tailwind CLI, da raiz de sitio/)
        run: npm ci && npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css

      - name: Canário do Tailwind (§10.3)
        run: bash scripts/checar-canario.sh

      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v5
      - name: Build (Jekyll)
        uses: actions/jekyll-build-pages@v1
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
```

> `npm ci` exige `package-lock.json` commitado — os dois (site e app) entram no git
> (fatias 00 e 01). Sem o lock, trocar por `npm install`.

- [ ] **Passo 2: commitar**

```bash
cd sitio && git add .github/workflows/github-pages.yml
git commit -m "ci: testa antes de buildar, constroi o app e roda o canario"
```

---

### Tarefa 3: O `/` vira o shell do app (§10.6)

**Arquivos:**
- Modificar: `sitio/index.html`
- Modificar: `sitio/_layouts/default.html`
- Modificar: `sitio/_config.yml`

**Interfaces:**
- Consome: o bundle `assets/js/app/app.js` + `assets/css/app.css` (fatia 00) e o app
  (fatias 05–09).
- Produz: o `/` como shell (`<div id="app">` + bundle), e o fim do bloco de Chart.js.

- [ ] **Passo 1: reescrever `index.html`**

```html
---
layout: default
title: Início
---
<div id="app"></div>
<!-- Sem <link> de CSS do app: o main.dist.css (Tailwind sobre o site inteiro, que já
     varre app/src) é carregado pelo _layouts/default.html — ver R13. -->
<script type="module" src="{{ '/assets/js/app/app.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
```

- [ ] **Passo 2: apagar o bloco de Chart.js de `default.html`**

Remover **inteiro** o `{% if page.title == 'Início' %} … {% endif %}` (linhas ~74–108):
os cinco CDNs (hammerjs, chart.js, adaptador de data-fns, annotation, datalabels, zoom) e
os sete scripts locais.

- [ ] **Passo 3: excluir `app/` do Jekyll — o mesmo trap do `docs/`**

`sitio/app/` está **dentro** do site. O Jekyll copia qualquer arquivo sem front matter
**verbatim** para `_site/` — sem isto, `sitio/app/src/*.svelte` e os notebooks de build
seriam publicados em `www.brasilemnumeros.ong.br/app/...`.

Acrescentar a `_config.yml`:

```yaml
exclude:
  - Gemfile
  - Gemfile.lock
  - node_modules/
  - CNAME
  - package.json
  - package-lock.json
  - docs/
  - app/            # ← novo: o fonte do app não é publicado
  - scripts/        # ← novo: o canário não é publicado
```

- [ ] **Passo 4: verificar com um build local**

Run: `cd sitio && npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css && bundle exec jekyll build`

**Esperado:** `_site/` **sem** `_site/app/` e **sem** `_site/scripts/`; `_site/index.html`
com o `<div id="app">` e o `<script type="module">`. Se `_site/app/` existir, o exclude
não pegou — corrigir antes de seguir.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add index.html _layouts/default.html _config.yml
git commit -m "feat(site): a raiz vira o shell do app e o fonte do app sai do build"
```

---

### Tarefa 4: Apagar o legado (§11)

**Arquivos:**
- Remover: os arquivos da §11 e o que ficou sem referência

**Interfaces:**
- Consome: nada (é remoção).
- Produz: a camada antiga fora do repositório.

- [ ] **Passo 1: confirmar que nada mais referencia cada arquivo**

```bash
cd sitio
for f in chart-creator chart-integration multiselect-manager chart-manager index-functions indicator-color-manager simple-mobile-zoom-fix mobile-landscape-nav; do
  echo "== $f: $(grep -rl "$f" --exclude-dir=node_modules --exclude-dir=_site . | tr '\n' ' ')"
done
```

Esperado: cada um só aparece em si mesmo (ou em nada). **Se aparecer em um template,
parar** — a virada não pode deixar referência pendurada.

- [ ] **Passo 2: remover**

```bash
cd sitio
git rm assets/js/chart-creator.js assets/js/chart-integration.js assets/js/multiselect-manager.js \
       assets/js/chart-manager.js assets/js/index-functions.js assets/js/indicator-color-manager.js \
       assets/js/simple-mobile-zoom-fix.js assets/js/mobile-landscape-nav.js \
       _includes/config-modal.html _includes/multiselect.html
```

*(confirmar os dois `_includes` no Passo 1 — eles são citados pela §11.)*

- [ ] **Passo 3: commitar**

```bash
cd sitio && git commit -m "refactor: remove a camada de graficos antiga (Chart.js e o multiselect)"
```

---

### Tarefa 5: Atribuição do TradingView (§10.5)

**Arquivos:**
- Criar: `sitio/NOTICE`
- Modificar: `sitio/_includes/footer.html`

**Interfaces:**
- Consome: nada.
- Produz: o **link no rodapé global** (vale para todas as páginas, e não depende de o
  gráfico continuar na página em que está hoje) + o arquivo **`NOTICE`** no repo, como a
  Apache-2.0 exige.

- [ ] **Passo 1: escrever o `NOTICE`** com o nome do produto (TradingView Lightweight
      Charts), a licença (Apache-2.0) e o endereço do repositório upstream.
- [ ] **Passo 2: acrescentar uma linha ao `footer.html`** com o link para
      `https://www.tradingview.com/`.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add NOTICE _includes/footer.html
git commit -m "docs: atribuicao do TradingView Lightweight Charts no rodape e no NOTICE"
```

---

### Tarefa 6: A ordem de deploy (§6)

- [ ] **Passo 1: confirmar que `dados/` já publicou `value`** (fatia 11, passo 1). Sem
      isso, o app novo lê um campo que não existe e o gráfico quebra.
- [ ] **Passo 2: push de `sitio/`** — a virada entra num push.
- [ ] **Passo 3: só então**, o commit que retira `rate` de `dados/` (fatia 11, passo 3).

---

## Critérios de aceite da fatia 10

- [ ] O **canário falha** quando `app/src` está no `.gitignore` e **passa** quando não está
      — provado nos dois sentidos (tarefa 1, passo 3).
- [ ] O CI roda **testes antes do build** e o pipeline é exatamente o da §10.2.
- [ ] `_site/` **não contém** `app/` nem `scripts/` — verificado por build local.
- [ ] `_site/index.html` tem o `<div id="app">` e o bundle; **nenhum CDN de Chart.js**
      sobrou em `default.html`; e **nenhuma referência a `app.css`** (R13).
- [ ] `_site/` **não contém** `assets/js/app/index.html` (R13: a entrada de build é o JS).
- [ ] `grep -rn "chart-creator\|multiselect\|decideAxisForNewIndicator" sitio --exclude-dir=node_modules --exclude-dir=_site` → **sem resultado**.
- [ ] O rodapé traz o link do TradingView e o `NOTICE` existe.
- [ ] A ordem de deploy foi seguida: `dados` publicou `value` **antes** do push do `sitio`.
- [ ] Nada em `window`; nenhum `console.log` de debug em produção.

## Auto-revisão

- **Cobertura da spec:** §10.1 (Vite, saída de nome fixo, gitignored) → tarefas 1–2;
  §10.2 (ordem do pipeline) → tarefa 2; §10.3 (arquivo ignorado não é varrido + canário)
  → tarefa 1; §10.5 (atribuição) → tarefa 5; §10.6 (a virada, sem convivência) → tarefas
  3–4; §11 (o que sai) → tarefa 4; §6 (ordem de deploy) → tarefa 6.
- **Achado que o plano acrescenta:** `sitio/app/` e `sitio/scripts/` precisam entrar no
  `exclude:` do `_config.yml` — **o mesmo trap do `docs/`**, já documentado no `AGENTS.md`.
  Sem isso o fonte do app é publicado como arquivo cru.
- **Não decidido aqui, de propósito:** §10.4 registra `vite build --watch` + `jekyll serve`
  como **rejeitado por ora** — não reintroduzir.
- **Consistência de nomes:** o canário usa `bg-[#0e1117]`, a mesma cor de fundo do adapter
  (fatia 06) e do `<main>` (fatia 07) — um valor, três lugares, e é de propósito: é o que
  faz o canário detectar a varredura do app inteiro.

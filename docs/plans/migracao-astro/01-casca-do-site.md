# Fatia 01 — A casca do site

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** o layout base, o cabeçalho/rodapé, os scripts do site, as **meta tags** (que hoje vêm
de carona do `jekyll-seo-tag`) e o par consentimento + analytics — todos portados para `.astro` com o
mesmo HTML que o Jekyll servia.

**Arquitetura:** `src/layouts/Base.astro` é o shell único. A distinção que hoje é `page.title ==
"Início"` (nav em grade, botão de tema posicionado, `<main>` sem o `prose`) vira uma prop explícita
`shell`, porque a `/` passa a ser o shell do app (fatia 02) e não uma página de texto.

**Stack:** Astro (`.astro`) · Tailwind v4 · os JS do site portados verbatim.

**Spec:** §5 (D6, D7, D8), §6 · **ADR:** 0002 (decisão 6, 7, 8).

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **Meta tag perdida é falha silenciosa** (D6). Por isso o teste grep é obrigatório, não um extra.
- **Portar o HTML como está** — a migração não redesenha. Divergência de classe Tailwind precisa ser
  explicada no critério de aceite.
- **O `{% seo %}` vinha do `jekyll-seo-tag`**, que **não está** no `Gemfile` nem em `plugins:` —
  entrava de carona no `github-pages`. Recriar o conjunto à mão; **não** assumir que "some sem
  consequência".

---

### Tarefa 1: `Base.astro` e as meta tags

**Arquivos:**

- Modificar: `src/layouts/Base.astro` (**criado na fatia 00** — aqui ele cresce; não o recrie)
- Modificar: `src/pages/index.astro` (passar as props novas ao `Base.astro`)
- Criar: `src/components/Meta.astro`
- Criar: `scripts/testar-meta.sh`
- Test: `scripts/testar-meta.sh` (o teste é o script — o projeto não tem harness de unit no site)

**Interfaces:**

- Consome: nada.
- Produz: `Base.astro` com props `{ title: string, description: string, image?: string, shell?: 'app'|'pagina', canonical?: string }`; renderiza `<head>` completo + `<slot />`.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-meta.sh`:

```bash
#!/usr/bin/env bash
# Meta tags são falha silenciosa se sumirem (D6). O jekyll-seo-tag entrava de carona;
# agora são explícitas — e este script é o que impede o "sumiu e ninguém viu".
set -euo pipefail
falha=0
conferir() { grep -qF "$1" "$2" || { echo "meta: falta '$1' em $2" >&2; falha=1; }; }

PAGINA="dist/blog.html"
conferir '<meta charset=' "$PAGINA"
conferir '<link rel="canonical"' "$PAGINA"
conferir 'property="og:title"' "$PAGINA"
conferir 'property="og:description"' "$PAGINA"
conferir 'property="og:type"' "$PAGINA"
conferir 'name="twitter:card"' "$PAGINA"
conferir 'application/ld+json' "$PAGINA"
[ "$falha" -eq 0 ] || exit 1
echo "meta ok"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `NODE_ENV=development bash scripts/testar-meta.sh`
Expected: FAIL — `dist/blog.html` não existe (a página é a fatia 02).

- [ ] **Passo 3: escrever `Meta.astro` e `Base.astro`**

`Meta.astro` produz, **no mínimo** (o conjunto que o `jekyll-seo-tag` publicava):

```html
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href={canonical} />
<meta property="og:site_name" content="Brasil em Números" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content={tipo} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={image} />
<meta name="twitter:card" content="summary_large_image" />
<script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
```

`Base.astro` reproduz o `<body class="flex min-h-screen flex-col">` e o `<main>` com a regra do
`shell`: `shell === 'app'` → `pt-14` e sem `prose`; `shell === 'pagina'` → `pt-24 container mx-auto
px-6 py-8 max-w-4xl prose prose-lg prose-slate dark:prose-invert`.

> **Nota de API:** `Astro.url`, `Astro.site` e a interpolação de atributos precisam ser conferidos
> contra `node_modules/astro/dist/@types/` antes de codar.

- [ ] **Passo 4: build e ver o meta passar numa página existente**

Run: `NODE_ENV=development npm run build && PAGINA=dist/index.html bash scripts/testar-meta.sh`
Expected: `meta ok` (a `/` já existe desde a fatia 00).

- [ ] **Passo 5: commit**

```bash
git add src/layouts/Base.astro src/components/Meta.astro scripts/testar-meta.sh
git commit -m "feat(astro): layout base e meta tags explícitas (substituem jekyll-seo-tag)"
```

---

### Tarefa 2: Nav, Footer e Tooltip

**Arquivos:**

- Criar: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/TooltipInfo.astro`
- Copiar (verbatim, para `public/`): `assets/img/**`, `assets/js/theme-switcher.js`,
  `assets/js/feedback-button.js`, `assets/js/toast-artigos.js`
- Modificar: `src/layouts/Base.astro` (incluir Nav, Footer, scripts)

**Interfaces:**

- Consome: `Base.astro` (T1).
- Produz: `Nav.astro` com prop `{ shell: 'app'|'pagina' }` (a posição do botão de tema e o `grid`
  dependem dela).

- [ ] **Passo 1: portar os componentes com o HTML atual**

`Nav.astro` e `Footer.astro` reproduzem `_includes/nav.html` e `_includes/footer.html` **byte a
byte** (as classes Tailwind, os `<svg>`, o `aria-label="Alternar tema"`). A troca é só Liquid → `{}`:
`{{ '/blog' | relative_url }}` → `/blog`.

- [ ] **Passo 2: mover os assets verbatim**

```bash
mkdir -p public/assets
git mv assets/img public/assets/img
git mv assets/js/theme-switcher.js assets/js/feedback-button.js assets/js/toast-artigos.js public/assets/js/
```

- [ ] **Passo 3: conferir que o nav e o rodapé saem no `dist/`**

Run: `NODE_ENV=development npm run build && grep -c 'theme-toggle' dist/index.html && grep -c 'Política de Privacidade' dist/index.html`
Expected: ≥1 em cada (nav e rodapé renderizados).

- [ ] **Passo 4: conferir que os scripts são servidos**

Run: `test -f dist/assets/js/theme-switcher.js && echo "assets ok"`
Expected: `assets ok`.

- [ ] **Passo 5: commit**

```bash
git add src/components public/assets
git commit -m "feat(astro): nav, footer, tooltip e assets do site verbatim"
```

---

### Tarefa 3: Consentimento e analytics (só em produção)

**Arquivos:**

- Criar: `src/components/CookieConsent.astro`, `src/components/Analytics.astro`
- Modificar: `src/layouts/Base.astro`
- Criar (ou reaproveitar): verificação manual no navegador

**Interfaces:**

- Consome: `import.meta.env.PROD` (o equivalente ao `jekyll.environment == 'production'`).
- Produz: `Analytics.astro` que só **insere** o script do Google após o cookie
  `cookie-notice-dismissed === 'true'`, e **nunca** com Do-Not-Track ligado.

- [ ] **Passo 1: portar `cookie-consent.html` e `analytics.html` como componentes**

O ID do GA4 (`G-N4CFQ7CL1S`) **vem do `_config.yml`**. Nesta fatia, virar uma constante declarada em
`src/config.js` (o `_config.yml` morre na fatia 07; aqui ele ainda existe e a constante é conferida
contra ele: `grep google_analytics _config.yml`).

- [ ] **Passo 2: reproduzir o gate de produção**

O bloco que no Jekyll era `{% if site.google_analytics and jekyll.environment == 'production' %}`
vira `{import.meta.env.PROD && …}` no `Base.astro` — **consentimento e analytics não aparecem em
dev**, como hoje.

- [ ] **Passo 3: verificar no navegador — o teste que pega a falha silenciosa**

Run: `NODE_ENV=development npm run build && npx http-server dist -p 8099 &`
No navegador em `http://localhost:8099/`:
1. **Sem aceitar**: o `js` do googletagmanager **não** aparece no `<head>` (aba Network vazia para
   `googletagmanager`).
2. **Após "Aprovar"**: aparece.
3. **Com DNT ligado**: não aparece mesmo após aprovar.
4. **Zero aviso de a11y** no terminal/console.

- [ ] **Passo 4: commit**

```bash
git add src/components src/config.js src/layouts/Base.astro
git commit -m "feat(astro): consentimento e analytics com o gate de produção preservado"
```

## Critérios de aceite (fatia 01)

- [ ] `dist/index.html` e qualquer página têm `canonical`, `og:*`, `twitter:card` e JSON-LD
      (`scripts/testar-meta.sh` passa).
- [ ] O `id="google_analytics"` é o **mesmo** valor do `_config.yml` (conferido por grep).
- [ ] Com o GA4 **bloqueado até o aceite**, verificado **no navegador** (não por leitura de código).
- [ ] Consentimento e analytics **não** aparecem em dev (`import.meta.env.PROD`).
- [ ] O HTML do nav/rodapé bate com o de hoje, com **zero aviso de a11y** no terminal.
- [ ] `dark:` continua presente no CSS (`grep -o 'dark\\:' dist/assets/*.css | wc -l` > 0 — **não**
      use `grep -c 'dark:'`, que devolve 0 porque o build escapa o seletor e o CSS é uma linha só).

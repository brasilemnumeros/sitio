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
- Produz: `Base.astro` com props `{ title: string, description: string, image?: string, shell?: 'app'|'pagina', canonical?: string }`; renderiza `<head>` completo + `<slot />`. Ele **delega** o `<head>` a `Meta.astro` (props `{ title, description, canonical, tipo, image?, jsonLd? }`), que é onde vive o contrato medido do passo 3.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-meta.sh`:

```bash
#!/usr/bin/env bash
# Meta tags são falha silenciosa se sumirem (D6). O jekyll-seo-tag entrava de carona;
# agora são explícitas — e este script é o que impede o "sumiu e ninguém viu".
set -euo pipefail
falha=0
conferir() { grep -qF "$1" "$2" || { echo "meta: falta '$1' em $2" >&2; falha=1; }; }

PAGINA="${PAGINA:-dist/blog.html}"
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

> **Contrato medido ao vivo em 2026-10-18** (`curl` de `/`, `/blog` e de um post publicados). O
> `jekyll-seo-tag` não tinha `twitter`, `logo` nem `lang` no `_config.yml`, então tudo abaixo é o que
> ele **de fato** publicava. **A primeira redação deste plano estava errada** em três pontos, todos
> corrigidos por esta medição: `twitter:card` é `summary` (não `summary_large_image`),
> `twitter:title` **existe**, e `og:locale` é `en_US`.

`Meta.astro` — props `{ title, description, canonical, tipo, image?, jsonLd? }` — produz, na ordem
medida:

| tag | valor medido |
|---|---|
| `<meta charset="utf-8">` | literal |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | literal |
| `<title>` | `{title} \| Brasil em Números` |
| `<meta name="description">` | `{description}` |
| `<link rel="canonical">` | `{canonical}` |
| `<meta property="og:title">` | `{title}` — **só** o título da página, **sem** o sufixo do site |
| `<meta property="og:locale">` | `en_US` — ver nota abaixo |
| `<meta property="og:description">` | `{description}` |
| `<meta property="og:url">` | `{canonical}` |
| `<meta property="og:site_name">` | `Brasil em Números` |
| `<meta property="og:type">` | `{tipo}` — `website` em página, `article` em post |
| `<meta name="twitter:card">` | `summary` |
| `<meta property="twitter:title">` | `{title}` |
| `<meta property="og:image">` | **só** quando houver `image` (o `/blog` publicado não tem) |
| `<script type="application/ld+json">` | `{JSON.stringify(jsonLd)}` |

As duas formas de JSON-LD, medidas e **chumbadas** pelo seo-tag (não invente campos; ele não emite
`author`, `publisher` nem `image` porque o `_config.yml` não os declara):

página:
```json
{"@context":"https://schema.org","@type":"WebPage","description":"…","headline":"…","url":"<canonical>"}
```
post:
```json
{"@context":"https://schema.org","@type":"BlogPosting","dateModified":"<iso>","datePublished":"<iso>","description":"…","headline":"…","mainEntityOfPage":{"@type":"WebPage","@id":"<canonical>"},"url":"<canonical>"}
```

> ⚠️ **`og:locale: en_US` é o default do seo-tag** — o site é pt-BR e não declara `lang` no
> `_config.yml`. **Reproduza como medido** (a migração não altera metadata publicada) e **registre
> como item aberto**: mudar para `pt_BR` é decisão de produto, não de migração.
> **Não** porte `<meta name="generator" content="Jekyll v3.10.0">` — seria mentira.

`Base.astro` reproduz o `<body class="flex min-h-screen flex-col">` e o `<main>` com a regra do
`shell`: `shell === 'app'` → `pt-14` e sem `prose`; `shell === 'pagina'` → `pt-24 container mx-auto
px-6 py-8 max-w-4xl prose prose-lg prose-slate dark:prose-invert`.

**`canonical` é calculado, não opcional** — mas com a normalização do `index.html`; a expressão
exata e a medição que a justifica estão no quadro vermelho logo abaixo. **Não “embeleze” a URL
arquivo → sem-extensão** (as páginas não-raiz publicam **com** `.html`).

A `/` (`src/pages/index.astro`) passa `title="Início"` e a `description` do `_config.yml`
(medidos: `<title>Início | Brasil em Números</title>` e “Uma plataforma dedicada a fornecer dados e
informações sobre o Brasil.”). **Não** passe `shell="app"` aqui: a `/` só vira shell do app na
fatia 02/T*.

> 🔴 **A normalização do `index.html` é obrigatória — medido, não deduzido (2026-10-18).** Sob
> `build.format: 'file'`, o `Astro.url.pathname` **da raiz** é `/index.html`, e o canonical que sai
> disso (`…/index.html`) **não é o que o site publica**: ao vivo, `/` publica o canonical
> `https://www.brasilemnumeros.ong.br/`. Numa página não-raiz o pathname é o certo (sonda medida:
> `/sonda-temp.html` → `…/sonda-temp.html`, casando com o `/blog.html` ao vivo). A expressão é:
>
> ```js
> const caminho = Astro.url.pathname.replace(/\/index\.html$/, '/');
> const canonical = new URL(caminho, Astro.site).href;
> ```
>
> Isto é exatamente a semântica de `page.url` do Jekyll (a raiz é `/`, e as outras páginas têm
> extensão). **A primeira redação desta fatia afirmava que a expressão crua bastava — estava errada
> na raiz.**

> **Nota de API:** `Astro.url`, `Astro.site` e a interpolação de atributos precisam ser conferidos
> contra `node_modules/astro/dist/@types/` antes de codar.

- [ ] **Passo 4: build e ver o meta passar numa página existente**

Run: `NODE_ENV=development npm run build && PAGINA=dist/index.html bash scripts/testar-meta.sh`
Expected: `meta ok` (a `/` já existe desde a fatia 00).

- [ ] **Passo 5: commit**

```bash
git add src/layouts/Base.astro src/components/Meta.astro src/pages/index.astro scripts/testar-meta.sh
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
git add src/components src/layouts/Base.astro public/assets
git commit -m "feat(astro): nav, footer, tooltip e assets do site verbatim"
```

---

### Tarefa 3: Consentimento e analytics (só em produção)

**Arquivos:**

- Criar: `src/components/CookieConsent.astro`, `src/components/Analytics.astro`
- Criar: `scripts/testar-analytics.mjs` (a verificação executável do gate)
- Modificar: `src/layouts/Base.astro`
- Criar: `src/config.js` (o ID do GA4)

> **Ruling (2026-10-18): a verificação desta tarefa vira executável.** A primeira redação mandava
> “verificar no navegador” à mão — e um subagente **não tem navegador para olhar**, então o caminho
> natural seria ele declarar sucesso **lendo o próprio código**, que é exatamente a falha que esta
> fatia existe para impedir. O `playwright` já está instalado no projeto (em `app/node_modules`,
> onde vivem os 12 E2E do app); o script abaixo o reusa por `createRequire`. Nada de dependência
> nova, nada de instalar navegador.

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

- [ ] **Passo 3: a verificação executável — o teste que pega a falha silenciosa**

`scripts/testar-analytics.mjs` — sobe um servidor estático de `dist/` (sem dependência, `node:http`)
e roda três cenários com o Playwright. O gate tem de valer **antes** de qualquer requisição a
terceiro: a falha é silenciosa e é de privacidade (LGPD).

```js
// Verifica o gate de consentimento/DNT do analytics num build de PRODUÇÃO.
// O playwright é o de app/ (o projeto já o tem; este script não instala nada).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const require = createRequire(new URL('../app/', import.meta.url));
const { chromium } = require('playwright');

const DIST = new URL('../dist/', import.meta.url).pathname;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const servidor = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const buf = await readFile(join(DIST, normalize(p)));
    res.writeHead(200, { 'content-type': TIPOS[extname(p)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('nao encontrado');
  }
});
await new Promise((r) => servidor.listen(8099, r));

const BASE = 'http://localhost:8099/';
let falha = 0;
const conferir = (ok, msg) => { if (!ok) { console.error(`analytics: ${msg}`); falha = 1; } };

async function cenario(rotulo, { dnt = false, consentiu = false }, esperaTerceiro) {
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext();
  // O analytics lê window.doNotTrack / navigator.doNotTrack (analytics.html, verbatim).
  if (dnt) await contexto.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
  if (consentiu) await contexto.addCookies([{ name: 'cookie-notice-dismissed', value: 'true', url: BASE }]);
  const pagina = await contexto.newPage();
  const terceiros = [];
  pagina.on('request', (r) => { if (r.url().includes('googletagmanager')) terceiros.push(r.url()); });
  await pagina.goto(BASE, { waitUntil: 'load' });
  await pagina.waitForTimeout(1500);
  conferir(
    esperaTerceiro ? terceiros.length > 0 : terceiros.length === 0,
    `${rotulo}: ${terceiros.length} requisicao(oes) ao googletagmanager (esperado ${esperaTerceiro ? '>0' : '0'})`,
  );
  await navegador.close();
}

await cenario('sem consentimento', { consentiu: false, dnt: false }, false);
await cenario('apos aprovar', { consentiu: true, dnt: false }, true);
await cenario('com DNT ligado', { consentiu: true, dnt: true }, false);

servidor.close();
if (falha) process.exit(1);
console.log('analytics ok');
```

- [ ] **Passo 4: rodar e ver passar**

Run: `NODE_ENV=development npm run build && NODE_ENV=development node scripts/testar-analytics.mjs`
Expected: `analytics ok`.

> Se o build **não** for de produção, `import.meta.env.PROD` é falso e os componentes nem renderizam
> — o cenário 2 falharia. O `npm run build` do Astro já é PROD; não use `astro dev` aqui.

- [ ] **Passo 5: commit**

```bash
git add src/components src/config.js src/layouts/Base.astro scripts/testar-analytics.mjs
git commit -m "feat(astro): consentimento e analytics com o gate de produção preservado"
```

## Critérios de aceite (fatia 01)

- [ ] `dist/index.html` e qualquer página têm `canonical`, `og:*`, `twitter:card` e JSON-LD
      (`scripts/testar-meta.sh` passa).
- [ ] O `id="google_analytics"` é o **mesmo** valor do `_config.yml` (conferido por grep).
- [ ] Com o GA4 **bloqueado até o aceite**, provado por `scripts/testar-analytics.mjs` (os três
      cenários) — **não** por leitura de código.
- [ ] Consentimento e analytics **não** aparecem em dev (`import.meta.env.PROD`).
- [ ] O HTML do nav/rodapé bate com o de hoje, com **zero aviso de a11y** no terminal.
- [ ] `dark:` continua presente no CSS (`grep -o 'dark\\:' dist/assets/*.css | wc -l` > 0 — **não**
      use `grep -c 'dark:'`, que devolve 0 porque o build escapa o seletor e o CSS é uma linha só).

# AGENTS.md — Brasil em Números (site)

Instruções para agentes de código neste repositório. Valem junto com os skills
instalados (ex.: `analytics-tracking`, `ga4-event-tracking`); em caso de conflito,
**este arquivo ganha**.

## O que é este repositório

Site estático (Astro 7) + o app Svelte 5 que renderiza a home como **terminal de
gráficos**. Uma toolchain só: **Node 26** (`.nvmrc`, `engines`). O Jekyll saiu na
migração (ADR 0002).

- Domínio publicado: `https://www.brasilemnumeros.ong.br` (CNAME em `public/`).
- Deploy: push em `main` → GitHub Actions → GitHub Pages.
- Dados **não** vivem aqui: vêm do repo irmão `dados/` (séries, governos,
  contrato). Local: `../dados/`; no CI: `./dados/`, apontado por `DADOS_DIR`.
- Catálogo de indicadores: `indicators.json` na raiz (13 indicadores); é copiado
  para `public/` no build. **Não** editar a cópia.
- Conteúdo editorial: `src/content/posts/*.md` (10 posts).

## Mapa rápido

| Caminho | O que é | Quando importa |
|---|---|---|
| `src/pages/` | rotas Astro (`index`, `blog`, posts, categorias, `links`, políticas, 404, `feed.xml.ts`, `sitemap.xml.ts`) | mudou URL, HTML publicado ou SEO |
| `src/layouts/Base.astro` | casca das páginas do site (nav, footer, feedback, toast, tema) | qualquer página que **não** é a home |
| `src/layouts/Home.astro` | casca exclusiva da `/` (sem nav/footer do site; `<html class="dark">` fixo) | home, atribuição do TradingView, analytics |
| `src/components/` | `Meta.astro`, `Nav.astro`, `Footer.astro`, `Analytics.astro`, `CookieConsent.astro`, listagens | shell e SEO |
| `src/config.js` | `GA4_ID` e metadados do site (fonte única) | analytics/título/descrição |
| `src/versao.js` | selo `?v=` de cache-bust (uma vez por build) | inclusão de scripts/CSS |
| `src/styles/main.css` | entrada do Tailwind + exceções | estilo global |
| `src/lib/` | helpers puros (feed, categorias, posts, trecho, smartify) | feed/listagem |
| `app/src/` | app Svelte/Vite da home | UI e lógica do gráfico |
| `app/src/domain/` | regras puras (`scales`, `color`, `format`, `mandates`, `schema`) | lógica testável sem DOM |
| `app/src/data/` | catálogo, fetch das séries, validação, presets | contrato de dados |
| `app/src/stores/` | estado (`catalog`, `series`, `viewport`, `axes`, `mandate`) | fonte da verdade do app |
| `app/src/chart/` | adapter, pontos, faixas, minimapa (Lightweight Charts) | desenho do gráfico |
| `app/e2e/` | Playwright (10 specs + `apoio.js`) | comportamento/geometria no navegador |
| `scripts/` | guardas do build publicado | `npm run build` falhar em voz alta |
| `docs/specs/` | desenhos aprovados (o que o produto deve ser) | ler antes de mudar produto |
| `docs/adr/0001-...app-isolado.md` | ADR 0001: app de gráficos isolado, Svelte + Lightweight Charts, contrato de dados | antes de mexer na fronteira do app ou nos dados |
| `docs/adr/0002-...astro.md` | ADR 0002: migração Jekyll → Astro, contrato de URL, feed/sitemap | antes de mexer em build, rotas ou deploy |
| `docs/plans/` | planos por fatia — **histórico**, pode estar defasado | referência, não verdade |
| `docs/produto/contexto-de-produto.md` | contexto de produto: público, personas, posicionamento, voz, objeções e conversão | copy, textos de interface, decisões de produto |
| `public/assets/js/app/` | artefato do app (`app.js`, `app.css`) — gerado, gitignored | **nunca** editar à mão |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run build` | cadeia completa: `build:app` → `preparar-publico` → Astro → `verificar` |
| `npm run dev` | build do app + `preparar-publico` + `astro dev` (com `DADOS_LOCAL=1`, serve o dado local) |
| `npm run css` | regenera `assets/css/main.dist.css` (Tailwind CLI) — **necessário para o dev/E2E do app** |
| `npm run canario` | confere a classe-canário no CSS de `dist/` (exige build) |
| `npm run test:analytics` | gate de consentimento/DNT contra `dist/` (exige build) |
| `cd app && npm test` | Vitest (unidade) |
| `cd app && npm run test:e2e` | Playwright (desktop 1280×900 + Pixel 7) |
| `cd app && npm run dev` | dev server do app (Vite, porta 5173) |

`NODE_ENV=development` é necessário nos comandos do app nesta máquina (o ambiente
tem `NODE_ENV=production` e `npm omit=dev`); os scripts do Playwright já cuidam
disso.

## Cadeia de build (não pular etapas)

1. **`app/`** (Vite/Svelte) emite `public/assets/js/app/app.js` e `app.css` com
   **nome fixo** (sem manifest). O `outDir` precisa ficar dentro de `public/`,
   senão o artefato existe no disco e nunca chega ao `dist/`.
2. **`preparar-publico`** copia `indicators.json` e `NOTICE` para `public/` e
   falha se o artefato do app estiver ausente (sem isso a `/` sobe vazia).
3. **`astro build`** gera `dist/` com `build.format: 'file'`, `trailingSlash:
   'never'` e assets em `dist/assets/`.
4. **`verificar`** roda os guardas do HTML/CSS publicado:
   `checar-canario` → `testar-urls` → `testar-feed` → `testar-sitemap` →
   `testar-publico` → `testar-home` → `testar-meta` → `testar-atribuicao` →
   `testar-mobile`.

**Filosofia do repo: falha em voz alta (D6/§9).** Nenhum vazio silencioso,
nenhum fallback que esconda dado faltando. Todo guarda novo deve reprovar o build
quando o defeito aparecer — e provar isso.

## O app da home (terminal)

- A `/` **não** usa `Base.astro`: `Home.astro` monta `#app` + `app.css` + `app.js`
  e a página não rola (`100dvh`, `overflow-hidden`).
- Moldura em três faixas: **barra superior** (`HomeToolbar`), **miolo** (gráfico
  `flex-1` + **trilho direito** `SeriesDrawer`) e **barra inferior**
  (`BottomDrawer`). Gavetas abrem **em fluxo**, encolhendo o gráfico; nunca por
  cima (exceto folhas `fixed` no celular).
- Medidas atuais: topo **44px** (36 no celular), trilho **44px** (40), inferior
  **36px** (32). Elas aparecem em `app/e2e/visual.spec.js` e em comentários de
  geometria: mudar exige atualizar os dois **depois** do aval do usuário.
- `App.svelte` é dona do estado das gavetas e da prioridade do `Esc`
  (busca → direita → inferior). Os componentes não duplicam esse estado.
- **Os stores são a fonte da verdade** (`viewport`, `mandate`, `axes`, `series`,
  `catalog`). O gráfico é espelho: `app/src/chart/` assina stores, nunca o
  contrário. Não chamar a lib do gráfico de um componente de UI.
- Entrada: `?series=` válido vence tudo; chave presente sem id válido cai em
  `EstadoInicial`; sem a chave entra o **preset do dia** (calculado em
  `America/Sao_Paulo`). `permalink-init.js` roda antes de qualquer escrita de URL.
- Dados: catálogo em `indicators.json`; séries e governos no repo `dados/`. Em
  dev, o middleware `app/vite-plugins/dados-locais.js` serve `/dados/**`; em
  produção o bundle aponta para `https://brasilemnumeros.github.io/dados`.

## Site Astro

- Contrato de URL é **congelado**: raiz `/`; demais páginas com `.html`;
  `feed.xml`, `sitemap.xml` e posts preservados (SEO acumulado). Quebrar URL é
  falha, não detalhe.
- Posts: o **slug vem do nome do arquivo** (data + slug), não do `title`.
  A categoria da rota é `categories[0]`.
- `.md` do Astro 7 não entrega o front matter como props de topo — `Base.astro`
  lê `frontmatter` com fallback e **lança** se faltar `title`/`description`.
- Tema: páginas do site seguem `localStorage.theme` (escuro por padrão); a `/` é
  escura fixa, sem alternador e sem `theme-switcher.js`.
- `Meta.astro` é o contrato de meta tags/JSON-LD; `testar-meta.sh` só prova
  presença — não remova fallbacks deliberados sem ler os comentários.

## Decisões arquiteturais (ADR)

As duas ADRs são **decisões vinculantes**, não histórico. Mudá-las exige emenda/ADR
nova e aval do usuário.

- **ADR 0001 — app de gráficos isolado.** O app tem build próprio (Svelte + Vite,
  Lightweight Charts) e o site não autora componente Svelte (`@astrojs/svelte`
  **não** entra). Lógica de série, escala, cor ou eixo **não** migra para template
  do Astro. O gráfico é espelho dos stores; o domínio é puro e testável. Governos
  são dado versionado (`dados/governos/`), **sem cor de partido** — identificação
  por sigla + logo. Atribuição Apache-2.0 do TradingView é obrigação legal
  (`NOTICE` publicado + link visível + `testar-atribuicao.sh`). Custo zero de
  hospedagem/dados é invariante.
- **ADR 0002 — Astro 7 no lugar do Jekyll.** Contrato de URL publicado é
  **não-negociável** (ver seção do site). Feed virou RSS 2.0 no mesmo path;
  meta tags passaram a ser explícitas; o app continua com build separado e roda
  **antes** do site. Publicar é decisão do usuário.
- **Divergência conhecida:** o item 7 da ADR 0002 diz que o `main.dist.css` saiu;
  na prática ele continua existindo **só** para o dev/E2E do app (o workflow o
  regenera). Vale o código + este guia; a ADR está defasada nesse ponto.

## Contexto de produto e voz

- O contexto de produto vive em `docs/produto/contexto-de-produto.md` (v3, 2026-10-28):
  público prioritário (jornalista/criador de conteúdo), personas, diferenciais
  (método aberto, contexto de governo, apartidarismo), objeções, glossário,
  palavras a evitar e a conversão do produto (**compartilhar o gráfico**).
- Leia antes de escrever **copy, títulos, CTAs ou textos de interface**. A voz é:
  didática, transparente, cuidadosa com causalidade, apartidária, direta e visual.
- **Nunca** prometer certeza ("a verdade sobre"), sugerir causalidade entre
  mandato e indicador ou dar recomendação de investimento.
- O documento é uma **fonte de contexto, não de verdade técnica**: ele tem campos
  **⚠ a confirmar** e itens que envelheceram (ex.: ainda cita o site Jekyll e diz
  que o permalink não existe; hoje é Astro e o app já tem "copiar link"). Confira
  no código antes de usar como fato.
- Ao revisar esse arquivo, suba a versão e registre a mudança no **Changelog**
  dele (uma linha por revisão). Ele é versionado no git.

## Testes e verificação

| Alvo | O que cobre |
|---|---|
| `app/src/**/*.test.js` (Vitest, ~20 arquivos) | domínio, stores, dados, permalink, presets |
| `app/e2e/*.spec.js` (Playwright) | casca, busca, trilho, presets, permalink, mobile, geometria |
| `scripts/testar-*.sh` | HTML/CSS publicado, contrato de URLs, feed, sitemap, 404 |
| `scripts/testar-analytics.mjs` | GA4 não carrega sem consentimento nem com DNT |
| `scripts/testar-mobile.mjs` | todas as páginas de `dist/` sem transbordo a 375px |

- O E2E falha com **qualquer `console.error` ou exceção não capturada**
  (`app/e2e/apoio.js`). Não silencie erro para “passar”.
- O E2E roda contra o **dev server do app**, que serve
  `assets/css/main.dist.css`: se você mudou classes Tailwind no app, rode
  `npm run css` antes — senão o teste mede CSS velho.
- `app/src/domain/mandates.medicao.test.js` depende dos dados reais: se ele
  falhar em contagens, compare com o repo `dados/` antes de culpar código.
- **Antes de dizer “pronto”:** `npm run build`, `cd app && npm test`,
  `cd app && npm run test:e2e` e `npm run test:analytics`. Reporte a saída.

Scripts avulsos que **não** estão no `verificar` (`testar-build-astro.sh`,
`testar-listagem.sh`, `testar-posts.sh`, `testar-feed-itens.mjs`) são legado da
migração; não os use como validação principal.

## Armadilhas conhecidas

- **Classe-canário.** Existe uma única classe Tailwind exclusiva do app, escrita
  **uma vez só** em `app/src/App.svelte`. O Tailwind varre `docs/`, `scripts/` e
  `AGENTS.md`; repetir o token em qualquer arquivo cria um segundo produtor e
  cega o canário. Por isso o nome dela nunca é citado fora do `<main>`.
- **Tailwind v4 não varre pasta no `.gitignore`.** Se `app/src` cair no ignore,
  o CSS perde as classes e o build falha no canário — a falha seria silenciosa.
- **`assets/css/main.dist.css` é só dev/E2E.** Produção usa o CSS que o Astro
  emite em `dist/assets/*.css`. O arquivo é gitignored: rode `npm run css`.
- **`.github/` é ignorado por convenção.** O workflow já é tracked; arquivo
  **novo** ali exige `git add -f`.
- **Caminho de dado errado não falha.** O middleware responde HTML e o app
  “carrega” vazio. Confira `Content-Type`/dado, não só status 200.
- **Artefato de dev não pode ir para produção:** `publico` exige a URL do Pages
  no `app.js` (`DADOS_LOCAL=1` só em dev).
- **Números de teste e status em `docs/plans/` envelhecem** (contagens, “nada
  publicado”). A verdade é o código + `docs/specs/` + `docs/adr/`.

## Analytics (GA4)

### Estado atual (não presumir outro)

- GA4 `G-N4CFQ7CL1S` via **gtag.js direto**, inline em
  `src/components/Analytics.astro`. **Não existe GTM e não se cria container.**
- O script do Google só é inserido **depois** do consentimento LGPD
  (`cookie-notice-dismissed=true`) e **nunca** com Do-Not-Track ligado. Antes
  disso, zero requisição a terceiro.
- Consent Mode: `ad_storage`, `ad_user_data`, `ad_personalization` sempre
  `denied`; `analytics_storage: granted` apenas porque o script já nasce pós-consentimento.
- `src/config.js` (`GA4_ID`) é a única fonte do ID. Não duplicar o valor.
- Gate coberto por `scripts/testar-analytics.mjs` (`npm run test:analytics`),
  que roda contra `dist/` de produção com Playwright.

### Regras ao instrumentar eventos

1. **Sem GTM.** Nada de `GoogleTagManager`, `dataLayer` de container, tag/trigger/
   variable. Eventos vão por `gtag('event', ...)`.
2. **Nada dispara antes do consentimento.** Não enfileirar eventos em
   `window.dataLayer` antes do "Aprovar": o `Analytics.astro` só cria o `dataLayer`
   depois do gate. Instrumentação deve verificar `typeof gtag === 'function'` e,
   se não existir, **descartar** o evento (não guardar para depois).
3. **Delegação de eventos.** O site tem SPA Svelte (`app/`) e conteúdo renderizado
   no cliente. Listeners presos a elementos no `DOMContentLoaded` não pegam
   conteúdo dinâmico — usar delegação a partir de `document`.
4. **Nomenclatura:** `object_action`, minúsculo, snake_case, em inglês
   (`outbound_link_clicked`, `nav_link_clicked`, `post_read_50`). Contexto vai em
   parâmetros, não no nome. Não usar nomes reservados do GA4 (`click`, `scroll`,
   `view_search_results`, `purchase`, etc.) nem `event_category`/`event_label`
   (são parâmetros de Universal Analytics; o GA4 os ignora como métrica).
5. **Sem PII.** Nunca enviar e-mail, nome, telefone, texto digitado, URL com query
   de busca interna ou parâmetro que identifique pessoa.
6. **Parâmetros enxutos**, com nomes estáveis: `link_url`, `link_domain`,
   `link_text`, `location` (`nav`, `footer`, `links`, `post`), `category`,
   `post_slug`, `percent_scrolled`.
7. **Conversões:** marcar no Admin do GA4 só o que responde a uma decisão
   (ex.: clique em link externo de parceiro). Não marcar pageview.

### Ordem de prioridade para o site

1. Links externos de saída (página `/links`, GitHub, parceiros) — `outbound_link_clicked`.
2. Navegação interna: nav, categorias, "últimas publicações" — `nav_link_clicked`.
3. Leitura de post: 50%/90% de scroll por slug — `post_read`.
4. Compartilhamento/CTA quando existirem — `share_clicked`, `cta_clicked`.
5. Busca interna (se houver) — `search_performed` (sem o termo digitado).

### Validação obrigatória (evidência, não afirmação)

- `npm run build` e depois `npm run test:analytics`.
- Ampliar `scripts/testar-analytics.mjs` quando adicionar evento: cenário
  **sem consentimento** deve provar que nenhuma requisição a
  `googletagmanager.com` acontece e que nenhum evento é enfileirado.
- DebugView só depois do consentimento; documentar o que foi observado.

### Arquivos de referência

- `src/components/Analytics.astro` — carregamento e Consent Mode.
- `src/components/CookieConsent.astro` — grava o cookie de decisão.
- `src/config.js` — `GA4_ID`.
- `scripts/testar-analytics.mjs` — teste do gate.

## Convenções do projeto

- Comentários e textos de interface em **português**; nomes de código em inglês
  quando seguem a API (eventos GA4, props).
- Comentários explicam **por que**, não o que. Decisões com histórico (medições,
  datas, alternativas descartadas) ficam no código perto do trecho.
- O build encadeia `app/` (Svelte/Vite) → `preparar-publico` → Astro → `verificar`.
  Não pular etapas ao validar.
- Não commitar `dist/`, `node_modules/` nem credenciais.
- Atributos `data-bloco` / `data-testid` são contrato dos testes: não renomear
  sem atualizar os specs.

## Ajustes visuais são iterativos

- Ao ajustar layout, tamanhos ou aparência a pedido do usuário, aplique primeiro
  **só no código de produto** e mostre/descreva o resultado.
- **Não trate a medida como definitiva antes da confirmação do usuário:** não
  atualize testes, asserções de geometria nem comentários que fixam os números
  antigos nessa primeira rodada. Esses valores costumam ser calibrados em mais de
  uma tentativa, e os testes só devem registrar a decisão final.
- Vale o mesmo para qualquer mudança "de acabamento" (cores, espaçamentos,
  fontes): confirmar antes de propagar para testes e documentação.
- Ao mudar medidas fixas (altura de barras, largura do trilho), procure também os
  consumidores fora do app — ex.: a posição do link de atribuição em
  `Home.astro` depende da altura da barra inferior.

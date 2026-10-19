# ADR 0002 — Migrar o site de Jekyll/Liquid para Astro

**Data da decisão:** 2026-10-18
**Estado:** **implementado** (fatias 00–07, 2026-10-19). **Não publicado** — o push está segurado por decisão do usuário.
**Desenho (detalhe canônico):** `sitio/docs/specs/2026-10-18-migracao-astro-design.md`
**Relação com a ADR 0001:** a 0001 listava "Migração de stack do site (Astro / Cloudflare Pages)"
como **fora de escopo**. Esta ADR decide a parte do Astro; o Cloudflare Pages continua não avaliado.

---

## Resumo

O site deixa de ser construído por Jekyll/Ruby e passa a ser construído por **Astro 7 (Node)**, que
também hospeda o app Svelte que já existe. O app continua um módulo autocontido. O contrato de URL
publicado é preservado. Nada é publicado nesta decisão.

## Contexto

Duas toolchains — Jekyll/Ruby e Node/Vite — produzem **um site estático**. A motivação não é dor no
dia a dia; é peso e perenidade:

- A stack Ruby **não roda nesta máquina** (medido em 2026-10-18: o `Gemfile.lock` pede Ruby ≥3.2 e
  `bundler 2.7.1`; só existe o Ruby 2.6.10 do sistema). O build é CI-only.
- `github-pages` **232 é a última versão**, de 2024-08-06, e pina `jekyll = 3.10.0` (2022). Não há
  versão mais nova desse caminho — é teto, não escolha de versão.
- A doc do GitHub passou a recomendar Actions e a despriorizar o gem.
- A ADR 0001, ao reconstruir a camada de gráficos, já tinha nomeado esta migração como candidata e
  a adiado.

## Decisão

1. **Astro 7.4.0** é o gerador único do site. Saem do repositório: `Gemfile`, `Gemfile.lock`,
   `_config.yml`, `_layouts/`, `_includes/`, `_site/` e o passo `jekyll-build-pages` do workflow.
   A seção "O site Jekyll" do `AGENTS.md` passa a ser história.
2. **A fronteira do app fica de pé — e o app não é uma ilha do Astro.** Correção de 2026-10-18,
   apontada na revisão do desenho: se o Astro fizesse o build e a hidratação do app, o E2E do app
   passaria a depender do dev server do site — o oposto de "não depender do site para ser testado".
   O app **mantém o próprio build** (`app/vite.config.js`, shell próprio, saída fixa
   `assets/js/app/app.js`) e o site o consome por `<div id="app">` + `<script>`, como hoje. Como o
   site **não autora componente Svelte nenhum**, **`@astrojs/svelte` não entra**. A ordem do build é
   **app primeiro, site depois**. Lógica de série, escala, cor ou eixo **não** migra para dentro de
   template do site — é exatamente o que a fatia 10 gastou 4.359 linhas medidas para desfazer.
3. **O contrato de URL é não-negociável.** Verificado no site publicado em 2026-10-18: `/blog` e
   `/blog.html`, os posts com e sem `.html`, `/categorias/analises(.html)`, `/feed.xml`,
   `/sitemap.xml` e as páginas sem extensão — todas 200. O Pages serve as duas formas de `.html`;
   gerar arquivos `.html` preserva ambas. `build.format: 'file'` + `trailingSlash: 'never'`
   (o default do Astro é `'directory'`, então isto é configuração explícita).
4. **O permalink do app (`?indicators=`) é implementado no app**, não no site: query string é
   client-side e nenhum gerador estático a toca. O app não lê query string nenhuma hoje — o que já
   estava registrado em `docs/specs/2026-10-17-plano-de-tagueamento.md` §3, onde o permalink é
   também pré-requisito do evento de conversão `share`. **Limitação aceita:** um link compartilhado
   não terá preview próprio (og:image/meta) — seriam N combinações de séries.
   **Decidido em 2026-10-18: esta fatia entra ANTES da publicação.** Publicar a virada sem ela
   regride ~11 links dos posts, que hoje funcionam em produção (o app legado lia a query) e
   passariam a apontar para um app que a ignora. Publica-se uma vez só, já com o permalink de pé.
5. **Feed e sitemap são reimplementados, nos mesmos paths** (`/feed.xml`, `/sitemap.xml`).
   `@astrojs/rss` e `@astrojs/sitemap` são candidatos; o **path de saída de cada um precisa ser
   verificado nos pacotes** na implementação, porque o default do sitemap do Astro é um índice com
   arquivos numerados, e o do `jekyll-sitemap` é um arquivo único.
6. **Meta tags passam a ser explícitas.** O `{% seo %}` vinha do `jekyll-seo-tag`, que entrava de
   carona no `github-pages` (não estava no `Gemfile` nem em `plugins:`). Passa a ser escrito no
   layout base, com teste — perder meta tag é falha silenciosa.
7. **Tailwind v4 pelo `@tailwindcss/vite`**, dentro do build do Astro. Saem o `main.dist.css`
   gerado por CLI e o middleware que o servia em dev.
8. **Analytics e consentimento são portados como estão** (`analytics.html` com GA4 + Consent Mode
   carregado só após o aceite, e `cookie-consent.html`). Requisito legal; verificação no navegador.
9. **O deploy continua por Actions**, com menos passos: sai o `jekyll-build-pages`, ficam
   `configure-pages` e `upload-pages-artifact`.
10. **Publicar acontece uma vez só, no fim, com aval explícito do usuário** — a virada da fatia 10
    (no repo, não publicada) e o `dados` (não publicado) seguram até então.

## Alternativas rejeitadas

| alternativa | por quê |
|---|---|
| Ficar no Jekyll e instalar Ruby 3.3 | Desbloqueia a máquina, não o objetivo: mantém duas stacks e uma base despriorizada. |
| Jekyll 4.4.1 com build próprio | Stack viva, mas ainda duas. Fica como plano B. |
| `jekyll-v4-github-pages` (gem comunitária) | Publicador é pessoa física; auditar custa mais que migrar. |
| Eleventy | Migração mais barata, mas é **segunda** ferramenta de build ao lado do Vite: não unifica. |
| Hugo | Seria uma **terceira** stack (binário Go, outra linguagem de template). |
| SPA total (tudo no app) | Perde HTML estático de 10 posts + 4 páginas, feed e sitemap; re-acopla chrome e app. |
| `sitio/` sem gerador (`.nojekyll` + HTML à mão) | Feed, sitemap e listagem de posts passariam a ser manuais. |
| Cloudflare Pages | É alternativa de **hospedagem**, não de stack. Não avaliada. |

## Consequências

- **Some o Ruby** do projeto: uma stack (Node), e o build roda nesta máquina sem instalar nada além
  do Node 26 que já existe.
- **Some a razão da seção "O site Jekyll"** do `AGENTS.md` — que descreve um build que não roda
  localmente e um `Gemfile.lock` que o próprio CI não usa (o container do
  `jekyll-build-pages` roda **Ruby 3.3**, medido no `Dockerfile` em 2026-10-18).
- **Zero framework novo**: `@tailwindcss/vite` 4.3.3 aceita `vite ^8` (o repo tem 8.3.4). O Vite que
  o Astro traz por dentro é o mesmo que o app já usa. `@astrojs/svelte` 9.1.0 foi medido e é
  compatível, mas **não entra** (D2): o site não autora componente Svelte.
- O `404.html` — que referencia `layout: page`, **inexistente**, conforme a ADR 0001 — morre nesta
  migração e vira uma página `404.astro`.
- `blog_categories` (usado por nenhum template) e `tailwind.config.js` (config morta desde a v4)
  **não** são portados.
- Risco principal: **quebrar uma URL publicada** ou perder meta tag em silêncio. Ambos são
  cobertos por verificação no §10 do desenho.

## Resolvido durante a execução (2026-10-18)

- **O tema da `/`: `/` escura fixa, sem o botão de tema** (opção (a) do §8). As outras páginas mantêm
  o alternador. Preserva a paleta medida para as 10 séries — a opção (b) a invalidaria. Fecha o item
  que estava aberto acima; a fatia 05 implementa.
- **O feed mudou de produtor *e de dialeto*: `jekyll-feed` (Atom) → `@astrojs/rss` (RSS 2.0).** O path
  `/feed.xml` não muda. O conteúdo foi comparado item a item (10 posts, mesmos links; o `description`
  leva o HTML integral com as URLs absolutizadas). Aceito pelo usuário.
- **Quatro defeitos do site atual foram consertados em vez de reproduzidos** (decisão do usuário):
  `og:locale` `en_US`→`pt_BR`; o mês em inglês nas datas → português; o corpo do 404 em inglês →
  português; `target="\_blank"`/falta de `rel` → `target="_blank" rel="noopener noreferrer"`. A
  migração vinha reproduzindo o publicado **byte a byte**, inclusive os defeitos; estas são a
  exceção deliberada. Detalhe no §8.1 do desenho.

## Fora de escopo (não decidido aqui)

- **Cloudflare Pages** e qualquer mudança de hospedagem.
- **Automatizar o pipeline de dados** (os notebooks seguem manuais).

## Implementado (2026-10-19)

A migração foi executada em 7 fatias (`sitio/docs/plans/migracao-astro/`, 00 a 07). O Jekyll saiu do
repositório — `Gemfile`, `Gemfile.lock`, `_config.yml`, `_layouts/`, `_includes/` e as páginas
`.html` (fatia 07). O CI (`.github/workflows/github-pages.yml`) passou a rodar `npm run build`
(Astro → `dist/`) e a publicar `dist/` via `upload-pages-artifact`; o `jekyll-build-pages` saiu.

O build roda **do zero nesta máquina** (`npm ci && npm run build`, sem Ruby): 20 páginas, feed,
sitemap, catálogo e o app. O critério "uma stack" (spec §10.6) fecha: nenhuma linha **viva** fora de
`docs/` menciona jekyll/liquid/ruby (sobram só os comentários de história e um metadado de
`peerDependencies` de terceiro em `package-lock.json`). **Falta só o push**, que segue sendo decisão
do usuário.

## Referências

- Desenho: `sitio/docs/specs/2026-10-18-migracao-astro-design.md`.
- `sitio/docs/adr/0001-camada-de-graficos-como-app-isolado.md`.
- `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` §10 (substituído).
- `sitio/docs/specs/2026-10-17-plano-de-tagueamento.md` §3.
- Astro: `https://docs.astro.build/en/reference/configuration-reference/` (2026-10-18).

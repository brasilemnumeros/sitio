# Migração do site de Jekyll/Liquid para Astro — desenho

**Data:** 2026-10-18
**Estado:** desenho em revisão. Nada foi publicado nem implementado.
**ADRs:** cria a ADR 0002; a ADR 0001 listava esta migração como fora de escopo.
**Substitui (na parte do site):** `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` §10
(toolchain, build e integração com o Jekyll). O conteúdo do §1–§9 daquela spec — a *camada de
gráficos* — **permanece em vigor e não é tocado**.

---

## 1. Intenção e o porquê

Hoje o site precisa de **duas toolchains** para entregar **um site estático**: Jekyll/Ruby (as
páginas, os posts, o feed, o sitemap, as meta tags) e Node/Vite (o app). Nenhuma das duas está
atrapalhando no dia a dia — mas:

- A stack Ruby **não roda nesta máquina** (medido em 2026-10-18: `Gemfile.lock` pede Ruby ≥3.2,
  `bundler 2.7.1`, e a máquina só tem o Ruby 2.6.10 do sistema). O build é CI-only.
- Ela está **desatualizada e despriorizada por quem a mantém**: `github-pages` 232 (2024-08-06)
  pina `jekyll = 3.10.0` (2022), e a doc do GitHub passou a dizer que *"GitHub Actions is now the
  recommended approach"*.
- O `github-pages` **não tem versão mais nova**. Este é o teto do caminho, não uma escolha de
  versão.

O objetivo não é "modernizar por moda": é **remover uma das duas stacks** e ficar com a que a
máquina executa bem, numa base viva.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**

1. Uma toolchain só (Node) para site + app.
2. **Preservar o contrato de URL** publicado (§4) — em especial o feed, o sitemap e as URLs dos
   posts, que têm SEO acumulado.
3. **Preservar a fronteira do app**: o app continua um módulo autocontido, com a própria suíte
   rodando em node, sem depender do site para ser testado.
4. Não perder nenhuma capacidade do site atual: posts, categorias, feed, sitemap, meta tags,
   analytics com consentimento, tema claro/escuro das páginas do blog.

**Não-objetivos** (nesta migração)

- Redesenhar o site ou o app. O HTML/CSS saem iguais, se possível byte a byte no que o usuário vê.
- Automatizar o pipeline de dados (notebooks) — continua manual.
- Publicar: **o push está segurado por decisão do usuário** (2026-10-18). A publicação acontece
  uma vez só, no fim, e só com aval.

**Anti-objetivos** (o que faria isto fracassar mesmo "funcionando")

- Quebrar uma URL publicada. `404` ou link morto em `/feed.xml`, `/sitemap.xml` ou nas URLs dos
  posts é falha, não detalhe.
- Re-acoplar o app ao site: lógica de gráfico dentro de template do site é exatamente o que a
  fatia 10 gastou para desfazer (4.359 linhas medidas).
- Perder o gate de consentimento do GA4 — é obrigação legal, não enfeite.

## 3. Restrições e o que foi medido

| item | medido em 2026-10-18 |
|---|---|
| `astro` | **7.4.0** (`engine`: `node >=22.22.0` — a máquina tem node 26.11.1 ✓) |
| `@astrojs/svelte` | 9.1.0 — peer `astro ^7.0.0`, `svelte ^5.43.6` (o repo tem **5.57.2** ✓) |
| `@tailwindcss/vite` | 4.3.3 — peer `vite ^5.2 \|\| ^6 \|\| ^7 \|\| ^8` (o repo tem **8.3.4** ✓) |
| `@astrojs/rss` | 4.0.19 |
| `@astrojs/sitemap` | 3.7.4 |
| Jekyll hoje | 3.10.0 via `github-pages` 232 (2024-08-06) |
| Superfície a portar | ~1.050 linhas de template (§6) |

**Zero framework novo.** O Vite que o Astro traz por dentro é **o mesmo** que o app já usa.

`@astrojs/svelte` 9.1.0 foi medido e é compatível — mas **não entra**, pela razão da D2: o site não
autora componente Svelte nenhum. Ele só inclui um artefato já construído.

**Sobre o container do build:** `actions/jekyll-build-pages@v1` roda
`ghcr.io/actions/jekyll-build-pages:v1.0.13`, cujo `Dockerfile` usa **Ruby 3.3**. O build de hoje
já não é o que o `Gemfile.lock` local descreve — é uma terceira configuração.

## 4. Contrato de URL (não-negociável, verificado no site publicado)

Medido com `curl` em `https://www.brasilemnumeros.ong.br` (2026-10-18), todas **200**:

| forma | exemplo |
|---|---|
| post **com** e **sem** `.html` | `/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros` e `....html` |
| página **com** e **sem** `.html` | `/blog` e `/blog.html` · `/categorias/analises` e `/categorias/analises.html` |
| sem extensão | `/sobre` `/links` `/termos-de-uso` `/politica-de-privacidade` |
| feed | `/feed.xml` |
| sitemap | `/sitemap.xml` |

Duas conclusões que o desenho aproveita:

1. O Pages **já serve as duas formas** (com e sem `.html`). Gerar arquivos `.html` preserva as duas
   de uma vez, no mesmo host — o que dispensa qualquer camada de redirecionamento.
2. As URLs dos posts têm o padrão default do Jekyll
   (`/:categories/:year/:month/:day/:title:output_ext`), porque **não há `permalink:` no
   `_config.yml`**. Reproduzir esse padrão é requisito, não preferência.

## 5. O que foi decidido

### D1 — Astro 7 é o gerador único; o Ruby sai

Astro, na versão 7.4.0, substitui Jekyll. Saem do repositório: `Gemfile`, `Gemfile.lock`,
`_config.yml`, `_layouts/`, `_includes/`, `_site/`, e o passo `actions/jekyll-build-pages` do
workflow. O `AGENTS.md` perde a seção "O site Jekyll" inteira — que passa a ser história.

### D2 — A fronteira do app fica de pé, e o app **não** é uma ilha do Astro

**Correção de 2026-10-18** (apontada na revisão do desenho): a redação anterior dizia "ilha Svelte"
e isso contradizia o objetivo 3. Se o Astro fizesse o build e a hidratação do app, o **E2E do app
passaria a depender do dev server do site** — o oposto de "não depender do site para ser testado".

Decidido: **o app mantém o build próprio** e o site o consome como artefato.

- O app continua com `app/vite.config.js`, o shell `app/index.html` (usado pelo `vite dev` e pelo
  Playwright) e a saída de nome fixo `assets/js/app/app.js`.
- O site inclui o app por `<div id="app">` + `<script src="/assets/js/app/app.js">` — como faz
  hoje. **Não há componente Svelte autorado no site**, então **`@astrojs/svelte` não entra**.
- A ordem no build passa a ser: **app primeiro, site depois** (o artefato precisa existir quando o
  site é construído), como o Tailwind já era construído antes.
- `__BASE_DADOS__` e o plugin de dado local **continuam no `app/vite.config.js`** — é de lá que o
  `vitest` os enxerga hoje, e movê-los quebraria os testes de `stores/mandate.js` com
  `ReferenceError`. O `astro.config.mjs` não precisa saber que eles existem.
- **A suíte fica intacta**: 126 unitários + 12 E2E verdes **sem alteração forçada**. (Isto é
  invariante da migração, não proibição de testes novos: ver D13.)

**O que isto proíbe:** mover lógica de série, escala, cor ou eixo para dentro de template do site.

### D3 — Contrato de URL preservado por configuração, não por remendo

`build.format: 'file'` + `trailingSlash: 'never'` (a reference do Astro diz que os dois andam
juntos). `build.format` aceita `'file' | 'directory' | 'preserve'`, e **`'directory'` é o
default** — gerar `.html` exige configurar. Rotas de post são geradas com o padrão do §4.

### D4 — Permalink do app é requisito, resolvido no app

Os posts linkam para `/?indicators=<ids>`. **O app não lê query string nenhuma hoje** (medido: zero
ocorrências de `URLSearchParams`/`location.search`) — o que já está registrado, por escrito, em
`sitio/docs/specs/2026-10-17-plano-de-tagueamento.md` §3, junto com a nota de que o permalink é
pré-requisito do evento de conversão `share`.

Decidido: o permalink é implementado **no app** (`location.search` → store), não no site. O site
apenas não interfere — query string é client-side e nenhum gerador estático a toca.

**Limitação aceita e registrada:** um link compartilhado não terá preview próprio (og:image/meta).
Seriam N combinações de séries; gerar páginas por combinação é inviável e não desejado. O card do
link continua sendo o da home.

### D5 — Feed e sitemap são reimplementados, mas nos **mesmos paths**

`/feed.xml` e `/sitemap.xml` continuam sendo os endereços publicados. `@astrojs/rss` e
`@astrojs/sitemap` são os candidatos; **o path de saída de cada um precisa ser verificado na
implementação** (o sitemap do Astro publica, por padrão, um índice + arquivos numerados, e o do
Jekyll publica um arquivo único) — se o path default divergir, é configuração ou endpoint próprio,
não aceitação da mudança de URL.

### D6 — Meta tags (o `{% seo %}`) passam a ser explícitas

O `{% seo %}` vem do `jekyll-seo-tag`, que hoje entra **de carona** no `github-pages` — não está
no `Gemfile` nem em `plugins:` do `_config.yml`. Na migração, o conjunto (canonical, `og:*`,
`twitter:*`, JSON-LD) passa a ser escrito no layout base. **Risco a cobrir por teste:** perder
meta tag é falha silenciosa.

### D7 — Tailwind v4 pelo `@tailwindcss/vite`, dentro do build do Astro

Sai o `main.dist.css` gerado por CLI e sai o middleware que o servia em dev. O `main.css` passa a
ser importado pelo layout, e o plugin `@tailwindcss/vite` (o mesmo que o app pode usar) compila
dentro do build. **Efeito colateral desejado:** desaparece a classe "arquivo gerado que o dev
server precisa servir de fora da raiz", que já custou uma rodada silenciosa (§10.4 da spec antiga).

**Duas coisas que a D7 não pode matar junto** (levantadas na revisão do desenho):

1. **O app é estilizado pelo CSS do site, e isso continua.** A §10.1 da spec antiga rejeitou o app
   ter build de Tailwind próprio, para não carregar o mesmo CSS duas vezes — ou seja, o Tailwind
   **do site tem de varrer `app/src`**, onde vivem as classes dos componentes Svelte. Essa
   varredura é a razão de existir do `scripts/checar-canario.sh`, e ele **não pode** sair na
   migração: sem canário, o modo de falha é "página sem estilo, em silêncio" — medido antes.
2. **O canário precisa de novo alvo.** O script lê `assets/css/main.dist.css`, que deixa de existir;
   ele passa a ler o CSS emitido no `dist/` do Astro (nome com hash → glob). Se o
   `@tailwindcss/vite` dentro do Astro, rodando com a raiz do projeto, **não** descobrir `app/src`,
   o canário tem de **falhar o build** — é para isso que ele existe.
   ⚠️ **O token do canário não pode aparecer na documentação** (o Tailwind varre `docs/` e extrai
   candidatos de texto — é a armadilha que o próprio `checar-canario.sh` já documenta). Escrito
   literalmente aqui, ele cria um segundo produtor e **cega** o canário.

### D9 — O dado continua vindo do repo `dados/`, com uma implementação e dois servidores

Em dev, o app lê o repo irmão `../../dados/` e o catálogo tem o `datafile` reescrito; em produção,
lê o Pages. Hoje isso é o middleware do `app/vite.config.js`.

**Decisão (ajustada pela revisão):** com a D2, passam a existir **dois** servidores de dev — o
`vite dev` do app (que o Playwright sobe) e o `astro dev` do site (que serve a `/`). O middleware
**não é copiado**: a lógica é extraída para um módulo único (ex.: `app/vite-plugins/dados-locais.js`)
importado pelos **dois** configs. Duplicar seria criar dois lugares para a mesma decisão — o que a
convenção deste repo proíbe.

**`__BASE_DADOS__` fica onde está** (`app/vite.config.js`): é um `define` de build do app, e é de lá
que o `vitest` o enxerga. Levá-lo para o `astro.config.mjs` quebraria os testes de
`stores/mandate.js` com `ReferenceError` — e o fetch de governos engole o erro
(`catch { store.set(inicial) }`), então o sintoma em produção seria **trilho vazio, sem erro**.

**`indicators.json` precisa pousar na raiz do `dist/`** — o app o busca em runtime em
`/indicators.json`. No Jekyll ele era servido da raiz; no Astro, o lugar dele é o `public/`, que é
copiado verbatim. Ele **não** estava listado na superfície a portar (§6) — omissão corrigida aqui.

**Fricção honesta aceita:** em `astro dev`, a `/` carrega o **artefato construído** do app
(`assets/js/app/app.js`, nome fixo, gitignored) — não o app em HMR. Iterar no app é com o `vite dev`
dele, como hoje. Olhar o app *dentro do site* exige construir o app antes. É o preço de manter a
fronteira, e é barato.

### D8 — Analytics e consentimento são preservados como estão

`_includes/analytics.html` (GA4 + Consent Mode, carregado **só após consentimento**) e
`_includes/cookie-consent.html` são portados. Não é enfeite: é requisito legal. Qualquer
reformatação passa por verificação no navegador, não por leitura.

### D10 — Deploy continua por Actions, com menos passos

O workflow perde o `jekyll-build-pages` e passa a rodar o build do Node; `configure-pages` e
`upload-pages-artifact` ficam. O `Gemfile` sai do `cache-dependency-path`.

### D11 — O tema da `/` é decidido **na** migração, não herdado

Hoje a `/` tem **duas cascas**: em dev, `app/index.html` com `<html class="dark">` hardcoded; em
produção, `_layouts/default.html` **sem** `dark`, com o `theme-switcher.js` aplicando a classe
depois e o botão de tema **visível**. Resultado: quem escolheu "claro" no site abre o app claro,
com o canvas fixo `#0e1117` por cima — e o E2E não pega, porque testa o shell de dev.

Na migração, a `/` deixa de ser um shell montado pelo layout. **Ainda não decidido** qual das duas
saídas (ver §8).

### D13 — O permalink do app entra **antes** da publicação (decidido em 2026-10-18)

Os ~11 links dos posts são `/?indicators=<ids>`. **O app publicado hoje lê essa query** (o
`index-functions.js` legado a consome); o app **novo não lê nada**. Portanto:

> Publicar a virada **regride** esses links — eles já estão mortos no repo, e passariam a estar
> mortos em produção. Não é a migração que os quebra, mas é a publicação que os entrega quebrados.

**Decidido pelo usuário em 2026-10-18:** o permalink **é uma fatia do app executada antes de
publicar**. O mecanismo é o da D4 (`location.search` → store). Publica-se uma vez só, no fim, já com
o permalink de pé — sem regressão.

Os testes **novos** dessa fatia **não** contam como violação do invariante "suíte intacta" (§10.3):
são feature adicionada, não teste existente alterado por causa da migração.

## 6. Superfície a portar (medida)

| peça | linhas | vira |
|---|---|---|
| `_layouts/default.html` | 74 | layout base `.astro` |
| `_layouts/post.html` | 224 | layout de post |
| `_includes/nav.html` | 41 | componente |
| `_includes/footer.html` | 25 | componente |
| `_includes/analytics.html` | 47 | componente (D8) |
| `_includes/cookie-consent.html` | 61 | componente (D8) |
| `_includes/tooltip-info.html` | 85 | componente |
| `blog.html` | 141 | página + listagem |
| `categorias/*.html` (3×) | 297 | 1 componente + 3 páginas finas |
| `links.html` | 51 | página |
| `index.html` | 10 | página (shell do app) |
| **total de template** | **~1.050** | |

Fora os templates: **10 posts** (`_posts/*.md` → coleção de conteúdo), 3 páginas `.md`
(`sobre`, `termos-de-uso`, `politica-de-privacidade`), `assets/` (imagens, JS do site, CSS) e o
`CNAME`.

**Dois itens que não são "template" e ainda assim precisam pousar na raiz do `dist/`** (levantados
na revisão do desenho, ausentes da primeira redação): o **`indicators.json`** (o catálogo do app,
buscado em runtime em `/indicators.json`) e o **artefato do app** (`assets/js/app/app.js`). Os dois
vão para o `public/` do Astro — copiado verbatim — ou por passo de cópia no build, já que o
artefato é gerado pelo build do app (§D2).

**Liquid dentro do conteúdo é quase nada — medido:** **15 ocorrências** no total. Uma é
`{% post_url %}`; ~11 são `{{ site.url }}` montando links; 3 são `{{ ... | relative_url }}`. Os
`categories:`/`tags:` dos posts estão no front matter.

Fora de escopo, mas anotado: `404.html` referencia `layout: page`, **que não existe** (a ADR 0001
registra a confirmação por build). No Astro, isso é uma página `404.astro` — o defeito morre com a
migração sem custo extra.

## 7. O que fica para quem for construir

- Escolher a API de conteúdo (coleções do Astro) e o formato do front matter dos 10 posts.
- Escrever as meta tags (D6) e cobrir com teste.
- Verificar o path de saída de feed e sitemap (D5) contra os pacotes, não contra este documento.
- Extrair o middleware de **dado local** para um módulo único usado por `app/vite.config.js` e
  `astro.config.mjs` (D9), e conferir que a `/` servida pelo `astro dev` ainda mostra dado local.
- Repontar `scripts/checar-canario.sh` para o CSS do `dist/` do Astro e conferir que ele **falha**
  quando a varredura de `app/src` não acontece (D7) — sabotar de propósito uma vez.
- Garantir que `indicators.json` e o artefato do app pousam na raiz do `dist/` (D9).
- Montar o workflow (D10) e conferir que o artefato publicado é o `dist/` do Astro.
- Medir o que sair: `git diff` do HTML publicado, antes × depois, nas URLs do §4.

## 8. O que ainda falta decidir (marcado honestamente)

> **Nota (2026-10-18):** o **permalink do app** era o item 1 desta lista — foi **decidido** (entra
> antes de publicar; ver D13) e saiu daqui. O que segue aberto:

1. ~~**O tema da `/`**~~ — **DECIDIDO (2026-10-18):** a opção **(a)**. A `/` é uma página **escura
   fixa**, sem o botão de tema; as outras páginas do site mantêm o alternador. Preserva a paleta
   medida para as 10 séries (o canvas do app é `#0e1117`); a opção (b) invalidaria essa paleta.
2. ~~**`/feed.xml` muda de produtor**~~ — **RESOLVIDO (2026-10-18), o item foi medido e fechado.** O
   publicado é **Atom** (10 `<entry>`, conteúdo HTML integral em `<content type="html" xml:base>`);
   o `@astrojs/rss` emite **RSS 2.0** (10 `<item>`). A mudança é maior do que "produtor": é de
   **dialeto**. **Decisão do usuário: aceitar RSS 2.0** (o path `/feed.xml` não muda; leitores aceitam
   os dois). O `description` leva o HTML integral do post com `href="/`/`src="/` **absolutizados** —
   o RSS 2.0 não tem `xml:base` e o relativo quebraria no leitor. Mesmos 10 posts, mesmos links.
3. **O histórico do git e a pasta `_posts/`**: renomear para a estrutura do Astro cria *rename*
   em 10 arquivos. Decidir se vale um commit dedicado (histórico preservado por `git mv`).
4. **Cloudflare Pages**, citado junto na ADR 0001 como alternativa, **não foi avaliado** nesta
   sessão. Não entra.
5. **`blog_categories`** do `_config.yml` é usado por **nenhum** template (achado da ADR 0001).
   Na migração: apagar, não portar. *(Medido na execução: os valores `name`/`description` coincidem
   com os do front matter das páginas de categoria, que são a fonte real — por isso apagar não perde
   nada; ver `src/lib/categorias.ts`.)*
6. **`tailwind.config.js`** é config morta desde a v4 (medido na ADR 0001: apontando o `content`
   para pasta inexistente, as classes continuam sendo geradas). Não portar.

### 8.1 Decisões de produto tomadas em 2026-10-18 (todas resolvidas)

Fechadas pelo usuário; aplicadas e verificadas no repo (commit `8fed17c`):

| # | item | decisão |
|---|---|---|
| 1 | `og:locale` publicado é `en_US` (default do `jekyll-seo-tag`) | **corrigir para `pt_BR`** — não é fiel, é conserto de meta errada |
| 2 | datas com o mês em inglês (`27 de July de 2025`) | **traduzir** (`27 de julho de 2025`) — texto visível; `Intl` em `pt-BR` |
| 3 | corpo do 404 em inglês (`Page not found :(`) | **traduzir**; o link de volta para `/` (que não existia) entra |
| 4 | `target="\_blank"` (barra invertida — `target` inerte) e sem `rel` | **corrigir** para `target="_blank" rel="noopener noreferrer"` (13 ocorrências em posts + `sobre.md`) |
| 5 | feed Atom → RSS 2.0 (item 2 acima) | **aceitar** |

> A migração vinha reproduzindo **byte a byte** o publicado, inclusive defeitos (mês em inglês,
> `target` quebrado). Estas cinco são a exceção deliberada: o usuário preferiu consertar.

## 9. Alternativas rejeitadas, e por quê

| alternativa | por que não |
|---|---|
| **Ficar no Jekyll** (instalar Ruby 3.3) | Resolve o build local hoje, não resolve o objetivo: mantém duas stacks e uma base que o próprio GitHub despriorizou. É o caminho se o objetivo fosse só desbloquear a máquina. |
| **Jekyll 4.4.1 com build próprio** | Mantém o Ruby e uma migração de lock/plugins. Troca "stack desatualizada" por "stack viva" — mas continuam sendo duas. Fica como plano B se o Astro falhar. |
| **`jekyll-v4-github-pages`** (gem comunitária) | Publicador é pessoa física, não canal oficial; exigiria auditar quem mantém e o que pina. Custo de auditoria maior que o de migrar. |
| **Eleventy (11ty)** | Também Node, migração mais barata e com Liquid disponível — mas é uma **segunda** ferramenta de build ao lado do Vite, então não unifica nada. |
| **Hugo** | Seria uma **terceira** stack (binário Go + outra linguagem de template). O oposto do objetivo. |
| **SPA total: tudo dentro do app** | Perde HTML estático para 10 posts + 4 páginas, o feed e o sitemap; joga SEO fora. Também re-acopla chrome e app. |
| **`sitio/` sem gerador** (só `.nojekyll` + HTML à mão) | Sem gerador, feed, sitemap e listagem de posts passam a ser manuais — regressão. |
| **Cloudflare Pages** | Alternativa de *hospedagem*, não de stack. Não avaliada; fora. |

## 10. Como saberemos que funcionou

1. **Contrato de URL**: as 13 URLs do §4 respondem 200 no site publicado, e o HTML servido nas
   URLs dos posts tem o mesmo texto de `<h1>`/`<title>` de antes.
2. **HTML comparado**: `diff` do HTML publicado antes × depois nas páginas do §4 — o que muda
   precisa ser explicado linha a linha.
3. **A suíte do app fica intacta**: 126 unitários + 12 E2E verdes, **sem alteração forçada por esta
   migração**. Se um teste existente precisou mudar por causa da migração, a fronteira do app foi
   violada. (Os testes **novos** do permalink — D13 — não contam: são feature, não migração.)
4. **Feed e sitemap válidos**: XML bem formado, com os mesmos N posts; `/sitemap.xml` lista as
   URLs novas.
5. **Consentimento**: com o GA4 bloqueado até o aceite, verificado **no navegador** (não por
   leitura de código), e zero aviso de a11y no terminal.
6. **Uma stack**: `rg -i "jekyll|liquid|bundler"` no repo só encontra história (docs), nenhum
   arquivo vivo. Sem `Gemfile`, sem Ruby no workflow, sem `_config.yml`.
7. **A máquina constrói**: `npm ci && npm run build` do zero, nesta máquina, sem instalar nada
   além do Node que já existe.
8. **O app continua estilizado**: o canário (D7) passa contra o CSS do `dist/` — e falha quando
   sabotado. Sem isso, "página sem estilo em silêncio" volta.
9. **O permalink funciona** (D13): abrir `/?indicators=<ids>` — pelo **caminho do produto**, não
   pelo harness — restaura as séries, e os ~11 links dos posts deixam de ser mudos.

## 11. Ordem sugerida (a fatia decide os detalhes)

1. Preparar o projeto Astro em paralelo ao Jekyll (o Jekyll continua sendo a fonte de comparação).
2. Portar layout, componentes e páginas simples (`links`, `sobre`, `termos`, `privacidade`).
3. Portar os posts + feed + sitemap + meta tags.
4. Incluir o app (artefato, D2) na `/`; resolver o tema (D11).
5. Comparar HTML e fechar o contrato de URL.
6. **A fatia do permalink no app** (D13) — antes de publicar.
7. Trocar o workflow; remover Jekyll; atualizar `AGENTS.md` e a ADR.
8. Publicar **uma vez só**, com aval do usuário.

## 12. Referências

- `sitio/docs/adr/0001-camada-de-graficos-como-app-isolado.md` — lista esta migração como fora de
  escopo; registra `404.html`, `blog_categories` e `tailwind.config.js` como achados.
- `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` — §1–§9 em vigor; §10 substituído.
- `sitio/docs/specs/2026-10-17-plano-de-tagueamento.md` — §3, o permalink como bloqueio de produto.
- Astro: `https://docs.astro.build/en/reference/configuration-reference/` (lido em 2026-10-18:
  `build.format`, `trailingSlash`, `vite`, `outDir`).
- `@astrojs/svelte` 9.1.0, `@astrojs/rss` 4.0.19, `@astrojs/sitemap` 3.7.4, `@tailwindcss/vite`
  4.3.3 — versões e peers lidos do registro npm em 2026-10-18.

# Fatia 02 — Páginas de texto, listagem e 404

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** portar as páginas que não são post — `links`, `sobre`, `termos-de-uso`,
`politica-de-privacidade`, a listagem `blog`, as **três** `categorias/*` e o `404` — preservando as
URLs publicadas.

**Arquitetura:** as três páginas de categoria hoje são **cópias** (99 linhas cada, ~mesmo markup).
Viram **um** componente + uma rota dinâmica `src/pages/categorias/[categoria].astro` com três
`getStaticPaths`. O `404` deixa de apontar para um `layout: page` **que não existe** (achado da ADR
0001) e passa a ser uma página de verdade.

**Stack:** Astro (`.astro`) · coleção `posts` (fatia 03) para as listagens.

**Spec:** §4 (contrato de URL), §6 · **ADR:** 0002 (decisão 3).

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **As URLs de hoje são as de amanhã**: `blog.html`, `categorias/analises.html` etc. saem com `.html`
  — `build.format:'file'` (fatia 00) é o que garante isso.
- **A rota dinâmica depende da coleção de posts** (fatia 03). **A fatia 03/T1 roda ANTES desta** —
  sem `getCollection('posts')` não há listagem nem contagem para portar. Não inventar contagem.
- **Ruling (2026-10-18): esta fatia roda em 02/T1 → 02/T2 → 03/T2 → 02/T3.** A tarefa 3 cria o
  `scripts/testar-urls.sh`, que exige a URL do **post**; escrevê-lo antes da rota do post (03/T2)
  deixaria um teste deliberadamente vermelho no repo. Escrito depois, ele nasce verde. Custo se
  errado: um RED conhecido e documentado por algumas horas.

## Dois fatos medidos que mudam o trabalho desta fatia (2026-10-18)

1. **`links.html` NÃO é só HTML + `relative_url`: ele tem um loop sobre `site.posts`** (`links.html:39-47`),
   com `post.url`, `post.title | escape` e `aria-label`. Ou seja, `links.astro` **consome
   `getCollection('posts')`** — a primeira redação deste plano dizia “portar o HTML como está,
   trocando os relative_url”, e teria produzido uma página sem a lista de posts.
2. **`sobre.md:14` usa uma IAL do kramdown** — `[texto](url){:target="\_blank"}` — que o Astro
   (remark) **não** entende: ele renderizaria `{:target="\_blank"}` como **texto literal** na página.
   E o que o Jekyll publica é `<a href="…" target="\_blank">` — com a **barra invertida dentro do
   valor**, isto é, um `target` quebrado (o Kramdown não desescapou o `\_`).

---

### Tarefa 1: páginas de texto (`links`, `sobre`, `termos`, `privacidade`)

**Arquivos:**

- Criar: `src/pages/links.astro` (de `links.html` — **consome `getCollection('posts')`**)
- Mover: `sobre.md`, `termos-de-uso.md`, `politica-de-privacidade.md` → `src/pages/` (ficam `.md`)
- Criar: `src/components/` não é preciso: as três usam o `Base.astro` como layout
- Test: `scripts/testar-urls.sh` (criado na tarefa 3)

**Interfaces:**

- Consome: `Base.astro` (fatia 01) e `getCollection('posts')` (fatia 03/T1, para o `links`).
- Produz: quatro rotas na raiz: `/links.html`, `/sobre.html`, `/termos-de-uso.html`,
  `/politica-de-privacidade.html`.

> **Ruling (2026-10-18): as três páginas ficam `.md`.** O plano deixava em aberto (“ou `.md` com o
> layout — decidir”). Ficam `.md`: o markdown é a fonte, o corpo não muda, e o Astro serve página
> markdown nativamente. O front matter `layout: default` do Jekyll vira
> `layout: ../layouts/Base.astro` (caminho **relativo ao arquivo**, e `src/pages/` está um nível
> abaixo de `src/`), e o `title`/`description` do front matter chegam ao layout como props.
>
> ⚠️ **O IAL do `sobre.md:14` precisa ser resolvido à mão.** Troque a linha por HTML cru no próprio
> markdown, **reproduzindo o valor quebrado** que o Jekyll publica:
>
> ```html
> <a href="https://github.com/brasilemnumeros" target="\_blank">Acesse nossa página no GitHub</a>
> ```
>
> (medido no site publicado: `target="\_blank"` — com a barra, sim). **Não “conserte” para
> `_blank`**: é um erro do site de hoje, e a migração não muda comportamento. Vai para a lista de
> itens abertos (junto com `og:locale` e o mês em inglês), e a correção é remover a barra **e**
> acrescentar `rel="noopener"`, que hoje não existe.
>
> **Todo Liquid vira caminho direto**, e são só estes (medido):
> `{{ "/termos-de-uso" | relative_url }}` → `/termos-de-uso`; idem `/politica-de-privacidade`;
> e no `links.html` o loop `{% for post in site.posts %}` vira iteração sobre a coleção.
>
> **O critério de aceite destas páginas é “conteúdo equivalente”, não `diff` byte a byte**: o
> renderizador de markdown do Astro (remark) não é o kramdown do Jekyll. Medido: não há smart quotes
> envolvidas na fonte, então o corpo deve sair com as mesmas tags — mas compare **texto e links**,
> e documente qualquer diferença de whitespace em vez de persegui-la.

- [ ] **Passo 3: buildar e conferir os quatro arquivos**

Run: `NODE_ENV=development npm run build && for p in links sobre termos-de-uso politica-de-privacidade; do test -f "dist/$p.html" && echo "$p ok" || echo "FALTA $p"; done`
Expected: quatro `ok`.

- [ ] **Passo 4: commit**

```bash
git add src/pages
git commit -m "feat(astro): páginas de texto com as URLs publicadas preservadas"
```

---

### Tarefa 2: listagem de posts (`blog`) e as categorias

**Arquivos:**

- Criar: `src/lib/categorias.ts` (o mapa que hoje vive no `_config.yml`)
- Criar: `src/lib/trecho.ts` (o `post.excerpt` do Jekyll, que o Astro não tem)
- Criar: `src/components/ListaDePosts.astro`
- Criar: `src/components/NavegacaoDeCategorias.astro`
- Criar: `src/pages/blog.astro`
- Criar: `src/pages/categorias/[categoria].astro`
- Test: `scripts/testar-listagem.sh`

**Interfaces:**

- Consome: `getCollection('posts')` (fatia 03) e `Base.astro` (fatia 01).
- Produz: `ListaDePosts.astro` com prop `{ posts: CollectionEntry<'posts'>[] }`;
  `NavegacaoDeCategorias.astro` com prop `{ atual: 'analises'|'indicadores'|'noticias'|null }`.
- Produz: `src/lib/categorias.ts` — nome, descrição, ícone e cor de cada categoria.

> 🔴 **Gap do plano, medido em 2026-10-18:** o nome, a descrição, o ícone e a cor de cada categoria
> **não estão no HTML** — vêm do mapa `blog_categories` do `_config.yml:9-23`, que a fatia 07 apaga.
> Se ninguém os portar, a listagem perde os títulos e as cores **em silêncio**. Eles viram
> `src/lib/categorias.ts`, com **os valores medidos** (copie-os; não invente):
>
> | chave | name | description | icon | color |
> |---|---|---|---|---|
> | `analises` | `Análises` | `Análises aprofundadas dos indicadores econômicos brasileiros` | `📊` | `blue` |
> | `indicadores` | `Indicadores` | `Novidades sobre indicadores econômicos disponíveis no site` | `📈` | `green` |
> | `noticias` | `Notícias` | `Novidades e atualizações do projeto Brasil em Números` | `📢` | `purple` |
>
> A ordem das três na navegação é a do mapa: `analises`, `indicadores`, `noticias`.

> 🔴 **Segundo gap, medido em 2026-10-18 (as três páginas de categoria NÃO são a mesma página):** elas
> divergem em **cinco** textos, e a `description` do `_config.yml` **não** é a intro do corpo. Cada
> campo abaixo foi lido do arquivo; **copie, não invente**:
>
> | | `analises` | `indicadores` | `noticias` |
> |---|---|---|---|
> | ícone | `📊` | `📈` | `📢` |
> | nome (h1 e navegação) | `Análises` | `Indicadores` | `Notícias` |
> | `description` (meta, = front matter) | `Análises aprofundadas dos indicadores econômicos brasileiros` | `Novidades sobre indicadores econômicos disponíveis no site` | `Novidades e atualizações do projeto Brasil em Números` |
> | **intro do corpo** (`<p class="mb-6 …">`) | `Análises aprofundadas dos indicadores econômicos, suas relações e impactos na economia brasileira.` | `Novidades sobre os indicadores econômicos disponíveis, metodologias e interpretações.` | `Novidades, atualizações e marcos do projeto Brasil em Números.` |
> | estado vazio | `Nenhuma análise encontrada nesta categoria.` | `Nenhum post encontrado nesta categoria.` | `Nenhuma notícia encontrada nesta categoria.` |
> | texto do “voltar” | `← Voltar para o blog` | `← Voltar para Artigos` | `← Voltar para Artigos` |
> | cor do destaque | `blue` | `green` | `purple` |
>
> ⚠️ As duas últimas linhas são **inconsistências do site de hoje** (o `analises` diz “o blog” e os
> outros dois “Artigos”; o `indicadores` diz “Nenhum post”). **Reproduza como está** — a migração não
> conserta texto; vão para a lista de itens abertos com o resto.
>
> A cor aparece em **dois** lugares com classes diferentes e ambas precisam existir **estáticas** no
> fonte (o Tailwind varre o `src/`, não pode montar classe por string):
>
> - o destaque da categoria atual na página de categoria:
>   `bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100` (idem `green`/`purple`);
> - o link das outras categorias no `blog`: `text-blue-700 hover:bg-blue-50 …` (idem).
>
> As classes já estão no HTML das três páginas — **não invente tons**; leia `categorias/*.html`.

> 🔴 **Terceiro gap, medido: o cartão do `blog` e o cartão da categoria NÃO são o mesmo cartão.**
>
> | | `blog.html` | `categorias/*.html` |
> |---|---|---|
> | título do post | `<h3>` | `<h2>` |
> | etiqueta de categoria | **sim** (`📊 Análise` — singular, com `<span>`) | não |
> | podcast | `🎧 Podcast` | `🎧 Podcast disponível` |
> | trecho | `truncatewords: **25**` | `truncatewords: **30**` |
> | lista | `site.posts limit: **10**` | todos os da categoria |
>
> Os nomes **singulares** da etiqueta são `case` no Liquid (`blog.html:102-111`), **não** vêm do
> `_config.yml`: `analises`→`Análise`, `indicadores`→`Indicador`, `noticias`→`Notícia`, qualquer outra
> → `🏷️ <span>{{ category | capitalize }}</span>`. O `limit: 10` só não corta nada hoje porque há
> exatamente 10 posts — **reproduza**, senão o 11º post aparece no `blog` e não aparecia antes.

> 🔴 **Quarto gap, medido: o trecho (`post.excerpt`) não existe no Astro.** O Jekyll gera o excerpt
> como o **primeiro bloco do corpo** renderizado e sem HTML (`strip_html`). Medido: no post dos
> homicídios, cujo corpo começa com `### Uma análise de quase 30 anos…`, o trecho publicado é
> `Uma análise de quase 30 anos de dados revela picos, quedas e o complexo papel das armas de fogo na
> segurança pública do país.` — **sem o `###`**.
>
> Então: um helper deriva o trecho do `body` da coleção (primeiro bloco, tirando marcação, espaços
> colapsados) e trunca em palavras com `…`, como o `truncatewords` do Ruby. A **oracle é o site
> publicado**: confira os **10** trechos de `/blog` contra os seus, e liste qualquer diferença.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-listagem.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
falha=0
# Cada categoria tem de ter a SUA contagem — é o que prova que a coleção foi
# filtrada, e não que a página renderizou 10 posts em todas.
for par in "blog:10" "categorias/analises:4" "categorias/indicadores:5" "categorias/noticias:1"; do
  u=${par%%:*}; esperado=${par##*:}
  f="dist/$u.html"
  [ -f "$f" ] || { echo "listagem: falta $f" >&2; falha=1; continue; }
  n=$(grep -o '<article' "$f" | wc -l | tr -d ' ')
  [ "$n" -eq "$esperado" ] || { echo "listagem: $f tem $n <article>, esperado $esperado" >&2; falha=1; }
  grep -qE '<title>[^<]*[^ <][^<]*</title>' "$f" \
    || { echo "listagem: $f sem <title> util" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
echo "listagem ok"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `NODE_ENV=development npm run build && bash scripts/testar-listagem.sh`
Expected: FAIL — `dist/blog.html` não existe.

- [ ] **Passo 3: implementar `NavegacaoDeCategorias.astro`**

As contagens **não** vêm de `site.categories` — vêm de `getCollection('posts')` filtrada. As classes
por categoria (`blue`/`green`/`purple`) mudam **só** por dentro do componente; o markup é o mesmo das
três páginas atuais.

- [ ] **Passo 4: implementar as quatro rotas**

`blog.astro` reproduz `blog.html`; `[categoria].astro` reproduce a página de categoria com
`getStaticPaths` sobre as três categorias (`analises`, `indicadores`, `noticias`).

- [ ] **Passo 5: rodar e ver passar**

Run: `bash scripts/testar-listagem.sh`
Expected: `listagem ok`.

- [ ] **Passo 6: conferir a contagem contra o Jekyll (a verdade externa)**

Run: `grep -o '([0-9]*)' dist/blog.html | head -4` e comparar com `grep -h '^categories:' _posts/*.md | sort | uniq -c`
Expected: `analises` = 4, `indicadores` = 5, `noticias` = 1, total = 10.

- [ ] **Passo 7: commit**

```bash
git add src/lib/categorias.ts src/components/ListaDePosts.astro src/components/NavegacaoDeCategorias.astro src/pages/blog.astro src/pages/categorias src/lib/trecho.ts scripts/testar-listagem.sh
git commit -m "feat(astro): listagem de posts e categorias a partir de um componente só"
```

---

### Tarefa 3: `404` e o teste do contrato de URL

**Arquivos:**

- Criar: `src/pages/404.astro`
- Criar: `scripts/testar-urls.sh`

**Interfaces:**

- Consome: os arquivos gerados no `dist/`.
- Produz: `scripts/testar-urls.sh` — o teste do **contrato** (spec §4) — que a fatia 07 roda no CI.

- [ ] **Passo 1: escrever `404.astro`**

Página de verdade, usando `Base.astro`. **Não** repetir o `layout: page` inexistente.

**O que o publicado faz hoje (medido em 2026-10-18, `curl …/404.html`):** Jekyll **aplica o
`default.html`** mesmo com o `layout: page` ausente (o `theme-switcher.js`, o `feedback-button.js` e o
GA4 estão lá) — então o chrome é o de sempre. O **corpo** é o de `404.html`: um `<style>` inline com
`.container`/`h1` e o `<div class="container">` com `404`, `Page not found :(`, `The requested page
could not be found.` — **em inglês**, resíduo de um template. Reproduza o corpo **como está**.

⚠️ **A meta do 404 NÃO é de página, é a de SITE** — é o que o `default.html` emite quando a página não
tem `title:` no front matter (medido):

| tag | valor publicado |
|---|---|
| `<title>` | `Brasil em Números \| Dados e informações sobre o Brasil em um só lugar` |
| `og:title` | `Brasil em Números` |
| `description` / `og:description` | `Uma plataforma dedicada a fornecer dados e informações sobre o Brasil.` |
| `canonical` | `https://www.brasilemnumeros.ong.br/404.html` |
| `og:type` | `website` |

Como o `Base.astro` **exige** `title` e acrescenta ` | Brasil em Números`, isso não sai sem um canal:
acrescente ao `Meta.astro` um prop booleano opcional (ex.: `tituloDoSite`) que, quando verdadeiro,
emite `<title>` = `Brasil em Números | Dados e informações sobre o Brasil em um só lugar` e
`og:title` = `Brasil em Números`. O `description` do 404 é a **descrição do site** — passe-a do
`404.astro` (o `Base` continua exigindo). **As três strings acima são medidas; copie-as.**

> **Item aberto (produto):** o corpo do 404 está em inglês. **Reproduzido**; traduzir é decisão do
> usuário (junto com `og:locale`, o mês em inglês e o `target="\_blank"`).
>
> O link “voltar para a `/`” **entra** (o plano o manda e ele não existe hoje) — é uma adição
> deliberada a uma página de erro, e o teste abaixo confere que ele existe.

- [ ] **Passo 2: escrever o teste do contrato de URL**

`scripts/testar-urls.sh` (lista da spec §4 — as mesmas 13 URLs, na forma `.html` que o build gera).
**Ele confere conteúdo, não só existência** (a lição da 03/T1: um teste que só conta arquivos não
prova que alguém os lê). Para cada arquivo: existe, tem `<title>` **não vazio** (não
`<title> | Brasil em Números</title>`), e não tem Liquid/IAL cru (`{{`, `{%`, `{:`).

```bash
#!/usr/bin/env bash
set -euo pipefail
falha=0
for f in index.html 404.html blog.html sobre.html links.html termos-de-uso.html \
         politica-de-privacidade.html categorias/analises.html \
         categorias/indicadores.html categorias/noticias.html \
         noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html; do
  arq="dist/$f"
  [ -f "$arq" ] || { echo "contrato: falta dist/$f" >&2; falha=1; continue; }
  # título não vazio: `title` ausente agora derruba o build, mas um título em
  # branco ainda passaria — e é meta invisível, a falha silenciosa do D6.
  grep -qE '<title>[^<]*[^ <][^<]*</title>' "$arq" \
    || { echo "contrato: $f sem <title> util" >&2; falha=1; }
  grep -qE '\{\{|\{%|\{:' "$arq" \
    && { echo "contrato: $f tem Liquid/IAL cru" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1

# O 404 não tem título de PÁGINA: publica o título do SITE (medido no publicado).
grep -qF '<title>Brasil em Números | Dados e informações sobre o Brasil em um só lugar</title>' dist/404.html \
  || { echo "contrato: título do 404 divergiu do publicado" >&2; falha=1; }
grep -qF 'href="/"' dist/404.html \
  || { echo "contrato: o 404 perdeu o link de volta para /" >&2; falha=1; }
[ "$falha" -eq 0 ] || exit 1
echo "contrato de URL ok"
```

> **Ruling (2026-10-18): esta tarefa roda DEPOIS da 03/T2** (a rota do post). Escrita antes, a lista
> acima nasce **vermelha** por causa do post — um teste deliberadamente quebrado no repo. Depois da
> 03/T2 ela nasce verde.

- [ ] **Passo 3: rodar**

Run: `npm run build && bash scripts/testar-urls.sh`
Expected: `contrato de URL ok`.

- [ ] **Passo 4: commit**

```bash
git add src/pages/404.astro scripts/testar-urls.sh
git commit -m "feat(astro): página 404 de verdade e teste do contrato de URL"
```

## Critérios de aceite (fatia 02)

- [ ] `dist/blog.html`, `dist/categorias/{analises,indicadores,noticias}.html` existem com `.html`.
- [ ] As contagens batem com `_posts/` (4 · 5 · 1 · 10).
- [ ] `dist/404.html` existe e usa o layout (não o `layout: page` inexistente).
- [ ] As quatro páginas de texto saem com o conteúdo **equivalente** ao de hoje (conferido em texto e
      links contra o site publicado — não `diff` byte a byte: o renderizador de markdown não é o
      kramdown). Drift conhecido e aceito: a seção 6 da política no repositório está **à frente** do
      publicado. Registrar qualquer outra diferença.
- [ ] **Nota de contrato nascida na 02/T1:** `title` e `description` passaram a ser **obrigatórios**
      em toda página (o `Base.astro` **derruba o build** sem eles — antes saía `<title>` vazio em
      silêncio). Toda página nova precisa dos dois, seja por prop, seja por front matter.
- [ ] O `shell` do `Base.astro` é `'pagina'` em todas — nav centralizado, `<main>` com `prose`.
- [ ] O selo de cache-bust é **o mesmo em todas as páginas** (é o que a fatia 01/T2 prometeu e não
      pôde provar com uma página só): `grep -oh 'v=[0-9]\+' dist/*.html dist/**/*.html | sort -u | wc -l`
      → **1**. Se der mais de 1, o `?v=` voltou a ser avaliado por página.

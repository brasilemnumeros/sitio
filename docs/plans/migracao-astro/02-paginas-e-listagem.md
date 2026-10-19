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

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-listagem.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
falha=0
for u in blog categorias/analises categorias/indicadores categorias/noticias; do
  f="dist/$u.html"
  [ -f "$f" ] || { echo "listagem: falta $f" >&2; falha=1; continue; }
  grep -q '<article' "$f" || { echo "listagem: $f sem <article>" >&2; falha=1; }
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
git add src/components/ListaDePosts.astro src/components/NavegacaoDeCategorias.astro src/pages/blog.astro src/pages/categorias scripts/testar-listagem.sh
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

Página de verdade (título + link para a `/`), usando `Base.astro`. **Não** repetir o `layout: page`
inexistente.

- [ ] **Passo 2: escrever o teste do contrato de URL**

`scripts/testar-urls.sh` (lista da spec §4 — as mesmas 13 URLs, na forma `.html` que o build gera):

```bash
#!/usr/bin/env bash
set -euo pipefail
falha=0
for f in index.html 404.html blog.html sobre.html links.html termos-de-uso.html \
         politica-de-privacidade.html categorias/analises.html \
         categorias/indicadores.html categorias/noticias.html \
         noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html; do
  [ -f "dist/$f" ] || { echo "contrato: falta dist/$f" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
echo "contrato de URL ok"
```

> O post entra na lista na fatia 03. Aqui ele provavelmente **falha** — é isso que a fatia 03 fecha.

- [ ] **Passo 3: rodar**

Run: `NODE_ENV=development npm run build && bash scripts/testar-urls.sh`
Expected: `contrato de URL ok` (com o post da fatia 03) **ou** falha apontando só o post — nenhuma
outra URL.

- [ ] **Passo 4: commit**

```bash
git add src/pages/404.astro scripts/testar-urls.sh
git commit -m "feat(astro): página 404 de verdade e teste do contrato de URL"
```

## Critérios de aceite (fatia 02)

- [ ] `dist/blog.html`, `dist/categorias/{analises,indicadores,noticias}.html` existem com `.html`.
- [ ] As contagens batem com `_posts/` (4 · 5 · 1 · 10).
- [ ] `dist/404.html` existe e usa o layout (não o `layout: page` inexistente).
- [ ] As quatro páginas de texto saem com o conteúdo igual ao de hoje (conferido por `diff`).
- [ ] O `shell` do `Base.astro` é `'pagina'` em todas — nav centralizado, `<main>` com `prose`.
- [ ] O selo de cache-bust é **o mesmo em todas as páginas** (é o que a fatia 01/T2 prometeu e não
      pôde provar com uma página só): `grep -oh 'v=[0-9]\+' dist/*.html dist/**/*.html | sort -u | wc -l`
      → **1**. Se der mais de 1, o `?v=` voltou a ser avaliado por página.

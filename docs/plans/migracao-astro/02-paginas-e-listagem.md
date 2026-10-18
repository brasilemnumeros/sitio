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

---

### Tarefa 1: páginas de texto (`links`, `sobre`, `termos`, `privacidade`)

**Arquivos:**

- Criar: `src/pages/links.astro` (de `links.html`)
- Criar: `src/pages/sobre.astro`, `src/pages/termos-de-uso.astro`,
  `src/pages/politica-de-privacidade.astro` (ou `.md` com o layout — decidir: manter como `.md` é
  menos trabalho e preserva o markdown como fonte)
- Test: `scripts/testar-urls.sh` (cria na tarefa 3 e usa aqui)

**Interfaces:**

- Consome: `Base.astro` (fatia 01).
- Produz: quatro rotas na raiz: `/links.html`, `/sobre.html`, `/termos-de-uso.html`,
  `/politica-de-privacidade.html`.

- [ ] **Passo 1: portar `links.astro`**

`links.html` tem front matter + um container; portar o HTML como está, trocando os
`{{ ... | relative_url }}` por caminhos diretos (`/categorias/analises.html`).

- [ ] **Passo 2: portar as três páginas `.md`**

Mover `sobre.md`, `termos-de-uso.md`, `politica-de-privacidade.md` para `src/pages/` mantendo o
**conteúdo**; o front matter `layout: default` vira o layout de página do Astro. Conferir que o
corpo (que tem `<small>`, `_itálico_`, links) sai igual.

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

- Criar: `src/components/ListaDePosts.astro`
- Criar: `src/components/NavegacaoDeCategorias.astro`
- Criar: `src/pages/blog.astro`
- Criar: `src/pages/categorias/[categoria].astro`
- Test: `scripts/testar-listagem.sh`

**Interfaces:**

- Consome: `getCollection('posts')` (fatia 03) e `Base.astro` (fatia 01).
- Produz: `ListaDePosts.astro` com prop `{ posts: CollectionEntry<'posts'>[] }`;
  `NavegacaoDeCategorias.astro` com prop `{ atual: 'analises'|'indicadores'|'noticias'|null }`.

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

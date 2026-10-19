# Fatia 04 — Feed e sitemap, nos mesmos paths

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** `/feed.xml` e `/sitemap.xml` continuam sendo os endereços publicados — reimplementados
no Astro, **não** substituídos por `/rss.xml` nem `/sitemap-index.xml`.

**Arquitetura:** `@astrojs/rss` para o feed (endpoint `src/pages/feed.xml.ts`); para o sitemap, a
decisão entre `@astrojs/sitemap` configurado e um **endpoint próprio** depende do que o pacote emite
— e o pacote é quem manda (ver Passo 1).

**Stack:** `@astrojs/rss` 4.0.19 · `@astrojs/sitemap` 3.7.4 · coleção `posts` (fatia 03).

**Spec:** §5 (D5) · **ADR:** 0002 (decisão 5).

## 🔴 O que o feed publicado é, medido em 2026-10-18 (`curl …/feed.xml`)

**Ele NÃO é RSS — é Atom.** O `jekyll-feed` emite `<feed xmlns="…Atom">` com **10 `<entry>`** — e
`grep -c '<item>'` nele dá **0**. O `@astrojs/rss` emite **RSS 2.0** (`<rss>`/`<channel>`/`<item>`).
Ou seja: a spec §8 diz que "o `/feed.xml` muda de produtor"; a medição acrescenta que **muda de
dialeto** (Atom → RSS 2.0). O path fica igual; o dialeto **não** — e isso é **item aberto de produto**
(o assinante vê o formato mudar), no topo da lista de decisões do controlador. **Não** invente um
gerador de Atom: o plano e a spec mandam `@astrojs/rss`.

Medido no `<entry>` do `jekyll-feed`, para comparar:

| campo | valor publicado |
|---|---|
| `<content type="html" xml:base="…">` | o **conteúdo HTML COMPLETO** do post (medido: 8.477 chars no 1º) |
| `<author><name>` | existe (10×) |
| `<updated>` | existe |
| `<id>` | a URL do post |

O `<content>` do Atom é conteúdo integral com `xml:base` para o relativo resolver. O RSS 2.0 **não
tem `xml:base`**: um `description` com HTML completo sairia com `/assets/…` **relativo e quebrado** no
leitor. Por isso, **decida medindo o pacote** (`node_modules/@astrojs/rss/dist/index.d.ts` e o
`dist/index.js`): (a) se ele escapar HTML no `description`, entregue o HTML renderizado do post com
`href="/` e `src="/` **absolutizados** para `site`; (b) se não der, use o **trecho** como `description`
e **registre a diferença** (a spec §8 aceita "completa ou resumo", mas a paridade de hoje é completa).
Diga no relatório **qual** dos dois e **por quê**.

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **🔴 Medir o pacote antes de codar.** O default do sitemap do Astro é um **índice** com arquivos
  numerados; o do `jekyll-sitemap` é **um arquivo**. Se o default divergir de `/sitemap.xml`, a saída
  é configuração ou endpoint próprio — **nunca** aceitar a mudança de URL.
- **A URL do feed está linkada** em `blog.html` e nos posts (`{{ site.url }}/feed.xml`). Mudar o path
  quebra link interno.

---

### Tarefa 1: `/feed.xml`

**Arquivos:**

- Criar: `src/pages/feed.xml.ts`
- Criar: `src/lib/feed-items.js` (a montagem dos itens, pura e testável)
- Test: `scripts/testar-feed-itens.mjs` + `scripts/testar-feed.sh`

**Interfaces:**

- Consome: `getCollection('posts')` (fatia 03) e `site` do `astro.config.mjs`.
- Produz: `montarItens(posts, site): Array<{title, pubDate, link, description}>` e, pelo endpoint, um
  arquivo `dist/feed.xml`.

> **Ruling (2026-10-18): o teste do `montarItens` é um script `node`, NÃO um `vitest` do app.**
> O plano original rodava `cd app && npx vitest run ../src/lib/feed-items.test.js` — isso acopla o
> **site** ao `devDependencies` do **app** (que é um módulo à parte, com `vite.config.js` próprio), por
> um caminho **fora da raiz** do vitest, e o teste some justamente em CI. O site já tem um harness
> próprio: `scripts/*.sh` + `scripts/testar-analytics.mjs` (node puro). Siga o padrão de casa.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-feed-itens.mjs` — o caso do **Review Focus 5** (coleção vazia) mora aqui, porque é o
único jeito de exercitá-lo sem uma coleção de verdade:

```js
// node puro: nada de runner. Sai !=0 na primeira falha.
import { montarItens } from '../src/lib/feed-items.js';

function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a !== b) { console.error(`feed-itens: ${nome}\n  obtido:   ${a}\n  esperado: ${b}`); process.exit(1); }
  console.log(`ok: ${nome}`);
}

eq('um item por post, com link absoluto',
  montarItens([{ id: '2025-07-27-hoje-nasce-o-brasil-em-numeros',
                 data: { title: 'T', categories: ['noticias'], body: '' } }],
              'https://www.brasilemnumeros.ong.br')[0].link,
  'https://www.brasilemnumeros.ong.br/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html');

// Review Focus 5 — coleção vazia: nenhum item quebrado, nenhuma exceção
eq('coleção vazia devolve lista vazia',
  montarItens([], 'https://www.brasilemnumeros.ong.br'), []);
```

`scripts/testar-feed.sh` (o artefato; com **saída enxuta** — o XML do feed é gigante):

```bash
#!/usr/bin/env bash
set -euo pipefail
FEED=dist/feed.xml
test -f "$FEED" || { echo "feed: falta $FEED" >&2; exit 1; }
itens=$(grep -c '<item>' "$FEED" || true)
[ "$itens" -eq 10 ] || { echo "feed: $itens itens, esperado 10" >&2; exit 1; }
grep -q '<link>https://www.brasilemnumeros.ong.br/noticias/2025/07/27/' "$FEED" \
  || { echo "feed: link de post faltando" >&2; exit 1; }
# XML bem formado: o parser reclama se não for (o feed é XML, não HTML).
python3 -c 'import xml.dom.minidom,sys; xml.dom.minidom.parse("dist/feed.xml")' \
  || { echo "feed: XML malformado" >&2; exit 1; }
echo "feed ok ($itens itens)"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `node scripts/testar-feed-itens.mjs`
Expected: FAIL — `../src/lib/feed-items.js` não existe.

- [ ] **Passo 3: implementar `montarItens` e o endpoint**

`montarItens` no formato `@astrojs/rss`; o endpoint `feed.xml.ts` usa o helper `rss()`. **Conferir a
assinatura contra `node_modules/@astrojs/rss/dist/index.d.ts` antes de codar** — e decidir o
`description` medindo o pacote (ver a seção do feed acima).

- [ ] **Passo 4: rodar e ver passar**

Run: `node scripts/testar-feed-itens.mjs && npm run build && bash scripts/testar-feed.sh`
Expected: PASS e `feed ok (10 itens)`.

- [ ] **Passo 5: comparar com o feed atual (o item aberto da spec §8)**

Run: `curl -s https://www.brasilemnumeros.ong.br/feed.xml | grep -c '<item>'`
Expected: comparar a contagem e o formato de `description` (completo × resumo) com o novo — e
registrar a diferença no `progress.md` da fatia.

- [ ] **Passo 6: commit**

```bash
git add src/pages/feed.xml.ts src/lib/feed-items.js scripts/testar-feed-itens.mjs scripts/testar-feed.sh
git commit -m "feat(astro): /feed.xml reimplementado com @astrojs/rss no mesmo path"
```

---

### Tarefa 2: `/sitemap.xml`

**Arquivos:**

- Modificar: `astro.config.mjs` (integrar `@astrojs/sitemap`) **ou** criar
  `src/pages/sitemap.xml.ts`
- Test: `scripts/testar-sitemap.sh`

**Interfaces:**

- Consome: as rotas geradas.
- Produz: `dist/sitemap.xml` (nome exato).

> **🔴 O sitemap publicado, medido em 2026-10-18 (`curl …/sitemap.xml`), para reproduzir:**
>
> - **um** `<urlset xmlns="…sitemap/0.9">` — sem `<sitemapindex>`;
> - **19** `<loc>` = as 20 páginas do `dist/` **menos o `404.html`** (o 404 **não** entra);
> - **10** `<lastmod>` — **só** os posts, e no formato `isoDoJekyll` (`2025-07-27T00:00:00+00:00`);
>   as páginas fixas **não** têm `<lastmod>`;
> - os posts saem em ordem **cronológica crescente**; a das páginas fixas é a ordem do `site.pages` do
>   Jekyll e **não interessa** (sitemap não é lista ordenada; o teste confere o **conjunto**).
>
> O `<loc>` do 404 **não** aparece — se você usar `getStaticPaths`/`import.meta.glob` para listar as
> rotas, **exclua** `404`.

- [ ] **Passo 1: medir o que o `@astrojs/sitemap` emite**

Integrar o plugin e buildar; depois:

Run: `ls dist/sitemap*.xml`
Expected: anotar **exatamente** o que sai. Se for `sitemap-index.xml` + `sitemap-0.xml`, o plugin
sozinho **não serve** — a saída é a tarefa 2b.

- [ ] **Passo 2a: se (e só se) o plugin emitir `sitemap.xml`**

Conferir as URLs listadas e seguir para o teste.

- [ ] **Passo 2b: se o plugin emitir índice/numerados — endpoint próprio**

Escrever `src/pages/sitemap.xml.ts` que monta um único `<urlset>` com `Astro.site` + as rotas
(coletadas de `getCollection('posts')` + as fixas). **Remover a integração** para não publicar os
`dist/sitemap-*.xml` órfãos.

- [ ] **Passo 3: escrever o teste**

`scripts/testar-sitemap.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
S=dist/sitemap.xml
test -f "$S" || { echo "sitemap: falta $S" >&2; exit 1; }
grep -q '<urlset' "$S" || { echo "sitemap: não é um urlset único" >&2; exit 1; }
grep -q '<sitemapindex' "$S" && { echo "sitemap: virou índice" >&2; exit 1; }
urls=$(grep -c '<loc>' "$S" || true)
# 19 = 20 páginas do dist/ menos o 404 (medido no publicado).
[ "$urls" -eq 19 ] || { echo "sitemap: $urls urls, esperado 19" >&2; exit 1; }
# Só os posts têm lastmod — e são exatamente 10 (medido).
last=$(grep -c '<lastmod>' "$S" || true)
[ "$last" -eq 10 ] || { echo "sitemap: $last lastmod, esperado 10" >&2; exit 1; }
grep -q '/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros' "$S" \
  || { echo "sitemap: falta o post" >&2; exit 1; }
grep -q '/404' "$S" && { echo "sitemap: o 404 não deveria entrar" >&2; exit 1; }
echo "sitemap ok ($urls urls, $last lastmod)"
```

- [ ] **Passo 4: rodar e ver passar**

Run: `NODE_ENV=development npm run build && bash scripts/testar-sitemap.sh`
Expected: `sitemap ok (>=14 urls)`.

- [ ] **Passo 5: conferir que nenhum `sitemap-*` órfão sobrou**

Run: `ls dist/sitemap* | sort`
Expected: **somente** `dist/sitemap.xml`.

- [ ] **Passo 6: commit**

```bash
git add src/pages/sitemap.xml.ts scripts/testar-sitemap.sh astro.config.mjs
git commit -m "feat(astro): /sitemap.xml único, no path publicado"
```

## Critérios de aceite (fatia 04)

- [ ] `dist/feed.xml` existe, é **XML bem formado** (o teste o parseia) e tem **10** `<item>`.
- [ ] `dist/sitemap.xml` é **um** `<urlset>` com **19** `<loc>` e **10** `<lastmod>` (só posts), e o
      `404` **não** entra — os números são os **medidos** no publicado, não estimados.
- [ ] **Nenhum** `dist/sitemap-index.xml` nem `dist/sitemap-0.xml`.
- [ ] A mudança de **dialeto** do feed (Atom → RSS 2.0) e o que foi feito com o `description`
      (completo × resumo) estão registrados no `progress.md` com a medição — é o item aberto da §8.
- [ ] O link para `/feed.xml` dentro de `blog.html`/posts continua resolvendo.

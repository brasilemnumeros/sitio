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
- Test: `src/lib/feed-items.test.js` + `scripts/testar-feed.sh`

**Interfaces:**

- Consome: `getCollection('posts')` (fatia 03) e `site` do `astro.config.mjs`.
- Produz: `montarItens(posts, site): Array<{title, pubDate, link, description}>` e, pelo endpoint, um
  arquivo `dist/feed.xml` com um `<item>` por post.

- [ ] **Passo 1: escrever os testes que falham**

`src/lib/feed-items.test.js` — o caso do **Review Focus 5** (coleção vazia) mora aqui, porque é o
único jeito de exercitá-lo sem uma coleção de verdade:

```js
import { describe, it, expect } from 'vitest';
import { montarItens } from './feed-items.js';

it('um item por post, com link absoluto', () => {
  const posts = [{ id: '2025-07-27-hoje-nasce-o-brasil-em-numeros', data: { title: 'T', categories: ['noticias'] } }];
  const [item] = montarItens(posts, 'https://www.brasilemnumeros.ong.br');
  expect(item.link).toBe('https://www.brasilemnumeros.ong.br/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html');
});

// Review Focus 5 — coleção vazia: nenhum item quebrado, nenhuma exceção
it('coleção vazia devolve lista vazia', () => {
  expect(montarItens([], 'https://www.brasilemnumeros.ong.br')).toEqual([]);
});
```

`scripts/testar-feed.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
FEED=dist/feed.xml
test -f "$FEED" || { echo "feed: falta $FEED" >&2; exit 1; }
itens=$(grep -c '<item>' "$FEED")
[ "$itens" -eq 10 ] || { echo "feed: $itens itens, esperado 10" >&2; exit 1; }
grep -q '<link>https://www.brasilemnumeros.ong.br/noticias/2025/07/27/' "$FEED" \
  || { echo "feed: link de post faltando" >&2; exit 1; }
echo "feed ok ($itens itens)"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run ../src/lib/feed-items.test.js`
Expected: FAIL — `feed-items.js` não existe.

- [ ] **Passo 3: implementar `montarItens` e o endpoint**

`montarItens` no formato `@astrojs/rss`; o endpoint `feed.xml.ts` usa o helper `rss()`. **Conferir a
assinatura contra `node_modules/@astrojs/rss/dist/index.d.ts` antes de codar.**

- [ ] **Passo 4: rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run ../src/lib/feed-items.test.js && cd .. && NODE_ENV=development npm run build && bash scripts/testar-feed.sh`
Expected: testes PASS e `feed ok (10 itens)`.

- [ ] **Passo 5: comparar com o feed atual (o item aberto da spec §8)**

Run: `curl -s https://www.brasilemnumeros.ong.br/feed.xml | grep -c '<item>'`
Expected: comparar a contagem e o formato de `description` (completo × resumo) com o novo — e
registrar a diferença no `progress.md` da fatia.

- [ ] **Passo 6: commit**

```bash
git add src/pages/feed.xml.ts src/lib/feed-items.js src/lib/feed-items.test.js scripts/testar-feed.sh
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
urls=$(grep -c '<loc>' "$S")
[ "$urls" -ge 14 ] || { echo "sitemap: $urls urls, esperado >=14" >&2; exit 1; }
grep -q '/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros' "$S" \
  || { echo "sitemap: falta o post" >&2; exit 1; }
echo "sitemap ok ($urls urls)"
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

- [ ] `dist/feed.xml` existe, é XML válido e tem **10** `<item>`.
- [ ] `dist/sitemap.xml` existe com **um** `<urlset>` e ≥14 `<loc>` (o `jekyll-sitemap` publicava um
      arquivo só — a forma é preservada).
- [ ] **Nenhum** `dist/sitemap-index.xml` nem `dist/sitemap-0.xml`.
- [ ] O conteúdo do feed foi **comparado** com o atual (`curl` da produção) e a diferença está
      registrada no `progress.md` (é o item aberto da spec §8).
- [ ] O link para `/feed.xml` dentro de `blog.html`/posts continua resolvendo.

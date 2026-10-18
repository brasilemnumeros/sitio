# Fatia 03 — Posts e a URL do Jekyll

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** os **10 posts** viram uma coleção de conteúdo do Astro, com o layout de post portado e a
URL reproduzindo o padrão default do Jekyll — `/:categories/:year/:month/:day/:title:output_ext` —
porque **não há `permalink:` no `_config.yml`**.

**Arquitetura:** `src/content.config.ts` define a coleção `posts` (loader `glob` sobre
`src/content/posts/`); `src/pages/[categoria]/[ano]/[mes]/[dia]/[slug].astro` gera as rotas com
`getStaticPaths`. O `title` da URL é o **do arquivo**, não o `title:` do front matter — medido: o
post `2025-07-27-hoje-nasce-o-brasil-em-numeros.md` (cuja `title:` é "Início de tudo...") está
publicado em `/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html`.

**Stack:** coleção de conteúdo do Astro 7 (content layer) · `@astrojs/rss` só na fatia 04.

**Spec:** §4, §6 · **ADR:** 0002 (decisão 3).

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **Conferir a API da coleção contra `node_modules/astro/dist/@types/`** — o content layer mudou
  entre versões e é exatamente onde "escrever a forma e deixar o conteúdo" custa caro (`AGENTS.md`).
- **O slug vem do nome do arquivo**, não do `title:`. Um palpite errado aqui muda **10 URLs**.
- **Liquid dentro do conteúdo é quase nada — medido: 15 ocorrências.** Uma é `{% post_url %}`; ~11
  são `{{ site.url }}` montando links; 3 são `{{ ... | relative_url }}`. Substituir por caminhos
  diretos no próprio markdown (o link para o outro post vira o caminho literal dele).
- **Não inventar `categories:`.** São 4 `analises`, 5 `indicadores`, 1 `noticias`.

---

### Tarefa 1: a coleção `posts` e o schema

**Arquivos:**

- Criar: `src/content.config.ts`
- Mover: `_posts/*.md` → `src/content/posts/*.md` (com `git mv`, para preservar o histórico)
- Test: `src/content/posts/posts.test.js` (unitário, rodado por `vitest` — ver Restrições)

**Interfaces:**

- Produz: `getCollection('posts')` devolvendo entradas com
  `{ id, data: { title, description?, categories, tags?, audio?, image?, date }, body }`.

- [ ] **Passo 1: escrever o teste que falha**

`src/content/posts/posts.test.js` — o teste lê os **arquivos** e a **URL derivada**, que é o que
importa:

```js
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';

const URL_JEKYLL = /^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/;

describe('URL do post derivada do nome do arquivo', () => {
  it('todo arquivo casa o padrão data-slug do Jekyll', () => {
    const arquivos = readdirSync('src/content/posts').filter((f) => f.endsWith('.md'));
    expect(arquivos.length).toBe(10);
    for (const f of arquivos) expect(URL_JEKYLL.test(f), f).toBe(true);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run ../src/content/posts/posts.test.js`
Expected: FAIL — `src/content/posts` não existe.

> **Nota:** o site ainda não tem `vitest` próprio. Este teste precisa do `vitest` que já existe em
> `app/node_modules`; a fatia 07 decide se o site ganha um `package.json` de teste próprio. Até lá,
> rodar pelo app é aceitável e está registrado aqui de propósito.

- [ ] **Passo 3: mover os posts e criar a coleção**

```bash
git mv _posts/*.md src/content/posts/
```

`src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      categories: z.array(z.string()),
      tags: z.array(z.string()).optional(),
      audio: z.string().optional(),
      image: z.string().optional(),
    }),
  }),
};
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run ../src/content/posts/posts.test.js`
Expected: PASS (10 arquivos, todos casando).

- [ ] **Passo 5: commit**

```bash
git add src/content.config.ts src/content/posts src/content/posts/posts.test.js
git commit -m "feat(astro): coleção de posts (content layer) com os 10 posts migrados"
```

---

### Tarefa 2: a rota do post e o layout

**Arquivos:**

- Criar: `src/layouts/Post.astro` (de `_layouts/post.html`, 224 linhas)
- Criar: `src/pages/[categoria]/[ano]/[mes]/[dia]/[slug].astro`
- Test: `scripts/testar-urls.sh` (fatia 02) — passa a incluir o post de verdade

**Interfaces:**

- Consome: `getCollection('posts')` (T1), `Base.astro` (fatia 01).
- Produz: uma rota por post, no formato `/<categoria>/<ano>/<mes>/<dia>/<slug>.html`.

- [ ] **Passo 1: escrever o `getStaticPaths` e rodar o contrato**

O `getStaticPaths` **deriva ano/mês/dia/slug do `id`** (nome do arquivo), e usa o **primeiro**
`categories:` como `:categoria`:

```js
export async function getStaticPaths() {
  const posts = await getCollection('posts');
  return posts.map((p) => {
    const m = p.id.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
    const [, ano, mes, dia, slug] = m;
    return {
      params: { categoria: p.data.categories[0], ano, mes, dia, slug },
      props: { post: p },
    };
  });
}
```

> **Cuidado (Review Focus):** um post com `categories:` **vazio** geraria
> `/2025/07/27/slug.html` com categoria vazia na rota — o roteador do Astro quebraria. Garantir
> `p.data.categories[0]` não seja `undefined` (o schema já exige array **não vazio**: ajustar para
> `z.array(z.string()).min(1)`).

- [ ] **Passo 2: rodar e ver falhar o Post.astro**

Run: `NODE_ENV=development npm run build && bash scripts/testar-urls.sh`
Expected: FAIL só no post (`dist/noticias/2025/...` falta).

- [ ] **Passo 3: portar `Post.astro`**

Reproduzir `_layouts/post.html`: `<h1>` do título, `<time datetime>` + data formatada, os badges de
categoria, as tags, e os blocos **condicionais** de áudio (`page.audio`) e imagem (`page.image`). O
player de áudio (`shk-player`, com o `<script>` que o inicializa) **sai verbatim**.

> **Conferir a data contra o HTML produzido pelo Jekyll** (o filtro `date: '%d de %B de %Y'` usa o
> locale **en** por padrão; o Astro não usa esse filtro). Se o texto de hoje for "27 de July de
> 2025", reproduzir exatamente isso — a migração não corrige o idioma, isso é outra decisão.

- [ ] **Passo 4: rodar e ver passar**

Run: `bash scripts/testar-urls.sh`
Expected: `contrato de URL ok`.

- [ ] **Passo 5: conferir as 10 URLs**

Run: `find dist -name '*.html' | grep -E '^dist/(analises|indicadores|noticias)/' | sort`
Expected: 10 caminhos, todos casando `<cat>/<aaaa>/<mm>/<dd>/<slug>.html`.

- [ ] **Passo 6: commit**

```bash
git add src/layouts/Post.astro 'src/pages/[categoria]'
git commit -m "feat(astro): rota de post com o permalink default do Jekyll"
```

## Critérios de aceite (fatia 03)

- [ ] Existem **10** arquivos `dist/<categoria>/<aaaa>/<mm>/<dd>/<slug>.html`.
- [ ] O slug de cada um vem do **nome do arquivo**, não de `title:` (conferir o post
      `2025-07-27-hoje-nasce-o-brasil-em-numeros` → `/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html`,
      cujo `<title>` é "Início de tudo...").
- [ ] `git log --follow src/content/posts/<arquivo>` mostra o histórico do `_posts/` (o `git mv`
      preservou).
- [ ] Nenhum Liquid (`{{`, `{%`) sobrou no markdown: `grep -rn '{{\|{%' src/content/posts | wc -l`
      = 0.
- [ ] As tags e os badges de categoria aparecem no HTML.

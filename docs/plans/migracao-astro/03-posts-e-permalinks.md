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
- Criar: `src/lib/posts.ts` (a data vem do **nome do arquivo**; o helper é de todos)
- Criar: `scripts/testar-posts.sh`

**Interfaces:**

- Produz: `getCollection('posts')` devolvendo entradas com
  `{ id, data: { title, description?, categories, tags?, audio?, image? }, body }` — **sem `date`**.
- Produz: `src/lib/posts.ts` com `dataDoId(id)`, `isoDoJekyll(d)` e `dataPorExtenso(d)`.

> 🔴 **A data NÃO está no front matter — medido em 2026-10-18.** Conferi os 10 arquivos de
> `_posts/`: as chaves usadas são **só** `layout`, `title`, `categories`, `tags` e, em um post cada,
> `audio` e `image`. **Nenhum** tem `date:`. A data vem do **nome do arquivo**, como no Jekyll.
> Por isso o schema não tem `date` e as outras fatias (a listagem da 02, a rota da T2, o RSS da 04)
> **derivam** a data do `id` por `dataDoId` — se cada uma derivar por conta própria, uma delas vai
> divergir em silêncio.
>
> **Os três formatos, medidos no site publicado (não deduzidos):**
>
> | onde | saída medida |
> |---|---|
> | atributo `datetime` | `2025-07-27T00:00:00+00:00` (**com** `+00:00`, **não** `Z`) |
> | texto | `27 de July de 2025` |
> | dia de um dígito | `07 de August de 2025` (dia **com zero à esquerda**) |
> | ordem da listagem | decrescente (2025-11-14 → … → 2025-07-27) |
>
> 🔴 **Tudo em UTC.** A data do arquivo é meia-noite **UTC**; formatar no fuso local
> (America/Sao_Paulo, UTC−3) devolve o **dia anterior** — e o defeito aparece só em alguns posts.
>
> ```ts
> // src/lib/posts.ts
> // A data NÃO está no front matter: ela vem do nome do arquivo, como no Jekyll.
> // Tudo em UTC — a data do arquivo é meia-noite UTC e o fuso local (UTC-3)
> // jogaria a formatação para o DIA ANTERIOR.
> export function dataDoId(id: string): Date {
>   const m = id.match(/^(\d{4})-(\d{2})-(\d{2})/);
>   if (!m) throw new Error(`post: id não começa com data: ${id}`);
>   return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
> }
>
> // medido no site publicado: "2025-07-27T00:00:00+00:00" (com +00:00, não "Z")
> export function isoDoJekyll(d: Date): string {
>   return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
> }
>
> const MES = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });
>
> // medido no site publicado: "27 de July de 2025" e "07 de August de 2025".
> // O mês sai em INGLÊS porque o Jekyll não declara locale — ver o item aberto.
> export function dataPorExtenso(d: Date): string {
>   const dia = String(d.getUTCDate()).padStart(2, '0');
>   return `${dia} de ${MES.format(d)} de ${d.getUTCFullYear()}`;
> }
> ```
>
> ⚠️ **Item aberto (produto, não migração):** o site publica `27 de July de 2025` — mês em inglês com
> conectivo em português — e `og:locale: en_US` (fatia 01/T1). Os dois são artefatos de locale default
> do Jekyll. **Reproduzidos** aqui para não mudar o que o visitante vê durante a migração; **corrigir
> os dois é decisão do usuário**, e é uma mudança de uma linha cada (`'pt-BR'`).

> **Ruling (varredura de conflitos, 2026-10-18):** a primeira redação punha o teste desta tarefa em
> `src/content/posts/posts.test.js` e o rodava com o `vitest` **do app** (`app/vite.config.js` tem
> `include: ['src/**/*.test.js']`, que não alcança o site). O site não tem harness próprio, e dar um
> a ele é decisão da fatia 07. Aqui a verificação vira o mesmo tipo de script que as outras fatias
> usam — é o que o build encadeia.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-posts.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
DIR=src/content/posts
[ -d "$DIR" ] || { echo "posts: falta $DIR" >&2; exit 1; }

n=$(find "$DIR" -name '*.md' | wc -l | tr -d ' ')
[ "$n" -eq 10 ] || { echo "posts: $n arquivos, esperado 10" >&2; exit 1; }

# O slug da URL vem do NOME DO ARQUIVO (data-slug do Jekyll), não do title:
falha=0
while IFS= read -r f; do
  b=$(basename "$f")
  [[ "$b" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+\.md$ ]] \
    || { echo "posts: $b não casa o padrão data-slug do Jekyll" >&2; falha=1; }
done < <(find "$DIR" -name '*.md')
[ "$falha" -eq 0 ] || exit 1

# O schema VALIDA: o build roda o content layer e falha se um front matter não
# casar `src/content.config.ts`. Sem esta linha o teste acima prova só nomes de
# arquivo — um post que o schema rejeita passaria.
npm run build >/dev/null || { echo "posts: o build falhou (schema?)" >&2; exit 1; }

echo "posts ok ($n arquivos)"
```

> **Por que o `npm run build` está no teste:** contar arquivos com o nome certo não prova que a
> coleção **carrega**. O build sincroniza e valida o content layer; se um `categories:` viesse como
> string em vez de lista, o teste antigo passaria e o build quebraria na fatia seguinte — longe da
> causa.

- [ ] **Passo 2: rodar e ver falhar**

Run: `bash scripts/testar-posts.sh`
Expected: FAIL — `src/content/posts` não existe.

- [ ] **Passo 3: mover os posts e criar a coleção**

```bash
mkdir -p src/content/posts && git mv _posts/*.md src/content/posts/
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
      // min(1): a rota usa categories[0]; um array VAZIO geraria URL sem categoria (Review Focus 3).
      categories: z.array(z.string()).min(1),
      tags: z.array(z.string()).optional(),
      audio: z.string().optional(),
      image: z.string().optional(),
    }),
  }),
};
```

- [ ] **Passo 4: rodar e ver passar**

Run: `bash scripts/testar-posts.sh`
Expected: `posts ok (10 arquivos)`.

- [ ] **Passo 5: commit**

```bash
git add src/content.config.ts src/content/posts src/lib/posts.ts scripts/testar-posts.sh
git commit -m "feat(astro): coleção de posts (content layer) com os 10 posts migrados"
```

---

### Tarefa 2: a rota do post e o layout

**Arquivos:**

- Criar: `src/layouts/Post.astro` (de `_layouts/post.html`, 224 linhas)
- Criar: `src/pages/[categoria]/[ano]/[mes]/[dia]/[slug].astro`
- Test: `scripts/testar-meta.sh` (estendido: meta de post + caixa do player)

**Interfaces:**

- Consome: `getCollection('posts')` (T1), `Base.astro` (fatia 01).
- Produz: uma rota por post, no formato `/<categoria>/<ano>/<mes>/<dia>/<slug>.html`.
- **Produz o `Meta` do post, e ele NÃO é o de página**: um post tem de passar `tipo: 'article'` e o
  `jsonLd` `BlogPosting` (o canal existe em `Base` desde a fatia 01/T1). Medido ao vivo em
  2026-10-18: um post publica `<meta property="og:type" content="article">` e um JSON-LD
  `{"@type":"BlogPosting",…}`. Sem isto o post regride **em silêncio** para `website`/`WebPage` — a
  tabela do contrato medido está na fatia 01/T1, passo 3.
- **E isto é verificado, não presumido**, e o lugar é o **`scripts/testar-meta.sh`**, que já é o teste
  do contrato de meta — **não** o `testar-urls.sh` (que a 02/T3 cria **depois** desta tarefa). Estenda
  o `testar-meta.sh` para aceitar um arquivo de **post** e, num post real em `dist/`, assertir:
  `property="og:type" content="article"`, `"@type":"BlogPosting"`, `description` **não vazia** e o
  `canonical` terminando em **`.html`**. Conferir o site inteiro não serve: a página continua passando
  e o post continua errado.
- **Assertir também a caixa do player no post SEM áudio** (a armadilha 1 vira teste): um post sem
  `audio:` tem de ter `id="podcast-player"` **e** `data-src=""`. Se alguém a puser dentro do `if`, o
  teste avisa.

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

> **Cuidado (Review Focus 3):** um post com `categories:` **vazio** geraria
> `/2025/07/27/slug.html` (categoria vazia na rota) e o roteador do Astro quebraria. O schema já
> exige `categories: z.array(z.string()).min(1)` (fatia 03/T1) — **é essa a guarda**; não reintroduza
> `.min(1)` de outra forma nem relaxe o schema.

- [ ] **Passo 2: rodar e ver falhar**

Run: `npm run build && bash scripts/testar-meta.sh` (com a asserção de post recém-acrescentada)
Expected: FAIL — não existe nenhum `dist/<cat>/<aaaa>/<mm>/<dd>/<slug>.html` para conferir.

> 🔴 **Gap medido em 2026-10-18 — há Liquid no CORPO de um post, e ninguém o tira.**
> `src/content/posts/2025-07-29-completando-o-quebra-cabeca-lancamos-o-indicador-de-inflacao-ipca.md:8`
> tem `[post de lançamento]({% post_url 2025-07-27-hoje-nasce-o-brasil-em-numeros %})`. O Jekyll
> resolve essa tag na URL do post — medido no publicado:
> `<a href="/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html">post de lançamento</a>`.
> O Astro **não tem `post_url`**: sem tratamento, o corpo publicaria os `{% %}` **literais**, e o
> critério de aceite "nenhum Liquid sobrou no markdown" fica violado **sem erro**. É a mesma classe do
> `{% post_url %}` que o `trecho.ts` mascara na listagem (fatia 02/T2) — mas ali era só o trecho; aqui
> é a página inteira.
>
> **Correção (é uma edição de conteúdo, deliberada e isolada):** troque a tag pela URL resolvida,
> mantendo o link markdown:
>
> ```markdown
> No nosso [post de lançamento](/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html), falamos …
> ```
>
> É a **única** ocorrência de Liquid no corpo de um post (medido: `grep -rn '{%' src/content/posts`
> dá 1 linha). Confira o link gerado contra o publicado — a URL acima é a medida, não deduzida.
> **Não** invente um plugin de remark para isso: uma tag, uma vez.

- [ ] **Passo 3: portar `Post.astro`**

**Inventário medido do `_layouts/post.html` (2026-10-18) — o plano dizia só “os blocos condicionais de
áudio e imagem”, e há duas armadilhas:**

| bloco | linhas | condicional? |
|---|---|---|
| `<h1>` do título | 6 | não |
| `<time>` + data | 9-10 | não |
| badges de categoria (`<a href="/categorias/<cat>.html">`) | 13-31 | sim (`categories`) |
| selo `🎧 Podcast disponível` | 33-37 | sim (`audio`) |
| tags (`#tag`) | 40-48 | sim (`tags`) |
| aviso do podcast (“Versão Podcast: Prefere escutar?”) | 51-68 | sim (`audio`) |
| 🔴 **caixa do player** `<div id="podcast-player">` + `.shk-player` | 70-73 | **NÃO — sai em TODO post** |
| imagem de capa (`site.url` + `image`) | 75-84 | sim (`image`) |
| o corpo (`{{ content }}`) | 86 | não |
| script do Shikwasa + GA4 de áudio + `MutationObserver` | 88-194 | sim (`audio`) |
| SocialShareJS + Font Awesome (2 css + 2 js, CDN) | 196-206 | não |
| giscus | 208-224 | não |

> 🔴 **Armadilha 1 — o player não é condicional.** Medido no site publicado: o post dos homicídios
> (**sem** `audio:`) publica `<div id="podcast-player">` com `<div class="shk-player" data-src="">` —
> uma **caixa cinza vazia**. Só o aviso (51-68) e o script (88-194) dependem de `audio`. Se você
> deixar a caixa dentro do `if`, **10 posts mudam** (9 perdem a caixa). Reproduza o
> `data-src={post.data.audio ?? ''}` como o Jekyll faz.
>
> 🔴 **Armadilha 2 — o script de áudio substitui o título DENTRO de JS.** `{{ page.title | escape }}`
> e `{{ page.audio }}` aparecem dentro de string JS (`audio_title: '…'`, `src: '…'`). No Astro, use a
> interpolação do componente (`{post.data.title}`) — ela escapa para HTML, **não** para string JS.
> Confira o HTML gerado no post da Selic: as aspas do título (`"Taxaço"`) **não podem** quebrar o
> `audio_title: '…'`. Se precisar, escape para JS explicitamente e diga no relatório o que usou.
>
> O `<script>` do Shikwasa, o do SocialShareJS, o do Font Awesome e o do giscus **saem verbatim** —
> mesmas URLs, mesmos `data-*`, mesma ordem. O `MutationObserver`/`getTheme` fica (é a troca de tema
> do player), mesmo que o app seja escuro: é o que o site faz hoje.
>
> 🔴 **Armadilha 3 — o post não tem `description` no front matter, e o `Base.astro` a exige.**
> Medido nos 10 posts publicados: a `<meta name="description">` do post é o **excerpt completo** (o
> mesmo primeiro bloco do `trecho.ts`, **sem** o corte de 25/30 palavras) — e há exemplos de **408** e
> **291** caracteres, então **não há truncagem em 200**. O `Base.astro` (fatia 02/T1) **derruba o
> build** sem `description`: passe `trecho(post, Number.MAX_SAFE_INTEGER)` (a assinatura real é
> `trecho(entry, maxPalavras)` — `src/lib/trecho.ts:88`) e confira a string contra o publicado.
>
> Medido também: o `og:title` do post é o `title` do front matter, o `og:type` é `article`, e o
> `canonical` termina em **`.html`** (`…/luzes-sombras-queda-homicidios-brasil.html`).
>
> Os badges de categoria do post usam o **mesmo** `case` singular do `blog`
> (`📊 Análise` / `📈 Indicador` / `📢 Notícia` / `🏷️` + capitalize) — **reutilize o mapa de
> `categorias.ts`**, não recrie. O link é `/categorias/<cat>.html`.
>
> Medido também: 9 dos 10 posts são sem áudio; **1** tem `image:` (o do PIB, `2025-09-04`) — a URL da
> capa é `https://www.brasilemnumeros.ong.br` + o caminho do `image:`.

> **Conferir a data contra o HTML produzido pelo Jekyll** (o filtro `date: '%d de %B de %Y'` usa o
> locale **en** por padrão; o Astro não usa esse filtro). Se o texto de hoje for "27 de July de
> 2025", reproduzir exatamente isso — a migração não corrige o idioma, isso é outra decisão.

- [ ] **Passo 4: rodar e ver passar**

Run: `bash scripts/testar-meta.sh`
Expected: `meta ok` (incluindo as asserções novas do post).

- [ ] **Passo 5: conferir as 10 URLs**

Run: `find dist -name '*.html' | grep -E '^dist/(analises|indicadores|noticias)/' | sort`
Expected: 10 caminhos, todos casando `<cat>/<aaaa>/<mm>/<dd>/<slug>.html`.

- [ ] **Passo 6: commit**

```bash
git add src/layouts/Post.astro 'src/pages/[categoria]' src/content/posts/2025-07-29-completando-o-quebra-cabeca-lancamos-o-indicador-de-inflacao-ipca.md
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
      = 0. **Conferir no `dist/` também** — o teste é no artefato, não no fonte: a página do post do
      IPCA tem de conter `<a href="/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html">`, não
      `{%`.
- [ ] As tags e os badges de categoria aparecem no HTML.

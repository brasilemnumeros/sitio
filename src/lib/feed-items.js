// A montagem dos itens do feed, PURA e testável (fatia 04/T1).
//
// O `feed.xml.ts` é só um adaptador: pega a coleção, ordena e entrega ao
// `@astrojs/rss`. A lógica que importa (URL, data, absolutização) mora aqui,
// onde o teste `scripts/testar-feed-itens.mjs` a exercita sem subir o site.
//
// O import é de `./posts.ts` (com extensão explícita): este arquivo roda no
// `node` puro pelo teste E no build do Astro. O Node 26 remove os tipos do
// `posts.ts` em tempo de execução; o Vite resolve igual. Uma segunda cópia de
// `urlDoPost` divergiria da rota do post em silêncio — a categoria Critical.
import { dataDoId, urlDoPost } from './posts.ts';

// O RSS 2.0 NÃO tem `xml:base` (o Atom do `jekyll-feed` tinha): um `href="/…"` ou
// `src="/…"` dentro do `description` sairia relativo e QUEBRADO no leitor.
// Absolutizamos contra o `site`. Só a raiz (`="/`), que é o que o markdown do
// site produz — URLs já absolutas não casam o padrão.
// LIMITE: o padrão casaria `href="//cdn…"` (protocol-relative) e viraria
// `…ong.br//cdn…`; não há ocorrência hoje — se surgir, tratar à parte.
export function absolutizar(html, site) {
  return html.replace(/(href|src)="\//g, `$1="${site}/`);
}

// `posts`: entradas da coleção (`getCollection('posts')`); `site`: a origem
// publicada (string, sem barra final). Devolve os itens no formato `@astrojs/rss`.
// A coleção VAZIA devolve `[]` — nenhum item quebrado (Review Focus 5).
export function montarItens(posts, site) {
  return posts.map((post) => ({
    title: post.data.title,
    pubDate: dataDoId(post.id),
    // `urlDoPost` devolve `/categoria/AAAA/MM/DD/slug.html`; o feed precisa do
    // absoluto (o leitor não tem o contexto do site).
    link: `${site}${urlDoPost(post.id, post.data.categories[0])}`,
    // Conteúdo COMPLETO do post (paridade com o `<content>` do Atom publicado),
    // com as URLs de raiz absolutizadas. O `@astrojs/rss` escapa o HTML em
    // entidades no `description` — que é como o RSS 2.0 carrega HTML — e o
    // leitor o reidrata. Ver a medição no relatório da fatia.
    description: absolutizar(post.rendered?.html ?? '', site),
  }));
}

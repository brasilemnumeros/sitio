// O `/feed.xml` publicado (fatia 04/T1). O PATH é o linkado em `blog.astro` e nos
// posts — não é `/rss.xml`.
//
// DIALETO: o `jekyll-feed` publicava ATOM (`<feed>`/`<entry>`); o `@astrojs/rss`
// publica RSS 2.0 (`<rss>`/`<channel>`/`<item>`). O path fica igual, o dialeto
// muda — é item aberto de produto (registrado no relatório/progresso da fatia).
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { dataDoId } from '../lib/posts';
import { montarItens } from '../lib/feed-items.js';

export async function GET(context) {
  // `site.posts` do Jekyll sai por data DECRESCENTE (o `<entry>` mais novo no
  // topo). `getCollection` não promete ordem nenhuma.
  const posts = (await getCollection('posts')).sort(
    (a, b) => dataDoId(b.id).getTime() - dataDoId(a.id).getTime(),
  );

  // `context.site` é uma URL (`.href` traz a barra final no root); `montarItens`
  // quer a origem SEM barra, senão o link sairia `…//categoria/…`.
  const site = String(context.site).replace(/\/$/, '');

  return rss({
    title: 'Brasil em Números',
    description: 'Uma plataforma dedicada a fornecer dados e informações sobre o Brasil.',
    site: context.site,
    items: montarItens(posts, site),
  });
}

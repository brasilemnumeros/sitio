// O `/sitemap.xml` publicado (fatia 04/T2).
//
// ENDPOINT PRÓPRIO, e a razão é MEDIDA (Passo 1 do plano): o `@astrojs/sitemap`
// emite `sitemap-index.xml` + `sitemap-0.xml` (dois arquivos, plural), com os
// `<loc>` SEM `.html` e SEM `<lastmod>` — três divergências do publicado, que é
// UM `<urlset>` em `/sitemap.xml` com `.html` e 10 `<lastmod>`. Por isso a
// integração NÃO fica ligada (senão os `sitemap-*.xml` órfãos são publicados).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { dataDoId, isoDoJekyll, urlDoPost } from '../lib/posts';
import { ORDEM_CATEGORIAS } from '../lib/categorias';

// As páginas FIXAS publicadas — o `site.pages` do Jekyll, medido contra o
// `sitemap.xml` publicado em 2026-10-18. As categorias saem do mapa
// (`categorias.ts`) para não divergirem; o resto é a lista publicada. O `404`
// NÃO entra (nem o Jekyll o publicava) e a raiz sai como `/` (sem nome de
// arquivo), como no site.
const FIXAS = [
  '/',
  '/blog.html',
  '/links.html',
  '/sobre.html',
  '/termos-de-uso.html',
  '/politica-de-privacidade.html',
  ...ORDEM_CATEGORIAS.map((categoria) => `/categorias/${categoria}.html`),
];

export const GET: APIRoute = async ({ site }) => {
  const origem = String(site).replace(/\/$/, '');

  // Os posts saem em ordem CRONOLÓGICA CRESCENTE, como no publicado.
  const posts = (await getCollection('posts')).sort(
    (a, b) => dataDoId(a.id).getTime() - dataDoId(b.id).getTime(),
  );

  // Só os POSTS têm `<lastmod>` (formato `isoDoJekyll`); as páginas fixas não.
  const urls = [
    ...posts.map((post) => ({
      loc: `${origem}${urlDoPost(post.id, post.data.categories[0])}`,
      lastmod: isoDoJekyll(dataDoId(post.id)),
    })),
    ...FIXAS.map((caminho) => ({
      loc: caminho === '/' ? `${origem}/` : `${origem}${caminho}`,
      lastmod: undefined,
    })),
  ];

  const corpo = urls
    .map(({ loc, lastmod }) =>
      lastmod
        ? `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
        : `<url><loc>${loc}</loc></url>`,
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${corpo}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};

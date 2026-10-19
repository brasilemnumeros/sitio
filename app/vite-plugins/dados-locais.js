// Middleware de DADO local — UMA implementação, usada por DOIS dev servers:
// o do app (`app/vite.config.js`, Vite) e o do site (`astro.config.mjs`, Vite por baixo
// do Astro). Extraído para módulo (§10.4) para que os dois não derivem: uma correção
// num, o outro não veria.
//
// O que ele resolve, e por que existe (medido em 2026-10-15, fatias 07/08/11): como os
// arquivos moram FORA da raiz do dev server, o Vite cai no fallback do SPA e devolve o
// `index.html` com `Content-Type: text/html` para QUALQUER caminho que não resolve. O
// browser descarta, e a falha é SILENCIOSA: a página fica sem estilo e o catálogo/série
// dão `SchemaError` (lendo HTML como JSON) em vez de 404. Nenhum teste pega (§10.7); só
// a tela. Este plugin mata o silêncio com um 404 EM VOZ ALTA.
//
// **Local serve dado LOCAL.** O catálogo publicado aponta `datafile` para as URLs do
// GitHub Pages, que só têm o schema novo depois que o repo `dados` for publicado — antes
// disso o app quebra com `SchemaError` mesmo estando tudo certo no disco. Então o
// `/indicators.json` servido aqui é o arquivo local com o `datafile` **reescrito para o
// caminho local**. Em produção isso não existe: lá o `datafile` aponta para o Pages.
//
// 🔴 Os CAMINHOS são PASSADOS PELO CHAMADOR, nunca adivinhados aqui. Este módulo vive em
// `app/vite-plugins/`, então um `../indicators.json` relativo a ele seria
// `sitio/app/indicators.json` — ERRADO. E um caminho errado **não falha**: ele só nunca
// casa, e o dev server responde o HTML (o defeito silencioso de novo). Cada config
// resolve os seus a partir do próprio `import.meta.url`.
import { existsSync, createReadStream, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Troca a URL publicada pela rota local — só em dev, só na cópia servida. */
const URL_PUBLICADA = /https:\/\/brasilemnumeros\.github\.io\/dados\//g;

/**
 * @param {object} opcoes
 * @param {string} opcoes.dadosDir  diretório absoluto do repo `dados/` local (raiz de `/dados/`).
 * @param {string} opcoes.catalogo  caminho absoluto do `indicators.json` a servir.
 * @param {string} [opcoes.css]     caminho absoluto do `main.dist.css` do site. **Opcional**:
 *   só o dev server do APP o passa (`app/index.html:14` o linka, e é ele que serve os 12 E2E).
 *   Sem ele, o ramo do CSS nem é montado — o Astro não tem esse arquivo no grafo dele.
 * @returns {import('vite').Plugin}
 */
export function dadosLocais({ dadosDir, catalogo, css } = {}) {
  if (!dadosDir) throw new Error('dadosLocais: falta `dadosDir`');
  if (!catalogo) throw new Error('dadosLocais: falta `catalogo`');

  return {
    name: 'dados-locais',
    configureServer(server) {
      // O CSS do site — opcional (só quando o chamador passa `css`).
      if (css) {
        server.middlewares.use('/assets/css/main.dist.css', (_req, res) => {
          if (!existsSync(css)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end('main.dist.css nao existe. Rode o Tailwind CLI (ver AGENTS.md).\n');
          }
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
          createReadStream(css).pipe(res);
        });
      }

      // O catálogo, com o `datafile` apontando para o dado LOCAL
      server.middlewares.use('/indicators.json', (_req, res) => {
        if (!existsSync(catalogo)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end('indicators.json nao existe.\n');
        }
        const bruto = readFileSync(catalogo, 'utf8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(bruto.replace(URL_PUBLICADA, '/dados/'));
      });

      // As séries, servidas do repo `dados/` local
      server.middlewares.use('/dados/', (req, res) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '');
        const caminho = resolve(dadosDir, rel);
        // Fora da pasta `dados/` (traversal) ou inexistente: **404 em voz alta**. Deixar
        // cair no fallback do SPA devolveria `index.html` com 200 e o app leria HTML como
        // JSON — exatamente o defeito silencioso que este middleware existe para matar.
        if (!caminho.startsWith(dadosDir) || !existsSync(caminho)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(`dados/${rel} nao existe no repo local.\n`);
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        createReadStream(caminho).pipe(res);
      });
    },
  };
}

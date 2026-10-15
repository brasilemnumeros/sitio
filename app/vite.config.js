import { existsSync, createReadStream, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Dev: serve os arquivos do SITE que moram fora da raiz do Vite, e o DADO local.
 *
 * O app roda em `sitio/app/`, mas consome arquivos que vivem um nível acima:
 * `/assets/css/main.dist.css` (o CSS do Tailwind CLI, §10.4), `/indicators.json` (o catálogo)
 * e as séries em `/dados/<familia>/<arquivo>.json`. Como estão fora da raiz do dev server, o
 * Vite **não os serve** — cai no fallback do SPA e devolve o `index.html` com
 * `Content-Type: text/html`. O browser descarta, e a falha é **silenciosa**: a página fica sem
 * estilo, e o catálogo/série dão `SchemaError` em vez de 404.
 *
 * Medido em 2026-10-15 (fatias 07, 08 e 11). Nenhum teste pega (§10.7 — o desenho não tem
 * teste) e o build do CI também não, porque lá os arquivos são publicados no lugar certo.
 * Só a tela pega.
 *
 * **Local serve dado LOCAL.** O catálogo publicado aponta `datafile` para as URLs do GitHub
 * Pages, que só têm o schema novo depois que o repo `dados` for publicado — antes disso o app
 * quebra com `SchemaError` mesmo estando tudo certo no disco. Então o `/indicators.json`
 * servido aqui é o arquivo local com o `datafile` **reescrito para o caminho local**. Em
 * produção isso não existe: lá o `datafile` aponta para o Pages e é o Pages que serve.
 * É a diferença entre "o app não funciona" e "o app não funciona por causa do ambiente".
 *
 * O Tailwind CLI é rebuildado à parte:
 *   `npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css`
 */
// Onde mora o repo `dados/`. Em dev local são repos IRMÃOS: de `sitio/app/` são dois níveis
// acima (`../../dados/`). No CI o `actions/checkout` não escreve fora do workspace, então lá o
// repo vai para `./dados/` — `DADOS_DIR` cobre os dois sem heurística escondida. (Trocar isto
// por um "tenta um, senão o outro" esconderia justamente o erro que já custou uma rodada: o
// caminho errado **não falha**, simplesmente nunca casa, e o dev server responde com o HTML.)
const DADOS_LOCAIS = fileURLToPath(new URL(process.env.DADOS_DIR ?? '../../dados/', import.meta.url));
const CATALOGO = fileURLToPath(new URL('../indicators.json', import.meta.url));
const CSS_DO_SITE = fileURLToPath(new URL('../assets/css/main.dist.css', import.meta.url));

/** Troca a URL publicada pela rota local — só em dev, só na cópia servida. */
const URL_PUBLICADA = /https:\/\/brasilemnumeros\.github\.io\/dados\//g;

function servirArquivosDoSite() {
  return {
    name: 'servir-arquivos-do-site',
    configureServer(server) {
      // O CSS do site
      server.middlewares.use('/assets/css/main.dist.css', (_req, res) => {
        if (!existsSync(CSS_DO_SITE)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end('main.dist.css nao existe. Rode o Tailwind CLI (ver AGENTS.md).\n');
        }
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        createReadStream(CSS_DO_SITE).pipe(res);
      });

      // O catálogo, com o `datafile` apontando para o dado LOCAL
      server.middlewares.use('/indicators.json', (_req, res) => {
        if (!existsSync(CATALOGO)) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end('indicators.json nao existe.\n');
        }
        const bruto = readFileSync(CATALOGO, 'utf8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(bruto.replace(URL_PUBLICADA, '/dados/'));
      });

      // As séries, servidas do repo `dados/` local
      server.middlewares.use('/dados/', (req, res) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '');
        const caminho = resolve(DADOS_LOCAIS, rel);
        // Fora da pasta `dados/` (traversal) ou inexistente: **404 em voz alta**. Deixar cair no
        // fallback do SPA devolveria `index.html` com 200 e o app leria HTML como JSON —
        // exatamente o defeito silencioso que este middleware existe para matar.
        if (!caminho.startsWith(DADOS_LOCAIS) || !existsSync(caminho)) {
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

export default defineConfig(({ command }) => ({
  // O app busca o DADO em dois lugares: as séries vêm do `datafile` do catálogo, e os
  // governos (o trilho de mandatos) de uma URL aqui. Em **dev** ambos apontam para o repo
  // `dados/` local — servido pelo middleware acima; em **produção**, para o Pages do repo
  // `dados`. Isto é o que faz "local serve dado local" sem mexer no app.
  define: {
    __BASE_DADOS__: JSON.stringify(
      command === 'serve' ? '/dados' : 'https://brasilemnumeros.github.io/dados'
    ),
  },
  plugins: [servirArquivosDoSite(), svelte()],
  build: {
    // Artefato publicado em sitio/assets/js/app/ (gitignored) — §10.1
    outDir: '../assets/js/app',
    emptyOutDir: true,
    rollupOptions: {
      // Entrada de build aponta para o JS: o index.html é só o shell do `vite dev`.
      // Sem isto o Vite copiaria o index.html para o outDir (shell órfão publicado).
      input: fileURLToPath(new URL('./src/main.js', import.meta.url)),
      output: {
        // Nome fixo: o HTML não precisa de manifest para descobrir o nome gerado.
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
  test: {
    // §10.7 — só unidade, sem navegador por ora.
    environment: 'node',
    // `globals: true` porque os BRIEFS dos planos escrevem `it`/`expect`/`vi` nus, e sem isto
    // cada transcrição quebra com ReferenceError. Já custou duas rodadas de correção na fatia 05
    // (o `vi` da tarefa 2, o `it`/`expect` da tarefa 3). Os 10 arquivos antigos importam
    // explícito e continuam válidos — isto só deixa de punir a forma que o plano já usa.
    globals: true,
    include: ['src/**/*.test.js'],
  },
}));

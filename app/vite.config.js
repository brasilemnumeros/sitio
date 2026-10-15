import { existsSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Dev: serve os arquivos do SITE que moram fora da raiz do Vite.
 *
 * O app roda em `sitio/app/`, mas consome dois arquivos que vivem um nível acima, na raiz
 * Jekyll: `/assets/css/main.dist.css` (o CSS gerado pelo Tailwind CLI, §10.4) e
 * `/indicators.json` (o catálogo, `data/catalog.js`). Como esses caminhos estão fora da raiz
 * do dev server, o Vite **não os serve** — cai no fallback do SPA e devolve o `index.html`
 * com `Content-Type: text/html`. O browser descarta e a falha é **silenciosa**: a página
 * fica sem estilo, e o catálogo dá `SchemaError` em vez de 404.
 *
 * Medido em 2026-10-15 (fatias 07 e 08). Nenhum teste pega (§10.7 — o desenho não tem teste)
 * e o build do CI também não, porque lá os dois arquivos são publicados no lugar certo.
 * Só a tela pega.
 *
 * O Tailwind CLI é rebuildado à parte:
 *   `npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css`
 */
const ARQUIVOS_DO_SITE = [
  { rota: '/assets/css/main.dist.css', de: '../assets/css/main.dist.css', tipo: 'text/css; charset=utf-8' },
  { rota: '/indicators.json',          de: '../indicators.json',          tipo: 'application/json; charset=utf-8' },
];

function servirArquivosDoSite() {
  return {
    name: 'servir-arquivos-do-site',
    configureServer(server) {
      for (const { rota, de, tipo } of ARQUIVOS_DO_SITE) {
        const caminho = fileURLToPath(new URL(de, import.meta.url));
        server.middlewares.use(rota, (_req, res) => {
          if (!existsSync(caminho)) {
            // Falha em voz alta: sem isto a página aparece quebrada e ninguém sabe por quê.
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end(`${de} nao existe. Ver AGENTS.md, secao "Dev environment".\n`);
          }
          res.setHeader('Content-Type', tipo);
          createReadStream(caminho).pipe(res);
        });
      }
    },
  };
}

export default defineConfig({
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
});

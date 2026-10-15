import { existsSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

/**
 * Dev: serve o CSS do site, que mora FORA da raiz do Vite.
 *
 * O `index.html` aponta para `../assets/css/main.dist.css` (o CSS gerado pelo Tailwind CLI
 * a partir de `sitio/`, §10.4). Como esse caminho está fora da raiz do dev server, o Vite
 * **não o serve** — cai no fallback do SPA e devolve o `index.html` com
 * `Content-Type: text/html`. O browser descarta, e a página fica **sem estilo, em silêncio**.
 *
 * Medido em 2026-10-15 durante a fatia 07: a captura de tela da Tarefa 1 saiu com Times New
 * Roman cru. Nenhum teste pega isso (§10.7 — o desenho não tem teste), e o build do CI não
 * pega também, porque lá o CSS é publicado junto. Só a tela pega.
 *
 * Rebuild do arquivo: `npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css`
 */
const cssDoSite = fileURLToPath(new URL('../assets/css/main.dist.css', import.meta.url));

function servirCssDoSite() {
  return {
    name: 'servir-css-do-site',
    configureServer(server) {
      server.middlewares.use('/assets/css/main.dist.css', (_req, res) => {
        if (!existsSync(cssDoSite)) {
          // Falha em voz alta: sem isto a página aparece sem estilo e ninguém sabe por quê.
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(
            'main.dist.css nao existe. Rode o Tailwind CLI — ver AGENTS.md, secao "Dev environment".\n',
          );
        }
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        createReadStream(cssDoSite).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [servirCssDoSite(), svelte()],
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

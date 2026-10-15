import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
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

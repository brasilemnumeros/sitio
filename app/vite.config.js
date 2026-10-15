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
    include: ['src/**/*.test.js'],
  },
});

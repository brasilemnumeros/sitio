import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.brasilemnumeros.ong.br',
  outDir: 'dist',
  publicDir: 'public',
  // `assets: 'assets'` faz o CSS/JS gerado sair em `dist/assets/` (o default do
  // Astro é `_astro`); o resto do plano (fatias 01 e 05) lê `dist/assets/*.css`
  // e `dist/assets/js/...`. O `public/` é copiado para a mesma pasta.
  build: { format: 'file', assets: 'assets' },
  trailingSlash: 'never',
  vite: { plugins: [tailwindcss()] },
});

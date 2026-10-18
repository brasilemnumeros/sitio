import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.brasilemnumeros.ong.br',
  outDir: 'dist',
  publicDir: 'public',
  build: { format: 'file' },
  trailingSlash: 'never',
  vite: { plugins: [tailwindcss()] },
});

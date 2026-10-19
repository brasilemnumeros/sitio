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
  // `gfm: false`: o Jekyll usa kramdown, que NÃO autolinka URL crua (`www.…`); o
  // GFM do remark transformaria esse texto em <a>, mudando o que o visitante vê.
  // Medido em 2026-10-18: nenhum conteúdo atual usa tabela, `~~` ou task list.
  markdown: { gfm: false },
  vite: { plugins: [tailwindcss()] },
});

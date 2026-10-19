import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
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
  // Sätteri é o processador nativo do Astro 7 (o `markdown.gfm` está deprecado).
  // `gfm: false`: o kramdown do Jekyll NÃO autolinka URL crua (`www.…`); o GFM
  // transformaria esse texto em <a> e mudaria o que o visitante vê.
  // `smartPunctuation` fica no default (true) DE PROPÓSITO: o kramdown também faz
  // smartypants — o site publicado tem aspas curvas geradas de aspas retas.
  markdown: { processor: satteri({ features: { gfm: false, smartPunctuation: true } }) },
  vite: { plugins: [tailwindcss()] },
});

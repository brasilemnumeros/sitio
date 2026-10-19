import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';
import { dadosLocais } from './app/vite-plugins/dados-locais.js';

// O middleware de dado local do `astro dev` é o MESMO módulo do app (extraído na
// fatia 05). Os caminhos são resolvidos a partir de `sitio/` — o módulo vive em
// `app/vite-plugins/`, então os relativos dele apontariam para o lugar errado, e um
// caminho errado NÃO falha: só nunca casa, e o dev server responde HTML (o defeito
// silencioso que só o `Content-Type` pega).
// `DADOS_DIR` cobre o layout do CI, onde o repo `dados` cai em `./dados/` (mesma
// convenção do `app/vite.config.js`).
const DADOS_LOCAIS = fileURLToPath(new URL(process.env.DADOS_DIR ?? '../dados/', import.meta.url));
const CATALOGO = fileURLToPath(new URL('./indicators.json', import.meta.url));

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
  // `gfm: false`: o kramdown do gerador anterior NÃO autolinkava URL crua (`www.…`); o GFM
  // transformaria esse texto em <a> e mudaria o que o visitante vê.
  // `smartPunctuation` fica no default (true) DE PROPÓSITO: o kramdown também faz
  // smartypants — o site publicado tem aspas curvas geradas de aspas retas.
  markdown: { processor: satteri({ features: { gfm: false, smartPunctuation: true } }) },
  // O middleware de dado local (o mesmo do app), SEM `css`: o Astro não serve o
  // `main.dist.css` do Tailwind CLI — só o app precisa dele (medição 4).
  // `__BASE_DADOS__` NÃO entra aqui: o site só inclui o `app.js` já construído, e
  // nele o valor de produção já está inline (medição 7).
  vite: { plugins: [tailwindcss(), dadosLocais({ dadosDir: DADOS_LOCAIS, catalogo: CATALOGO })] },
});

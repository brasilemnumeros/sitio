import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { dadosLocais } from './vite-plugins/dados-locais.js';

/**
 * Dev do APP: além do app em si, serve o DADO local (o catálogo e as séries em
 * `/dados/**`) e o CSS do site. O middleware é compartilhado com o site (o
 * `astro.config.mjs` usa o mesmo módulo) — ver `vite-plugins/dados-locais.js`, onde
 * está o porquê detalhado (o fallback silencioso do Vite, "local serve dado local").
 *
 * Os CAMINHOS são resolvidos AQUI (não no módulo): ele vive em `app/vite-plugins/`,
 * então um `../indicators.json` relativo a ele seria `sitio/app/indicators.json`.
 * Um caminho errado NÃO falha — só nunca casa, e o dev server responde HTML.
 *
 * O Tailwind CLI é rebuildado à parte (o script `css` do `sitio/package.json`).
 */
// Onde mora o repo `dados/`. Em dev local são repos IRMÃOS: de `sitio/app/` são dois níveis
// acima (`../../dados/`). No CI o `actions/checkout` não escreve fora do workspace, então lá o
// repo vai para `./dados/` — `DADOS_DIR` cobre os dois sem heurística escondida. (Trocar isto
// por um "tenta um, senão o outro" esconderia justamente o erro que já custou uma rodada: o
// caminho errado **não falha**, simplesmente nunca casa, e o dev server responde com o HTML.)
const DADOS_LOCAIS = fileURLToPath(new URL(process.env.DADOS_DIR ?? '../../dados/', import.meta.url));
const CATALOGO = fileURLToPath(new URL('../indicators.json', import.meta.url));
const CSS_DO_SITE = fileURLToPath(new URL('../assets/css/main.dist.css', import.meta.url));


export default defineConfig(({ command }) => ({
  // O app busca o DADO em dois lugares: as séries vêm do `datafile` do catálogo, e os
  // governos (o trilho de mandatos) de uma URL aqui. Em **dev** ambos apontam para o repo
  // `dados/` local — servido pelo middleware acima; em **produção**, para o Pages do repo
  // `dados`. Isto é o que faz "local serve dado local" sem mexer no app.
  define: {
    // ⚠ O `dev` do SITE (`astro dev`) roda `build:app` em modo BUILD — e por isso caía no ramo de
    // PRODUÇÃO, buscando os governos na URL publicada. Medido em 2026-10-19: `federal.json`
    // publicado responde **404** (item 1 do deploy pendente), o `catch` de `carregarMandatos`
    // engole a falha (§9.3) e o resultado é o gráfico e o minimapa SEM FAIXA NENHUMA — parece
    // minimapa vazio, é dado faltando. `DADOS_LOCAL=1` (posto pelo script `dev` do `sitio`) faz o
    // mesmo que o `vite dev` do app: local serve dado local.
    __BASE_DADOS__: JSON.stringify(
      command === 'serve' || process.env.DADOS_LOCAL === '1'
        ? '/dados'
        : 'https://brasilemnumeros.github.io/dados'
    ),
  },
  plugins: [
    // O middleware de dado local, compartilhado com o site. Só o APP passa o `css`:
    // `app/index.html` linka `../assets/css/main.dist.css` e é este ramo que o serve
    // (o que sustenta os 12 E2E). O Astro passa sem `css` (medição 4).
    dadosLocais({ dadosDir: DADOS_LOCAIS, catalogo: CATALOGO, css: CSS_DO_SITE }),
    svelte(),
  ],
  build: {
    // Artefato publicado em sitio/public/assets/js/app/ (gitignored) — §10.1.
    // O `astro build` só copia o `publicDir` (`public/`) para o `dist/`; um
    // `outDir` fora dele (o antigo `../assets/js/app`) existe no disco e NUNCA
    // chega ao `dist/` — falha silenciosa (medição 1 do brief da fatia 05).
    outDir: '../public/assets/js/app',
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

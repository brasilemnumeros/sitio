#!/usr/bin/env node
/**
 * MOBILE — o site não rola na horizontal a 375px. Mede TODAS as páginas de `dist/`.
 *
 * Por que este guarda existe: o E2E do app (`app/e2e/`) roda contra o dev server do Vite e só
 * alcança o app — as páginas do site nascem DEPOIS, no `astro build`. Um elemento de largura
 * fixa numa página de texto é falha silenciosa: nada quebra, o build passa, e no celular a
 * página rola de lado. Medido em 2026-10-19 (320/375/390px): o site estava OK; este script
 * congela isso, porque nada provava.
 *
 * ⚠️ A armadilha que este script tem de evitar: se o CSS NÃO carregar (MIME errado, 404), a
 *    página renderiza sem Tailwind e a medição vira MENTIRA — foi assim que a fatia 07 ficou
 *    sem estilo em silêncio. Por isso o servidor daqui serve `text/css` de verdade E cada
 *    página é conferida antes: sem o preflight, a margem do `<body>` seria os 8px do navegador.
 *
 * ⚠️ Depende do chromium do Playwright, que vive em `../app/node_modules` — por isso o require
 *    é criado a partir de `app/package.json` (o repo do site não tem playwright próprio). No CI
 *    ele já foi instalado antes do build (o passo do E2E vem primeiro).
 */
import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const LARGURA = 375; // iPhone SE/12 mini — o corte apertado ainda em uso (a §12.1 do app usa 768)
const ALTURA = 812;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

// --- servidor de statics (node:http; sem dependência, sem TLS) ---------------------------------
const servidor = createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let arquivo = join(DIST, caminho);
  if (!arquivo.startsWith(DIST)) {
    res.writeHead(403).end('403');
    return;
  }
  try {
    if ((await stat(arquivo)).isDirectory()) arquivo = join(arquivo, 'index.html');
    const corpo = await readFile(arquivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' });
    res.end(corpo);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
  }
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const PORTA = servidor.address().port;

// --- playwright (de app/node_modules) ----------------------------------------------------------
const exigir = createRequire(new URL('../app/package.json', import.meta.url));
let chromium;
try {
  ({ chromium } = exigir('playwright'));
} catch {
  console.error(
    'mobile: playwright não está em app/node_modules — rode `npm ci --prefix app` e\n' +
      '        `npx --prefix app playwright install chromium` antes do build.',
  );
  process.exit(1);
}

const paginas = (await readdir(DIST, { recursive: true }))
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.split(sep).join('/'))
  .sort();

if (paginas.length === 0) {
  console.error('mobile: dist/ não tem página nenhuma — rode o `astro build` antes.');
  process.exit(1);
}

const navegador = await chromium.launch().catch((erro) => {
  console.error(
    'mobile: o chromium do Playwright não subiu — rode\n' +
      '        `npx --prefix app playwright install chromium` antes do build.\n' +
      `        (${erro.message.split('\n')[0]})`,
  );
  process.exit(1);
});
const contexto = await navegador.newContext({
  viewport: { width: LARGURA, height: ALTURA },
  isMobile: true,
  hasTouch: true,
});
const pagina = await contexto.newPage();

const problemas = [];
for (const caminho of paginas) {
  await pagina.goto(`http://127.0.0.1:${PORTA}/${caminho}`, { waitUntil: 'load' });
  // o app monta depois do load (busca o catálogo); 150ms bastam para o layout assentar
  await pagina.waitForTimeout(150);

  const medida = await pagina.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    margemDoBody: getComputedStyle(document.body).margin,
  }));

  // O canário vem PRIMEIRO: com a medição inválida, o resto não diz nada.
  if (medida.margemDoBody !== '0px') {
    problemas.push(
      `${caminho}: o Tailwind NÃO aplicou (margem do <body> = ${medida.margemDoBody}) — ` +
        'a página renderizou crua e a medição de transbordo não vale',
    );
    continue;
  }

  if (medida.scrollW > medida.clientW + 1) {
    const culpados = await pagina.evaluate(() => {
      const limite = document.documentElement.clientWidth;
      const fora = [];
      for (const el of document.querySelectorAll('body *')) {
        const caixa = el.getBoundingClientRect();
        if (caixa.width === 0 || getComputedStyle(el).position === 'fixed') continue;
        if (caixa.right > limite + 1) {
          const classe = (el.getAttribute('class') ?? '').split(/\s+/).slice(0, 2).join('.');
          fora.push(`<${el.tagName.toLowerCase()}${classe ? ` class="${classe}…"` : ''}> right=${Math.round(caixa.right)}`);
        }
      }
      return fora.slice(0, 4);
    });
    problemas.push(
      `${caminho}: rola na horizontal — ${medida.scrollW}px de conteúdo em ${medida.clientW}px ` +
        `(+${medida.scrollW - medida.clientW}px)\n      ${culpados.join('\n      ')}`,
    );
    continue;
  }

  console.log(`  ok  ${caminho}`);
}

await navegador.close();
servidor.close();

if (problemas.length > 0) {
  console.error(`\nmobile: ${problemas.length} de ${paginas.length} páginas reprovadas a ${LARGURA}px:`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`mobile ok — ${paginas.length} páginas sem transbordo horizontal a ${LARGURA}px`);

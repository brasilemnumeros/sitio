// Verifica o gate de consentimento/DNT do analytics num build de PRODUÇÃO.
// O playwright é o de app/ (o projeto já o tem; este script não instala nada).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const require = createRequire(new URL('../app/', import.meta.url));
const { chromium } = require('playwright');

const DIST = new URL('../dist/', import.meta.url).pathname;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const servidor = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const buf = await readFile(join(DIST, normalize(p)));
    res.writeHead(200, { 'content-type': TIPOS[extname(p)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('nao encontrado');
  }
});
// Porta efêmera (`0`): não colide com nada já na 8099. A porta real só existe
// depois do listen, então o BASE é montado aqui.
await new Promise((r) => servidor.listen(0, r));
const { port } = servidor.address();

const BASE = `http://localhost:${port}/`;
let falha = 0;
const conferir = (ok, msg) => { if (!ok) { console.error(`analytics: ${msg}`); falha = 1; } };

async function cenario(rotulo, { dnt = false, consentiu = false }, esperaTerceiro) {
  const navegador = await chromium.launch();
  const contexto = await navegador.newContext();
  // O analytics lê window.doNotTrack / navigator.doNotTrack (analytics.html, verbatim).
  if (dnt) await contexto.addInitScript(() => Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' }));
  if (consentiu) await contexto.addCookies([{ name: 'cookie-notice-dismissed', value: 'true', url: BASE }]);
  const pagina = await contexto.newPage();
  const terceiros = [];
  pagina.on('request', (r) => { if (r.url().includes('googletagmanager')) terceiros.push(r.url()); });
  await pagina.goto(BASE, { waitUntil: 'load' });
  await pagina.waitForTimeout(1500);
  conferir(
    esperaTerceiro ? terceiros.length > 0 : terceiros.length === 0,
    `${rotulo}: ${terceiros.length} requisicao(oes) ao googletagmanager (esperado ${esperaTerceiro ? '>0' : '0'})`,
  );
  // Sem consentimento o banner TEM de estar visível: o gate também pode falhar
  // escondendo a UI de consentimento (o gtag fica verde sob o cookie semeado).
  if (!consentiu) conferir(await pagina.isVisible('#cookie-notice'), `${rotulo}: #cookie-notice nao esta visivel`);
  await navegador.close();
}

await cenario('sem consentimento', { consentiu: false, dnt: false }, false);
await cenario('apos aprovar', { consentiu: true, dnt: false }, true);
await cenario('com DNT ligado', { consentiu: true, dnt: true }, false);

servidor.close();
if (falha) process.exit(1);
console.log('analytics ok');

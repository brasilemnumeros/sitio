/**
 * MEDE os dois defeitos que jogavam fora a JANELA DO USUÁRIO (2026-10-19) — o instrumento por trás
 * da correção registrada em `e2e/minimapa.spec.js` e em `src/chart/adapter.js`.
 *
 * Não é teste: MEDE e imprime, para que a conclusão seja reauditável (a convenção do projeto).
 * Precisa do dev server no ar, porque ele serve o dado local:
 *
 *   cd sitio/app && NODE_ENV=development npm run dev      # noutro terminal, em :5173
 *   cd sitio/app && NODE_ENV=development node scripts/medir-janela.mjs
 *
 * Cena 1 — O FIT ADIADO. Escolhe o preset "10 anos" e adiciona uma série que ESTENDE o domínio de
 *   tempo. Antes da correção a janela ia para o ALCANCE TOTAL (1995-12→2025-10): o `fitContent`
 *   agendado (150ms) não era desarmado pelo preset, só por gesto no gráfico grande.
 *
 * Cena 2 — O `setData`. A mesma coisa com o fit desarmado de antemão por um clique no gráfico (o
 *   caminho que já existia), isolando o SEGUNDO mecanismo: `setData` de uma série cuja data estende
 *   o domínio move o range visível, e o eco do adapter aceitava a mudança como se fosse do usuário.
 *   Antes da correção a janela ia para 2020-08→2025-10 (5,2 anos, não 10).
 *
 * Depois da correção as duas cenas terminam com a janela do preset, `2015-06-01 → 2025-06-01`.
 */
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5173/';

const JANELA_ESPERADA = { from: '2015-06-01', to: '2025-06-01' };

const janela = (p) =>
  p.evaluate(async () => {
    const { viewportStore } = await import('/src/stores/viewport.js');
    let v = null;
    viewportStore.subscribe((x) => { v = x; })();
    return v;
  });

const rotulo = (j) => {
  if (!j || !j.from) return 'alcance total (ou vazio)';
  const dias = ((Date.parse(j.to) - Date.parse(j.from)) / 86400000).toFixed(0);
  return `${j.from} → ${j.to} (${dias}d)`;
};

/** O veredito compara o VALOR da janela, não o rótulo (que traz os dias junto). */
const veredito = (j) =>
  j && j.from === JANELA_ESPERADA.from && j.to === JANELA_ESPERADA.to
    ? 'OK — a janela do usuário ficou de pé'
    : 'FALHOU — a janela do usuário foi jogada fora';

async function adicionar(p, termo) {
  await p.getByRole('button', { name: 'Buscar indicador…' }).first().click();
  const campo = p.getByRole('searchbox');
  await campo.fill(termo);
  await campo.press('Enter');
  await p.locator('[data-bloco="ficha"]').getByRole('button', { name: 'Adicionar' }).click();
  await campo.press('Escape');
  await campo.press('Escape');
}

/** Monta o cenário: 1ª série, filtro habilitado e preset de 10 anos aplicado. */
async function preparar(p) {
  await p.goto(URL, { waitUntil: 'networkidle' });
  await adicionar(p, 'IPCA');
  const filtro = p.getByRole('button', { name: 'Janela de 10 anos' });
  await filtro.waitFor({ state: 'visible', timeout: 20000 });
  await p.waitForTimeout(3000); // a rajada de carga + o fit automático assentarem
  await filtro.click();
  await p.waitForTimeout(1500);
  return filtro;
}

const b = await chromium.launch();

// ── Cena 1: o preset contra o fit adiado ────────────────────────────────────────────────────────
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await preparar(p);
  const antes = rotulo(await janela(p));
  await adicionar(p, 'SELIC'); // estende o domínio de tempo: termina depois do IPCA
  await p.waitForTimeout(2500);
  const depois = await janela(p);
  console.log('Cena 1 (preset + fit adiado)');
  console.log(`  antes de adicionar : ${antes}`);
  console.log(`  depois de adicionar: ${rotulo(depois)}`);
  console.log(`  ${veredito(depois)}.`);
  await p.close();
}

// ── Cena 2: o preset contra o `setData` (fit já desarmado por um clique no gráfico) ─────────────
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await preparar(p);
  const g = await p.getByTestId('grafico').boundingBox();
  await p.mouse.click(g.x + g.width / 2, g.y + g.height / 2); // o `pointerdown` desarma o fit
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Janela de 10 anos' }).click();
  await p.waitForTimeout(1500);
  const antes = rotulo(await janela(p));
  await adicionar(p, 'SELIC');
  await p.waitForTimeout(2500);
  const depois = await janela(p);
  console.log('\nCena 2 (preset + `setData` da série nova)');
  console.log(`  antes de adicionar : ${antes}`);
  console.log(`  depois de adicionar: ${rotulo(depois)}`);
  console.log(`  ${veredito(depois)}.`);
  await p.close();
}

await b.close();

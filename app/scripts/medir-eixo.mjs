// Medição da §12.2 — rótulos de último valor NO EIXO (a pilha que invade o gráfico).
//
// Método: análise de pixel dos canvases do app real (o caminho do produto).
//   • RENDERIZADO — o pill do último valor é desenhado no canvas do EIXO com a COR da série como
//     fundo; a caixa de cada pill é o bounding box dos pixels daquela cor. (Medido: pills e texto
//     dos ticks dividem o MESMO canvas — por isso "texto encoberto" NÃO pode ser lido direto.)
//   • NATURAL — a ponta da linha, no canvas do GRÁFICO (que os pills não apagam): o y que o rótulo
//     teria sem desconflição. Colisão natural = |Δy| < altura do pill.
//   • TICKS FALTANDO — o eixo desenha os ticks em passo regular; um BURACO na sequência (gap ≥ 1,6×
//     o passo modal) é um rótulo que não foi desenhado. Se um pill cobre aquele y, ele foi coberto.
//     É um teste INTERNO ao cenário (não compara cenários distintos, que teriam passos diferentes).
//
// Uso: node scripts/medir-eixo.mjs        (dev server do app no ar, em :5173)
import { chromium } from 'playwright';

const URL = process.env.URL || 'http://localhost:5173/';
const OUT = process.env.OUT || '/private/var/folders/vt/47pfx6zs7v12gfgqcdk1mb300000gn/T/opencode';
const PALETA = ['#6351ca', '#00fddc', '#d25200', '#9d99ed', '#ffd000', '#8d5375', '#ff8b75', '#b47699', '#a5c4ff', '#cea2ba'];

const MISTO = ['selic-meta-acum-12m', 'mvgr-nominal', 'ipca-acum-12m', 'populacao-total-anual', 'igpm-acum-12m', 'caged-total-mensal', 'pib-real-anual', 'mvgr-real', 'homicidios-anual', 'selic-over-acum-12m'];
const SO_PCT = ['selic-meta-acum-12m', 'ipca-acum-12m', 'igpm-acum-12m', 'pib-real-anual', 'selic-over-acum-12m', 'populacao-variacao-anual', 'proporcao-homicidios-armas-fogo-anual'];
// pior caso realista: últimos valores reais (medidos nos JSONs) todos baixos e próximos no MESMO eixo
const PIOR = ['selic-meta-acum-12m', 'selic-over-acum-12m', 'ipca-acum-12m', 'pib-real-anual', 'igpm-acum-12m', 'populacao-variacao-anual', 'homicidios-anual', 'proporcao-homicidios-armas-fogo-anual', 'mvgr-real', 'caged-total-mensal'];

const CENARIOS = [
  ...[2, 3, 5, 10].map((n) => ({ nome: `A${n} misto`, ids: MISTO.slice(0, n) })),
  ...[2, 3, 5, 7].map((n) => ({ nome: `B${n} só%`, ids: SO_PCT.slice(0, n) })),
  // C — pior caso REALISTA: os últimos valores caem todos num punhado de unidades do mesmo eixo
  ...[5, 8, 10].map((n) => ({ nome: `C${n} concentrado`, ids: PIOR.slice(0, n) })),
  { nome: 'D10 mesmo-valor', seed: 10 },
];

function analisar(PALETA) {
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const ALVOS = PALETA.map(rgb);
  const TEXTO = [0xc9, 0xd1, 0xd9];
  const perto = (d, o, a, t) => Math.abs(d[o] - a[0]) <= t && Math.abs(d[o + 1] - a[1]) <= t && Math.abs(d[o + 2] - a[2]) <= t;

  const cvs = [...document.querySelectorAll('canvas')].map((c) => {
    const r = c.getBoundingClientRect();
    return { c, x: r.x, y: r.y, w: c.width, h: c.height };
  }).filter((o) => o.w > 20 && o.h > 100);

  const plot = cvs.reduce((a, b) => (b.w > a.w ? b : a));
  const eixo = (lado) => cvs.filter((o) => (lado === 'left' ? o.x + o.w <= plot.x + 1 : o.x >= plot.x + plot.w - 1));

  const px = (o) => o.c.getContext('2d').getImageData(0, 0, o.w, o.h);

  const out = {};
  for (const lado of ['left', 'right']) {
    const p = {};
    const textoPx = [];
    for (const o of eixo(lado)) {
      const { data, width, height } = px(o);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] < 200) continue;
          ALVOS.forEach((a, k) => {
            if (perto(data, i, a, 6)) {
              const b = (p[PALETA[k]] ??= { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0 });
              b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y); b.n++;
            }
          });
          if (perto(data, i, TEXTO, 22)) textoPx.push(y);
        }
      }
      out[`_alturaEixo_${lado}`] = height;
    }
    const caixas = Object.entries(p).filter(([, b]) => b.n >= 40).map(([hex, b]) => ({ hex, ...b, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1 }));

    // bandas de texto (linhas com tinta de tick)
    const porY = {};
    for (const y of textoPx) porY[y] = (porY[y] ?? 0) + 1;
    const bandas = [];
    for (const y of Object.keys(porY).map(Number).sort((a, b) => a - b)) {
      const u = bandas[bandas.length - 1];
      if (u && y - u.y1 <= 2) { u.y1 = y; u.n += porY[y]; } else bandas.push({ y0: y, y1: y, n: porY[y] });
    }
    const centros = bandas.filter((b) => b.n > 30).map((b) => Math.round((b.y0 + b.y1) / 2));

    out[lado] = { caixas, centros, alturaEixo: out[`_alturaEixo_${lado}`] };
  }
  delete out._alturaEixo_left; delete out._alturaEixo_right;

  // posição natural: ponta das linhas no canvas do gráfico
  const gp = px(plot);
  const naturais = {};
  for (let k = 0; k < PALETA.length; k++) {
    const a = ALVOS[k];
    let soma = 0, n = 0;
    for (let x = plot.w - 4; x < plot.w; x++)
      for (let y = 0; y < plot.h; y++) {
        const i = (y * plot.w + x) * 4;
        if (gp.data[i + 3] >= 200 && perto(gp.data, i, a, 22)) { soma += y; n++; }
      }
    if (n >= 2) naturais[PALETA[k]] = soma / n;
  }
  return { plot: { w: plot.w, h: plot.h }, lados: out, naturais };
}

const inter = (a, b) => {
  const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return dx >= 0 && dy >= 0 ? dx * dy : 0;
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const res = [];

for (const cen of CENARIOS) {
  await p.goto(cen.ids ? `${URL}?indicators=${cen.ids.join(',')}` : URL, { waitUntil: 'networkidle' });
  if (cen.seed) {
    await p.evaluate(async (n) => {
      const { seriesStore } = await import('/src/stores/series.js');
      const PALETA = ['#6351ca', '#00fddc', '#d25200', '#9d99ed', '#ffd000', '#8d5375', '#ff8b75', '#b47699', '#a5c4ff', '#cea2ba'];
      const data = Array.from({ length: 120 }, (_, k) => ({ date: new Date(Date.UTC(2015 + Math.floor(k / 12), k % 12, 1)).toISOString().slice(0, 10), value: 10 }));
      const unit = { type: 'percentage', symbol: '%', decimals: 2 };
      seriesStore.set({ itens: Array.from({ length: n }, (_, i) => ({ id: `sint-${i}`, name: `Sintética ${i}`, url: 'data:', unit, cor: PALETA[i], corPessoal: false, status: 'ok', series: { schema: 1, id: `sint-${i}`, unit, granularity: 'monthly', source: 'spike', data }, error: null })) });
    }, cen.seed);
  }
  await p.waitForTimeout(2500);
  const r = await p.evaluate(analisar, PALETA);
  const ladosLegenda = await p.$$eval('button[title="Trocar de eixo"]', (bs) =>
    bs.map((b) => b.textContent.trim()));

  const linha = { cenario: cen.nome, plot: r.plot, lados: {} };
  for (const lado of ['left', 'right']) {
    const cs = r.lados[lado].caixas;
    if (!cs.length) { linha.lados[lado] = { pills: 0 }; continue; }
    const h = Math.max(...cs.map((c) => c.h));
    let sobre = 0;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) if (inter(cs[i], cs[j]) > 0) sobre++;
    const ord = [...cs].sort((a, b) => a.y0 - b.y0);
    let corrida = [ord[0]], maior = [ord[0]];
    for (let i = 1; i < ord.length; i++) {
      corrida = ord[i].y0 - ord[i - 1].y1 <= 1 ? [...corrida, ord[i]] : [ord[i]];
      if (corrida.length > maior.length) maior = corrida;
    }
    const pilhaTopo = Math.min(...maior.map((c) => c.y0)), pilhaBase = Math.max(...maior.map((c) => c.y1));
    const faixaPilha = pilhaBase - pilhaTopo + 1;
    const topo = Math.min(...cs.map((c) => c.y0)), base = Math.max(...cs.map((c) => c.y1));
    const cortados = cs.filter((c) => c.y0 <= 1 || c.y1 >= r.lados[lado].alturaEixo - 2).length;

    // buracos na sequência de ticks (teste INTERNO)
    const cen2 = r.lados[lado].centros;
    const gaps = cen2.slice(1).map((y, i) => y - cen2[i]);
    const passo = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;
    let buracos = 0, buracosComPill = 0;
    for (let i = 1; i < cen2.length; i++) {
      if (passo && cen2[i] - cen2[i - 1] >= passo * 1.6) {
        buracos += Math.round((cen2[i] - cen2[i - 1]) / passo) - 1;
        const y = (cen2[i] + cen2[i - 1]) / 2;
        if (cs.some((c) => y >= c.y0 && y <= c.y1)) buracosComPill++;
      }
    }
    const nat = Object.entries(r.naturais).filter(([hex]) => cs.some((c) => c.hex === hex)).map(([, y]) => y);
    let natColid = 0;
    for (let i = 0; i < nat.length; i++) for (let j = i + 1; j < nat.length; j++) if (Math.abs(nat[i] - nat[j]) < h) natColid++;

    linha.lados[lado] = {
      pills: cs.length, seriesNoEixo: ladosLegenda.filter((t) => t === (lado === 'left' ? 'esq.' : 'dir.')).length,
      sobrepostos: sobre, empilhadosMax: maior.length, faixaPx: base - topo + 1, faixaPilha,
      pctPilha: +(100 * faixaPilha / r.plot.h).toFixed(0),
      pctDoPlot: +(100 * (base - topo + 1) / r.plot.h).toFixed(0), alturaPill: h,
      ticksVisiveis: cen2.length, passo, buracos, buracosComPill, colisoesNaturais: natColid, cortados,
      caixas: cs.map((c) => `${c.hex} ${c.y0}-${c.y1}`).join(' | '),
    };
  }
  res.push(linha);
  await p.screenshot({ path: `${OUT}/eixo-${cen.nome.replace(/[^\w]/g, '')}.png` });
}

console.log(JSON.stringify(res, null, 1));
console.log(`\nplot 952x452 (altura do plot: ${res[0].plot.h}px)\n`);
console.log('| cenário | eixo | séries | pills | sobrepostos | maior pilha | faixa da PILHA px | % plot | dispersão px | ticks visíveis | buracos | buracos c/ pill | colisões naturais | cortados |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const l of res) for (const lado of ['left', 'right']) {
  const d = l.lados[lado]; if (!d.pills) continue;
  console.log(`| ${l.cenario} | ${lado === 'left' ? 'esq' : 'dir'} | ${d.seriesNoEixo} | ${d.pills} | ${d.sobrepostos} | ${d.empilhadosMax} | ${d.faixaPilha} | ${d.pctPilha}% | ${d.faixaPx} | ${d.ticksVisiveis} | ${d.buracos} | ${d.buracosComPill} | ${d.colisoesNaturais} | ${d.cortados} |`);
}
await b.close();

/**
 * Contas de mandato (spec §4, §7.3). Camada 3: puro.
 * @typedef {import('../data/validate.js').Series} Series
 * @typedef {{id:string, rotulo:string, titular?:string, partido?:string, tipo?:string,
 *            inicio:string, fim:string|null, emCurso?:boolean,
 *            mandatoDe?:{inicio:string, fim:string}}} Mandato
 */

export const COBERTURA = Object.freeze({
  CALCULAVEL: 'calculavel',
  PARCIAL: 'parcial',
  SEM: 'sem-cobertura',
  PONTO_UNICO: 'ponto-unico',
});

const ymd = (date) => date.slice(0, 10);

/** Pontos da série dentro do mandato, ordenados por data. */
export function pontosNoMandato(series, mandato) {
  const inicio = ymd(mandato.inicio);
  const fim = mandato.fim ? ymd(mandato.fim) : '9999-12-31';
  return series.data
    .filter((p) => ymd(p.date) >= inicio && ymd(p.date) <= fim)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Quantos pontos a série DEVERIA ter dentro do mandato, na granularidade dela.
 * É a régua da cobertura (§7.3.5): "abaixo do esperado para a própria granularidade".
 * `null` para mandato em curso — não há período fechado para comparar.
 */
export function pontosEsperados(granularity, mandato) {
  if (mandato.emCurso || mandato.fim === null) return null;
  if (granularity === 'annual') {
    return Number(mandato.fim.slice(0, 4)) - Number(mandato.inicio.slice(0, 4)) + 1;
  }
  if (granularity === 'monthly') {
    const meses = (d) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7));
    return meses(mandato.fim) - meses(mandato.inicio) + 1;
  }
  return null; // 'daily': sem régua declarada nesta camada
}

/**
 * Δ = último − primeiro valor dentro do mandato (spec §4), com os quatro estados
 * de célula da §9.4. Cobertura parcial é marcada por QUALQUER motivo — não só o
 * mandato em curso (§7.3.5).
 *
 * A régua é `pontos < esperados` para a granularidade da série. Medido sobre os
 * dados reais: são **15 células** nos mandatos fechados — o mesmo número que a §7.3
 * publica. Comparar datas cruas marcaria 49 (todo ponto mensal cai no dia 1º, e o
 * mandato começa no meio do mês) — por isso a régua é por contagem, não por data.
 * @returns {{estado:string, delta:number|null, pontos:number,
 *            periodo:{inicio:string,fim:string}|null, motivo:string|null}}
 */
export function deltaNoMandato(series, mandato) {
  const pontos = pontosNoMandato(series, mandato);
  if (pontos.length === 0) {
    return {
      estado: COBERTURA.SEM,
      delta: null,
      pontos: 0,
      periodo: null,
      motivo: motivoDaAusencia(series, mandato),
    };
  }
  if (pontos.length === 1) {
    return { estado: COBERTURA.PONTO_UNICO, delta: null, pontos: 1, periodo: null, motivo: null };
  }
  const periodo = { inicio: pontos[0].date, fim: pontos[pontos.length - 1].date };
  const delta = pontos[pontos.length - 1].value - pontos[0].value;
  const esperados = pontosEsperados(series.granularity, mandato);
  const completa = esperados !== null && pontos.length >= esperados;
  return {
    estado: completa ? COBERTURA.CALCULAVEL : COBERTURA.PARCIAL,
    delta,
    pontos: pontos.length,
    periodo,
    motivo: null,
  };
}

function motivoDaAusencia(series, mandato) {
  if (series.data.length === 0) return 'série sem dados';
  const datas = series.data.map((p) => p.date).sort();
  const primeira = datas[0];
  const ultima = datas[datas.length - 1];
  const inicio = ymd(mandato.inicio);
  const fim = mandato.fim ? ymd(mandato.fim) : null;
  if (fim !== null && ymd(primeira) > fim) return `série começa em ${primeira.slice(0, 7)}`;
  return `série termina em ${ultima.slice(0, 7)}`;
}

/** "03/2004–12/2006" */
export function formatarPeriodo(periodo) {
  const mmaaaa = (date) => `${date.slice(5, 7)}/${date.slice(0, 4)}`;
  return `${mmaaaa(periodo.inicio)}–${mmaaaa(periodo.fim)}`;
}

/** Cronológica por `inicio`, com o mandato em curso sempre na ponta direita (§7.3.6). */
export function ordenarMandatos(mandatos) {
  return [...mandatos].sort((a, b) => {
    if (Boolean(a.emCurso) !== Boolean(b.emCurso)) return a.emCurso ? 1 : -1;
    return a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0;
  });
}

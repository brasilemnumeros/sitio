/**
 * Contas de escala e comparabilidade (spec §5). Camada 3: puro, sem Svelte, sem DOM,
 * sem rede.
 */

/** @typedef {import('../data/validate.js').Series} Series */

/**
 * Amplitude da série inteira: max − min. Nunca sobre a janela visível (§5).
 * @param {Series} series
 * @returns {number}
 */
export function seriesSpan(series) {
  const values = series.data.map((p) => p.value);
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Razão entre a maior e a menor amplitude. É a régua da comparabilidade (§5) —
 * medida por magnitude, nunca por `unit.type`.
 * @param {Series} a
 * @param {Series} b
 * @returns {number}
 */
export function amplitudeRatio(a, b) {
  const sa = seriesSpan(a);
  const sb = seriesSpan(b);
  const maior = Math.max(sa, sb);
  const menor = Math.min(sa, sb);
  if (menor === 0) return maior === 0 ? 1 : Infinity;
  return maior / menor;
}

/** O corte de comparabilidade (§5). O valor exato não é crítico: qualquer limiar em
 * (21,2 · 125) particiona os dados de hoje de forma idêntica — 50 é o meio da faixa. */
export const AMPLITUDE_LIMIT = 50;

/** Acima daqui nem dois eixos salvam — a série menor vira reta colada no zero (§5).
 * Seis ordens de grandeza. Decidido por medição dos 78 pares reais em 2026-10-14: 14 pares
 * (18%) caem aqui, todos amplitude de ordem de milhão contra um percentual. NÃO é faixa
 * vazia como o corte de 50 — a região 92.267–3.759.751 é densa, então o número é declarado,
 * não livre. Ver a §5 da spec. */
export const AMPLITUDE_LIMIT_ILEGIVEL = 1_000_000;

/**
 * @typedef {Object} Veredito
 * @property {'convive'|'avisa'|'ilegivel'} veredito
 * @property {number} ratio   pior razão contra as séries já presentes
 * @property {Series|null} contra  a série que produziu a pior razão
 */

/**
 * Decide se uma série pode entrar num eixo com as que já estão lá.
 * Não encaixa em silêncio: devolve o veredito para a ficha da modal exibir (§1.1, §5).
 * @param {Series} novaSerie
 * @param {Series[]} seriesExistentes
 * @returns {Veredito}
 */
export function comparabilidade(novaSerie, seriesExistentes) {
  // `contra` é null SÓ quando não há existentes (é o que o typedef promete). Semear com
  // `ratio: 1` e comparar com `>` deixava `contra` null no caso de razão EXATAMENTE 1
  // (duas séries de amplitude idêntica) — contrato violado, e a fatia 08 leria isso como
  // "nada a comparar" num caso em que há. Por isso a primeira existente sempre entra.
  let piorRatio = 1;
  let contra = null;
  for (const existente of seriesExistentes) {
    const ratio = amplitudeRatio(novaSerie, existente);
    if (contra === null || ratio > piorRatio) {
      piorRatio = ratio;
      contra = existente;
    }
  }
  const veredito =
    piorRatio > AMPLITUDE_LIMIT_ILEGIVEL ? 'ilegivel'
    : piorRatio > AMPLITUDE_LIMIT ? 'avisa'
    : 'convive';
  return { veredito, ratio: piorRatio, contra };
}

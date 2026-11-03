/**
 * Bolinhas nos pontos das séries (2026-11-03). Camada 3: puro, sem Svelte, sem DOM, sem lib.
 *
 * Por que existe: numa série anual, o cursor do gráfico passa por dezenas de meses sem dado e
 * a linha vira um traço só, sem indicar ONDE estão os pontos. Bolinha em TODO ponto resolveria
 * o caso esparso e arruinaria o denso (mensal no horizonte completo = 380 bolinhas por série).
 *
 * A régua é o ESPAÇAMENTO na janela visível, não a quantidade de pontos do arquivo: uma série
 * mensal no horizonte inteiro fica sem bolinha, e a mesma série com zoom de dois anos ganha —
 * porque ali o ponto individual é legível. A conta roda a cada mudança de janela e usa busca
 * binária: `series.dados` já vem ordenado, então não há varredura de milhares de pontos por
 * pixel de arrasto.
 */

/** Abaixo disto os pontos encostam e as bolinhas viram uma faixa contínua. Medido no gráfico
 *  de 1280px: ~16px é onde o círculo de 2,5px de raio ainda se separa do vizinho. */
export const ESPACO_MINIMO_PX = 16;

/** Primeiro índice cujo tempo é >= `alvo` (o array está crescente). */
function limiteInferior(tempos, alvo) {
  let lo = 0;
  let hi = tempos.length;
  while (lo < hi) {
    const meio = (lo + hi) >> 1;
    if (tempos[meio] < alvo) lo = meio + 1;
    else hi = meio;
  }
  return lo;
}

/** Primeiro índice cujo tempo é > `alvo`. */
function limiteSuperior(tempos, alvo) {
  let lo = 0;
  let hi = tempos.length;
  while (lo < hi) {
    const meio = (lo + hi) >> 1;
    if (tempos[meio] <= alvo) lo = meio + 1;
    else hi = meio;
  }
  return lo;
}

/**
 * Quantos pontos caem em `[from, to]` (tempos em segundos, como a lib entrega).
 *
 * @param {number[]} tempos
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function contarNoIntervalo(tempos, from, to) {
  if (!Array.isArray(tempos) || tempos.length === 0) return 0;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  const inicio = limiteInferior(tempos, from);
  const fim = limiteSuperior(tempos, to);
  return Math.max(0, fim - inicio);
}

/**
 * A série mostra bolinha agora? Sim quando há ponto na janela e a distância média entre eles
 * cabe na largura da plotagem com folga (`ESPACO_MINIMO_PX`).
 *
 * Ponto ÚNICO na janela também mostra: sozinho ele não encosta em ninguém, e é justamente o
 * caso em que o usuário precisa ver que existe um ponto ali.
 *
 * @param {number[]} tempos  tempos da série em segundos, crescentes
 * @param {{from:number, to:number, largura:number}} janela  `largura` em px da plotagem
 * @returns {boolean}
 */
export function deveMostrarMarcadores(tempos, { from, to, largura } = {}) {
  if (!Number.isFinite(largura) || largura <= 0) return false;
  const n = contarNoIntervalo(tempos, from, to);
  if (n === 0) return false;
  const passo = n === 1 ? largura : largura / (n - 1);
  return passo >= ESPACO_MINIMO_PX;
}

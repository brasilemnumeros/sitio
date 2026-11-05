/**
 * A regra do gesto de fechar uma folha (spec mobile, 2026-11-05).
 *
 * Mora no domínio porque as três superfícies que fecham por arrasto — a alça da gaveta inferior,
 * o grabber da comparação e o grabber da ficha — não podem divergir no limiar. Abaixo disso é
 * toque/hesitação, não intenção de fechar.
 */
export const LIMIAR_FECHAMENTO = 80;

/**
 * @param {number} deslocamento  quanto o ponteiro andou para baixo, em px
 * @param {number} [limiar]
 * @returns {boolean}
 */
export function deveFecharAoArrastar(deslocamento, limiar = LIMIAR_FECHAMENTO) {
  return deslocamento > limiar;
}

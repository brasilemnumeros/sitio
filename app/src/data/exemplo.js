// §9.1 — o atalho de primeiro uso. Os IDs vivem no CATÁLOGO, e o par "Selic × IPCA" é
// RESOLVIDO no catálogo carregado NA HORA DE ADICIONAR — nada de hardcodar nome nem URL aqui.
//
// Mora num módulo próprio porque quem cobra a existência destes ids (a conferência com o repo
// `dados`) precisa do MESMO literal, não de uma cópia que envelheça em silêncio.
export const EXEMPLO_IDS = ['selic-meta', 'ipca-acum-12m'];

/**
 * O atalho só existe se ao menos um id do exemplo estiver no catálogo carregado.
 *
 * Com o catálogo `ready` mas sem os ids do exemplo, o botão "Selic × IPCA" não tinha o que
 * adicionar: o clique não fazia nada e a tela convidava a uma ação inerte (§9.1). A decisão
 * mora aqui, pura, para o `App` não precisar de DOM para saber se o atalho serve.
 */
export function exemploDisponivel(indicadores) {
  return indicadores.some((ind) => EXEMPLO_IDS.includes(ind.id));
}

// §9.1 — o atalho de primeiro uso. Os IDs vivem no CATÁLOGO, e o par "Selic × IPCA" é
// RESOLVIDO no catálogo carregado NA HORA DE ADICIONAR — nada de hardcodar nome nem URL aqui.
//
// Mora num módulo próprio porque quem cobra a existência destes ids (a conferência com o repo
// `dados`) precisa do MESMO literal, não de uma cópia que envelheça em silêncio.
export const EXEMPLO_IDS = ['selic-meta', 'ipca-acum-12m'];

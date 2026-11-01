/**
 * Formatação na unidade do indicador (spec §4, §8). Camada 3: puro — sem Svelte, sem DOM,
 * sem rede. É uma das "contas que erram calado" (§8), por isso tem teste.
 *
 * A unidade vem da SÉRIE carregada (`unit.decimals`, `unit.symbol`), nunca do catálogo (§6).
 */

/**
 * @param {number} valor
 * @param {{type?:string, symbol?:string, decimals?:number}|null} [unit]
 * @returns {string}
 */
export function valorNaUnidade(valor, unit) {
  const casas = Number.isInteger(unit?.decimals) ? unit.decimals : 2;
  const numero = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
  const simbolo = unit?.symbol ?? '';
  if (simbolo === '') return numero;
  // O símbolo cola no número quando é `%` (44,22%) e ganha espaço quando é palavra (hab.).
  // 💰 Moeda é PREFIXO em português — `R$ 155.000`, nunca `155.000,00 R$`. A regra do sufixo
  //    valia só para símbolo de unidade; ao expor o valor no gráfico (2026-11-01) o sufixo virou
  //    erro visível na legenda. Corrigido AQUI, e não no componente: a matriz de comparação usa a
  //    mesma função e teria a mesma leitura errada.
  if (unit?.type === 'currency') return `${simbolo} ${numero}`;
  return simbolo === '%' ? `${numero}${simbolo}` : `${numero} ${simbolo}`;
}

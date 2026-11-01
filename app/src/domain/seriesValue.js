/**
 * Leitura de valor por data (spec de 2026-11-01, "valor sob o cursor"). Camada 3: puro, sem
 * Svelte, sem DOM, sem rede.
 *
 * Por que existe: a legenda do gráfico mostra o valor da série NO PONTO em que o cursor está, e
 * essa consulta roda a cada movimento do mouse para até 10 séries de milhares de pontos. Um
 * `find` linear por evento seria 10 × 8.000 comparações de string — a busca binária é O(log n) e
 * aproveita que `series.data` já vem ORDENADA por data (o validador garante; `points.js` também
 * reordena ao converter para o tempo da lib).
 */

/**
 * O valor da série na data exata, ou `null` se ela não tem ponto ali.
 *
 * 🚫 Nada de "ponto mais próximo" nem "valor vigente": o eixo do tempo mostra a data do cursor, e
 *    um número de outra data ao lado dela seria uma mentira silenciosa — justamente o tipo de
 *    erro que o produto não pode cometer (§9).
 *
 * @param {Array<{date:string, value:number}>} data
 * @param {string|null} iso `AAAA-MM-DD`
 * @returns {number|null}
 */
export function valorNaData(data, iso) {
  if (!Array.isArray(data) || data.length === 0 || !iso) return null;
  let lo = 0;
  let hi = data.length - 1;
  while (lo <= hi) {
    const meio = (lo + hi) >> 1;
    // `slice(0,10)` porque o arquivo pode trazer hora (`2024-01-01T00:00:00`): comparar a string
    // inteira faria a mesma data "não existir" conforme o arquivo. O validador normaliza hoje;
    // isto é defesa barata contra o dado que voltar a trazer hora.
    const d = data[meio].date.slice(0, 10);
    if (d === iso) return data[meio].value;
    if (d < iso) lo = meio + 1;
    else hi = meio - 1;
  }
  return null;
}

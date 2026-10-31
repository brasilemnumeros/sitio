/**
 * Horizonte temporal do eixo x — decisão de produto de 2026-10-29.
 *
 * O eixo NÃO nasce do dado: ele sempre cobre do início do FHC I (01/01/1995) até o
 * DIA DE HOJE, mesmo que a série carregada comece em 2004 ou termine em 2025. Sem
 * isto, trocar o conjunto de séries mudava o alcance do eixo e o mesmo mandato
 * aparecia em posições diferentes — o contexto (governos) passava a depender do
 * indicador escolhido.
 *
 * As âncoras são pontos VAZIOS (`{ time }`, sem valor): a lib precisa de um ponto
 * na escala de tempo para esticar o domínio, mas não deve desenhar nada nele. São
 * mensais para que o eixo fique proporcional ao calendário também nas séries
 * anuais/esparsas — um único ponto em 1995 faria oito anos vazios caberem numa
 * coluna só, mostrando 1995 e 2003 lado a lado.
 *
 * Camada 3: puro, sem DOM, sem rede. `hoje` entra como argumento (o chamador usa o
 * dia de São Paulo, nunca o fuso do navegador).
 */

export const HORIZONTE_INICIO = '1995-01-01';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Datas-âncora do horizonte: o dia 1º de cada mês desde `inicio` até o mês de
 * `hoje`, mais o próprio `hoje` (o eixo termina no dia atual, não no 1º do mês).
 * Ordem crescente, sem repetição.
 *
 * @param {string} hoje  `AAAA-MM-DD` no fuso de São Paulo
 * @param {string} [inicio]  `AAAA-MM-DD` (padrão: início do FHC I)
 * @returns {string[]}
 */
export function ancorasDoHorizonte(hoje, inicio = HORIZONTE_INICIO) {
  if (typeof hoje !== 'string' || !ISO.test(hoje)) return [];
  if (typeof inicio !== 'string' || !ISO.test(inicio)) return [];
  if (hoje < inicio) return [];

  const [anoIni, mesIni] = inicio.split('-').map(Number);
  const [anoFim, mesFim] = hoje.split('-').map(Number);
  const datas = [];

  for (let ano = anoIni, mes = mesIni; ano < anoFim || (ano === anoFim && mes <= mesFim); ) {
    datas.push(`${ano}-${String(mes).padStart(2, '0')}-01`);
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }

  // `hoje` no dia 1º já está na lista — não duplicar (a lib lança em tempo repetido).
  if (datas[datas.length - 1] !== hoje) datas.push(hoje);
  return datas;
}

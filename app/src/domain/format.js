/**
 * Formatação na unidade do indicador (spec §4, §8). Camada 3: puro — sem Svelte, sem DOM,
 * sem rede. É uma das "contas que erram calado" (§8), por isso tem teste.
 *
 * A unidade vem da SÉRIE carregada (`unidade.casas`, `unidade.simbolo`), nunca do catálogo (§6).
 */

/**
 * @param {number} valor
 * @param {{tipo?:string, simbolo?:string, casas?:number}|null} [unidade]
 * @returns {string}
 */
export function valorNaUnidade(valor, unidade) {
  const casas = Number.isInteger(unidade?.casas) ? unidade.casas : 2;
  const numero = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
  const simbolo = unidade?.simbolo ?? '';
  if (simbolo === '') return numero;
  // O símbolo cola no número quando é `%` (44,22%) e ganha espaço quando é palavra (hab.).
  // 💰 Moeda é PREFIXO em português — `R$ 155.000`, nunca `155.000,00 R$`. A regra do sufixo
  //    valia só para símbolo de unidade; ao expor o valor no gráfico (2026-11-01) o sufixo virou
  //    erro visível na legenda. Corrigido AQUI, e não no componente: a matriz de comparação usa a
  //    mesma função e teria a mesma leitura errada.
  if (unidade?.tipo === 'moeda') return `${simbolo} ${numero}`;
  return simbolo === '%' ? `${numero}${simbolo}` : `${numero} ${simbolo}`;
}

/**
 * Versão COMPACTA, para superfícies onde largura é escassa (a caixa do cursor e a tabela, 2026-11-01).
 *
 * A mesma régua do eixo Y (`chart/adapter.js` → `rotuloDoEixo`): só a partir de UM MILHÃO, onde o
 * ganho é real ("216.000.000" → "216 mi"). Abaixo disso, compactar milhar não economiza pixel e
 * ainda custa exatidão. O valor exato continua disponível em `valorNaUnidade` — quem exibe o
 * compacto deve pôr o exato no `title`.
 */
const COMPACTO = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export function valorCompacto(valor, unidade) {
  if (!(Math.abs(valor) >= 1_000_000)) return valorNaUnidade(valor, unidade);
  const numero = COMPACTO.format(valor);
  const simbolo = unidade?.simbolo ?? '';
  if (simbolo === '') return numero;
  if (unidade?.tipo === 'moeda') return `${simbolo} ${numero}`;
  return simbolo === '%' ? `${numero}${simbolo}` : `${numero} ${simbolo}`;
}

/**
 * Rótulo de data do eixo do tempo sob o cursor (2026-11-03).
 *
 * Por que existe: a lib formata esse rótulo com o padrão dela (`dd MMM 'yy`) e com o mês em
 * INGLÊS — a caixa do cursor dizia `jan/2013` e o eixo logo abaixo, `01 Jan '13`. O formato aqui
 * é o MESMO (dia + mês curto + ano de dois dígitos), só com o mês em português. `timeFormatter`
 * recebe o tempo ORIGINAL da série, que neste app é sempre segundos UTC (ver `chart/points.js`),
 * por isso a leitura é toda em `getUTC*`: usar o fuso local deslocaria o dia.
 *
 * @param {number} segundos  tempo UNIX em segundos
 * @returns {string} `01 jan '13`, ou `''` para entrada inválida
 */
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rotuloDaCruz(segundos) {
  if (!Number.isFinite(segundos)) return '';
  const d = new Date(segundos * 1000);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = MESES_CURTOS[d.getUTCMonth()];
  const ano = String(d.getUTCFullYear() % 100).padStart(2, '0');
  return `${dia} ${mes} '${ano}`;
}

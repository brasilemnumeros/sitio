import { LIMITE_SERIES } from './stores/series.js';

/**
 * Parser PURO do permalink do app (`?indicators=<ids>`). Não conhece DOM nem catálogo:
 * a leitura da query e a resolução contra o catálogo são responsabilidades separadas
 * (§5/§6 — o parser é testável sem rede). Quem resolve id → indicador é a integração.
 */

/**
 * Lê os ids da query (`search` SEM o `?`), na ORDEM da query, sem repetição e no máximo
 * `LIMITE_SERIES`. Espaços e entradas vazias são descartados em silêncio. Id desconhecido
 * NÃO é problema daqui (o parser não conhece o catálogo).
 *
 * @param {string} search  a query string sem o `?` (ex.: `'indicators=selic,ipca'`)
 * @returns {string[]}
 */
export function lerIds(search) {
  const bruto = new URLSearchParams(search).get('indicators');
  if (!bruto) return [];
  const vistos = new Set();
  const ids = [];
  for (const parte of bruto.split(',')) {
    const id = parte.trim();
    if (id === '' || vistos.has(id)) continue;
    vistos.add(id);
    ids.push(id);
    if (ids.length === LIMITE_SERIES) break; // o teto da paleta (§1) — não repetir o número
  }
  return ids;
}

/**
 * Reescreve a query preservando as OUTRAS chaves (ex.: parâmetros de campanha) e
 * substituindo a chave `indicators` pela lista. Lista vazia REMOVE a chave.
 *
 * @param {string[]} ids
 * @param {string} [searchAtual]  a query string sem o `?`
 * @returns {string}
 */
export function escreverSearch(ids, searchAtual = '') {
  const params = new URLSearchParams(searchAtual);
  if (ids.length === 0) {
    params.delete('indicators');
  } else {
    params.set('indicators', ids.join(','));
  }
  return params.toString();
}

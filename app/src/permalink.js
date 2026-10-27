import { LIMITE_SERIES } from './stores/series.js';

/**
 * Parser PURO do permalink do app (`?series=<ids>`). Não conhece DOM nem catálogo:
 * a leitura da query e a resolução contra o catálogo são responsabilidades separadas
 * (§5/§6 — o parser é testável sem rede). Quem resolve id → indicador é a integração.
 */

/** A chave da query. Desde 2026-10-27 é `series`; a antiga (`indicators`) é IGNORADA,
 *  sem alias — nome novo, contrato novo (os links dos posts já foram migrados). */
const CHAVE = 'series';

/** A chave anterior, apagada ao escrever para não deixar lixo em links migrados. */
const CHAVE_ANTIGA = 'indicators';

/**
 * Lê os ids da query (`search` SEM o `?`), na ORDEM da query, sem repetição e no máximo
 * `LIMITE_SERIES`. Espaços e entradas vazias são descartados em silêncio. Id desconhecido
 * NÃO é problema daqui (o parser não conhece o catálogo).
 *
 * @param {string} search  a query string sem o `?` (ex.: `'series=selic,ipca'`)
 * @returns {string[]}
 */
export function lerIds(search) {
  const bruto = new URLSearchParams(search).get(CHAVE);
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
 * substituindo a chave `series` pela lista. Lista vazia REMOVE a chave.
 * A chave antiga (`indicators`) sai sempre: escrever é migrar o link.
 *
 * @param {string[]} ids
 * @param {string} [searchAtual]  a query string sem o `?`
 * @returns {string}
 */
export function escreverSearch(ids, searchAtual = '') {
  const params = new URLSearchParams(searchAtual);
  params.delete(CHAVE_ANTIGA);
  if (ids.length === 0) {
    params.delete(CHAVE);
  } else {
    params.set(CHAVE, ids.join(','));
  }
  return params.toString();
}

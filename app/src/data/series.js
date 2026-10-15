import { validateSeries } from './validate.js';

/** @type {Map<string, Promise<import('./validate.js').Series>>} */
const cache = new Map();

async function fetchAndValidate(url, expectedId, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new Error(`falha de rede ao buscar ${url}`, { cause });
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar ${url}`);
  }
  return validateSeries(await response.json(), { expectedId });
}

/**
 * Carrega e valida uma série, memorizando por URL. Uma falha NÃO fica no cache —
 * a próxima chamada tenta de novo (§9.3).
 * @param {string} url
 * @param {{expectedId?: string, fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<import('./validate.js').Series>}
 */
export async function loadSeries(url, { expectedId, fetchImpl = fetch } = {}) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetchAndValidate(url, expectedId, fetchImpl);
    cache.set(url, pending);
  }
  try {
    return await pending;
  } catch (error) {
    cache.delete(url);
    throw error;
  }
}

export function clearSeriesCache() {
  cache.clear();
}

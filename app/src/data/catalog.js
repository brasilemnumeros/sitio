import { SchemaError, validateUnit } from './validate.js';

const CHART_TYPES = new Set(['line', 'bar']);

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string} datafile
 * @property {'line'|'bar'} chartType
 * @property {import('./validate.js').Unit} unit
 * @property {string|null} yAxisTitle
 */

export function validateCatalog(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError('catálogo não é um objeto JSON');
  }
  const groups = raw.groups;
  if (groups === null || typeof groups !== 'object' || Array.isArray(groups)) {
    throw new SchemaError('catálogo sem o mapa "groups"');
  }
  if (!Array.isArray(raw.indicators)) {
    throw new SchemaError('catálogo sem a lista "indicators"');
  }
  const indicators = raw.indicators.map((ind, i) => {
    const where = `indicators[${i}]`;
    if (ind === null || typeof ind !== 'object' || Array.isArray(ind)) {
      throw new SchemaError(`${where} não é objeto`);
    }
    if (typeof ind.id !== 'string' || ind.id === '') throw new SchemaError(`${where}.id ausente`);
    if (typeof ind.name !== 'string' || ind.name === '') throw new SchemaError(`${where}.name ausente`);
    if (!Object.hasOwn(groups, ind.group)) {
      throw new SchemaError(`${where} (${ind.id}): grupo "${ind.group}" não existe em "groups"`);
    }
    if (typeof ind.datafile !== 'string' || ind.datafile === '') {
      throw new SchemaError(`${where}.datafile ausente`);
    }
    if (!CHART_TYPES.has(ind.chartType)) {
      throw new SchemaError(`${where}.chartType deve ser "line" ou "bar", veio ${JSON.stringify(ind.chartType)}`);
    }
    return {
      id: ind.id,
      name: ind.name,
      group: ind.group,
      datafile: ind.datafile,
      chartType: ind.chartType,
      // A unidade vive no ARQUIVO DE SÉRIE, não aqui (§6) — repetir metadado nos dois
      // lados é a duplicação que a ADR condena. Aceito se presente só durante a transição
      // (a fatia 11 remove); a UI lê a unidade da série carregada.
      unit: ind.unit ? validateUnit(ind.unit, `${where}.unit`) : null,
      yAxisTitle: typeof ind.yAxisTitle === 'string' ? ind.yAxisTitle : null,
    };
  });
  return { groups, indicators };
}

export async function loadCatalog({ url = '/indicators.json', fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new Error(`falha de rede ao buscar o catálogo ${url}`, { cause });
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar o catálogo ${url}`);
  }
  return validateCatalog(await response.json());
}

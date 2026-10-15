import { SchemaError } from './validate.js';

const CHART_TYPES = new Set(['line', 'bar']);

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string} datafile
 * @property {'line'|'bar'} chartType
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
    // PRESERVA o resto do registro (R16 emendado): `description`, `yAxisMax` e afins são
    // curadoria de APRESENTAÇÃO e pertencem ao catálogo (§6) — descartá-los em silêncio
    // seria perda invisível de dado, e o revisor pegou exatamente isso (`yAxisMax: 100` em
    // `proporcao-homicidios-armas-fogo-anual`).
    // `unit` vem junto se estiver no arquivo, mas o app NÃO o lê daqui: a unidade vem da
    // SÉRIE carregada (fatias 05 e 08), e o campo sai do registro na fatia 11.
    return {
      ...ind,
      id: ind.id,
      name: ind.name,
      group: ind.group,
      datafile: ind.datafile,
      chartType: ind.chartType,
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

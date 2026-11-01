import { SchemaError } from './validate.js';
import bruto from './indicadores.json';

const CHART_TYPES = new Set(['line', 'bar']);
/** As três CLASSES DE ESCALA do distintivo da busca (§12.1). A unidade completa (símbolo,
 *  casas, locale) é dona da SÉRIE — aqui fica só o que a lista precisa antes do dado chegar. */
const ESCALAS = new Set(['percentual', 'moeda', 'numero']);
/** `arquivo` é o caminho dentro do repo `dados/`, nunca URL: a base é resolvida na leitura. */
const ARQUIVO = /^[a-z0-9-]+\/[a-z0-9-]+\.json$/;

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string} arquivo   caminho relativo em `dados/` (fonte)
 * @property {string} datafile  URL resolvida contra a base (é o que stores e componentes usam)
 * @property {'line'|'bar'} chartType
 * @property {'percentual'|'moeda'|'numero'} escala
 */

/**
 * Valida o catálogo e resolve `arquivo` contra a base de dados.
 *
 * O catálogo é APRESENTAÇÃO: nome, grupo, descrição, tipo de gráfico, escala e o caminho do
 * arquivo. O que descreve o dado — `unit`, `granularity`, `source` — mora na própria série e
 * não é duplicado aqui (2026-11-01; antes o `unit` divergia da série em 8 de 13 registros).
 */
export function validateCatalog(raw, { base = __BASE_DADOS__ } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError('catálogo não é um objeto JSON');
  }
  if (raw.schema !== 1) {
    throw new SchemaError(`catálogo com schema ${JSON.stringify(raw.schema)}; esperado 1`);
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
    if (typeof ind.arquivo !== 'string' || !ARQUIVO.test(ind.arquivo)) {
      throw new SchemaError(
        `${where} (${ind.id}): arquivo deve ser caminho relativo "familia/arquivo.json", veio ${JSON.stringify(ind.arquivo)}`
      );
    }
    if (!CHART_TYPES.has(ind.chartType)) {
      throw new SchemaError(`${where}.chartType deve ser "line" ou "bar", veio ${JSON.stringify(ind.chartType)}`);
    }
    if (!ESCALAS.has(ind.escala)) {
      throw new SchemaError(`${where}.escala deve ser percentual|moeda|numero, veio ${JSON.stringify(ind.escala)}`);
    }
    // PRESERVA o resto do registro (R16 emendado): `description` e afins são curadoria de
    // APRESENTAÇÃO e pertencem ao catálogo (§6) — descartá-los em silêncio seria perda
    // invisível de dado.
    return { ...ind, datafile: `${base.replace(/\/+$/, '')}/${ind.arquivo}` };
  });
  return { groups, indicators };
}

/** O catálogo do site, embutido no bundle. Não há `fetch`: o arquivo ausente quebra o build. */
export function catalogoEmbutido() {
  return validateCatalog(bruto);
}

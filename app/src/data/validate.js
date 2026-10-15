import { SCHEMA_VERSION } from '../domain/schema.js';

/** Erro de contrato — o app recusa em voz alta em vez de plotar vazio (§6). */
export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}

export const UNIT_TYPES = new Set(['percentage', 'number', 'currency']);
export const GRANULARITIES = new Set(['daily', 'monthly', 'annual']);
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {Object} Unit
 * @property {'percentage'|'number'|'currency'} type
 * @property {string} symbol
 * @property {number} decimals
 */

/**
 * @typedef {Object} Series
 * @property {1} schema
 * @property {string} id
 * @property {Unit} unit
 * @property {'daily'|'monthly'|'annual'} granularity
 * @property {string} source
 * @property {Array<{date: string, value: number}>} data
 */

/**
 * Normaliza e valida uma unidade. Estrito de propósito: `symbol` não-vazio e `decimals`
 * inteiro ≥ 0 são obrigatórios. Este é o caminho CANÔNICO (`validateSeries`), onde um
 * `percentage` sem símbolo ou sem casas declaradas é defeito de verdade; relaxá-lo para
 * acomodar dado de transição enfraqueceria o contrato que fica.
 * @param {unknown} unit
 * @param {string} [where]
 * @returns {Unit}
 */
export function validateUnit(unit, where = 'unit') {
  if (unit === null || typeof unit !== 'object' || Array.isArray(unit)) {
    throw new SchemaError(`${where}: ausente ou não é objeto`);
  }
  if (!UNIT_TYPES.has(unit.type)) {
    throw new SchemaError(`${where}.type "${unit.type}" desconhecido`);
  }
  if (typeof unit.symbol !== 'string' || unit.symbol === '') {
    throw new SchemaError(`${where}.symbol ausente ou vazio`);
  }
  if (!Number.isInteger(unit.decimals) || unit.decimals < 0) {
    throw new SchemaError(`${where}.decimals deve ser inteiro ≥ 0`);
  }
  return { type: unit.type, symbol: unit.symbol, decimals: unit.decimals };
}

/**
 * Valida e normaliza uma série. Lança SchemaError em qualquer divergência.
 * @param {unknown} raw
 * @param {{expectedId?: string}} [options]
 * @returns {Series}
 */
export function validateSeries(raw, { expectedId } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError('série não é um objeto JSON');
  }
  if (raw.schema !== SCHEMA_VERSION) {
    throw new SchemaError(
      `schema ${JSON.stringify(raw.schema)} não suportado; este app entende o schema ${SCHEMA_VERSION}`,
    );
  }
  if (typeof raw.id !== 'string' || raw.id === '') {
    throw new SchemaError('campo "id" ausente ou não textual');
  }
  if (expectedId !== undefined && raw.id !== expectedId) {
    throw new SchemaError(`veio o id "${raw.id}" mas o app pediu "${expectedId}"`);
  }
  const unit = validateUnit(raw.unit, 'unit');
  if (!GRANULARITIES.has(raw.granularity)) {
    throw new SchemaError(`granularity "${raw.granularity}" desconhecida`);
  }
  if (typeof raw.source !== 'string' || raw.source === '') {
    throw new SchemaError('campo "source" ausente');
  }
  if (!Array.isArray(raw.data)) {
    throw new SchemaError('campo "data" deve ser uma lista');
  }
  const data = raw.data.map((point, i) => {
    if (point === null || typeof point !== 'object' || Array.isArray(point)) {
      throw new SchemaError(`data[${i}] não é um objeto`);
    }
    if (typeof point.date !== 'string' || !ISO_DATE.test(point.date)) {
      throw new SchemaError(`data[${i}]: "date" deve ser YYYY-MM-DD, veio ${JSON.stringify(point.date)}`);
    }
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
      throw new SchemaError(`data[${i}]: "value" deve ser número finito, veio ${JSON.stringify(point.value)}`);
    }
    return { date: point.date, value: point.value };
  });

  return {
    schema: SCHEMA_VERSION,
    id: raw.id,
    unit,
    granularity: raw.granularity,
    source: raw.source,
    data,
  };
}

/**
 * Validação do arquivo de série — o contrato é `sitio/docs/contrato-de-indicadores.md`.
 * Cada erro começa pelo CÓDIGO da regra (`C3`, `C11`…), porque o corpus de conformidade
 * (`dados/tests/contrato/`) carrega o código no nome do caso: é assim que os validadores de
 * Python e de JS provam que concordam.
 */
export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}

/** A ÚNICA versão do formato. Não há convivência entre versões: mudar o formato é migrar
 *  todos os arquivos, não abrir um ramo novo (decisão de 2026-11-01). */
export const SCHEMA_VERSION = 1;

export const UNIT_TYPES = new Set(['percentage', 'number', 'currency']);
export const GRANULARITIES = new Set(['daily', 'monthly', 'annual']);
/** C4 — comparabilidade declarada: duas séries só dividem eixo y se o `eixo` for igual. */
export const EIXOS = new Set(['percentual', 'reais', 'contagem', 'por-100-mil']);
/** O `unit.type` que cada eixo obriga (C4). */
export const TIPO_DO_EIXO = {
  percentual: 'percentage',
  reais: 'currency',
  contagem: 'number',
  'por-100-mil': 'number',
};
/** C5 — o que o número É (≠ `granularity`, que diz de quanto em quanto tempo há ponto). */
export const MEDIDAS = new Set(['nivel', 'acumulado-12m', 'variacao-anual', 'estoque', 'participacao']);
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]+$/;
const LOCALE = /^[a-z]{2}(-[A-Z]{2})?$/;

const CHAVES_SERIE = new Set([
  'schema', 'id', 'unit', 'eixo', 'medida', 'granularity', 'source', 'sourceUrl', 'data',
]);
const CHAVES_UNIDADE = new Set(['type', 'symbol', 'decimals', 'locale']);
const CHAVES_PONTO = new Set(['date', 'value']);

const erro = (codigo, texto) => {
  throw new SchemaError(`${codigo}: ${texto}`);
};

/** Data de calendário válida (rejeita 2019-02-31) — C9. */
function dataValida(iso) {
  if (!ISO_DATE.test(iso)) return false;
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Normaliza e valida uma unidade — C3/C3.1. `locale` é opcional.
 * @param {unknown} unit
 * @param {string} [where]
 */
export function validateUnit(unit, where = 'unit') {
  if (unit === null || typeof unit !== 'object' || Array.isArray(unit)) {
    erro('C3', `${where}: ausente ou não é objeto`);
  }
  for (const chave of Object.keys(unit)) {
    if (!CHAVES_UNIDADE.has(chave)) erro('C3', `${where}: campo desconhecido "${chave}"`);
  }
  if (!UNIT_TYPES.has(unit.type)) erro('C3', `${where}.type "${unit.type}" desconhecido`);
  if (typeof unit.symbol !== 'string' || unit.symbol === '') {
    erro('C3', `${where}.symbol ausente ou vazio`);
  }
  if (!Number.isInteger(unit.decimals) || unit.decimals < 0) {
    erro('C3', `${where}.decimals deve ser inteiro ≥ 0`);
  }
  if (unit.locale !== undefined && (typeof unit.locale !== 'string' || !LOCALE.test(unit.locale))) {
    erro('C3.1', `${where}.locale deve ser tag BCP 47 (ex.: pt-BR)`);
  }
  return unit.locale === undefined
    ? { type: unit.type, symbol: unit.symbol, decimals: unit.decimals }
    : { type: unit.type, symbol: unit.symbol, decimals: unit.decimals, locale: unit.locale };
}

/** Chave de unicidade do período (C11): dia, mês ou ano conforme a granularidade. */
const chaveDoPeriodo = (date, granularity) => {
  if (granularity === 'annual') return date.slice(0, 4);
  if (granularity === 'monthly') return date.slice(0, 7);
  return date;
};

/**
 * Valida e normaliza uma série — o contrato inteiro (C1…C14).
 * @param {unknown} raw
 * @param {{expectedId?: string}} [options]
 */
export function validateSeries(raw, { expectedId } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    erro('C1', 'série não é um objeto JSON');
  }
  for (const chave of Object.keys(raw)) {
    if (!CHAVES_SERIE.has(chave)) erro('C8.1', `campo desconhecido na raiz: "${chave}"`);
  }
  if (raw.schema !== SCHEMA_VERSION) {
    erro(
      'C1',
      `schema ${JSON.stringify(raw.schema)} desconhecido; este app entende o schema ${SCHEMA_VERSION}`,
    );
  }
  if (typeof raw.id !== 'string' || !ID.test(raw.id)) {
    erro('C2', `campo "id" ausente ou fora do padrão ${ID}`);
  }
  if (expectedId !== undefined && raw.id !== expectedId) {
    erro('C2', `veio o id "${raw.id}" mas o arquivo se chama "${expectedId}"`);
  }
  const unit = validateUnit(raw.unit, 'unit');

  if (!EIXOS.has(raw.eixo)) {
    erro('C4', `eixo ${JSON.stringify(raw.eixo)} desconhecido`);
  }
  if (TIPO_DO_EIXO[raw.eixo] !== unit.type) {
    erro(
      'C4',
      `eixo "${raw.eixo}" exige unit.type "${TIPO_DO_EIXO[raw.eixo]}", veio "${unit.type}"`,
    );
  }
  if (!MEDIDAS.has(raw.medida)) {
    erro('C5', `medida ${JSON.stringify(raw.medida)} desconhecida`);
  }
  if (!GRANULARITIES.has(raw.granularity)) {
    erro('C6', `granularity ${JSON.stringify(raw.granularity)} desconhecida`);
  }
  if (typeof raw.source !== 'string' || raw.source === '') {
    erro('C7', 'campo "source" ausente');
  }
  if (raw.sourceUrl !== undefined) {
    if (typeof raw.sourceUrl !== 'string' || !/^https:\/\/\S+$/.test(raw.sourceUrl)) {
      erro('C7.1', 'sourceUrl deve ser URL https://');
    }
  }
  if (!Array.isArray(raw.data)) erro('C8', 'campo "data" deve ser uma lista');
  if (raw.data.length === 0) erro('C8', 'campo "data" vazio');

  const vistos = new Map();
  let anterior = null;
  const data = raw.data.map((point, i) => {
    if (point === null || typeof point !== 'object' || Array.isArray(point)) {
      erro('C8', `data[${i}] não é um objeto`);
    }
    for (const chave of Object.keys(point)) {
      if (!CHAVES_PONTO.has(chave)) erro('C8.1', `data[${i}]: campo desconhecido "${chave}"`);
    }
    if (typeof point.date !== 'string' || !dataValida(point.date)) {
      erro('C9', `data[${i}]: "date" deve ser YYYY-MM-DD válido, veio ${JSON.stringify(point.date)}`);
    }
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
      erro('C10', `data[${i}]: "value" deve ser número finito, veio ${JSON.stringify(point.value)}`);
    }
    const chave = chaveDoPeriodo(point.date, raw.granularity);
    if (vistos.has(chave)) {
      erro('C11', `data[${i}]: período "${chave}" repetido (também no ponto ${vistos.get(chave)})`);
    }
    vistos.set(chave, i);
    if (anterior !== null && point.date <= anterior) {
      erro('C12', `data[${i}]: "${point.date}" não é posterior a "${anterior}" (ordem ascendente)`);
    }
    anterior = point.date;
    return { date: point.date, value: point.value };
  });

  const serie = {
    schema: SCHEMA_VERSION,
    id: raw.id,
    unit,
    eixo: raw.eixo,
    medida: raw.medida,
    granularity: raw.granularity,
    source: raw.source,
    data,
  };
  if (raw.sourceUrl !== undefined) serie.sourceUrl = raw.sourceUrl;
  return serie;
}

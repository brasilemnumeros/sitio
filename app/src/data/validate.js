/**
 * Validação do arquivo de série — o contrato é `sitio/docs/contrato-de-indicadores.md`.
 * As chaves e os valores são em português (`unidade`, `dados`, `data`/`valor`): o arquivo é
 * lido e publicado assim, sem camada de tradução.
 *
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

export const TIPOS_DE_UNIDADE = new Set(['percentual', 'numero', 'moeda']);
export const GRANULARIDADES = new Set(['diaria', 'mensal', 'anual']);
/** C4 — comparabilidade declarada: duas séries só dividem eixo y se o `eixo` for igual. */
export const EIXOS = new Set(['percentual', 'reais', 'contagem', 'por-100-mil']);
/** O `unidade.tipo` que cada eixo obriga (C4). */
export const TIPO_DO_EIXO = {
  percentual: 'percentual',
  reais: 'moeda',
  contagem: 'numero',
  'por-100-mil': 'numero',
};
/** C5 — o que o número É (≠ `granularidade`, que diz de quanto em quanto tempo há ponto). */
export const MEDIDAS = new Set(['nivel', 'acumulado-12m', 'variacao-anual', 'estoque', 'participacao']);
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]+$/;
const IDIOMA = /^[a-z]{2}(-[A-Z]{2})?$/;

const CHAVES_SERIE = new Set([
  'versao', 'id', 'unidade', 'eixo', 'medida', 'granularidade', 'fonte', 'urlFonte', 'dados',
]);
const CHAVES_UNIDADE = new Set(['tipo', 'simbolo', 'casas', 'idioma']);
const CHAVES_PONTO = new Set(['data', 'valor']);

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
 * Normaliza e valida uma unidade — C3/C3.1. `idioma` é opcional.
 * @param {unknown} unidade
 * @param {string} [onde]
 */
export function validateUnit(unidade, onde = 'unidade') {
  if (unidade === null || typeof unidade !== 'object' || Array.isArray(unidade)) {
    erro('C3', `${onde}: ausente ou não é objeto`);
  }
  for (const chave of Object.keys(unidade)) {
    if (!CHAVES_UNIDADE.has(chave)) erro('C3', `${onde}: campo desconhecido "${chave}"`);
  }
  if (!TIPOS_DE_UNIDADE.has(unidade.tipo)) {
    erro('C3', `${onde}.tipo "${unidade.tipo}" desconhecido`);
  }
  if (typeof unidade.simbolo !== 'string' || unidade.simbolo === '') {
    erro('C3', `${onde}.simbolo ausente ou vazio`);
  }
  if (!Number.isInteger(unidade.casas) || unidade.casas < 0) {
    erro('C3', `${onde}.casas deve ser inteiro ≥ 0`);
  }
  if (unidade.idioma !== undefined && (typeof unidade.idioma !== 'string' || !IDIOMA.test(unidade.idioma))) {
    erro('C3.1', `${onde}.idioma deve ser tag BCP 47 (ex.: pt-BR)`);
  }
  return unidade.idioma === undefined
    ? { tipo: unidade.tipo, simbolo: unidade.simbolo, casas: unidade.casas }
    : { tipo: unidade.tipo, simbolo: unidade.simbolo, casas: unidade.casas, idioma: unidade.idioma };
}

/** Chave de unicidade do período (C11): dia, mês ou ano conforme a granularidade. */
const chaveDoPeriodo = (data, granularidade) => {
  if (granularidade === 'anual') return data.slice(0, 4);
  if (granularidade === 'mensal') return data.slice(0, 7);
  return data;
};

/**
 * Valida e normaliza uma série — o contrato inteiro (C1…C14).
 * @param {unknown} bruto
 * @param {{expectedId?: string}} [options]
 */
export function validateSeries(bruto, { expectedId } = {}) {
  if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) {
    erro('C1', 'série não é um objeto JSON');
  }
  for (const chave of Object.keys(bruto)) {
    if (!CHAVES_SERIE.has(chave)) erro('C8.1', `campo desconhecido na raiz: "${chave}"`);
  }
  if (bruto.versao !== SCHEMA_VERSION) {
    erro(
      'C1',
      `versao ${JSON.stringify(bruto.versao)} desconhecida; este app entende a versão ${SCHEMA_VERSION}`,
    );
  }
  if (typeof bruto.id !== 'string' || !ID.test(bruto.id)) {
    erro('C2', `campo "id" ausente ou fora do padrão ${ID}`);
  }
  if (expectedId !== undefined && bruto.id !== expectedId) {
    erro('C2', `veio o id "${bruto.id}" mas o arquivo se chama "${expectedId}"`);
  }
  const unidade = validateUnit(bruto.unidade, 'unidade');

  if (!EIXOS.has(bruto.eixo)) {
    erro('C4', `eixo ${JSON.stringify(bruto.eixo)} desconhecido`);
  }
  if (TIPO_DO_EIXO[bruto.eixo] !== unidade.tipo) {
    erro(
      'C4',
      `eixo "${bruto.eixo}" exige unidade.tipo "${TIPO_DO_EIXO[bruto.eixo]}", veio "${unidade.tipo}"`,
    );
  }
  if (!MEDIDAS.has(bruto.medida)) {
    erro('C5', `medida ${JSON.stringify(bruto.medida)} desconhecida`);
  }
  if (!GRANULARIDADES.has(bruto.granularidade)) {
    erro('C6', `granularidade ${JSON.stringify(bruto.granularidade)} desconhecida`);
  }
  if (typeof bruto.fonte !== 'string' || bruto.fonte === '') {
    erro('C7', 'campo "fonte" ausente');
  }
  if (bruto.urlFonte !== undefined) {
    if (typeof bruto.urlFonte !== 'string' || !/^https:\/\/\S+$/.test(bruto.urlFonte)) {
      erro('C7.1', 'urlFonte deve ser URL https://');
    }
  }
  if (!Array.isArray(bruto.dados)) erro('C8', 'campo "dados" deve ser uma lista');
  if (bruto.dados.length === 0) erro('C8', 'campo "dados" vazio');

  const vistos = new Map();
  let anterior = null;
  const dados = bruto.dados.map((ponto, i) => {
    if (ponto === null || typeof ponto !== 'object' || Array.isArray(ponto)) {
      erro('C8', `dados[${i}] não é um objeto`);
    }
    for (const chave of Object.keys(ponto)) {
      if (!CHAVES_PONTO.has(chave)) erro('C8.1', `dados[${i}]: campo desconhecido "${chave}"`);
    }
    if (typeof ponto.data !== 'string' || !dataValida(ponto.data)) {
      erro('C9', `dados[${i}]: "data" deve ser YYYY-MM-DD válido, veio ${JSON.stringify(ponto.data)}`);
    }
    if (typeof ponto.valor !== 'number' || !Number.isFinite(ponto.valor)) {
      erro('C10', `dados[${i}]: "valor" deve ser número finito, veio ${JSON.stringify(ponto.valor)}`);
    }
    const chave = chaveDoPeriodo(ponto.data, bruto.granularidade);
    if (vistos.has(chave)) {
      erro('C11', `dados[${i}]: período "${chave}" repetido (também no ponto ${vistos.get(chave)})`);
    }
    vistos.set(chave, i);
    if (anterior !== null && ponto.data <= anterior) {
      erro('C12', `dados[${i}]: "${ponto.data}" não é posterior a "${anterior}" (ordem ascendente)`);
    }
    anterior = ponto.data;
    return { data: ponto.data, valor: ponto.valor };
  });

  const serie = {
    versao: SCHEMA_VERSION,
    id: bruto.id,
    unidade,
    eixo: bruto.eixo,
    medida: bruto.medida,
    granularidade: bruto.granularidade,
    fonte: bruto.fonte,
    dados,
  };
  if (bruto.urlFonte !== undefined) serie.urlFonte = bruto.urlFonte;
  return serie;
}

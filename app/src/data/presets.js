/**
 * Presets nomeados da home (§"Preset do dia" da spec 2026-10-26).
 * Módulo puro: nada de rede, cache, relógio (`new Date()` sem argumento) ou
 * sorteio (`Math.random`) — a decisão de "hoje" cabe sempre ao chamador.
 */

/** @typedef {{ id: string, nome: string, indicadores: string[] }} Preset */

const MS_POR_DIA = 86_400_000;

// Ordem importa: é a rotação do "preset do dia" (juros → inflação → … → trabalho → juros).
// Os ids de indicador são os do catálogo (`indicators.json`), sem inventar apelidos.
/** @type {ReadonlyArray<Preset>} */
export const PRESETS = Object.freeze([
  {
    id: 'juros',
    nome: 'Juros',
    indicadores: Object.freeze(['selic-meta-acum-12m', 'selic-over-acum-12m']),
  },
  {
    id: 'inflacao',
    nome: 'Inflação',
    indicadores: Object.freeze(['ipca-acum-12m', 'igpm-acum-12m']),
  },
  {
    id: 'habitacao',
    nome: 'Habitação',
    indicadores: Object.freeze(['mvgr-nominal', 'mvgr-real']),
  },
  {
    id: 'violencia',
    nome: 'Violência',
    indicadores: Object.freeze(['homicidios-anual', 'homicidios-armas-fogo-anual']),
  },
  {
    id: 'atividade',
    nome: 'Atividade',
    indicadores: Object.freeze(['pib-real-anual', 'populacao-variacao-anual']),
  },
  {
    id: 'trabalho',
    nome: 'Trabalho',
    indicadores: Object.freeze(['caged-total-mensal']),
  },
]);

// Um único formatador por módulo: `en-CA` nasce no formato AAAA-MM-DD que o
// `presetDoDia` espera, e o fuso é sempre o do Brasil, não o do navegador.
const FORMATO_DIA_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Converte um instante no dia LOCAL de São Paulo, em `AAAA-MM-DD`.
 * Sem argumento devolve `null`: o módulo é puro e não consulta `new Date()` —
 * o chamador decide o "agora" (injeção, como nos testes e na iniciação).
 *
 * @param {Date} [agora]
 * @returns {string|null}
 */
export function dataEmSaoPaulo(agora) {
  if (!(agora instanceof Date) || Number.isNaN(agora.getTime())) return null;
  return FORMATO_DIA_SP.format(agora);
}

/**
 * Preset do dia: rotação determinística por dia — o mesmo dia devolve o mesmo
 * preset para todo mundo, e o dia seguinte cai no próximo da lista.
 * Lista vazia ou data inválida → `null`.
 *
 * @param {string} dataISO  Dia no formato `AAAA-MM-DD`.
 * @param {ReadonlyArray<Preset>} [lista]
 * @returns {Preset|null}
 */
export function presetDoDia(dataISO, lista = PRESETS) {
  if (!Array.isArray(lista) || lista.length === 0 || typeof dataISO !== 'string') return null;
  // Ancora a data em meia-noite UTC para que o "dia" seja o mesmo em qualquer fuso.
  const ms = Date.parse(`${dataISO}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  const dias = Math.floor(ms / MS_POR_DIA);
  // Módulo positivo: índice nunca sai negativo, mesmo com data anterior à época.
  const i = ((dias % lista.length) + lista.length) % lista.length;
  return lista[i];
}

/**
 * Preset cujos indicadores são exatamente o conjunto dado (ordem irrelevante).
 * Conjunto vazio ou sem correspondência → `null`.
 *
 * @param {string[]} ids
 * @param {ReadonlyArray<Preset>} [lista]
 * @returns {Preset|null}
 */
export function presetDosIds(ids, lista = PRESETS) {
  if (!Array.isArray(ids) || ids.length === 0 || !Array.isArray(lista) || lista.length === 0) {
    return null;
  }
  const conjunto = new Set(ids);
  return (
    lista.find(
      (preset) => preset.indicadores.length === conjunto.size && preset.indicadores.every((id) => conjunto.has(id)),
    ) ?? null
  );
}

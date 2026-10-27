import { writable, derived, get } from 'svelte/store';
import { loadSeries } from '../data/series.js';
import { PALETA_PADRAO } from '../domain/color.js';

/** O teto vem da PALETA, não do layout (§1): sem ciclo, não há 11ª cor. */
export const LIMITE_SERIES = 10;

/** @typedef {{id:string, name:string, unit:object, cor:string,
 *             status:'carregando'|'ok'|'erro', series:object|null, error:string|null}} Item */

export const seriesStore = writable({ itens: [] });

/** A DATA DE REFERÊNCIA (§8): a mais recente entre as séries `ok`. Mora aqui, e não no componente,
 *  porque desde 2026-10-19 DOIS a usam — o filtro de tempo (o "10a" conta a partir dela) e o
 *  trilho de mandatos (o mandato em curso termina nela). Uma fonte só: duas cópias divergiriam.
 *  Série com erro não conta: a referência não pode vir de dado que não chegou (§9.3). */
export const dataMaximaStore = derived(seriesStore, ({ itens }) => {
  let max = null;
  for (const item of itens) {
    if (item.status !== 'ok' || !Array.isArray(item.series?.data)) continue;
    for (const { date } of item.series.data) if (max === null || date > max) max = date;
  }
  return max;
});

const escrever = (fn) => seriesStore.update((s) => ({ ...s, itens: fn(s.itens) }));

/** Cores padrão por POSIÇÃO, sem ciclo — posição > 9 só acontece se o limite furar. */
function reindexarCores(itens) {
  const overrides = new Map(itens.filter((i) => i.corPessoal).map((i) => [i.id, i.cor]));
  return itens.map((item, i) => ({ ...item, cor: overrides.get(item.id) ?? PALETA_PADRAO[i] }));
}

/** Item novo, ainda sem dado: a cor é reindexada por quem emite (§1). Reutilizado por
 *  `adicionarSerie` e `substituirSeries` para que os dois caminhos criem itens idênticos. */
const paraItem = (entry) => ({
  id: entry.id,
  name: entry.name,
  url: entry.datafile,
  unit: entry.unit ?? null,
  cor: null,
  corPessoal: false,
  status: 'carregando',
  series: null,
  error: null,
});

/** A unidade vem da SÉRIE, não do catálogo (§6) — o catálogo só a tem durante a transição.
 *  `expectedId` é opcional: o caminho do add/retentativa passa o id (defesa contra arquivo
 *  trocado na URL), o atalho de preset não — o `datafile` do preset é o arquivo CURADO pelo
 *  catálogo, e o id interno do JSON pode divergir do id do preset sem que a troca falhe. */
const carregarItem = async (entry, { fetchImpl, expectedId } = {}) => {
  const series = await loadSeries(entry.datafile, { expectedId, fetchImpl });
  escrever((itens) => itens.map((i) => (i.id === entry.id ? { ...i, status: 'ok', series, unit: series.unit, error: null } : i)));
};

const registrarFalha = (id, error) => {
  escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'erro', series: null, error: error.message } : i)));
};

export async function adicionarSerie(entry, { fetchImpl } = {}) {
  if (get(seriesStore).itens.some((i) => i.id === entry.id)) return;
  if (atingiuLimite()) return; // visível e desabilitado na UI; nada é removido (§9.5)
  escrever((itens) => reindexarCores([...itens, paraItem(entry)]));
  try {
    await carregarItem(entry, { fetchImpl, expectedId: entry.id });
  } catch (error) {
    registrarFalha(entry.id, error);
  }
}

/** Troca o CONJUNTO inteiro (atalho de preset) numa ÚNICA emissão da store: todas as séries
 *  entram juntas como `carregando`, já com cor por posição, e só então carregam em paralelo.
 *  Um `set` — não um `update` por série — para que a UI nunca mostre a mistura de dois
 *  conjuntos durante a transição. */
export async function substituirSeries(entries, { fetchImpl } = {}) {
  const vistos = new Set();
  const unicos = [];
  for (const entry of entries) {
    if (vistos.has(entry.id)) continue; // id repetido: o primeiro vence
    vistos.add(entry.id);
    if (unicos.length >= LIMITE_SERIES) break; // o teto é a paleta (§1)
    unicos.push(entry);
  }
  seriesStore.set({ itens: reindexarCores(unicos.map(paraItem)) });
  // Cada carga atualiza só o próprio item; falha é parcial (§9.3) — não derruba as demais.
  await Promise.all(unicos.map(async (entry) => {
    try {
      await carregarItem(entry, { fetchImpl });
    } catch (error) {
      registrarFalha(entry.id, error);
    }
  }));
}

export function removerSerie(id) {
  escrever((itens) => reindexarCores(itens.filter((i) => i.id !== id)));
}

export async function tentarNovamente(id, { fetchImpl } = {}) {
  const item = get(seriesStore).itens.find((i) => i.id === id);
  if (!item) return;
  escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'carregando', error: null } : i)));
  try {
    // A URL REAL, guardada ao adicionar. NÃO reconstruir a partir do id: o caminho publicado
    // inclui a família (`dados/selic/selic-meta-acum-12m.json`), e uma URL adivinhada daria
    // 404 — numa ação cujo propósito é justamente RECUPERAR de uma falha.
    const series = await loadSeries(item.url, { expectedId: id, fetchImpl });
    // A unidade vem da SÉRIE, não do catálogo (§6) — igual ao caminho de `adicionarSerie`.
    // Sem isto, a MESMA série ficaria com unidade diferente conforme tivesse vindo pelo
    // add ou pela retentativa (R28).
    escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'ok', series, unit: series.unit, error: null } : i)));
  } catch (error) {
    escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'erro', error: error.message } : i)));
  }
}

export const atingiuLimite = () => get(seriesStore).itens.length >= LIMITE_SERIES;

export function motivoDoLimite() {
  return atingiuLimite()
    ? `Limite de ${LIMITE_SERIES} séries atingido — a paleta tem ${LIMITE_SERIES} cores sem repetição. Remova uma para adicionar outra.`
    : null;
}

export const corDe = (id) => get(seriesStore).itens.find((i) => i.id === id)?.cor ?? null;

export function definirCor(id, hex) {
  escrever((itens) => itens.map((i) => (i.id === id ? { ...i, cor: hex, corPessoal: true } : i)));
}

export function restaurarCor(id) {
  escrever((itens) => reindexarCores(itens.map((i) => (i.id === id ? { ...i, corPessoal: false } : i))));
}

/** Só para testes e para o atalho "limpar seleção" (§9.1). */
export function limparSeries() {
  seriesStore.set({ itens: [] });
}

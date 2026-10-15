import { writable, get } from 'svelte/store';
import { loadSeries } from '../data/series.js';
import { PALETA_PADRAO } from '../domain/color.js';

/** O teto vem da PALETA, não do layout (§1): sem ciclo, não há 11ª cor. */
export const LIMITE_SERIES = 10;

/** @typedef {{id:string, name:string, unit:object, cor:string,
 *             status:'carregando'|'ok'|'erro', series:object|null, error:string|null}} Item */

export const seriesStore = writable({ itens: [] });

const escrever = (fn) => seriesStore.update((s) => ({ ...s, itens: fn(s.itens) }));

/** Cores padrão por POSIÇÃO, sem ciclo — posição > 9 só acontece se o limite furar. */
function reindexarCores(itens) {
  const overrides = new Map(itens.filter((i) => i.corPessoal).map((i) => [i.id, i.cor]));
  return itens.map((item, i) => ({ ...item, cor: overrides.get(item.id) ?? PALETA_PADRAO[i] }));
}

export async function adicionarSerie(entry, { fetchImpl } = {}) {
  if (get(seriesStore).itens.some((i) => i.id === entry.id)) return;
  if (atingiuLimite()) return; // visível e desabilitado na UI; nada é removido (§9.5)
  escrever((itens) => reindexarCores([...itens, { id: entry.id, name: entry.name, url: entry.datafile, unit: entry.unit ?? null, cor: null, corPessoal: false, status: 'carregando', series: null, error: null }]));
  try {
    const series = await loadSeries(entry.datafile, { expectedId: entry.id, fetchImpl });
    // A unidade vem da SÉRIE, não do catálogo (§6) — o catálogo só a tem durante a transição.
    escrever((itens) => itens.map((i) => (i.id === entry.id ? { ...i, status: 'ok', series, unit: series.unit, error: null } : i)));
  } catch (error) {
    escrever((itens) => itens.map((i) => (i.id === entry.id ? { ...i, status: 'erro', series: null, error: error.message } : i)));
  }
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
    escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'ok', series, error: null } : i)));
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

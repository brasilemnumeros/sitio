import { writable, get } from 'svelte/store';
import { loadCatalog } from '../data/catalog.js';

const inicial = { status: 'idle', groups: {}, indicators: [], error: null };

/** Camada 2 — não conhece a Lightweight Charts nem o DOM (§8). */
export const catalogStore = writable(inicial);

/** Ação nomeada: única forma de escrever no store (§8). */
export async function carregarCatalogo({ url, fetchImpl } = {}) {
  if (get(catalogStore).status === 'loading' || get(catalogStore).status === 'ready') return;
  catalogStore.set({ ...inicial, status: 'loading' });
  try {
    const { groups, indicators } = await loadCatalog({ url, fetchImpl });
    catalogStore.set({ status: 'ready', groups, indicators, error: null });
  } catch (error) {
    catalogStore.set({ ...inicial, status: 'error', error: error.message });
  }
}

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function buscarIndicadores(termo) {
  const { indicators } = get(catalogStore);
  const t = semAcento(termo.trim());
  if (t === '') return indicators;
  return indicators.filter((i) => semAcento(i.name).includes(t) || semAcento(i.id).includes(t));
}

export function indicadoresDoGrupo(groupId) {
  return get(catalogStore).indicators.filter((i) => i.group === groupId);
}

import { writable, get } from 'svelte/store';
import { validateCatalog, catalogoEmbutido } from '../data/catalog.js';

const inicial = { status: 'idle', groups: {}, indicators: [], error: null };

/** Camada 2 — não conhece a Lightweight Charts nem o DOM (§8). */
export const catalogStore = writable(inicial);

/** Ação nomeada: única forma de escrever no store (§8). `dados` é injetável para os testes;
 *  em produção o catálogo é o `indicadores.json` importado no bundle. */
export function carregarCatalogo({ dados } = {}) {
  if (get(catalogStore).status === 'loading' || get(catalogStore).status === 'ready') return;
  catalogStore.set({ ...inicial, status: 'loading' });
  try {
    const { groups, indicators } = dados ? validateCatalog(dados) : catalogoEmbutido();
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

/** Resolve um id do permalink para a entrada do catálogo; `null` se não existir (pode ser ignorado). */
export function indicadorPorId(id) {
  return get(catalogStore).indicators.find((i) => i.id === id) ?? null;
}

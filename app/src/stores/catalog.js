import { writable, get } from 'svelte/store';
import { validateCatalog, catalogoEmbutido } from '../data/catalog.js';

const inicial = { status: 'idle', grupos: {}, indicadores: [], error: null };

/** Camada 2 — não conhece a Lightweight Charts nem o DOM (§8). */
export const catalogStore = writable(inicial);

/** Ação nomeada: única forma de escrever no store (§8). `dados` é injetável para os testes;
 *  em produção o catálogo é o `indicadores.json` importado no bundle. */
export function carregarCatalogo({ dados } = {}) {
  if (get(catalogStore).status === 'loading' || get(catalogStore).status === 'ready') return;
  catalogStore.set({ ...inicial, status: 'loading' });
  try {
    const { grupos, indicadores } = dados ? validateCatalog(dados) : catalogoEmbutido();
    catalogStore.set({ status: 'ready', grupos, indicadores, error: null });
  } catch (error) {
    catalogStore.set({ ...inicial, status: 'error', error: error.message });
  }
}

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function buscarIndicadores(termo) {
  const { indicadores } = get(catalogStore);
  const t = semAcento(termo.trim());
  if (t === '') return indicadores;
  return indicadores.filter((i) => semAcento(i.nome).includes(t) || semAcento(i.id).includes(t));
}

export function indicadoresDoGrupo(groupId) {
  return get(catalogStore).indicadores.filter((i) => i.grupo === groupId);
}

/** Resolve um id do permalink para a entrada do catálogo; `null` se não existir (pode ser ignorado). */
export function indicadorPorId(id) {
  return get(catalogStore).indicadores.find((i) => i.id === id) ?? null;
}

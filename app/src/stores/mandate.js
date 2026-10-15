import { writable, get } from 'svelte/store';
import { ordenarMandatos } from '../domain/mandates.js';

const URL_GOVERNOS = 'https://brasilemnumeros.github.io/dados/governos/federal.json';
const inicial = { mandatos: [], selecionado: null };

const store = writable(inicial);
export const mandateStore = { subscribe: store.subscribe };

/** O mandato é CONTEXTO, não dado do gráfico: se os governos não vierem, o app ainda mostra
 * as séries — por isso a falha é engolida e o store fica vazio em vez de propagar (§9.3). */
export async function carregarMandatos({ url = URL_GOVERNOS, fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} ao buscar governos`);
    const dados = await r.json();
    store.set({ mandatos: ordenarMandatos(dados.mandatos ?? []), selecionado: null });
  } catch {
    store.set({ ...inicial });
  }
}

export function selecionarMandato(id) {
  store.update((s) => (s.mandatos.some((m) => m.id === id) ? { ...s, selecionado: id } : s));
}

export function limparSelecao() {
  store.update((s) => ({ ...s, selecionado: null }));
}

export function mandatoSelecionado() {
  const { mandatos, selecionado } = get(store);
  return mandatos.find((m) => m.id === selecionado) ?? null;
}

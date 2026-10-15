import { writable } from 'svelte/store';

const inicial = { from: null, to: null };
const store = writable(inicial);
export const viewportStore = { subscribe: store.subscribe };

/** A única escrita que o ADAPTER chama (§8.1) — nenhum componente lê a janela de volta do
 * gráfico para escrevê-la aqui. (`resetarJanela` é a outra escrita: as duas são ações nomeadas,
 * nenhuma é alcançável de fora de `stores/`.) */
export function definirJanela({ from = null, to = null } = {}) {
  store.set({ from, to });
}

export function resetarJanela() {
  store.set({ ...inicial });
}

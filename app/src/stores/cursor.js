import { writable } from 'svelte/store';

/**
 * O CURSOR do gráfico (2026-11-01): a data sob o mouse e a posição em pixels DENTRO do pane.
 *
 * Existe porque a UI (legenda ou caixa flutuante) precisa mostrar o valor no ponto e a posição do
 * cursor, e a UI não pode perguntar isso à lib (ADR 0001: componente de UI não chama o gráfico). O
 * caminho é o de sempre — adapter assina o crosshair, publica aqui, a UI lê.
 *
 * ⚠ É um store SEPARADO de `viewport`: a janela visível muda no zoom (debounce, aritmética de data,
 * persistência no permalink), o cursor muda a cada pixel de mouse. Juntar os dois faria todo
 * movimento do mouse reescrever a janela — e a janela reescrever a URL.
 */
const store = writable({ data: null, x: 0, y: 0 });
export const cursorStore = { subscribe: store.subscribe };

/** Chamado SÓ pelo adapter (via `Chart.svelte`). Data inválida/ausente vira `null` — cursor fora. */
export function definirCursor(data, x = 0, y = 0) {
  store.set({
    data: typeof data === 'string' && data.length >= 10 ? data.slice(0, 10) : null,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  });
}

/** Para testes e para o desmonte do gráfico. */
export function limparCursor() {
  store.set({ data: null, x: 0, y: 0 });
}

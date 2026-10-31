import { writable } from 'svelte/store';
import { comparabilidade } from '../domain/scales.js';

const inicial = { atribuicao: {}, avisos: [] };
const store = writable(inicial);
export const axesStore = { subscribe: store.subscribe };

const EIXOS = ['left', 'right'];

/** Sugere eixo para cada série, na ordem dada: a primeira vai para a **direita** — o eixo-base do
 * terminal, como no TradingView, porque o "agora" está na ponta direita e é ali que o último valor
 * mora (decisão de 2026-10-30; era `left`, herança do Chart.js). Cada seguinte fica à direita SE
 * conviver com as que já estão lá — senão vai para a esquerda com um aviso apontando a culpada
 * (§5). Só existem dois eixos (§9.5): não há terceiro. */
export function recalcularEixos(seriesList) {
  const atribuicao = {};
  const avisos = [];
  const base = [];
  for (const s of seriesList) {
    if (base.length === 0) {
      atribuicao[s.id] = 'right';
      base.push(s);
      continue;
    }
    const v = comparabilidade(s, base);
    if (v.veredito === 'convive') {
      atribuicao[s.id] = 'right';
      base.push(s);
    } else {
      atribuicao[s.id] = 'left';
      avisos.push({ ...v, id: s.id });
    }
  }
  store.set({ atribuicao, avisos });
}

/** Só `left` e `right`. Um terceiro valor é ignorado em silêncio — o app não inventa eixo. */
export function moverParaEixo(id, eixo) {
  if (!EIXOS.includes(eixo)) return;
  store.update((s) => ({ ...s, atribuicao: { ...s.atribuicao, [id]: eixo } }));
}

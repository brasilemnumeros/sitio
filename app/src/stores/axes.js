import { writable, get } from 'svelte/store';
import { comparabilidade } from '../domain/scales.js';

const inicial = { atribuicao: {}, avisos: [] };
const store = writable(inicial);
export const axesStore = { subscribe: store.subscribe };

const EIXOS = ['left', 'right'];

/** Sugere eixo para cada série, na ordem dada: a primeira vai para a esquerda, e cada
 * seguinte fica à esquerda SE conviver com as que já estão lá — senão vai para a direita
 * com um aviso apontando a culpada (§5). Só existem dois eixos (§9.5): não há terceiro. */
export function recalcularEixos(seriesList) {
  const atribuicao = {};
  const avisos = [];
  const esquerda = [];
  for (const s of seriesList) {
    if (esquerda.length === 0) {
      atribuicao[s.id] = 'left';
      esquerda.push(s);
      continue;
    }
    const v = comparabilidade(s, esquerda);
    if (v.veredito === 'convive') {
      atribuicao[s.id] = 'left';
      esquerda.push(s);
    } else {
      atribuicao[s.id] = 'right';
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

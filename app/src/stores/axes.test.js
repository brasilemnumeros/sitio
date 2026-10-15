import { it, expect } from 'vitest';
import { get } from 'svelte/store';
import { axesStore, recalcularEixos, moverParaEixo } from './axes.js';

// ⚠️ Fixtures na forma CANÔNICA da série (fatia 02): o campo é `data`, não `pontos`, e o
// span é max−min — uma série de UM ponto só tem span 0 e nunca dispara aviso. Por isso cada
// fixture tem dois pontos; é a amplitude (span) que decide o veredito.
const s = (id, unit) => ({ id, unit, data: [{ date: '2020-01-01', value: 0 }, { date: '2021-01-01', value: 1 }] });
// As amplitudes reais decidem o veredito (fatia 02): 1e11 vs 1 dá razão 1e11, acima de 1e6 → 'ilegivel'.
const grande = { id: 'g', unit: { type: 'currency', symbol: 'R$' }, data: [{ date: '2020-01-01', value: 0 }, { date: '2021-01-01', value: 1e11 }] };
const pequeno = { id: 'p', unit: { type: 'currency', symbol: 'R$' }, data: [{ date: '2020-01-01', value: 0 }, { date: '2021-01-01', value: 1 }] };

it('com tudo convivendo, tudo fica num eixo só (§5)', () => {
  recalcularEixos([s('a'), s('b')]);
  const { atribuicao, avisos } = get(axesStore);
  expect(atribuicao).toEqual({ a: 'left', b: 'left' });
  expect(avisos).toEqual([]);
});

it('a série incompatível vai para a direita, e o aviso aponta a CULPADA', () => {
  recalcularEixos([grande, pequeno]);
  const { atribuicao, avisos } = get(axesStore);
  expect(atribuicao.left ?? atribuicao.g).toBe('left');
  expect(atribuicao.p).toBe('right');
  expect(avisos).toHaveLength(1);
  expect(avisos[0].id).toBe('p');
  expect(avisos[0].contra).toBe(grande);          // a culpada, não um booleano
  expect(['avisa', 'ilegivel']).toContain(avisos[0].veredito);
});

it('moverParaEixo move uma série para a direita', () => {
  recalcularEixos([s('a'), s('b')]);
  moverParaEixo('a', 'right');
  expect(get(axesStore).atribuicao.a).toBe('right');
});

it('só existem dois eixos — um terceiro valor é ignorado (§9.5)', () => {
  recalcularEixos([s('a')]);
  moverParaEixo('a', 'meio');
  expect(get(axesStore).atribuicao.a).toBe('left'); // inalterado
});

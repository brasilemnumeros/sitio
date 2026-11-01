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
  expect(get(axesStore)).toEqual({ atribuicao: { a: 'right', b: 'right' } }); // base = DIREITO
});

// 2026-11-01 — o que se prova aqui é só a ATRIBUIÇÃO: a store não publica mais veredito nenhum
// (§5 emendada). O aviso saiu da ficha e da seção Eixos porque descrevia um impedimento que não
// existe — adicionar nunca ficou bloqueado.
it('a série de amplitude incompatível vai para o eixo que não está em uso', () => {
  recalcularEixos([grande, pequeno]);
  const { atribuicao } = get(axesStore);
  expect(atribuicao.g).toBe('right'); // o eixo-base
  expect(atribuicao.p).toBe('left'); // a incompatível sai do eixo-base
  expect(get(axesStore)).not.toHaveProperty('avisos');
});

it('moverParaEixo move uma série para a esquerda', () => {
  recalcularEixos([s('a'), s('b')]);
  moverParaEixo('a', 'left');
  expect(get(axesStore).atribuicao.a).toBe('left');
});

it('só existem dois eixos — um terceiro valor é ignorado (§9.5)', () => {
  recalcularEixos([s('a')]);
  moverParaEixo('a', 'meio');
  expect(get(axesStore).atribuicao.a).toBe('right'); // inalterado
});

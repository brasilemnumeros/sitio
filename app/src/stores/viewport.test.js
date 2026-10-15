import { it, expect } from 'vitest';
import { get } from 'svelte/store';
import { viewportStore, definirJanela, resetarJanela } from './viewport.js';

it('definirJanela é a única escrita, e vem do adapter (§8.1)', () => {
  definirJanela({ from: '2020-01-01', to: '2021-01-01' });
  expect(get(viewportStore)).toEqual({ from: '2020-01-01', to: '2021-01-01' });
});

it('campos ausentes viram null, não undefined', () => {
  definirJanela({ from: '2020-01-01' });
  expect(get(viewportStore)).toEqual({ from: '2020-01-01', to: null });
});

it('resetarJanela volta ao intervalo completo', () => {
  definirJanela({ from: '2020-01-01', to: '2021-01-01' });
  resetarJanela();
  expect(get(viewportStore)).toEqual({ from: null, to: null });
});

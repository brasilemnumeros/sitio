import { it, expect } from 'vitest';
import { valorNaData } from './seriesValue.js';

const serie = [
  { date: '2020-01-01', value: 10 },
  { date: '2020-02-01', value: 20 },
  { date: '2020-03-01', value: 30 },
];

it('acha o valor na data exata', () => {
  expect(valorNaData(serie, '2020-01-01')).toBe(10);
  expect(valorNaData(serie, '2020-02-01')).toBe(20);
  expect(valorNaData(serie, '2020-03-01')).toBe(30);
});

// A regra de produto (2026-11-01): data sem ponto devolve `null`, e a legenda mostra "—". Devolver
// o vizinho mais próximo seria exibir um número de OUTRA data ao lado da data do cursor.
it('data sem ponto devolve null — nunca o vizinho', () => {
  expect(valorNaData(serie, '2020-01-15')).toBeNull();
  expect(valorNaData(serie, '2019-12-31')).toBeNull();
  expect(valorNaData(serie, '2020-03-02')).toBeNull();
});

it('não se perde com série de um ponto só nem com dado vazio', () => {
  expect(valorNaData([{ date: '2020-05-05', value: 7 }], '2020-05-05')).toBe(7);
  expect(valorNaData([{ date: '2020-05-05', value: 7 }], '2020-05-06')).toBeNull();
  expect(valorNaData([], '2020-05-05')).toBeNull();
  expect(valorNaData(null, '2020-05-05')).toBeNull();
  expect(valorNaData(serie, null)).toBeNull();
});

it('aceita data com hora no arquivo (compara só o dia)', () => {
  expect(valorNaData([{ date: '2020-02-01T00:00:00', value: 5 }], '2020-02-01')).toBe(5);
});

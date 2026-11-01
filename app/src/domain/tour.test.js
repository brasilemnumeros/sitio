import { describe, it, expect } from 'vitest';
import { deveMostrarTour, filtrarPassos, LARGURA_MINIMA } from './tour.js';

describe('deveMostrarTour', () => {
  const base = { largura: 1280, urlTemSeries: false, jaVisto: false };

  it('mostra na primeira visita, no desktop', () => {
    expect(deveMostrarTour(base)).toBe(true);
  });

  it('não mostra se já foi visto', () => {
    expect(deveMostrarTour({ ...base, jaVisto: true })).toBe(false);
  });

  it('não mostra abaixo da largura mínima', () => {
    expect(deveMostrarTour({ ...base, largura: LARGURA_MINIMA - 1 })).toBe(false);
  });

  it('mostra exatamente na largura mínima', () => {
    expect(deveMostrarTour({ ...base, largura: LARGURA_MINIMA })).toBe(true);
  });

  it('não mostra quando a URL trouxe séries', () => {
    expect(deveMostrarTour({ ...base, urlTemSeries: true })).toBe(false);
  });
});

describe('filtrarPassos', () => {
  const passos = [{ element: '#a' }, { element: '#b' }, { element: '#c' }];

  it('mantém só os passos cujo elemento existe', () => {
    expect(filtrarPassos(passos, (s) => s !== '#b')).toEqual([{ element: '#a' }, { element: '#c' }]);
  });

  it('devolve lista vazia quando não há elemento nenhum', () => {
    expect(filtrarPassos(passos, () => false)).toEqual([]);
  });
});

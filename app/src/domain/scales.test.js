import { describe, it, expect } from 'vitest';
import { seriesSpan, amplitudeRatio } from './scales.js';

/** Série de fixture: só as amplitudes importam (spec §5, anexo). */
function serie(id, min, max) {
  return { id, data: [{ date: '2000-01-01', value: min }, { date: '2001-01-01', value: max }] };
}

describe('seriesSpan', () => {
  it('mede max − min sobre a série inteira', () => {
    expect(seriesSpan(serie('x', 2.0, 44.22))).toBeCloseTo(42.22, 6);
  });

  it('é 0 numa série de um ponto só', () => {
    expect(seriesSpan({ id: 'x', data: [{ date: '2000-01-01', value: 5 }] })).toBe(0);
  });
});

describe('amplitudeRatio', () => {
  it('devolve a razão entre a maior e a menor amplitude', () => {
    // selic-meta (42,22) × igpm (39,97) = 1,056 — par mais compatível medido (§5)
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);
    expect(amplitudeRatio(selic, igpm)).toBeCloseTo(1.056, 2);
  });

  it('mede o par patológico populacao-total × selic-meta (§5)', () => {
    // Amplitudes do anexo, arredondadas a 2 casas: 50.337.190 ÷ 42,22 = 1.192.259,4.
    // A §5 publica **1.192.196** porque mediu sobre os valores CRUS, sem arredondar as
    // amplitudes — a diferença está na 4ª casa significativa. O teste trava o que as
    // fixtures desta suíte realmente produzem, não o número publicado.
    const pop = serie('populacao-total-anual', 154524335, 204861525);
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    expect(amplitudeRatio(pop, selic)).toBeCloseTo(1192259, 0);
  });

  it('é simétrica', () => {
    const a = serie('a', 0, 10);
    const b = serie('b', 0, 500);
    expect(amplitudeRatio(a, b)).toBeCloseTo(amplitudeRatio(b, a), 9);
  });

  it('duas séries constantes convivem (razão 1)', () => {
    expect(amplitudeRatio({ id: 'a', data: [] }, { id: 'b', data: [] })).toBe(1);
  });
});

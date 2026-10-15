import { describe, it, expect } from 'vitest';
import { seriesSpan, amplitudeRatio } from './scales.js';
import { comparabilidade, AMPLITUDE_LIMIT, AMPLITUDE_LIMIT_ILEGIVEL } from './scales.js';

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

describe('comparabilidade (§5)', () => {
  it('o corte é 50', () => {
    expect(AMPLITUDE_LIMIT).toBe(50);
  });

  it('convive: razão ≤ 50 não gera aviso', () => {
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);          // amplitude 39,97
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);    // amplitude 42,22
    const v = comparabilidade(selic, [igpm]);
    expect(v.veredito).toBe('convive');
    expect(v.ratio).toBeCloseTo(1.056, 2);
    expect(v.contra.id).toBe('igpm-acum-12m');
  });

  it('avisa: razão entre 50 e 1.000.000 aponta a série culpada', () => {
    // MVG-R (222.000) × Selic (42,22) = 5.258× — acima do corte de 50 e bem abaixo do
    // patológico. ⚠️ NÃO use `populacao-total × selic-meta` aqui: medido, aquele par dá
    // **1.192.259×**, que cai do OUTRO lado do limiar de 1.000.000 e devolveria `'ilegivel'`
    // (R19). O par patológico tem os seus próprios testes na Tarefa 3.
    const mvgr = serie('mvgr-nominal', 42000, 264000);
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    const v = comparabilidade(selic, [mvgr]);
    expect(v.veredito).toBe('avisa');
    expect(v.ratio).toBeGreaterThan(AMPLITUDE_LIMIT);
    expect(v.contra.id).toBe('mvgr-nominal');
  });

  it('reporta o PIOR caso entre várias existentes', () => {
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);          // 39,97
    const pop = serie('populacao-total-anual', 154524335, 204861525);
    const v = comparabilidade(serie('selic-meta-acum-12m', 2.0, 44.22), [igpm, pop]);
    expect(v.contra.id).toBe('populacao-total-anual'); // 1.192.259 > 1,056
  });

  it('sem existentes, não há com o que comparar', () => {
    const v = comparabilidade(serie('x', 0, 10), []);
    expect(v.veredito).toBe('convive');
    expect(v.contra).toBeNull();
  });

  it('razão EXATAMENTE 1 ainda aponta a série comparada — `contra` só é null sem existentes', () => {
    // Duas séries de amplitude idêntica: 10×10. O contrato do typedef diz que `contra` é a
    // série que produziu a pior razão — não "null quando a razão é 1".
    const dez = serie('dez', 0, 10);
    const outraDez = serie('outra-dez', 5, 15);
    const v = comparabilidade(dez, [outraDez]);
    expect(v.ratio).toBeCloseTo(1, 9);
    expect(v.contra).not.toBeNull();
    expect(v.contra.id).toBe('outra-dez');
  });

  it('o insumo é a MAGNITUDE, não unit.type (§5)', () => {
    // homicidios (number) × pib (percentage) → 1,068 → convive apesar de tipos diferentes
    const hom = serie('homicidios-anual', 21.22, 31.59);       // 10,37
    const pib = serie('pib-real-anual', -3.55, 7.53);          // 11,08
    expect(comparabilidade(hom, [pib]).veredito).toBe('convive');
  });
});

describe('o caso patológico (§5, decidido por medição em 2026-10-14)', () => {
  it('o limiar é seis ordens de grandeza', () => {
    expect(AMPLITUDE_LIMIT_ILEGIVEL).toBe(1_000_000);
  });

  it('nas FRONTEIRAS vale o `>` estrito: 50 convive, 1.000.000 avisa', () => {
    const um = serie('um', 0, 1);
    expect(comparabilidade(serie('cinquenta', 0, 50), [um]).veredito).toBe('convive');
    expect(comparabilidade(serie('um-milhao', 0, 1_000_000), [um]).veredito).toBe('avisa');
  });

  it('série de amplitude ZERO é ilegível contra uma série real — a razão é indefinida', () => {
    // Uma série constante (ou de um ponto só) tem span 0. Contra uma série real a razão é
    // `Infinity`, e a comparação não significa nada — é o veredito mais forte.
    const plana = serie('plana', 5, 5);
    expect(comparabilidade(plana, [serie('real', 0, 10)]).veredito).toBe('ilegivel');
    // Duas planas convivem: as duas são retas na mesma escala.
    expect(comparabilidade(plana, [serie('plana2', 7, 7)]).veredito).toBe('convive');
  });

  it('populacao-total × populacao-variacao (20.886.801×) é ILEGÍVEL', () => {
    const pop = serie('populacao-total-anual', 154524335, 204861525);      // 50.337.190
    const var_ = serie('populacao-variacao-anual', -0.35, 2.06);           // 2,41
    expect(comparabilidade(pop, [var_]).veredito).toBe('ilegivel');
  });

  it('caged × selic-meta (657.681×) ainda AVISA — não é patológico', () => {
    const caged = serie('caged-total-mensal', 20937049, 48704360);          // 27.767.311
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);                 // 42,22
    expect(comparabilidade(caged, [selic]).veredito).toBe('avisa');
  });
});

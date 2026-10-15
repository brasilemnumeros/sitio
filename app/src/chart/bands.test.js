import { faixasVisiveis, tomDaFaixa } from './bands.js';
import { PALETA_PADRAO } from '../domain/color.js';

const M = [
  { id: 'a', inicio: '1999-01-01', fim: '2002-12-31' },
  { id: 'b', inicio: '2003-01-01', fim: '2006-12-31' },
  { id: 'c', inicio: '2007-01-01', fim: null, emCurso: true },
];

describe('faixasVisiveis', () => {
  it('devolve só as faixas que TOCAM a janela', () => {
    expect(faixasVisiveis(M, { from: '2003-06-01', to: '2007-06-01' }).map((m) => m.id))
      .toEqual(['b', 'c']);
  });

  it('a faixa que começa antes e termina dentro conta como visível', () => {
    expect(faixasVisiveis(M, { from: '2002-06-01', to: '2003-06-01' }).map((m) => m.id))
      .toEqual(['a', 'b']);
  });

  it('janela sem fim (mandato em curso) vai até o infinito', () => {
    expect(faixasVisiveis(M, { from: '2008-01-01', to: null }).map((m) => m.id)).toEqual(['c']);
  });

  it('sem janela, devolve todas — é o estado inicial', () => {
    expect(faixasVisiveis(M, { from: null, to: null })).toHaveLength(3);
  });

  it('janela que não toca ninguém devolve vazio, não tudo', () => {
    expect(faixasVisiveis(M, { from: '1990-01-01', to: '1991-01-01' })).toEqual([]);
  });

  it('o limite é INCLUSIVO nas DUAS pontas — `>=` não pode virar `>`', () => {
    // Sem este caso, trocar `>=` por `>` passa despercebido: os fixtures acima têm folga e nunca
    // tocam o limite exato. Aqui a janela começa EXATAMENTE quando `x` termina.
    const J = [
      { id: 'x', inicio: '2000-01-01', fim: '2004-12-31' },
      { id: 'y', inicio: '2005-01-01', fim: '2009-12-31' },
    ];
    expect(faixasVisiveis(J, { from: '2004-12-31', to: '2005-01-01' }).map((m) => m.id))
      .toEqual(['x', 'y']);
  });
});

describe('tomDaFaixa', () => {
  it('alterna entre vizinhos e usa só DOIS tons (§2)', () => {
    expect(tomDaFaixa(0)).not.toBe(tomDaFaixa(1));
    expect(tomDaFaixa(0)).toBe(tomDaFaixa(2));
  });

  it('os tons são neutros — nenhuma cor de partido (§2, §7.3.4)', () => {
    // A regra é a AUSÊNCIA: o tom não pode coincidir com nenhuma cor da paleta das séries.
    expect(PALETA_PADRAO).not.toContain(tomDaFaixa(0));
    expect(PALETA_PADRAO).not.toContain(tomDaFaixa(1));
  });
});

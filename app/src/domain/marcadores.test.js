import { describe, it, expect } from 'vitest';
import { contarNoIntervalo, deveMostrarMarcadores, ESPACO_MINIMO_PX } from './marcadores.js';

const emSegundos = (ano, mes = 1, dia = 1) => Date.UTC(ano, mes - 1, dia) / 1000;

describe('contarNoIntervalo', () => {
  const tempos = [emSegundos(2010), emSegundos(2011), emSegundos(2012)];

  it('conta as duas pontas (intervalo fechado)', () => {
    expect(contarNoIntervalo(tempos, emSegundos(2010), emSegundos(2012))).toBe(3);
    expect(contarNoIntervalo(tempos, emSegundos(2011), emSegundos(2012))).toBe(2);
  });

  it('janela vazia, invertida ou sem pontos não inventa contagem', () => {
    expect(contarNoIntervalo(tempos, emSegundos(2011), emSegundos(2011))).toBe(1);
    expect(contarNoIntervalo(tempos, emSegundos(2013), emSegundos(2014))).toBe(0);
    expect(contarNoIntervalo(tempos, emSegundos(2012), emSegundos(2010))).toBe(0);
    expect(contarNoIntervalo([], emSegundos(2010), emSegundos(2012))).toBe(0);
    expect(contarNoIntervalo(undefined, emSegundos(2010), emSegundos(2012))).toBe(0);
  });
});

describe('deveMostrarMarcadores', () => {
  /** Série anual de 1995 a 2025 — o caso "Atividade". */
  const anuais = Array.from({ length: 31 }, (_, i) => emSegundos(1995 + i));
  /** Série mensal de 1995 a 2025 — o caso "Selic" no horizonte inteiro. */
  const mensais = [];
  for (let ano = 1995; ano <= 2025; ano++) {
    for (let mes = 1; mes <= 12; mes++) mensais.push(emSegundos(ano, mes));
  }
  const todoHorizonte = { from: emSegundos(1995), to: emSegundos(2025), largura: 1200 };

  it('anual no horizonte inteiro mostra (≈40px entre pontos)', () => {
    expect(deveMostrarMarcadores(anuais, todoHorizonte)).toBe(true);
  });

  it('mensal no horizonte inteiro NÃO mostra (≈3px entre pontos)', () => {
    expect(deveMostrarMarcadores(mensais, todoHorizonte)).toBe(false);
  });

  it('a MESMA série mensal mostra quando o zoom deixa os pontos legíveis', () => {
    // 24 pontos em 1200px = 52px de passo.
    expect(
      deveMostrarMarcadores(mensais, {
        from: emSegundos(2024),
        to: emSegundos(2025),
        largura: 1200,
      }),
    ).toBe(true);
  });

  it('sem ponto na janela não mostra — não há o que marcar', () => {
    expect(
      deveMostrarMarcadores(anuais, {
        from: emSegundos(2026, 2),
        to: emSegundos(2026, 6),
        largura: 1200,
      }),
    ).toBe(false);
  });

  it('ponto único na janela mostra: ele não encosta em ninguém', () => {
    expect(
      deveMostrarMarcadores(anuais, {
        from: emSegundos(2010, 6),
        to: emSegundos(2011, 6),
        largura: 1200,
      }),
    ).toBe(true);
  });

  it('o limiar é inclusivo e largura inválida não mostra', () => {
    const doisPontos = [emSegundos(2000), emSegundos(2001)];
    const janela = { from: emSegundos(2000), to: emSegundos(2001) };
    expect(deveMostrarMarcadores(doisPontos, { ...janela, largura: ESPACO_MINIMO_PX })).toBe(true);
    expect(deveMostrarMarcadores(doisPontos, { ...janela, largura: ESPACO_MINIMO_PX - 1 })).toBe(
      false,
    );
    expect(deveMostrarMarcadores(anuais, { ...todoHorizonte, largura: 0 })).toBe(false);
    expect(deveMostrarMarcadores(anuais, { ...todoHorizonte, largura: NaN })).toBe(false);
  });
});

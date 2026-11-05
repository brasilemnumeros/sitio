import { describe, it, expect } from 'vitest';
import {
  COBERTURA, deltaNoMandato, formatarPeriodo, janelaDoMandato, ordenarMandatos, pontosEsperados,
} from './mandates.js';

const LULA_I = { id: 'federal-2003-lula', rotulo: 'Lula I', inicio: '2003-01-01', fim: '2006-12-31' };
const LULA_III = { id: 'federal-2023-lula', rotulo: 'Lula III', inicio: '2023-01-01', fim: null, emCurso: true };
const FHC_II = { id: 'federal-1999-fhc', rotulo: 'FHC II', inicio: '1999-01-01', fim: '2002-12-31' };

/** Série mensal que começa em 03/2004 (MVG-R, §7.3.5). */
function mensal(de, ate) {
  const dados = [];
  for (let a = +de.slice(0, 4), m = +de.slice(5, 7); a < +ate.slice(0, 4) || (a === +ate.slice(0, 4) && m <= +ate.slice(5, 7)); m === 12 ? (m = 1, a++) : m++) {
    dados.push({ data: `${a}-${String(m).padStart(2, '0')}-28`, valor: 42 + m });
  }
  return { id: 'mvgr-nominal', granularidade: 'mensal', dados };
}

describe('deltaNoMandato (§4, §7.3.5)', () => {
  it('Δ = último − primeiro valor dentro do mandato, cobertura completa', () => {
    const c = deltaNoMandato(mensal('2003-01', '2006-12'), LULA_I);
    expect(c.estado).toBe(COBERTURA.CALCULAVEL);
    expect(c.pontos).toBe(48);
    expect(c.delta).toBeCloseTo(12 - 1, 6);
    expect(c.periodo).toEqual({ inicio: '2003-01-28', fim: '2006-12-28' });
  });

  it('marca PARCIAL quando a série começa depois do início do mandato', () => {
    const c = deltaNoMandato(mensal('2004-03', '2025-07'), LULA_I);
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(c.pontos).toBe(34); // fixture sintética: 03/2004–12/2006, sem meses repetidos
    expect(formatarPeriodo(c.periodo)).toBe('03/2004–12/2006');
    expect(c.motivo).toBeNull();
  });

  it('ponto único é estado distinto, explicitamente sem Δ', () => {
    const serieAnual = { id: 'homicidios-anual', granularidade: 'anual', dados: [{ data: '2023-01-01', valor: 30.5 }] };
    const c = deltaNoMandato(serieAnual, LULA_III);
    expect(c.estado).toBe(COBERTURA.PONTO_UNICO);
    expect(c.delta).toBeNull();
    expect(c.pontos).toBe(1);
  });

  it('sem cobertura diz POR QUÊ — a série começa em 2004-03', () => {
    const c = deltaNoMandato(mensal('2004-03', '2025-07'), FHC_II);
    expect(c.estado).toBe(COBERTURA.SEM);
    expect(c.motivo).toMatch(/começa em 2004-03/);
    expect(c.delta).toBeNull();
  });

  it('o mandato em curso corta no último dado e é parcial (§7.3.5)', () => {
    const c = deltaNoMandato(mensal('2023-01', '2025-08'), LULA_III);
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(formatarPeriodo(c.periodo)).toBe('01/2023–08/2025');
  });

  it('nunca devolve 0 para ausência de dado', () => {
    for (const c of [
      deltaNoMandato(mensal('2004-03', '2025-07'), FHC_II),
      deltaNoMandato({ id: 'x', granularidade: 'anual', dados: [{ data: '2023-01-01', valor: 1 }] }, LULA_III),
    ]) {
      expect(c.delta).not.toBe(0);
    }
  });
});

// Bienal (IDEB, C6 do contrato): um ponto a cada DOIS anos, e a paridade é a do
// PRIMEIRO ponto da série — 2005, 2007, ... 2019, 2021. O mandato não redefine a grade.
const IDEB = {
  id: 'ideb-anos-iniciais',
  granularidade: 'bienal',
  dados: [
    { data: '2005-01-01', valor: 3.8 },
    { data: '2007-01-01', valor: 4.2 },
    { data: '2019-01-01', valor: 5.9 },
    { data: '2021-01-01', valor: 5.8 },
  ],
};
const BOLSONARO = { id: 'federal-2019-bolsonaro', inicio: '2019-01-01', fim: '2022-12-31' };
const TEMER = { id: 'federal-2016-temer', inicio: '2016-05-12', fim: '2018-12-31' };

describe('deltaNoMandato numa série bienal (IDEB)', () => {
  it('bienal espera 2 pontos num mandato de 4 anos e 1 num de 2', () => {
    expect(pontosEsperados('bienal', BOLSONARO, 2005)).toBe(2);
    expect(pontosEsperados('bienal', TEMER, 2005)).toBe(1);
    // Lula I começa ANTES do primeiro ponto: 2003 e 2005 têm a paridade certa, mas a grade
    // da série só existe a partir de 2005 — não há medição a esperar em 2003.
    expect(pontosEsperados('bienal', LULA_I, 2005)).toBe(1);
  });

  it('sem a fase (ano do primeiro ponto) não há régua: devolve null', () => {
    expect(pontosEsperados('bienal', BOLSONARO)).toBeNull();
  });

  it('bienal completo é calculável e o delta é último − primeiro', () => {
    const c = deltaNoMandato(IDEB, BOLSONARO);
    expect(c.estado).toBe(COBERTURA.CALCULAVEL);
    expect(c.delta).toBeCloseTo(5.8 - 5.9, 6);
  });

  it('janela entre duas medições diz que não há medição no período', () => {
    const c = deltaNoMandato(IDEB, TEMER);
    expect(c.estado).toBe(COBERTURA.SEM);
    expect(c.motivo).toMatch(/sem medição no período/);
  });
});

describe('formatarPeriodo', () => {
  it('usa MM/AAAA encurtado', () => {
    expect(formatarPeriodo({ inicio: '2004-03-31', fim: '2006-12-31' })).toBe('03/2004–12/2006');
  });
});

describe('pontosEsperados — a régua da cobertura (§7.3.5)', () => {
  it('mensal conta meses inclusive nas duas pontas', () => {
    expect(pontosEsperados('mensal', LULA_I)).toBe(48);
    expect(pontosEsperados('mensal', { inicio: '2016-05-12', fim: '2018-12-31' })).toBe(32);
  });

  it('anual conta anos inclusive', () => {
    expect(pontosEsperados('anual', { inicio: '2019-01-01', fim: '2022-12-31' })).toBe(4);
    expect(pontosEsperados('anual', { inicio: '2016-05-12', fim: '2018-12-31' })).toBe(3);
  });

  it('mandato em curso não tem régua', () => {
    expect(pontosEsperados('mensal', LULA_III)).toBeNull();
  });
});

describe('janelaDoMandato — clicar no mandato FILTRA o período (§3)', () => {
  it('o mandato fechado devolve as DUAS pontas do mandato', () => {
    expect(janelaDoMandato(LULA_I, '2025-06-01')).toEqual({ from: '2003-01-01', to: '2006-12-31' });
  });

  it('o mandato EM CURSO termina na última data disponível — a janela precisa de ponta direita', () => {
    expect(janelaDoMandato(LULA_III, '2025-06-01')).toEqual({ from: '2023-01-01', to: '2025-06-01' });
  });

  it('em curso e SEM dado não inventa data: `to` fica nulo (sem janela, o fit decide)', () => {
    // `null` não é "até o fim": o adapter o lê como "mantenha a borda direita atual".
    expect(janelaDoMandato(LULA_III, null)).toEqual({ from: '2023-01-01', to: null });
  });

  it('corta a hora, como o resto da camada de mandatos (`ymd`)', () => {
    const comHora = { ...LULA_I, inicio: '2003-01-01T00:00:00Z', fim: '2006-12-31T00:00:00Z' };
    expect(janelaDoMandato(comHora, '2025-06-01')).toEqual({ from: '2003-01-01', to: '2006-12-31' });
  });
});

describe('ordenarMandatos (§7.3.6)', () => {
  it('ordena por início e joga o mandato em curso para a ponta direita', () => {
    const ordem = ordenarMandatos([LULA_III, FHC_II, LULA_I]).map((m) => m.rotulo);
    expect(ordem).toEqual(['FHC II', 'Lula I', 'Lula III']);
  });
});

import { describe, it, expect } from 'vitest';
import { PRESETS, dataEmSaoPaulo, presetDoDia, presetDosIds } from './presets.js';

describe('dataEmSaoPaulo', () => {
  it('usa o dia LOCAL de São Paulo, não o dia UTC', () => {
    expect(dataEmSaoPaulo(new Date('2026-10-27T02:00:00Z'))).toBe('2026-10-26');
    expect(dataEmSaoPaulo(new Date('2026-10-27T03:00:00Z'))).toBe('2026-10-27');
  });
});

describe('presetDoDia', () => {
  it('é determinístico: a mesma data devolve o mesmo preset', () => {
    expect(presetDoDia('2026-10-27')).toBe(presetDoDia('2026-10-27'));
  });

  it('rotaciona: seis dias consecutivos cobrem os seis presets, e o sétimo repete o primeiro', () => {
    const dias = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    const vistos = dias.map((d) => presetDoDia(d).id);
    expect(new Set(vistos).size).toBe(PRESETS.length);
    expect(presetDoDia('2026-11-01').id).toBe(presetDoDia('2026-10-26').id);
  });

  it('lista vazia ou data inválida → null', () => {
    expect(presetDoDia('2026-10-27', [])).toBeNull();
    expect(presetDoDia('ontem')).toBeNull();
  });
});

describe('presetDosIds', () => {
  it('compara por CONJUNTO, sem depender da ordem', () => {
    const [{ indicadores }] = PRESETS;
    expect(presetDosIds([...indicadores].reverse())).toBe(PRESETS[0]);
  });

  it('conjunto diferente, vazio ou com id a mais → null', () => {
    expect(presetDosIds([])).toBeNull();
    expect(presetDosIds(['selic-meta-acum-12m'])).toBeNull();
    expect(presetDosIds([...PRESETS[0].indicadores, 'ipca-acum-12m'])).toBeNull();
  });
});

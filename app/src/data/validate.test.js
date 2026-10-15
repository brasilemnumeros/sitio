import { describe, it, expect } from 'vitest';
import { SchemaError, validateSeries, validateUnit } from './validate.js';

// Pontos reais medidos (dados/selic/selic-meta-acum-12m.json, 2026-10-14) — não inventados.
const serieValida = {
  schema: 1,
  id: 'selic-meta-acum-12m',
  unit: { type: 'percentage', symbol: '%', decimals: 2 },
  granularity: 'monthly',
  source: 'Banco Central do Brasil',
  data: [
    { date: '1999-03-31', value: 44.22222222222222 },
    { date: '1999-04-30', value: 36.85 },
  ],
};

describe('validateSeries', () => {
  it('aceita uma série canônica e normaliza os pontos', () => {
    const s = validateSeries(serieValida, { expectedId: 'selic-meta-acum-12m' });
    expect(s.id).toBe('selic-meta-acum-12m');
    expect(s.data).toEqual([
      { date: '1999-03-31', value: 44.22222222222222 },
      { date: '1999-04-30', value: 36.85 },
    ]);
    expect(s.schema).toBe(1);
  });

  it('descarta a chave de convivência "rate" (§6)', () => {
    const comRate = {
      ...serieValida,
      data: [{ date: '1999-03-31', rate: 44.22, value: 44.22 }],
    };
    expect(validateSeries(comRate).data[0]).toEqual({ date: '1999-03-31', value: 44.22 });
  });

  it('recusa em voz alta um schema desconhecido (§6, §9.3)', () => {
    expect(() => validateSeries({ ...serieValida, schema: 2 })).toThrow(SchemaError);
    expect(() => validateSeries({ ...serieValida, schema: 2 })).toThrow(/schema 2/);
  });

  it('recusa quando o id não é o pedido (§6)', () => {
    expect(() => validateSeries(serieValida, { expectedId: 'ipca-acum-12m' })).toThrow(
      /o app pediu "ipca-acum-12m"/,
    );
  });

  it('recusa ponto sem "value" numérico', () => {
    const quebrada = { ...serieValida, data: [{ date: '1999-03-31', rate: 44.22 }] };
    expect(() => validateSeries(quebrada)).toThrow(/value/);
  });

  it('recusa data fora do formato ISO', () => {
    const quebrada = { ...serieValida, data: [{ date: '31/03/1999', value: 1 }] };
    expect(() => validateSeries(quebrada)).toThrow(/YYYY-MM-DD/);
  });

  it('recusa granularidade desconhecida', () => {
    expect(() => validateSeries({ ...serieValida, granularity: 'semanal' })).toThrow(
      /granularity/,
    );
  });

  it('recusa resposta que não é objeto', () => {
    expect(() => validateSeries(null)).toThrow(SchemaError);
    expect(() => validateSeries([])).toThrow(SchemaError);
  });
});

describe('validateUnit', () => {
  it('aceita as três unidades do contrato', () => {
    for (const type of ['percentage', 'number', 'currency']) {
      expect(validateUnit({ type, symbol: '%', decimals: 2 })).toEqual({
        type,
        symbol: '%',
        decimals: 2,
      });
    }
  });

  it('recusa tipo desconhecido', () => {
    expect(() => validateUnit({ type: 'peso', symbol: 'kg', decimals: 1 })).toThrow(
      /desconhecido/,
    );
  });
});

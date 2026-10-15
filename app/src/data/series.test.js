import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSeries, clearSeriesCache } from './series.js';

const JSON_VALIDO = {
  schema: 1,
  id: 'ipca-acum-12m',
  unit: { type: 'percentage', symbol: '%', decimals: 2 },
  granularity: 'monthly',
  source: 'Banco Central do Brasil',
  data: [{ date: '1995-12-31', value: 1.64 }],
};

function respostaOk(body) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => clearSeriesCache());

describe('loadSeries', () => {
  it('busca, valida e devolve a série', async () => {
    const fetchImpl = vi.fn(async () => respostaOk(JSON_VALIDO));
    const s = await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    expect(s.id).toBe('ipca-acum-12m');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('memoriza por URL: segunda chamada não refaz a rede', async () => {
    const fetchImpl = vi.fn(async () => respostaOk(JSON_VALIDO));
    await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('não envenena o cache: falha e depois sucesso volta a buscar (§9.3 "tentar de novo")', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce(respostaOk(JSON_VALIDO));
    await expect(loadSeries('https://exemplo/ipca.json', { fetchImpl })).rejects.toThrow(/HTTP 500/);
    const s = await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    expect(s.id).toBe('ipca-acum-12m');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propaga erro de rede com a URL no texto', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(loadSeries('https://exemplo/x.json', { fetchImpl })).rejects.toThrow(
      /falha de rede ao buscar https:\/\/exemplo\/x.json/,
    );
  });

  it('propaga o SchemaError de um schema desconhecido', async () => {
    const fetchImpl = vi.fn(async () => respostaOk({ ...JSON_VALIDO, schema: 99 }));
    await expect(loadSeries('https://exemplo/x.json', { fetchImpl })).rejects.toThrow(/schema 99/);
  });
});

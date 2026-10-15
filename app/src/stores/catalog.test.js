import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { catalogStore, carregarCatalogo, buscarIndicadores } from './catalog.js';

const CATALOGO = {
  groups: { monetary: { name: '🏦 Política Monetária' }, inflation: { name: '📈 Inflação' } },
  indicators: [
    { id: 'selic-meta-acum-12m', name: 'Taxa Selic Meta (%)', group: 'monetary', datafile: 'x', chartType: 'line', unit: { type: 'percentage', symbol: '%', decimals: 2 } },
    { id: 'ipca-acum-12m', name: 'IPCA (%)', group: 'inflation', datafile: 'y', chartType: 'line', unit: { type: 'percentage', symbol: '%', decimals: 2 } },
  ],
};

const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => catalogStore.set({ status: 'idle', groups: {}, indicators: [], error: null }));

describe('catalogStore', () => {
  it('começa em idle', () => {
    expect(get(catalogStore).status).toBe('idle');
  });

  it('carrega uma vez e vira ready', async () => {
    await carregarCatalogo({ fetchImpl: ok(CATALOGO) });
    expect(get(catalogStore).status).toBe('ready');
    expect(get(catalogStore).indicators).toHaveLength(2);
  });

  it('falha em voz alta — status error com a mensagem (§9.3)', async () => {
    await carregarCatalogo({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(catalogStore).status).toBe('error');
    expect(get(catalogStore).error).toMatch(/HTTP 500/);
  });

  it('busca por digitação ignora caixa e acento', async () => {
    await carregarCatalogo({ fetchImpl: ok(CATALOGO) });
    expect(buscarIndicadores('taxa selic').map((i) => i.id)).toEqual(['selic-meta-acum-12m']);
    expect(buscarIndicadores('ÍPCA').map((i) => i.id)).toEqual(['ipca-acum-12m']);
    expect(buscarIndicadores('')).toHaveLength(2);
  });
});

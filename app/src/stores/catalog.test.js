import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { catalogStore, carregarCatalogo, buscarIndicadores } from './catalog.js';

const CATALOGO = {
  schema: 1,
  groups: { monetary: { name: '🏦 Política Monetária' }, inflation: { name: '📈 Inflação' } },
  indicators: [
    { id: 'selic-meta-acum-12m', name: 'Taxa Selic Meta (%)', group: 'monetary', arquivo: 'selic/selic-meta-acum-12m.json', escala: 'percentual', chartType: 'line' },
    { id: 'ipca-acum-12m', name: 'IPCA (%)', group: 'inflation', arquivo: 'ipca/ipca-acum-12m.json', escala: 'percentual', chartType: 'line' },
  ],
};

beforeEach(() => catalogStore.set({ status: 'idle', groups: {}, indicators: [], error: null }));

describe('catalogStore', () => {
  it('começa em idle', () => {
    expect(get(catalogStore).status).toBe('idle');
  });

  it('carrega o catálogo embutido e vira ready', () => {
    carregarCatalogo({ dados: CATALOGO });
    expect(get(catalogStore).status).toBe('ready');
    expect(get(catalogStore).indicators).toHaveLength(2);
  });

  it('não recarrega o que já está pronto (idempotente)', () => {
    carregarCatalogo({ dados: CATALOGO });
    const antes = get(catalogStore);
    carregarCatalogo();
    expect(get(catalogStore)).toBe(antes);
  });

  it('busca por digitação ignora caixa e acento', () => {
    carregarCatalogo({ dados: CATALOGO });
    expect(buscarIndicadores('taxa selic').map((i) => i.id)).toEqual(['selic-meta-acum-12m']);
    expect(buscarIndicadores('ÍPCA').map((i) => i.id)).toEqual(['ipca-acum-12m']);
    expect(buscarIndicadores('')).toHaveLength(2);
  });
});

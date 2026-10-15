import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateCatalog, loadCatalog } from './catalog.js';

const catalogoMinimo = {
  groups: { monetary: { name: '🏦 Política Monetária', description: '...' } },
  indicators: [
    {
      id: 'selic-meta-acum-12m',
      name: 'Taxa Selic Meta (%)',
      group: 'monetary',
      datafile: 'https://brasilemnumeros.github.io/dados/selic/selic-meta-acum-12m.json',
      chartType: 'line',
      unit: { type: 'percentage', symbol: '%', decimals: 2 },
      yAxisTitle: 'Taxa (%)',
    },
  ],
};

describe('validateCatalog', () => {
  it('aceita um catálogo bem-formado e normaliza o indicador', () => {
    const c = validateCatalog(catalogoMinimo);
    expect(c.indicators[0]).toEqual({
      id: 'selic-meta-acum-12m',
      name: 'Taxa Selic Meta (%)',
      group: 'monetary',
      datafile: 'https://brasilemnumeros.github.io/dados/selic/selic-meta-acum-12m.json',
      chartType: 'line',
      unit: { type: 'percentage', symbol: '%', decimals: 2 },
      yAxisTitle: 'Taxa (%)',
    });
  });

  it('recusa um indicador cujo grupo não existe em "groups"', () => {
    const ruim = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], group: 'inexistente' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/grupo "inexistente" não existe/);
  });

  it('recusa chartType fora de line|bar', () => {
    const ruim = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], chartType: 'pie' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/chartType/);
  });

  it('exige datafile e id', () => {
    expect(() => validateCatalog({ ...catalogoMinimo, indicators: [{ name: 'x', group: 'monetary' }] })).toThrow(
      /\.id ausente/,
    );
  });

  it('aceita indicador SEM unit — o metadado vive no arquivo de série (§6)', () => {
    const semUnit = { ...catalogoMinimo, indicators: [{ ...catalogoMinimo.indicators[0] }] };
    delete semUnit.indicators[0].unit;
    expect(validateCatalog(semUnit).indicators[0].unit).toBeNull();
  });
});

describe('loadCatalog', () => {
  it('busca e valida', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => catalogoMinimo }));
    const c = await loadCatalog({ fetchImpl, url: '/x.json' });
    expect(c.indicators).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith('/x.json');
  });

  it('o catálogo REAL do site valida (sitio/indicators.json)', () => {
    const caminho = fileURLToPath(new URL('../../../indicators.json', import.meta.url));
    const real = JSON.parse(readFileSync(caminho, 'utf8'));
    const c = validateCatalog(real);
    expect(c.indicators).toHaveLength(13);
    expect(Object.keys(c.groups)).toHaveLength(7);
  });
});

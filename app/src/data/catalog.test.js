import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateCatalog, catalogoEmbutido } from './catalog.js';

const catalogoMinimo = {
  schema: 1,
  groups: { monetary: { name: '🏦 Política Monetária', description: '...' } },
  indicators: [
    {
      id: 'selic-meta-acum-12m',
      name: 'Taxa Selic Meta (%)',
      group: 'monetary',
      arquivo: 'selic/selic-meta-acum-12m.json',
      escala: 'percentage',
      chartType: 'line',
      description: 'Taxa básica de juros',
    },
  ],
};

describe('validateCatalog', () => {
  it('aceita um catálogo bem-formado e resolve o arquivo contra a base de dados', () => {
    const c = validateCatalog(catalogoMinimo, { base: 'https://exemplo/dados' });
    expect(c.indicators[0]).toEqual({
      id: 'selic-meta-acum-12m',
      name: 'Taxa Selic Meta (%)',
      group: 'monetary',
      arquivo: 'selic/selic-meta-acum-12m.json',
      escala: 'percentage',
      chartType: 'line',
      description: 'Taxa básica de juros',
      datafile: 'https://exemplo/dados/selic/selic-meta-acum-12m.json',
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

  it('recusa escala desconhecida', () => {
    const ruim = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], escala: 'banana' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/escala/);
  });

  it('exige arquivo RELATIVO no padrão familia/arquivo.json', () => {
    const absoluto = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], arquivo: 'https://x/selic/a.json' }],
    };
    expect(() => validateCatalog(absoluto)).toThrow(/arquivo/);
    const semPasta = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], arquivo: 'a.json' }],
    };
    expect(() => validateCatalog(semPasta)).toThrow(/arquivo/);
  });

  it('exige id', () => {
    expect(() =>
      validateCatalog({ ...catalogoMinimo, indicators: [{ name: 'x', group: 'monetary' }] }),
    ).toThrow(/\.id ausente/);
  });

  it('exige schema 1', () => {
    expect(() => validateCatalog({ ...catalogoMinimo, schema: 2 })).toThrow(/schema/);
  });

  it('PRESERVA os campos de apresentação — nada é descartado em silêncio (§6)', () => {
    const comApresentacao = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], description: 'texto editorial' }],
    };
    const [ind] = validateCatalog(comApresentacao).indicators;
    expect(ind.description).toBe('texto editorial');
  });
});

describe('catalogoEmbutido', () => {
  it('o catálogo REAL do app valida (13 indicadores, 7 grupos)', () => {
    const c = catalogoEmbutido();
    expect(c.indicators).toHaveLength(13);
    expect(Object.keys(c.groups)).toHaveLength(7);
    for (const ind of c.indicators) expect(ind.datafile).toMatch(/\/dados\/[^/]+\/[^/]+\.json$/);
  });

  it('o arquivo versionado não repete o que é dono da série (unit/granularity)', () => {
    const bruto = JSON.parse(
      readFileSync(fileURLToPath(new URL('./indicadores.json', import.meta.url)), 'utf8'),
    );
    for (const ind of bruto.indicators) {
      expect(ind, ind.id).not.toHaveProperty('unit');
      expect(ind, ind.id).not.toHaveProperty('granularity');
      expect(ind, ind.id).not.toHaveProperty('yAxisTitle');
      expect(ind, ind.id).not.toHaveProperty('yAxisMax');
      expect(ind, ind.id).not.toHaveProperty('datafile');
    }
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateCatalog, catalogoEmbutido } from './catalog.js';

const catalogoMinimo = {
  versao: 1,
  grupos: { monetario: { nome: '🏦 Política Monetária' } },
  indicadores: [
    {
      id: 'selic-meta',
      nome: 'Taxa Selic Meta (%)',
      grupo: 'monetario',
      arquivo: 'selic/selic-meta.json',
      escala: 'percentual',
      descricao: 'Taxa básica de juros',
    },
  ],
};

describe('validateCatalog', () => {
  it('aceita um catálogo bem-formado e resolve o arquivo contra a base de dados', () => {
    const c = validateCatalog(catalogoMinimo, { base: 'https://exemplo/dados' });
    expect(c.indicadores[0]).toEqual({
      id: 'selic-meta',
      nome: 'Taxa Selic Meta (%)',
      grupo: 'monetario',
      arquivo: 'selic/selic-meta.json',
      escala: 'percentual',
      descricao: 'Taxa básica de juros',
      datafile: 'https://exemplo/dados/selic/selic-meta.json',
    });
  });

  it('recusa um indicador cujo grupo não existe em "grupos"', () => {
    const ruim = {
      ...catalogoMinimo,
      indicadores: [{ ...catalogoMinimo.indicadores[0], grupo: 'inexistente' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/grupo "inexistente" não existe/);
  });

  it('recusa escala desconhecida', () => {
    const ruim = {
      ...catalogoMinimo,
      indicadores: [{ ...catalogoMinimo.indicadores[0], escala: 'banana' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/escala/);
  });

  it('exige arquivo RELATIVO no padrão familia/arquivo.json', () => {
    const absoluto = {
      ...catalogoMinimo,
      indicadores: [{ ...catalogoMinimo.indicadores[0], arquivo: 'https://x/selic/a.json' }],
    };
    expect(() => validateCatalog(absoluto)).toThrow(/arquivo/);
    const semPasta = {
      ...catalogoMinimo,
      indicadores: [{ ...catalogoMinimo.indicadores[0], arquivo: 'a.json' }],
    };
    expect(() => validateCatalog(semPasta)).toThrow(/arquivo/);
  });

  it('exige id', () => {
    expect(() =>
      validateCatalog({ ...catalogoMinimo, indicadores: [{ nome: 'x', grupo: 'monetario' }] }),
    ).toThrow(/\.id ausente/);
  });

  it('exige versao 1', () => {
    expect(() => validateCatalog({ ...catalogoMinimo, versao: 2 })).toThrow(/versao/);
  });

  it('PROÍBE o que é dono da série: unidade, granularidade e tipo de gráfico não entram', () => {
    // O contrato da série é quem manda nesses campos; repetir aqui foi o que fez a unidade
    // divergir em 8 de 13 registros antes de 2026-11-01. `chartType` não é lido por ninguém.
    const bruto = JSON.parse(
      readFileSync(fileURLToPath(new URL('./indicadores.json', import.meta.url)), 'utf8'),
    );
    for (const ind of bruto.indicadores) {
      expect(ind, ind.id).not.toHaveProperty('chartType');
      expect(ind, ind.id).not.toHaveProperty('unidade');
      expect(ind, ind.id).not.toHaveProperty('granularidade');
    }
  });
});

describe('catalogoEmbutido', () => {
  it('o catálogo REAL do app valida (13 indicadores, 7 grupos)', () => {
    const c = catalogoEmbutido();
    expect(c.indicadores).toHaveLength(13);
    expect(Object.keys(c.grupos)).toHaveLength(7);
    for (const ind of c.indicadores) expect(ind.datafile).toMatch(/\/indicadores\/[^/]+\/[^/]+\.json$/);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCatalog, urlDoCatalogo, buscarCatalogo } from './catalog.js';
import { raizDados } from './raiz-dados.js';

const catalogoMinimo = {
  versao: 1,
  grupos: { monetario: { nome: '🏦 Política Monetária' } },
  indicadores: [
    {
      id: 'selic-meta-acum-12m',
      nome: 'Taxa Selic Meta (%)',
      grupo: 'monetario',
      arquivo: 'selic/selic-meta-acum-12m.json',
      escala: 'percentual',
      descricao: 'Taxa básica de juros',
    },
  ],
};

const resposta = (body) => ({ ok: true, status: 200, json: async () => body });

describe('validateCatalog', () => {
  it('aceita um catálogo bem-formado e resolve o arquivo contra a base de dados', () => {
    const c = validateCatalog(catalogoMinimo, { base: 'https://exemplo/dados' });
    expect(c.indicadores[0]).toEqual({
      id: 'selic-meta-acum-12m',
      nome: 'Taxa Selic Meta (%)',
      grupo: 'monetario',
      arquivo: 'selic/selic-meta-acum-12m.json',
      escala: 'percentual',
      descricao: 'Taxa básica de juros',
      datafile: 'https://exemplo/dados/selic/selic-meta-acum-12m.json',
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
    // Lê o catálogo PUBLICADO (repo `dados/`) desde 2026-11-01 — é ele que o app consome.
    const bruto = JSON.parse(
      readFileSync(join(raizDados(), 'indicadores', 'catalogo.json'), 'utf8'),
    );
    for (const ind of bruto.indicadores) {
      expect(ind, ind.id).not.toHaveProperty('chartType');
      expect(ind, ind.id).not.toHaveProperty('unidade');
      expect(ind, ind.id).not.toHaveProperty('granularidade');
    }
  });
});

describe('urlDoCatalogo', () => {
  it('monta a URL a partir da base, sem barra dupla', () => {
    expect(urlDoCatalogo('https://x/dados/indicadores/')).toBe('https://x/dados/indicadores/catalogo.json');
  });

  it('base sem barra no fim não perde o separador', () => {
    expect(urlDoCatalogo('/dados/indicadores')).toBe('/dados/indicadores/catalogo.json');
  });
});

describe('buscarCatalogo', () => {
  it('busca, valida e resolve o datafile contra a base', async () => {
    const fetchImpl = vi.fn(async () => resposta(catalogoMinimo));
    const c = await buscarCatalogo({
      url: 'https://x/dados/indicadores/catalogo.json',
      fetchImpl,
    });
    expect(c.indicadores[0].datafile).toBe(
      'https://x/dados/indicadores/selic/selic-meta-acum-12m.json',
    );
    // A URL pedida é exatamente a que veio por parâmetro (o default sai de `urlDoCatalogo`).
    expect(fetchImpl).toHaveBeenCalledWith('https://x/dados/indicadores/catalogo.json');
  });

  it('HTTP de erro vira mensagem com o status', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 404 }));
    await expect(buscarCatalogo({ url: 'u', fetchImpl })).rejects.toThrow(/HTTP 404/);
  });

  it('falha de rede vira mensagem própria e preserva a causa', async () => {
    const causa = new TypeError('fetch failed');
    const fetchImpl = vi.fn(async () => {
      throw causa;
    });
    const erro = await buscarCatalogo({ url: 'u', fetchImpl }).catch((e) => e);
    expect(erro.message).toBe('falha de rede ao buscar o catálogo');
    expect(erro.cause).toBe(causa);
  });

  it('corpo que não é JSON não vira lista vazia', async () => {
    // O middleware/dev server pode responder HTML com status 200; engolir isso como "catálogo
    // vazio" deixaria a home sem indicadores e sem dizer por quê (§9).
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    }));
    await expect(buscarCatalogo({ url: 'u', fetchImpl })).rejects.toThrow(/Unexpected token/);
  });

  it('catálogo inválido vindo da rede reprova com a mensagem do validador', async () => {
    const fetchImpl = vi.fn(async () => resposta({ ...catalogoMinimo, versao: 2 }));
    await expect(
      buscarCatalogo({ url: 'https://x/dados/indicadores/catalogo.json', fetchImpl }),
    ).rejects.toThrow(/versao/);
  });
});

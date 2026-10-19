import { describe, it, expect } from 'vitest';
import { lerIds, escreverSearch } from './permalink.js';

describe('lerIds', () => {
  it('lê a lista separada por vírgula', () => {
    expect(lerIds('indicators=selic,ipca')).toEqual(['selic', 'ipca']);
  });
  // Review Focus 1 — id repetido
  it('deduplica mantendo a primeira ocorrência', () => {
    expect(lerIds('indicators=selic,ipca,selic')).toEqual(['selic', 'ipca']);
  });
  it('ignora espaços e entradas vazias', () => {
    expect(lerIds('indicators= selic , ,ipca ')).toEqual(['selic', 'ipca']);
  });
  it('query ausente devolve lista vazia', () => {
    expect(lerIds('')).toEqual([]);
    expect(lerIds('outra=coisa')).toEqual([]);
  });
  // Review Focus 2 — mais de 10 ids
  it('corta em 10 ids (LIMITE_SERIES)', () => {
    const muitos = Array.from({ length: 15 }, (_, i) => `s${i}`).join(',');
    expect(lerIds(`indicators=${muitos}`)).toHaveLength(10);
  });
});

describe('escreverSearch', () => {
  it('escreve a lista e preserva outras chaves', () => {
    expect(escreverSearch(['selic'], 'utm=x')).toBe('utm=x&indicators=selic');
  });
  it('sem séries, remove a chave', () => {
    expect(escreverSearch([], 'indicators=selic&utm=x')).toBe('utm=x');
  });
});

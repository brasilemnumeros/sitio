import { describe, it, expect } from 'vitest';
import { lerIds, escreverSearch } from './permalink.js';

describe('lerIds', () => {
  it('lê a lista separada por vírgula', () => {
    expect(lerIds('series=selic,ipca')).toEqual(['selic', 'ipca']);
  });
  // Review Focus 1 — id repetido
  it('deduplica mantendo a primeira ocorrência', () => {
    expect(lerIds('series=selic,ipca,selic')).toEqual(['selic', 'ipca']);
  });
  it('ignora espaços e entradas vazias', () => {
    expect(lerIds('series= selic , ,ipca ')).toEqual(['selic', 'ipca']);
  });
  it('query ausente devolve lista vazia', () => {
    expect(lerIds('')).toEqual([]);
    expect(lerIds('outra=coisa')).toEqual([]);
  });
  // Review Focus 2 — mais de 10 ids
  it('corta em 10 ids (LIMITE_SERIES)', () => {
    const muitos = Array.from({ length: 15 }, (_, i) => `s${i}`).join(',');
    expect(lerIds(`series=${muitos}`)).toHaveLength(10);
  });
  // Task 3 — a chave mudou de nome, sem alias: o contrato antigo deixa de ser lido.
  it('ignora a chave antiga `indicators` (renomeação sem alias)', () => {
    expect(lerIds('indicators=selic,ipca')).toEqual([]);
  });
});

describe('escreverSearch', () => {
  it('escreve a lista e preserva outras chaves', () => {
    expect(escreverSearch(['selic'], 'utm=x')).toBe('utm=x&series=selic');
  });
  it('sem séries, remove a chave', () => {
    expect(escreverSearch([], 'series=selic&utm=x')).toBe('utm=x');
  });
  it('escreverSearch remove a chave antiga e usa `series`', () => {
    expect(escreverSearch(['selic'], 'indicators=ipca&utm=x')).toBe('utm=x&series=selic');
  });
});

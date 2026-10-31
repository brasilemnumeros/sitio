import { ancorasDoHorizonte, HORIZONTE_INICIO } from './horizonte.js';

describe('ancorasDoHorizonte', () => {
  it('começa no início do FHC I', () => {
    expect(ancorasDoHorizonte('2026-10-29')[0]).toBe(HORIZONTE_INICIO);
  });

  it('termina no dia de hoje, não no 1º do mês', () => {
    const datas = ancorasDoHorizonte('2026-10-29');
    expect(datas[datas.length - 1]).toBe('2026-10-29');
    expect(datas[datas.length - 2]).toBe('2026-10-01');
  });

  it('tem uma âncora por mês no meio do caminho', () => {
    const datas = ancorasDoHorizonte('2026-10-29');
    expect(datas).toContain('1995-01-01');
    expect(datas).toContain('1995-02-01');
    expect(datas).toContain('2000-02-01'); // bissexto não desloca o dia 1º
    expect(datas).toContain('2016-05-01');
  });

  it('não repete quando hoje é dia 1º', () => {
    const datas = ancorasDoHorizonte('2026-10-01');
    expect(datas[datas.length - 1]).toBe('2026-10-01');
    expect(datas.filter((d) => d === '2026-10-01')).toHaveLength(1);
    expect(datas.filter((d) => d === HORIZONTE_INICIO)).toHaveLength(1);
  });

  it('devolve datas em ordem crescente e sem repetição', () => {
    const datas = ancorasDoHorizonte('2026-10-29');
    const ordenadas = [...datas].sort();
    expect(datas).toEqual(ordenadas);
    expect(new Set(datas).size).toBe(datas.length);
  });

  it('entrada inválida ou hoje antes do início devolve lista vazia', () => {
    expect(ancorasDoHorizonte('29/10/2026')).toEqual([]);
    expect(ancorasDoHorizonte(null)).toEqual([]);
    expect(ancorasDoHorizonte('1994-12-31')).toEqual([]);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  LIMITE_SERIES, seriesStore, dataMaximaStore, adicionarSerie, removerSerie, tentarNovamente,
  atingiuLimite, motivoDoLimite, corDe, definirCor, restaurarCor, limparSeries, substituirSeries,
} from './series.js';
import { clearSeriesCache } from '../data/series.js';
import { PALETA_PADRAO } from '../domain/color.js';

const entrada = (id) => ({ id, name: `Indicador ${id}`, datafile: `https://x/${id}.json`, unit: { type: 'percentage', symbol: '%', decimals: 2 } });
const okSerie = (id) => async () => ({
  ok: true, status: 200,
  json: async () => ({ schema: 1, id, unit: { type: 'percentage', symbol: '%', decimals: 2 }, granularity: 'monthly', source: 'fonte', data: [{ date: '2020-01-01', value: 1 }] }),
});

// O cache de `loadSeries` é por URL e vive no módulo — sem zerá-lo, um sucesso de um teste
// vaza para o próximo (o R28 usa a MESMA url do R26) e o teste deixa de provar o que diz.
beforeEach(() => { limparSeries(); clearSeriesCache(); });

describe('dataMaximaStore (§8 — a data de referência vem do estado)', () => {
  it('é a MAIOR data entre as séries `ok`; nulo sem série', async () => {
    expect(get(dataMaximaStore)).toBeNull();

    const duasDatas = async () => ({
      ok: true, status: 200,
      json: async () => ({
        schema: 1, id: 'a', unit: { type: 'percentage', symbol: '%', decimals: 2 },
        granularity: 'monthly', source: 'fonte',
        data: [{ date: '2020-01-01', value: 1 }, { date: '2021-05-01', value: 2 }],
      }),
    });
    await adicionarSerie(entrada('a'), { fetchImpl: duasDatas });
    expect(get(dataMaximaStore)).toBe('2021-05-01');
  });

  it('ignora série com ERRO — a data de referência não vem de dado que não chegou (§9.3)', async () => {
    await adicionarSerie(entrada('b'), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(dataMaximaStore)).toBeNull();
  });
});

describe('seriesStore', () => {
  it('adiciona e carrega, com status por série (§9.2)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    const [item] = get(seriesStore).itens;
    expect(item.status).toBe('ok');
    expect(item.series.id).toBe('a');
  });

  it('erro em uma série é degradação parcial — as outras seguem (§9.3)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    const itens = get(seriesStore).itens;
    expect(itens.map((i) => i.status)).toEqual(['ok', 'erro']);
    expect(itens[1].error).toMatch(/HTTP 500/);
  });

  it('tentar de novo recupera a série que falhou — NA URL ORIGINAL (R26)', async () => {
    await adicionarSerie(entrada('b'), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(seriesStore).itens[0].url).toBe('https://x/b.json'); // a url fica guardada

    // O fetch espia o argumento: a retentativa NÃO pode adivinhar o caminho a partir do id.
    const espiao = vi.fn(okSerie('b'));
    await tentarNovamente('b', { fetchImpl: espiao });
    expect(espiao).toHaveBeenCalledWith('https://x/b.json');
    expect(get(seriesStore).itens[0].status).toBe('ok');
  });

  it('a retentativa também pega a unidade da SÉRIE, não a do catálogo (§6, R28)', async () => {
    // O catálogo carrega uma unidade TRANSITÓRIA; quem manda é a série (§6).
    // As duas unidades são de propósito DIFERENTES — com `entrada()`/`okSerie()` iguais o
    // teste passaria sem provar nada.
    const doCatalogo = { type: 'number', symbol: '', decimals: 0 };
    const daSerie = { type: 'percentage', symbol: '%', decimals: 2 };
    await adicionarSerie({ ...entrada('b'), unit: doCatalogo }, { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(seriesStore).itens[0].unit).toEqual(doCatalogo);   // ainda a do catálogo

    await tentarNovamente('b', { fetchImpl: okSerie('b') });
    expect(get(seriesStore).itens[0].unit).toEqual(daSerie);      // agora a da SÉRIE
  });

  it('o override de cor sobrevive à remoção de outra série — a chave é o id (§1)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: okSerie('b') });
    definirCor('b', '#123456');
    removerSerie('a');                       // 'b' muda de posição (1 → 0)
    expect(corDe('b')).toBe('#123456');      // sobreviveu: a cor NÃO é por posição
  });

  it('o limite é 10 e o motivo é a PALETA, não o layout (§1, §9.5)', async () => {
    expect(LIMITE_SERIES).toBe(10);
    for (let i = 0; i < 10; i++) await adicionarSerie(entrada(`s${i}`), { fetchImpl: okSerie(`s${i}`) });
    expect(atingiuLimite()).toBe(true);
    expect(motivoDoLimite()).toMatch(/paleta/i);
  });

  it('no limite, adicionar NÃO remove nada automaticamente (§9.5)', async () => {
    for (let i = 0; i < 10; i++) await adicionarSerie(entrada(`s${i}`), { fetchImpl: okSerie(`s${i}`) });
    await adicionarSerie(entrada('s10'), { fetchImpl: okSerie('s10') });
    expect(get(seriesStore).itens).toHaveLength(10);
    expect(get(seriesStore).itens.map((i) => i.id)).not.toContain('s10');
  });

  it('a cor padrão sai da paleta, por índice, SEM ciclo (§1)', async () => {
    for (let i = 0; i < 10; i++) await adicionarSerie(entrada(`s${i}`), { fetchImpl: okSerie(`s${i}`) });
    expect(get(seriesStore).itens.map((i) => corDe(i.id))).toEqual([...PALETA_PADRAO]);
  });

  it('override pessoal é chaveado pelo ID e restaurável (§1)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    definirCor('a', '#123456');
    expect(corDe('a')).toBe('#123456');
    restaurarCor('a');
    expect(corDe('a')).toBe(PALETA_PADRAO[0]);
  });

  it('remover libera a vaga e reindexa as cores', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: okSerie('b') });
    removerSerie('a');
    expect(get(seriesStore).itens.map((i) => corDe(i.id))).toEqual([PALETA_PADRAO[0]]);
  });

  it('adicionar o mesmo id duas vezes não duplica', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    expect(get(seriesStore).itens).toHaveLength(1);
  });
});

describe('substituirSeries — preset troca o conjunto numa escrita atômica', () => {
  it('emite UMA vez com todas as séries carregando, na ordem recebida', async () => {
    const emissoes = [];
    const parar = seriesStore.subscribe((s) => emissoes.push(s.itens.map((i) => i.status)));
    await substituirSeries([entrada('a'), entrada('b')], { fetchImpl: okSerie('a') });
    parar();
    expect(emissoes[1]).toEqual(['carregando', 'carregando']);
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['a', 'b']);
    expect(get(seriesStore).itens.every((i) => i.status === 'ok')).toBe(true);
  });

  it('descarta id repetido e corta no teto da paleta', async () => {
    const dez = Array.from({ length: 12 }, (_, i) => entrada(`s${i}`));
    await substituirSeries([entrada('a'), entrada('a'), ...dez], { fetchImpl: okSerie('s0') });
    const itens = get(seriesStore).itens;
    expect(itens[0].id).toBe('a');
    expect(itens).toHaveLength(LIMITE_SERIES);
  });

  it('falha de uma série é parcial: as outras seguem `ok`', async () => {
    await substituirSeries([entrada('a'), entrada('b')], {
      fetchImpl: async (url) => (String(url).endsWith('b.json')
        ? { ok: false, status: 500, json: async () => ({}) }
        : okSerie('a')()),
    });
    expect(get(seriesStore).itens.map((i) => i.status)).toEqual(['ok', 'erro']);
  });
});

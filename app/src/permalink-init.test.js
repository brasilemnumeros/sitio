import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { seriesStore, adicionarSerie, limparSeries, definirCor, motivoDoLimite } from './stores/series.js';
import { catalogStore } from './stores/catalog.js';
import { clearSeriesCache } from './data/series.js';
import { iniciarPermalink } from './permalink-init.js';

/** O `window`/`history` falso: só o que a integração toca (`location` e `replaceState`). */
function janelaFalsa(search = '') {
  return {
    location: { search, pathname: '/', hash: '' },
    history: { replaceState: vi.fn() },
  };
}

const resposta = (body) => ({ ok: true, status: 200, json: async () => body });

/**
 * `fetchImpl` de FIXTURE, com URL `data:` (evita ter de limpar `app/public/`, AGENTS.md).
 * Roteia: o catálogo vem de `/indicators.json`; cada série, da própria URL `data:<id>`.
 */
function fixture(idsDoCatalogo) {
  const catalogo = {
    groups: { g: { name: 'G', description: '' } },
    indicators: idsDoCatalogo.map((id) => ({
      id,
      name: `Ind ${id}`,
      group: 'g',
      datafile: `data:${id}`,
      chartType: 'line',
      yAxisTitle: null,
    })),
  };
  return async (url) => {
    if (url === '/indicators.json') return resposta(catalogo);
    if (url.startsWith('data:')) {
      const id = url.slice('data:'.length);
      return resposta({
        schema: 1,
        id,
        unit: { type: 'percentage', symbol: '%', decimals: 2 },
        granularity: 'monthly',
        source: 'fonte',
        data: [{ date: '2020-01-01', value: 1 }],
      });
    }
    throw new Error(`url inesperada no fixture: ${url}`);
  };
}

// O cache de `loadSeries` é por URL e vive no módulo (AGENTS.md); o catálogo é global e
// memoiza — sem zerar os dois, um teste passa (ou falha) pelo motivo do anterior.
beforeEach(() => {
  limparSeries();
  clearSeriesCache();
  catalogStore.set({ status: 'idle', groups: {}, indicators: [], error: null });
});

// Cada `iniciarPermalink` deixa uma assinatura viva; sem desfazê-la, a assinatura de um
// teste dispararia com o `window` falso do teste seguinte.
let parar;
afterEach(() => {
  parar?.();
  parar = undefined;
});

describe('iniciarPermalink', () => {
  it('restaura as séries na ORDEM da query (?)indicators=selic,ipca', async () => {
    parar = await iniciarPermalink({
      window: janelaFalsa('?indicators=selic,ipca'),
      fetchImpl: fixture(['selic', 'ipca']),
    });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic', 'ipca']);
    expect(get(seriesStore).itens.every((i) => i.status === 'ok')).toBe(true);
  });

  // Review Focus 1 — id desconhecido
  it('ignora id desconhecido em silêncio, sem lançar', async () => {
    parar = await iniciarPermalink({
      window: janelaFalsa('?indicators=nao-existe,selic'),
      fetchImpl: fixture(['selic']),
    });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);
  });

  // Review Focus 2 — mais de 10 ids
  it('15 ids → exatamente 10 séries (o teto da paleta)', async () => {
    const ids = Array.from({ length: 15 }, (_, i) => `s${i}`);
    parar = await iniciarPermalink({
      window: janelaFalsa(`?indicators=${ids.join(',')}`),
      fetchImpl: fixture(ids),
    });
    expect(get(seriesStore).itens).toHaveLength(10);
    // O teto e a frase do motivo vêm da MESMA fonte já existente (§9.5) — não é uma
    // segunda regra inventada no permalink.
    expect(motivoDoLimite()).toMatch(/Limite de 10 séries/);
  });

  it('sem query: store vazia e NENHUM replaceState espúrio', async () => {
    const win = janelaFalsa('');
    parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic']) });
    expect(get(seriesStore).itens).toEqual([]);
    expect(win.history.replaceState).not.toHaveBeenCalled();
  });

  it('adicionar série atualiza a URL com replaceState (store → URL)', async () => {
    const win = janelaFalsa('');
    const fetchImpl = fixture(['selic', 'ipca']);
    parar = await iniciarPermalink({ window: win, fetchImpl });
    expect(win.history.replaceState).not.toHaveBeenCalled(); // nada mudou ainda

    await adicionarSerie(
      { id: 'selic', name: 'Ind selic', datafile: 'data:selic', unit: null },
      { fetchImpl },
    );

    expect(win.history.replaceState).toHaveBeenCalled();
    const [, , url] = win.history.replaceState.mock.calls.at(-1);
    expect(url).toBe('/?indicators=selic');
  });

  it('a query NÃO é relida depois de escrita (sem laço de eco)', async () => {
    const win = janelaFalsa('?indicators=selic');
    const fetchImpl = fixture(['selic', 'ipca']);
    parar = await iniciarPermalink({ window: win, fetchImpl });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);

    // A URL passa a pedir um id **válido e ausente** (`ipca`). Se a integração relesse a URL
    // dentro do caminho de escrita — o defeito do `adapter.js:79`, em que a escrita
    // programática volta como estado — `ipca` entraria na store AQUI.
    win.location.search = '?indicators=ipca';
    definirCor('selic', '#123456'); // força uma emissão da store (o subscribe reescreve a URL)
    await new Promise((r) => setTimeout(r, 0)); // deixa qualquer caminho assíncrono se revelar

    // A store obedece só a si mesma: a URL mexida à mão não trouxe série nenhuma.
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);
    // E nada do que a integração escreveu pode conter o id injetado.
    const escritas = win.history.replaceState.mock.calls.map((c) => c[2]).join(' ');
    expect(escritas).not.toContain('ipca');
    // A escrita é unidirecional e corrige a URL de volta para a store.
    expect(win.history.replaceState.mock.calls.at(-1)[2]).toBe('/?indicators=selic');
  });

  it('não reescreve a URL quando ela já reflete a store (guarda do ruído)', async () => {
    const win = janelaFalsa('?indicators=selic');
    parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic']) });
    const antes = win.history.replaceState.mock.calls.length;

    // Emissão da store com a MESMA lista que a URL já tem: a guarda `proximo === atual`
    // impede um `replaceState` inútil (que poluiria o histórico do navegador).
    definirCor('selic', '#abcdef');
    await new Promise((r) => setTimeout(r, 0));

    expect(win.history.replaceState.mock.calls.length).toBe(antes);
  });
});

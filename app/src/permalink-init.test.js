import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { seriesStore, adicionarSerie, limparSeries, definirCor, motivoDoLimite } from './stores/series.js';
import { catalogStore, recarregarCatalogo } from './stores/catalog.js';
import { clearSeriesCache } from './data/series.js';
import { iniciarPermalink, retomarPermalink } from './permalink-init.js';
import { escreverSearch } from './permalink.js';
import { PRESETS, presetDoDia, dataEmSaoPaulo } from './data/presets.js';

/**
 * O `window`/`history` falso: só o que a integração toca (`location` e `replaceState`).
 * `replaceState` APLICA a URL na `location` — como o navegador faz —, senão a guarda
 * `proximo === atual` seria medida contra uma URL congelada e o número de escritas
 * (o que os testes de preset contam) não teria significado.
 */
function janelaFalsa(search = '') {
  const location = { search, pathname: '/', hash: '' };
  return {
    location,
    history: {
      replaceState: vi.fn((_estado, _titulo, url) => {
        const [caminho, resto = ''] = String(url).split('?');
        const [query, hash = ''] = resto.split('#');
        location.pathname = caminho || '/';
        location.search = query ? `?${query}` : '';
        location.hash = hash ? `#${hash}` : '';
      }),
    },
  };
}

const resposta = (body) => ({ ok: true, status: 200, json: async () => body });

/** A série que o validador aceita — usada tanto pelo `fixture` (catalogStore semeada) quanto
 *  pelo fetch de quem passa pelo `buscarCatalogo` de verdade. */
const corpoDaSerie = (id) => ({
  versao: 1,
  id,
  unidade: { tipo: 'percentual', simbolo: '%', casas: 2 },
  eixo: 'percentual',
  medida: 'nivel',
  granularidade: 'mensal',
  fonte: 'fonte',
  dados: [{ data: '2020-01-01', valor: 1 }],
});

/**
 * Fixa o CATÁLOGO na store e devolve o `fetchImpl` de FIXTURE, com URL `data:` para as séries
 * (evita ter de limpar `app/public/`, AGENTS.md). O catálogo vem da rede desde 2026-11-01, mas
 * `carregarCatalogo` não refaz nada quando a store já está `ready` — então `iniciarPermalink`
 * não busca `catalogo.json` aqui, e o `fetchImpl` abaixo só precisa servir as séries.
 */
function fixture(idsDoCatalogo) {
  catalogStore.set({
    status: 'ready',
    grupos: { g: { nome: 'G' } },
    indicadores: idsDoCatalogo.map((id) => ({
      id,
      nome: `Ind ${id}`,
      grupo: 'g',
      arquivo: `g/${id}.json`,
      datafile: `data:${id}`,
      escala: 'percentual',
    })),
    error: null,
  });
  return async (url) => {
    if (url.startsWith('data:')) {
      const id = url.slice('data:'.length);
      return resposta(corpoDaSerie(id));
    }
    throw new Error(`url inesperada no fixture: ${url}`);
  };
}

// O cache de `loadSeries` é por URL e vive no módulo (AGENTS.md); o catálogo é global e
// memoiza — sem zerar os dois, um teste passa (ou falha) pelo motivo do anterior.
beforeEach(() => {
  limparSeries();
  clearSeriesCache();
  catalogStore.set({ status: 'idle', grupos: {}, indicadores: [], error: null });
});

// Cada `iniciarPermalink` deixa uma assinatura viva; sem desfazê-la, a assinatura de um
// teste dispararia com o `window` falso do teste seguinte.
let parar;
afterEach(() => {
  parar?.();
  parar = undefined;
});

describe('iniciarPermalink', () => {
  it('restaura as séries na ORDEM da query (?series=selic,ipca)', async () => {
    parar = await iniciarPermalink({
      window: janelaFalsa('?series=selic,ipca'),
      fetchImpl: fixture(['selic', 'ipca']),
    });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic', 'ipca']);
    expect(get(seriesStore).itens.every((i) => i.status === 'ok')).toBe(true);
  });

  // Review Focus 1 — id desconhecido
  it('ignora id desconhecido em silêncio, sem lançar', async () => {
    parar = await iniciarPermalink({
      window: janelaFalsa('?series=nao-existe,selic'),
      fetchImpl: fixture(['selic']),
    });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);
  });

  // Review Focus 2 — mais de 10 ids
  it('15 ids → exatamente 10 séries (o teto da paleta)', async () => {
    const ids = Array.from({ length: 15 }, (_, i) => `s${i}`);
    parar = await iniciarPermalink({
      window: janelaFalsa(`?series=${ids.join(',')}`),
      fetchImpl: fixture(ids),
    });
    expect(get(seriesStore).itens).toHaveLength(10);
    // O teto e a frase do motivo vêm da MESMA fonte já existente (§9.5) — não é uma
    // segunda regra inventada no permalink.
    expect(motivoDoLimite()).toMatch(/Limite de 10 séries/);
  });

  it('sem a chave series: aplica o preset do dia e o escreve na URL', async () => {
    const win = janelaFalsa('');
    const agora = new Date('2026-10-27T12:00:00Z');
    const esperado = presetDoDia(dataEmSaoPaulo(agora));
    parar = await iniciarPermalink({
      window: win,
      fetchImpl: fixture(PRESETS.flatMap((p) => p.indicadores)),
      agora,
    });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(esperado.indicadores);
    // A expectativa passa pelo SERIALIZADOR real (`escreverSearch`): o `URLSearchParams`
    // percent-encoda a vírgula, e montar a URL com `join(',')` passaria só nos dias em que
    // a rotação cai num preset de 1 id — uma bomba-relógio de calendário.
    expect(win.history.replaceState.mock.calls.at(-1)[2]).toBe(
      `/?${escreverSearch(esperado.indicadores)}`,
    );
    // UMA escrita só: o laço de `adicionarSerie` não escreve (a assinatura vem depois) e a
    // escrita explícita do preset passa pela guarda `proximo === atual` na assinatura.
    expect(win.history.replaceState).toHaveBeenCalledTimes(1);
  });

  it('preset de 2 ids também escreve a URL uma única vez (com vírgula codificada)', async () => {
    // Data congelada num preset de DOIS ids (`atividade`): o caso que a rotação de hoje não
    // exercita. Se a URL fosse montada com `join(',')`, este teste acusaria a diferença.
    const win = janelaFalsa('');
    const agora = new Date('2026-10-26T12:00:00Z');
    const esperado = presetDoDia(dataEmSaoPaulo(agora));
    expect(esperado.indicadores).toHaveLength(2);
    parar = await iniciarPermalink({
      window: win,
      fetchImpl: fixture(PRESETS.flatMap((p) => p.indicadores)),
      agora,
    });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(esperado.indicadores);
    expect(win.history.replaceState).toHaveBeenCalledTimes(1);
    const url = win.history.replaceState.mock.calls[0][2];
    expect(url).toBe(`/?${escreverSearch(esperado.indicadores)}`);
    // Prova direta do formato: exatamente uma vírgula codificada entre os dois ids.
    expect(url).toBe(`/?series=${esperado.indicadores[0]}%2C${esperado.indicadores[1]}`);
    expect(win.location.search).toBe(`?series=${esperado.indicadores[0]}%2C${esperado.indicadores[1]}`);
  });

  it('chave series presente mas sem id válido: NÃO aplica preset', async () => {
    const win = janelaFalsa('?series=nao-existe');
    parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic']) });
    expect(get(seriesStore).itens).toEqual([]);
  });

  it('chave series válida vence o preset', async () => {
    const win = janelaFalsa('?series=selic');
    parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic', 'ipca']) });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);
    // A URL já estava na forma canônica: nenhuma normalização, NENHUM `replaceState`.
    expect(win.history.replaceState).not.toHaveBeenCalled();
  });

  it('preset cujos ids não existem no catálogo não quebra: store vazia', async () => {
    const win = janelaFalsa('');
    parar = await iniciarPermalink({
      window: win,
      fetchImpl: fixture(['outro']),
      agora: new Date('2026-10-27T12:00:00Z'),
    });
    expect(get(seriesStore).itens).toEqual([]);
  });

  it('adicionar série atualiza a URL com replaceState (store → URL)', async () => {
    // A URL JÁ tem uma série: sem a chave `series` o preset do dia entraria, e este teste
    // mede o caminho store → URL, não a entrada pelo preset.
    const win = janelaFalsa('?series=ipca');
    const fetchImpl = fixture(['selic', 'ipca']);
    parar = await iniciarPermalink({ window: win, fetchImpl });
    expect(win.history.replaceState).not.toHaveBeenCalled(); // nada mudou ainda

    await adicionarSerie(
      { id: 'selic', name: 'Ind selic', datafile: 'data:selic', unit: null },
      { fetchImpl },
    );

    expect(win.history.replaceState).toHaveBeenCalled();
    const [, , url] = win.history.replaceState.mock.calls.at(-1);
    // A vírgula sai percent-encoded: quem serializa é o `URLSearchParams` (o link segue
    // válido — a leitura decodifica). O que importa aqui é a ORDEM e a chave.
    expect(url).toBe('/?series=ipca%2Cselic');
  });

  it('a query NÃO é relida depois de escrita (sem laço de eco)', async () => {
    const win = janelaFalsa('?series=selic');
    const fetchImpl = fixture(['selic', 'ipca']);
    parar = await iniciarPermalink({ window: win, fetchImpl });
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);

    // A URL passa a pedir um id **válido e ausente** (`ipca`). Se a integração relesse a URL
    // dentro do caminho de escrita — o defeito do `adapter.js:79`, em que a escrita
    // programática volta como estado — `ipca` entraria na store AQUI.
    win.location.search = '?series=ipca';
    definirCor('selic', '#123456'); // força uma emissão da store (o subscribe reescreve a URL)
    await new Promise((r) => setTimeout(r, 0)); // deixa qualquer caminho assíncrono se revelar

    // A store obedece só a si mesma: a URL mexida à mão não trouxe série nenhuma.
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);
    // E nada do que a integração escreveu pode conter o id injetado.
    const escritas = win.history.replaceState.mock.calls.map((c) => c[2]).join(' ');
    expect(escritas).not.toContain('ipca');
    // A escrita é unidirecional e corrige a URL de volta para a store.
    expect(win.history.replaceState.mock.calls.at(-1)[2]).toBe('/?series=selic');
  });

  it('não reescreve a URL quando ela já reflete a store (guarda do ruído)', async () => {
    const win = janelaFalsa('?series=selic');
    parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic']) });
    const antes = win.history.replaceState.mock.calls.length;

    // Emissão da store com a MESMA lista que a URL já tem: a guarda `proximo === atual`
    // impede um `replaceState` inútil (que poluiria o histórico do navegador).
    definirCor('selic', '#abcdef');
    await new Promise((r) => setTimeout(r, 0));

    expect(win.history.replaceState.mock.calls.length).toBe(antes);
  });
});

/**
 * O CATÁLOGO QUE VOLTA (fix round 1, 2026-11-01).
 *
 * Com o catálogo quebrado na entrada, `iniciarPermalink` sai cedo: não aplica o `?series=` nem
 * assina `seriesStore` (assinar escreveria a URL VAZIA por cima do link do usuário). Só que o
 * "Tentar de novo" da tela devolve o catálogo e, sem uma retomada, o gráfico ficava vazio com a
 * URL ainda pedindo as séries. `retomarPermalink()` é a MESMA passada do boot, chamável depois.
 */
describe('retomarPermalink (catálogo volta depois do erro)', () => {
  /** Catálogo VÁLIDO para o `validateCatalog` real: é ele que resolve `datafile` contra a base. */
  const catalogoBruto = (ids) => ({
    versao: 1,
    grupos: { g: { nome: 'G' } },
    indicadores: ids.map((id) => ({
      id,
      nome: `Ind ${id}`,
      grupo: 'g',
      arquivo: `g/${id}.json`,
      escala: 'percentual',
    })),
  });

  /** `fetch` de fixture: o catálogo REJEITA até `liberarCatalogo()`, e as séries respondem pelo
   *  caminho REAL (`buscarCatalogo` → `validateCatalog` → `datafile` → `adicionarSerie`). */
  function fetchComCatalogoInstavel(ids) {
    let foraDoAr = true;
    const fetchImpl = async (url) => {
      const alvo = String(url);
      if (alvo.endsWith('/catalogo.json')) {
        if (foraDoAr) throw new Error('rede fora do ar');
        return resposta(catalogoBruto(ids));
      }
      if (alvo.startsWith('data:')) return resposta(corpoDaSerie(alvo.slice('data:'.length)));
      const id = ids.find((i) => alvo.endsWith(`/g/${i}.json`));
      if (id) return resposta(corpoDaSerie(id));
      throw new Error(`url inesperada no fixture: ${alvo}`);
    };
    return { fetchImpl, liberarCatalogo: () => (foraDoAr = false) };
  }

  it('catálogo rejeitado na entrada → nada aplicado; a retomada aplica o ?series= e assina a URL', async () => {
    const ids = ['selic', 'ipca'];
    const win = janelaFalsa('?series=selic,ipca');
    const { fetchImpl, liberarCatalogo } = fetchComCatalogoInstavel(ids);

    parar = await iniciarPermalink({ window: win, fetchImpl });

    // 1 · catálogo quebrado: NENHUMA série, link intacto, nenhuma escrita na URL
    expect(get(catalogStore).status).toBe('error');
    expect(get(seriesStore).itens).toEqual([]);
    expect(win.location.search).toBe('?series=selic,ipca');
    expect(win.history.replaceState).not.toHaveBeenCalled();

    // 2 · o catálogo volta; é isto que o "Tentar de novo" da `App` faz — recarrega e retoma
    liberarCatalogo();
    await recarregarCatalogo({ fetchImpl });
    expect(get(catalogStore).status).toBe('ready');
    parar = await retomarPermalink({ window: win, fetchImpl });

    // as duas séries do link entraram OK, na ordem da query
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic', 'ipca']);
    expect(get(seriesStore).itens.every((i) => i.status === 'ok')).toBe(true);
    // e a URL continua com os MESMOS ids (o serializador real a normaliza, como no boot)
    expect(new URLSearchParams(win.location.search).get('series')).toBe('selic,ipca');

    // 3 · a assinatura store→URL passou a existir: uma série nova entra no link
    await adicionarSerie({ id: 'igpm', nome: 'Ind igpm', datafile: 'data:igpm' }, { fetchImpl });
    await new Promise((r) => setTimeout(r, 0));
    expect(new URLSearchParams(win.location.search).get('series')).toBe('selic,ipca,igpm');
  });

  it('retomada SEM catálogo (retry que falhou) não escreve nada na URL', async () => {
    const win = janelaFalsa('?series=selic,ipca');
    const { fetchImpl } = fetchComCatalogoInstavel(['selic', 'ipca']);

    // Catálogo quebrado e NENHUMA retomada bem-sucedida: a passada saiu cedo.
    parar = await iniciarPermalink({ window: win, fetchImpl });
    expect(get(catalogStore).status).toBe('error');

    // O handler do retry chama a retomada só quando o status vira `ready`; aqui o catálogo
    // continua fora do ar e a função precisa ser inofensiva (nada de assinar/escrever).
    parar = await retomarPermalink({ window: win, fetchImpl });

    expect(get(seriesStore).itens).toEqual([]);
    expect(win.location.search).toBe('?series=selic,ipca');
    expect(win.history.replaceState).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  catalogStore,
  carregarCatalogo,
  recarregarCatalogo,
  buscarIndicadores,
} from './catalog.js';

const CATALOGO = {
  versao: 1,
  grupos: { monetario: { nome: '🏦 Política Monetária' }, inflacao: { nome: '📈 Inflação' } },
  indicadores: [
    { id: 'selic-meta', nome: 'Taxa Selic Meta (%)', grupo: 'monetario', arquivo: 'selic/selic-meta.json', escala: 'percentual' },
    { id: 'ipca-acum-12m', nome: 'IPCA (%)', grupo: 'inflacao', arquivo: 'ipca/ipca-acum-12m.json', escala: 'percentual' },
  ],
};

const URL = 'https://x/dados/indicadores/catalogo.json';
const resposta = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => catalogStore.set({ status: 'idle', grupos: {}, indicadores: [], error: null }));

describe('catalogStore', () => {
  it('começa em idle', () => {
    expect(get(catalogStore).status).toBe('idle');
  });

  it('carrega o catálogo injetado e vira ready', async () => {
    await carregarCatalogo({ dados: CATALOGO });
    expect(get(catalogStore).status).toBe('ready');
    expect(get(catalogStore).indicadores).toHaveLength(2);
  });

  it('não recarrega o que já está pronto (idempotente)', async () => {
    await carregarCatalogo({ dados: CATALOGO });
    const antes = get(catalogStore);
    // Sem `dados` nem `fetchImpl`, uma segunda passada iria à REDE (e falharia no ambiente
    // de teste); a store ficar `ready` é o que impede isso.
    await carregarCatalogo();
    expect(get(catalogStore)).toBe(antes);
  });

  it('busca por digitação ignora caixa e acento', async () => {
    await carregarCatalogo({ dados: CATALOGO });
    expect(buscarIndicadores('taxa selic').map((i) => i.id)).toEqual(['selic-meta']);
    expect(buscarIndicadores('ÍPCA').map((i) => i.id)).toEqual(['ipca-acum-12m']);
    expect(buscarIndicadores('')).toHaveLength(2);
  });

  it('vai de loading a ready numa passada', async () => {
    const vistos = [];
    const cancelar = catalogStore.subscribe((s) => vistos.push(s.status));
    const fetchImpl = vi.fn(async () => resposta(CATALOGO));

    const carregando = carregarCatalogo({ url: URL, fetchImpl });
    // `loading` é observável ANTES de a rede responder: é o que a home usa para o spinner.
    expect(get(catalogStore).status).toBe('loading');
    await carregando;
    cancelar();

    expect(vistos).toEqual(['idle', 'loading', 'ready']);
    expect(get(catalogStore).indicadores).toHaveLength(2);
    expect(get(catalogStore).error).toBeNull();
  });

  it('falha vira status error com a mensagem crua', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    await carregarCatalogo({ url: URL, fetchImpl });
    expect(get(catalogStore).status).toBe('error');
    // A mensagem chega à tela como veio do `buscarCatalogo`: sem "erro desconhecido".
    expect(get(catalogStore).error).toMatch(/HTTP 500/);
    expect(get(catalogStore).indicadores).toEqual([]);
  });

  it('não dispara dois requests quando chamado duas vezes', async () => {
    const fetchImpl = vi.fn(async () => resposta(CATALOGO));
    await Promise.all([
      carregarCatalogo({ url: URL, fetchImpl }),
      carregarCatalogo({ url: URL, fetchImpl }),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(get(catalogStore).status).toBe('ready');
  });

  it('recarregarCatalogo refaz mesmo depois de ready', async () => {
    const fetchImpl = vi.fn(async () => resposta(CATALOGO));
    await carregarCatalogo({ url: URL, fetchImpl });
    await recarregarCatalogo({ url: URL, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(get(catalogStore).status).toBe('ready');
  });

  it('recarregarCatalogo sai de error e volta a ready (o "tentar de novo")', async () => {
    const falha = vi.fn(async () => ({ ok: false, status: 500 }));
    await carregarCatalogo({ url: URL, fetchImpl: falha });
    expect(get(catalogStore).status).toBe('error');

    await recarregarCatalogo({ url: URL, fetchImpl: vi.fn(async () => resposta(CATALOGO)) });
    expect(get(catalogStore).status).toBe('ready');
    expect(get(catalogStore).error).toBeNull();
    expect(get(catalogStore).indicadores).toHaveLength(2);
  });
});

describe('carregarCatalogo em voo', () => {
  it('a segunda chamada ESPERA a primeira em vez de resolver na hora', async () => {
    let liberar;
    const fetchImpl = vi.fn(
      () =>
        new Promise((resolve) => {
          liberar = () => resolve(resposta(CATALOGO));
        }),
    );

    const primeira = carregarCatalogo({ url: URL, fetchImpl });
    const segunda = carregarCatalogo({ url: URL, fetchImpl });

    let segundaResolveu = false;
    segunda.then(() => (segundaResolveu = true));
    await new Promise((r) => setTimeout(r, 0));
    expect(segundaResolveu, 'a segunda não pode resolver antes do catálogo').toBe(false);

    liberar();
    await Promise.all([primeira, segunda]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(get(catalogStore).status).toBe('ready');
  });
});

describe('recarregarCatalogo preserva a lista que já estava em uso', () => {
  it('falha no recarregamento mantém os indicadores anteriores', async () => {
    await carregarCatalogo({ dados: CATALOGO });
    expect(get(catalogStore).indicadores).toHaveLength(2);

    await recarregarCatalogo({
      url: URL,
      fetchImpl: async () => ({ ok: false, status: 500 }),
    });

    const estado = get(catalogStore);
    expect(estado.status).toBe('error');
    expect(estado.error).toMatch(/HTTP 500/);
    // A lista sobrevive: um "atualizar" malsucedido não pode deixar a pessoa sem o que já tinha.
    expect(estado.indicadores).toHaveLength(2);
  });
});

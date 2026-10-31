import { it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { filtroAtivo, resetarFiltros } from './filtros.js';
import { viewportStore, definirJanela, resetarJanela } from './viewport.js';
import { mandateStore, selecionarMandato, limparSelecao, carregarMandatos } from './mandate.js';

// O horizonte tem ~30 anos (1995-01-01 → hoje): qualquer janela bem menor que isso é recorte.
const janelaDe = (anos) => {
  const to = Date.now();
  const from = to - anos * 365.25 * 24 * 60 * 60 * 1000;
  return { from: new Date(from).toISOString().slice(0, 10), to: new Date(to).toISOString().slice(0, 10) };
};

beforeEach(() => {
  resetarJanela();
  limparSelecao();
});

it('sem janela e sem mandato não há filtro — o botão não aparece', () => {
  expect(get(filtroAtivo)).toBe(false);
});

it('uma janela de 10 anos é filtro', () => {
  definirJanela(janelaDe(10), { escolhaDoUsuario: true });
  expect(get(filtroAtivo)).toBe(true);
});

it('a janela COMPLETA (o eco do fitContent) não é filtro — a folga de 1 ano cobre o arredondamento', () => {
  definirJanela(janelaDe(31), { escolhaDoUsuario: true });
  expect(get(filtroAtivo)).toBe(false);
});

it('mandato escolhido é filtro, mesmo com a janela completa', () => {
  carregarMandatos({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        mandatos: [{ id: 'lula-1', rotulo: 'Lula I', partido: 'PT', inicio: '2003-01-01', fim: '2006-12-31' }],
      }),
    }),
  });
  return new Promise((resolve) => {
    // `carregarMandatos` é assíncrona: espera a store refletir a lista antes de selecionar.
    setTimeout(() => {
      selecionarMandato('lula-1');
      expect(get(mandateStore).selecionado).toBe('lula-1');
      expect(get(filtroAtivo)).toBe(true);
      resetarFiltros();
      // o reset solta o mandato E volta a janela ao intervalo completo
      expect(get(mandateStore).selecionado).toBeNull();
      expect(get(viewportStore)).toEqual({ from: null, to: null });
      expect(get(filtroAtivo)).toBe(false);
      resolve();
    }, 0);
  });
});

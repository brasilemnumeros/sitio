import { it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  mandateStore, carregarMandatos, selecionarMandato, limparSelecao, mandatoSelecionado,
  aplicarMandato,
} from './mandate.js';
import { definirJanela } from './viewport.js';

const GOVERNOS = {
  schema: 1,
  mandatos: [
    { id: 'lula-3', titular: 'Lula', inicio: '2023-01-01', fim: null, emCurso: true },
    { id: 'bolsonaro', titular: 'Bolsonaro', inicio: '2019-01-01', fim: '2022-12-31', emCurso: false },
    { id: 'lula-1', titular: 'Lula', inicio: '2003-01-01', fim: '2005-12-31', emCurso: false },
  ],
};
const okGovernos = async () => ({ ok: true, status: 200, json: async () => GOVERNOS });

it('carrega ordenado (em curso por último) e começa SEM seleção', async () => {
  await carregarMandatos({ fetchImpl: okGovernos });
  const { mandatos, selecionado } = get(mandateStore);
  expect(mandatos.map((m) => m.id)).toEqual(['lula-1', 'bolsonaro', 'lula-3']);
  expect(selecionado).toBeNull();
});

it('governos fora do ar NÃO derrubam o app — o store só fica vazio', async () => {
  // O mandato é CONTEXTO: o eixo do tempo não depende dele (§9.3, espírito).
  await carregarMandatos({ fetchImpl: async () => { throw new Error('rede'); } });
  expect(get(mandateStore)).toEqual({ mandatos: [], selecionado: null });
  await carregarMandatos({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
  expect(get(mandateStore)).toEqual({ mandatos: [], selecionado: null });
});

it('seleciona e limpa', async () => {
  await carregarMandatos({ fetchImpl: okGovernos });
  selecionarMandato('bolsonaro');
  expect(mandatoSelecionado().id).toBe('bolsonaro');
  limparSelecao();
  expect(mandatoSelecionado()).toBeNull();
});

it('R27 — não importa series.js, verificado NO FONTE e não por proxy', async () => {
  // O teste anterior conferia que `celulaDe` não existe e que `seriesStore` não é exportado —
  // mas um módulo poderia importar series.js SEM exportar nada disso e ainda passar.
  // O R27 proíbe o IMPORT, então é o import que tem de ser travado.
  //
  // ⚠ Casa por ESPECIFICADOR, não por regex sobre o texto inteiro. A versão anterior procurava
  // `from '…stores/'` e `series.js` no texto — e escapava de três formas que o Vite resolve:
  //   import { x } from './series'        (sem extensão)
  //   import '../stores/series'           (efeito colateral, sem `from`)
  //   const x = require('./series')       (CommonJS)
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('./mandate.js', import.meta.url), 'utf8');
  const especificadores = [
    ...fonte.matchAll(/(?:from|require\s*\(|^[ \t]*import)\s*\(?\s*['"]([^'"]+)['"]/gm),
  ].map((m) => m[1]);
  // Um extrator que não acha nada faz o teste passar vazio — é o defeito que este teste existe
  // para evitar. Se isto falhar, o extrator quebrou, não o módulo.
  expect(especificadores.length).toBeGreaterThan(0);
  expect(especificadores.filter((e) => /series/i.test(e))).toEqual([]);
});

// ─── aplicarMandato: a regra ÚNICA de escolha (trilho, chip da barra superior e minimapa) ───
// Antes ela vivia dentro do `MandateRail`; com três caminhos até o mesmo estado, uma cópia por
// caminho garantiria divergência (um limpando o realce, outro não; um declarando a autoria da
// janela, outro não). Aqui se prova o CONTRATO que os três herdam.
it('aplicarMandato escolhe o governo E leva a janela para o período dele', async () => {
  const { viewportStore } = await import('./viewport.js');
  await carregarMandatos({ fetchImpl: okGovernos });
  definirJanela({ from: '1990-01-01', to: '1990-12-31' });
  expect(aplicarMandato('bolsonaro')).toBe(true);
  expect(get(mandateStore).selecionado).toBe('bolsonaro');
  expect(get(viewportStore)).toEqual({ from: '2019-01-01', to: '2022-12-31' });
});

it('aplicarMandato no MESMO governo desliga o filtro (o "clicar de novo" do trilho)', async () => {
  const { viewportStore } = await import('./viewport.js');
  await carregarMandatos({ fetchImpl: okGovernos });
  aplicarMandato('lula-1');
  expect(aplicarMandato('lula-1')).toBe(false);
  expect(get(mandateStore).selecionado).toBeNull();
  expect(get(viewportStore)).toEqual({ from: null, to: null });
});

it('aplicarMandato com o mandato EM CURSO termina na data máxima do dado', async () => {
  const { viewportStore } = await import('./viewport.js');
  await carregarMandatos({ fetchImpl: okGovernos });
  aplicarMandato('lula-3', '2025-10-01');
  expect(get(viewportStore)).toEqual({ from: '2023-01-01', to: '2025-10-01' });
});

it('aplicarMandato com id desconhecido limpa (nada de "selecionado" órfão)', async () => {
  await carregarMandatos({ fetchImpl: okGovernos });
  selecionarMandato('bolsonaro');
  expect(aplicarMandato('nao-existe')).toBe(false);
  expect(get(mandateStore).selecionado).toBeNull();
});

it('aplicarMandato declara a AUTORIA da janela (§8.1) — o fit automático para', async () => {
  const { aoEscolherJanela } = await import('./viewport.js');
  const avisos = [];
  const cancelar = aoEscolherJanela((v) => avisos.push(v));
  await carregarMandatos({ fetchImpl: okGovernos });
  aplicarMandato('bolsonaro');
  aplicarMandato('bolsonaro'); // o "Todos": NÃO é janela escolhida
  cancelar();
  expect(avisos).toEqual([true, false]);
});

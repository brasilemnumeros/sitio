import { it, expect } from 'vitest';
import { get } from 'svelte/store';
import {
  mandateStore, carregarMandatos, selecionarMandato, limparSelecao, mandatoSelecionado,
} from './mandate.js';

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
  // mas um módulo poderia importar series.js SEM exportar nada disso e ainda assim passar.
  // O R27 proíbe o IMPORT, então é o import que tem de ser travado.
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('./mandate.js', import.meta.url), 'utf8');
  expect(fonte).not.toMatch(/from\s+['"][^'"]*stores\//);   // nenhum store
  expect(fonte).not.toMatch(/\bseries\.js\b/);              // nem por caminho direto
});

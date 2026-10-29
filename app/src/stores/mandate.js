import { writable, get } from 'svelte/store';
import { ordenarMandatos, janelaDoMandato } from '../domain/mandates.js';
import { definirJanela, resetarJanela } from './viewport.js';

// `__BASE_DADOS__` é trocado em tempo de build pelo `vite.config.js`: em dev aponta para o
// repo `dados/` local (servido pelo middleware), em produção para o Pages. Antes isto era uma
// URL publicada **fixa** — o que fazia o trilho de mandatos buscar da rede mesmo em dev.
const URL_GOVERNOS = `${__BASE_DADOS__}/governos/federal.json`;
const inicial = { mandatos: [], selecionado: null };

const store = writable(inicial);
export const mandateStore = { subscribe: store.subscribe };

/** O mandato é CONTEXTO, não dado do gráfico: se os governos não vierem, o app ainda mostra
 * as séries — por isso a falha é engolida e o store fica vazio em vez de propagar (§9.3). */
export async function carregarMandatos({ url = URL_GOVERNOS, fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} ao buscar governos`);
    const dados = await r.json();
    store.set({ mandatos: ordenarMandatos(dados.mandatos ?? []), selecionado: null });
  } catch {
    store.set({ ...inicial });
  }
}

export function selecionarMandato(id) {
  store.update((s) => (s.mandatos.some((m) => m.id === id) ? { ...s, selecionado: id } : s));
}

export function limparSelecao() {
  store.update((s) => ({ ...s, selecionado: null }));
}

export function mandatoSelecionado() {
  const { mandatos, selecionado } = get(store);
  return mandatos.find((m) => m.id === selecionado) ?? null;
}

/**
 * "USE ESTE MANDATO (ou nenhum) COMO A JANELA" — a regra ÚNICA dos três lugares que escolhem
 * mandato: o trilho da gaveta inferior, o chip da barra superior e o clique na faixa do
 * minimapa (2026-10-28). Estava escrita dentro do `MandateRail`; com três caminhos até o mesmo
 * estado, deixá-la copiada garantiria que um deles divergisse (um limpando o realce e o outro
 * não, um declarando a autoria da janela e o outro não).
 *
 * - `id` válido: seleciona o mandato e a janela vai para o PERÍODO dele.
 * - `id` nulo (ou o que JÁ está selecionado — clicar de novo desliga): limpa a seleção e volta ao
 *   intervalo completo ("Tudo"). É o par de `limparSelecao` + `resetarJanela`.
 *
 * ⚠ `escolhaDoUsuario`: quem escolheu foi o usuário, então o enquadramento automático para e uma
 * série adicionada depois não move a janela (§8.1). Sem isto o filtro duraria ~150ms.
 *
 * @param {string|null} id
 * @param {string|null} dataMaxima  ISO da última data do dado — o fim do mandato EM CURSO.
 * @returns {boolean} se a escolha mudou alguma coisa
 */
export function aplicarMandato(id, dataMaxima = null) {
  const { mandatos, selecionado } = get(store);
  const alvo = id === selecionado ? null : mandatos.find((m) => m.id === id) ?? null;
  if (alvo) {
    selecionarMandato(alvo.id);
    definirJanela(janelaDoMandato(alvo, dataMaxima), { escolhaDoUsuario: true });
    return true;
  }
  limparSelecao();
  resetarJanela();
  return false;
}

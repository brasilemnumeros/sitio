import { writable, get } from 'svelte/store';
import { ordenarMandatos, janelaDoMandato } from '../domain/mandates.js';
import { definirJanela, resetarJanela } from './viewport.js';
import federal from '../data/governos/federal.json';

// Os governos são dado versionado AQUI (2026-11-01, antes viviam no repo `dados` e vinham por
// `fetch`). Entrar no bundle troca o 404 silencioso por erro de build: se o arquivo sumir, o
// bundle não existe — em vez de o gráfico e o minimapa ficarem sem faixa sem avisar (§9.3).
const inicial = { mandatos: [], selecionado: null };

const store = writable(inicial);
export const mandateStore = { subscribe: store.subscribe };

/** Carrega o registro embutido. Síncrona e com `dados` injetável: os testes passam fixture e
 * não precisam de rede; `dados` é o único ponto de troca. */
export function carregarMandatos({ dados = federal } = {}) {
  store.set({ mandatos: ordenarMandatos(dados.mandatos ?? []), selecionado: null });
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
 * "USE ESTE MANDATO (ou nenhum) COMO A JANELA" — a regra ÚNICA dos caminhos que escolhem mandato:
 * o chip da barra superior e o clique na faixa do minimapa (2026-10-28). O trilho da gaveta
 * inferior, que também a usava, saiu em 2026-10-30. Estava escrita dentro do `MandateRail`; com
 * mais de um caminho até o mesmo estado, deixá-la copiada garantiria que um deles divergisse (um
 * limpando o realce e o outro não, um declarando a autoria da janela e o outro não).
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

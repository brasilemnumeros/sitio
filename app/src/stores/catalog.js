import { writable, get } from 'svelte/store';
import { validateCatalog, buscarCatalogo } from '../data/catalog.js';

const inicial = { status: 'idle', grupos: {}, indicadores: [], error: null };

/** Camada 2 — não conhece a Lightweight Charts nem o DOM (§8). */
export const catalogStore = writable(inicial);

/**
 * A passada de carregamento, sem a guarda de idempotência — quem decide se pode começar é
 * quem chama (ver `carregarCatalogo`/`recarregarCatalogo`).
 *
 * `catalogStore.set('loading')` acontece ANTES do primeiro `await`: é o que faz a segunda
 * chamada de `carregarCatalogo` enxergar `loading` e não disparar um segundo request.
 *
 * `preservar` mantém a lista já carregada durante o recarregamento E depois de uma falha: um
 * "atualizar" malsucedido não pode deixar a pessoa sem o catálogo que ela já estava usando.
 * O estado continua `error` (a mensagem fica na store), mas com a lista anterior de pé — quem
 * decide o que desenhar é a `App`, que só mostra o erro quando não há lista nenhuma.
 */
async function executarCarregamento({ dados, fetchImpl, url } = {}, { preservar = false } = {}) {
  const anterior = get(catalogStore);
  const mantidos = preservar ? { grupos: anterior.grupos, indicadores: anterior.indicadores } : { grupos: {}, indicadores: [] };
  catalogStore.set({ ...inicial, ...mantidos, status: 'loading' });
  try {
    // `dados` injetado é o caminho dos testes (e do fixture do permalink): pula a rede e
    // valida o mesmo `validateCatalog`. Sem ele, o catálogo vem da base de dados.
    const { grupos, indicadores } = dados
      ? validateCatalog(dados)
      : await buscarCatalogo({ url, fetchImpl });
    catalogStore.set({ status: 'ready', grupos, indicadores, error: null });
  } catch (error) {
    // A mensagem crua (HTTP, rede, `SchemaError`) é o que a tela mostra: o vazio sempre diz
    // por quê (§9). Não se loga nem se embrulha aqui — o erro é do usuário, não do console.
    catalogStore.set({ ...inicial, ...mantidos, status: 'error', error: error.message });
  }
}

/** O pedido em voo: a segunda chamada ESPERA o primeiro em vez de devolver na hora. Sem isto,
 *  `await carregarCatalogo()` resolvia antes de o catálogo chegar e quem chamasse lia uma
 *  lista vazia. */
let emVoo = null;

/**
 * Ação nomeada: única forma de escrever no store (§8). Idempotente — `loading`/`ready` não
 * refazem o pedido, porque a home chama no `onMount` e o permalink chama de novo na entrada.
 * `dados`/`fetchImpl`/`url` são injetáveis para os testes.
 */
export async function carregarCatalogo({ dados, fetchImpl, url } = {}) {
  const { status } = get(catalogStore);
  if (status === 'ready') return;
  if (status === 'loading') return emVoo; // espera a passada em curso, não dispara outra
  emVoo = executarCarregamento({ dados, fetchImpl, url });
  try {
    await emVoo;
  } finally {
    emVoo = null;
  }
}

/** O "tentar de novo" do erro: ignora o estado atual (inclusive `ready`) e refaz a passada,
 *  mantendo a lista que já estava carregada. */
export async function recarregarCatalogo(opcoes = {}) {
  await executarCarregamento(opcoes, { preservar: true });
}

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function buscarIndicadores(termo) {
  const { indicadores } = get(catalogStore);
  const t = semAcento(termo.trim());
  if (t === '') return indicadores;
  return indicadores.filter((i) => semAcento(i.nome).includes(t) || semAcento(i.id).includes(t));
}

export function indicadoresDoGrupo(groupId) {
  return get(catalogStore).indicadores.filter((i) => i.grupo === groupId);
}

/** Resolve um id do permalink para a entrada do catálogo; `null` se não existir (pode ser ignorado). */
export function indicadorPorId(id) {
  return get(catalogStore).indicadores.find((i) => i.id === id) ?? null;
}

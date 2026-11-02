import { get } from 'svelte/store';
import { seriesStore, adicionarSerie } from './stores/series.js';
import { catalogStore, carregarCatalogo, indicadorPorId } from './stores/catalog.js';
import { lerIds, escreverSearch } from './permalink.js';
import { presetDoDia, dataEmSaoPaulo } from './data/presets.js';

/**
 * Liga o permalink (`?series=`) aos stores — o que impede a migração de entrar com
 * regressão: os posts linkam `/?series=<ids>` e o app novo precisa restaurá-los.
 *
 * A LEITURA da query acontece UMA vez, na entrada — e UMA vez de novo se o catálogo falhar e a
 * pessoa clicar em "Tentar de novo" (`retomarPermalink`). A ESCRITA é unidirecional
 * (store → URL). Ler de volta o que se escreveu é o defeito conhecido do `adapter.js:79` — não
 * se repete aqui.
 */

/** Ids do preset do dia. Relógio injetável (`agora`) e dia de São Paulo, nunca o do navegador. */
const presetIds = (agora) => presetDoDia(dataEmSaoPaulo(agora))?.indicadores ?? [];

/**
 * Marcador (sessionStorage) de que o `?series=` da URL foi escrito pelo próprio app — o preset
 * do dia — e não veio de um link compartilhado. `main.js` o consulta para decidir o tour.
 */
export const CHAVE_SERIES_DO_APP = 'series-do-app';

/** Lê o marcador com `storage` injetável (testável sem navegador). */
export function seriesForamEscritasPeloApp(storage = globalThis.sessionStorage) {
  try {
    return storage?.getItem(CHAVE_SERIES_DO_APP) === '1';
  } catch {
    return false; // modo privado: sem marcador, vale o comportamento conservador (sem tour)
  }
}

/** Espera o catálogo sair de `loading`/`idle` (aqui ele está sendo carregado pelo próprio init
 *  ou já foi disparado pelo `onMount` da `App`; os dois caminhos terminam em `ready`/`error`). */
function esperarCatalogo() {
  return new Promise((resolve) => {
    const cancelar = catalogStore.subscribe((s) => {
      if (s.status === 'ready' || s.status === 'error') {
        // `cancelar` só existe depois que o `subscribe` retorna; a 1ª emissão é SÍNCRONA.
        queueMicrotask(() => {
          cancelar();
          resolve(s);
        });
      }
    });
  });
}

/** A assinatura store→URL VIVA: UMA por documento. Boot e retomada passam pelo mesmo caminho, e
 *  uma segunda chamada SUBSTITUI a escuta em vez de somar outra (duas escreveriam a URL duas
 *  vezes por emissão, e o `replaceState` é do usuário, não nosso). */
let assinatura = null;

/**
 * A passada "ler a URL → resolver ids → adicionar → assinar": a MESMA do boot, chamável de novo.
 *
 * Existe por causa do defeito medido em 2026-11-01: com o catálogo quebrado na entrada,
 * `iniciarPermalink` sai antes daqui (sem assinar, senão a assinatura escreveria a URL VAZIA por
 * cima do link de quem compartilhou); o "Tentar de novo" devolvia a lista e deixava o gráfico
 * vazio com a URL ainda pedindo `?series=…`. O retry do catálogo chama esta função DEPOIS de o
 * status virar `ready`. Nada de `location.reload()`: quem já está na tela continua nela.
 *
 * Catálogo quebrado continua sem escrever nada — a guarda do topo vale para os dois caminhos.
 *
 * SEM a chave `series` a URL segue a regra de sempre: o PRESET DO DIA entra (determinístico por
 * dia, em São Paulo) e é escrito na URL. Com a chave, ela vence sempre — mesmo que não sobre
 * nenhum id válido —, para o link de quem compartilhou não ser trocado por um preset.
 *
 * @param {{window?: Window, fetchImpl?: typeof fetch, agora?: Date}} [opcoes]
 * @returns {Promise<() => void>} o cancelamento da assinatura (útil para testes)
 */
export async function retomarPermalink({ window: win = window, fetchImpl, agora = new Date() } = {}) {
  const searchAtual = () => (win.location.search || '').replace(/^\?/, '');

  // Catálogo quebrado: NÃO apagar o permalink do usuário (a assinatura abaixo escreveria a URL
  // vazia). Sem catálogo não há como resolver id nenhum, e a tela já mostra o erro.
  if (get(catalogStore).status !== 'ready') return () => {};

  // A decisão "preset ou query" é tomada UMA vez, com os params já montados: o preset é aplicado
  // pelo laço abaixo (uma `adicionarSerie` por id), sem as emissões escreverem a URL.
  const params = new URLSearchParams(searchAtual());
  const ids = params.has('series') ? lerIds(searchAtual()) : presetIds(agora);

  /** store → URL: preserva as outras chaves da query e não reescreve quando nada muda. */
  const escreverUrl = (itens) => {
    const atual = searchAtual();
    const proximo = escreverSearch(itens.map((i) => i.id), atual);
    if (proximo === atual) return;
    const url = `${win.location.pathname}${proximo ? `?${proximo}` : ''}${win.location.hash ?? ''}`;
    win.history.replaceState(null, '', url);
  };

  for (const id of ids) {
    const entry = indicadorPorId(id);
    if (!entry) continue; // id desconhecido: ignorado, sem lançar
    await adicionarSerie(entry, { fetchImpl });
  }

  // Assina DEPOIS de restaurar: a primeira emissão normaliza a URL (corta 15→10, tira o id
  // desconhecido) e cada mudança seguinte acompanha a store. Nenhuma leitura de volta.
  /**
   * Marcador de que o `?series=` desta URL foi escrito AQUI (preset do dia), não veio de link
   * compartilhado. Sem ele, o `location.reload()` do consentimento transforma o preset em
   * "entrou com link" e o tour nunca abre para quem acabou de aceitar (medido em 2026-11-01).
   * `sessionStorage` porque a resposta vale para ESTA aba: um link compartilhado aberto em aba
   * nova não herda o marcador e continua não recebendo tour.
   *
   * O preset entra na URL com UMA escrita explícita, aqui, e só depois a assinatura é
   * registrada — sem isto o laço de `adicionarSerie` faria uma escrita por série. E fica DENTRO
   * desta passada única (não no boot) de propósito: a retomada depois do "Tentar de novo"
   * também aplica o preset, e o marcador tem de acompanhar as duas.
   */
  if (!params.has('series')) {
    escreverUrl(get(seriesStore).itens);
    try {
      win.sessionStorage.setItem(CHAVE_SERIES_DO_APP, '1');
    } catch {
      /* modo privado: sem marcador, o pior caso é o de antes (sem tour após o consentimento) */
    }
  }

  assinatura?.(); // uma por documento: a anterior morre aqui (ver `assinatura`)
  assinatura = seriesStore.subscribe((s) => escreverUrl(s.itens));
  return assinatura;
}

/**
 * O boot: espera o catálogo (que a `App` dispara no `onMount`), depois entrega para a passada
 * única de leitura da URL. Se o catálogo não vier, a retomada fica nas mãos do "Tentar de novo".
 *
 * @param {{window?: Window, fetchImpl?: typeof fetch, agora?: Date}} [opcoes]
 * @returns {Promise<() => void>} o cancelamento da assinatura (útil para testes)
 */
export async function iniciarPermalink({ window: win = window, fetchImpl, agora = new Date() } = {}) {
  await carregarCatalogo({ fetchImpl });
  await esperarCatalogo();
  return retomarPermalink({ window: win, fetchImpl, agora });
}

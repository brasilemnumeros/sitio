import { get } from 'svelte/store';
import { seriesStore, adicionarSerie } from './stores/series.js';
import { catalogStore, carregarCatalogo, indicadorPorId } from './stores/catalog.js';
import { lerIds, escreverSearch } from './permalink.js';
import { presetDoDia, dataEmSaoPaulo } from './data/presets.js';

/**
 * Liga o permalink (`?series=`) aos stores — o que impede a migração de entrar com
 * regressão: os posts linkam `/?series=<ids>` e o app novo precisa restaurá-los.
 *
 * A LEITURA da query acontece UMA vez, na entrada. A ESCRITA é unidirecional (store → URL).
 * Ler de volta o que se escreveu é o defeito conhecido do `adapter.js:79` — não se repete aqui.
 */

/** Ids do preset do dia. Relógio injetável (`agora`) e dia de São Paulo, nunca o do navegador. */
const presetIds = (agora) => presetDoDia(dataEmSaoPaulo(agora))?.indicadores ?? [];

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

/**
 * Lê `?series=` na entrada, resolve cada id contra o catálogo (id desconhecido é
 * ignorado em silêncio) e adiciona as séries UMA A UMA — o caminho do produto. Depois
 * assina `seriesStore` para escrever a URL com `replaceState` (nunca `pushState`).
 *
 * SEM a chave `series` a home entra com o PRESET DO DIA (determinístico por dia, em São
 * Paulo). A chave presente vence sempre — mesmo que não sobre nenhum id válido —, para o
 * link de quem compartilhou não ser trocado por um preset.
 *
 * @param {{window?: Window, fetchImpl?: typeof fetch, agora?: Date}} [opcoes]
 * @returns {Promise<() => void>} o cancelamento da assinatura (útil para testes)
 */
export async function iniciarPermalink({ window: win = window, fetchImpl, agora = new Date() } = {}) {
  const searchAtual = () => (win.location.search || '').replace(/^\?/, '');
  // A decisão "preset ou query" é tomada UMA vez, com os params já montados: o preset é
  // aplicado pelo laço abaixo (uma adicionarSerie por id), sem as emissões escreverem a URL.
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

  await carregarCatalogo({ fetchImpl });
  await esperarCatalogo();

  // Catálogo quebrado: NÃO apagar o permalink do usuário (a assinatura abaixo escreveria a
  // URL vazia). Sem catálogo não há como resolver id nenhum, e a tela já mostra o erro.
  if (get(catalogStore).status !== 'ready') return () => {};

  for (const id of ids) {
    const entry = indicadorPorId(id);
    if (!entry) continue; // id desconhecido: ignorado, sem lançar
    await adicionarSerie(entry, { fetchImpl });
  }

  // Assina DEPOIS de restaurar: a primeira emissão normaliza a URL (corta 15→10, tira o id
  // desconhecido) e cada mudança seguinte acompanha a store. Nenhuma leitura de volta.
  //
  // O preset entra na URL com UMA escrita explícita, aqui, e só depois a assinatura é
  // registrada — sem isto o laço de `adicionarSerie` faria uma escrita por série.
  if (!params.has('series')) escreverUrl(get(seriesStore).itens);
  return seriesStore.subscribe((s) => escreverUrl(s.itens));
}

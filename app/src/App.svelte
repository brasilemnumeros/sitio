<script>
  import { onMount } from 'svelte';
  import { catalogStore, carregarCatalogo } from './stores/catalog.js';
  import { seriesStore, adicionarSerie, tentarNovamente } from './stores/series.js';
  import { carregarMandatos } from './stores/mandate.js';
  import Chart from './components/Chart.svelte';
  import SeriesChips from './components/SeriesChips.svelte';
  import TimeFilters from './components/TimeFilters.svelte';
  import EstadoInicial from './components/EstadoInicial.svelte';
  import Esqueleto from './components/Esqueleto.svelte';
  import ErroTotal from './components/ErroTotal.svelte';
  // 🔴 Só se importa o que JÁ EXISTE. Um import de arquivo inexistente QUEBRA O BUILD —
  // e é o defeito que o pré-voo desta fatia achou. Os demais componentes entram pelos
  // marcadores de posição abaixo, e cada tarefa troca o seu.

  let buscaAberta = $state(false);
  let itens = $derived($seriesStore.itens);

  // §9.3 — erro TOTAL é quando NADA carregou; com uma série de pé, é degradação PARCIAL e o
  // chip de erro cuida dela. Estes dois ramos leem só o `status` dos itens (§8).
  let todosEmErro = $derived(itens.length > 0 && itens.every((i) => i.status === 'erro'));
  let todosCarregando = $derived(
    itens.length > 0 && itens.every((i) => i.status === 'carregando'),
  );

  // O motivo vem das PRÓPRIAS séries: a mensagem do validador já diz o que houve — um `schema`
  // não suportado, por exemplo, chega com a palavra "schema" (§6). NUNCA "erro desconhecido":
  // o vazio sempre diz por quê (§9). Várias séries → um motivo por linha.
  let motivoErro = $derived.by(() => {
    const falhas = itens.filter((i) => i.status === 'erro' && i.error);
    if (falhas.length === 0) return null;
    if (falhas.length === 1) return falhas[0].error;
    return falhas.map((i) => `${i.name}: ${i.error}`).join('\n');
  });

  // §9.1 — o atalho de primeiro uso. Os IDs vivem no `indicators.json`; o par "Selic × IPCA" é
  // RESOLVIDO no catálogo carregado NA HORA DE ADICIONAR — nada de hardcodar nome nem URL aqui.
  const EXEMPLO_IDS = ['selic-meta-acum-12m', 'ipca-acum-12m'];

  function pedirExemplo() {
    const { indicators } = $catalogStore;
    for (const id of EXEMPLO_IDS) {
      const entry = indicators.find((i) => i.id === id);
      if (entry) adicionarSerie(entry);
    }
  }

  /** O "tentar de novo" do erro total: refaz o fetch de CADA série (uma a uma, como no add). */
  function tentarTodas() {
    for (const item of itens) tentarNovamente(item.id);
  }

  onMount(() => {
    carregarCatalogo();
    carregarMandatos();
  });
</script>

<!-- A ORDEM DESTES SEIS BLOCOS É A DA §1, LITERAL. Não reordenar. -->
<main class="mx-auto flex max-w-6xl flex-col gap-4 p-4">
  <!-- 1 · busca -->
  <button class="rounded border px-3 py-2 text-left" onclick={() => (buscaAberta = true)}>
    Buscar indicador…
  </button>

  <!-- 2 · chips -->
  <SeriesChips />

  <!-- 3 · gráfico (ou o estado que o substitui) + a LEGENDA, que é o canal redundante
       de identificação (§12.2) e fica FORA do gráfico de propósito: com 10 séries os
       rótulos da lib ocupam 80% da altura da área de plot. -->
  {#if itens.length === 0}
    <EstadoInicial aoAbrirBusca={() => (buscaAberta = true)} aoPedirExemplo={pedirExemplo} />
  {:else if todosEmErro}
    <!-- §9.3 — erro TOTAL: nada carregou. Sem marcador próprio (R29) — é um ramo a mais. -->
    <ErroTotal
      titulo="Não foi possível carregar os dados"
      motivo={motivoErro}
      aoTentarNovamente={tentarTodas}
    />
  {:else if todosCarregando}
    <Esqueleto />
  {:else}
    <Chart />
    <!-- TODO(T5): <SeriesLegend /> -->
    <div class="text-sm opacity-50" data-bloco="legenda">[3 · legenda das séries]</div>
  {/if}

  <!-- 4 · filtros de tempo — controle do gráfico, escreve no store `viewport` (§8.1). -->
  <TimeFilters />

  <!-- 5 · trilho — TODO(fatia 09): <MandateRail /> -->
  <div class="text-sm opacity-50" data-bloco="trilho">[5 · trilho de mandatos]</div>

  <!-- 6 · painel de comparação, SEMPRE visível, largura total (§1) — não é aba.
       TODO(fatia 09): <ComparisonPanel /> -->
  <div class="text-sm opacity-50" data-bloco="comparacao">[6 · painel de comparação]</div>

  {#if buscaAberta}
    <!-- TODO(fatia 08): <SearchModal aoFechar={...} /> — e o overlay abaixo vira parte dela.
         É um <button>, não um <div>: um <div> com onclick dispara dois avisos de
         acessibilidade do Svelte (sem handler de teclado, sem role) — medido no dev server
         em 2026-10-15. O overlay É clicável para fechar, então <button> é o elemento certo
         e resolve os dois de uma vez, ainda ganhando o foco por teclado. -->
    <button
      type="button"
      class="fixed inset-0 cursor-default border-0 bg-black/40 p-0"
      aria-label="Fechar a busca"
      onclick={() => (buscaAberta = false)}
    ></button>
  {/if}
</main>

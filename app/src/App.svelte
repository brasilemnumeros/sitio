<script>
  import { onMount } from 'svelte';
  import { catalogStore, carregarCatalogo } from './stores/catalog.js';
  import { seriesStore } from './stores/series.js';
  import { carregarMandatos } from './stores/mandate.js';
  import Chart from './components/Chart.svelte';
  import SeriesChips from './components/SeriesChips.svelte';
  // 🔴 Só se importa o que JÁ EXISTE. Um import de arquivo inexistente QUEBRA O BUILD —
  // e é o defeito que o pré-voo desta fatia achou. Os demais componentes entram pelos
  // marcadores de posição abaixo, e cada tarefa troca o seu.

  let buscaAberta = $state(false);
  let { status } = $derived($catalogStore);
  let itens = $derived($seriesStore.itens);

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
    <!-- TODO(T4): <EstadoInicial aoPedirExemplo={...} /> -->
    <div class="text-sm opacity-50" data-bloco="inicial">[3 · estado inicial]</div>
  {:else if itens.every((i) => i.status === 'carregando')}
    <!-- TODO(T4): <Esqueleto /> -->
    <div class="text-sm opacity-50" data-bloco="esqueleto">[3 · carregando]</div>
  {:else}
    <Chart />
    <!-- TODO(T5): <SeriesLegend /> -->
    <div class="text-sm opacity-50" data-bloco="legenda">[3 · legenda das séries]</div>
  {/if}

  <!-- 4 · filtros de tempo — TODO(T3): trocar por <TimeFilters /> -->
  <div class="text-sm opacity-50" data-bloco="filtros">[4 · filtros de tempo]</div>

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

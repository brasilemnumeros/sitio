<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { criarAdapter } from '../chart/adapter.js';
  import { criarNavigator } from '../chart/navigator.js';
  import { seriesStore } from '../stores/series.js';
  import { mandateStore, carregarMandatos } from '../stores/mandate.js';
  import { viewportStore, definirJanela } from '../stores/viewport.js';

  let container;
  let containerMini;

  onMount(() => {
    // adapter → store: o callback EXPLÍCITO (§8.1). O gráfico não é dono do estado.
    const adapter = criarAdapter(container, { aoMudarJanela: (j) => definirJanela(j) });
    const navigator = criarNavigator(containerMini, {
      // Arrastar no minimapa muda a janela — e a mudança entra pelo MESMO caminho (a store).
      aoMudarJanela: (j) => definirJanela(j),
    });

    // O minimapa desenha faixas E séries: as duas fontes podem chegar em qualquer ordem.
    // Por isso ele é atualizado tanto pela mudança das SÉRIES quanto pela dos MANDATOS —
    // sem isto, os mandatos que chegam depois da última série nunca viram faixa no minimapa.
    const atualizarMinimapa = () => {
      const ok = get(seriesStore).itens.filter((i) => i.status === 'ok');
      navigator.definirFaixas(get(mandateStore).mandatos, ok.flatMap((i) => i.series?.data ?? []));
    };

    // store → adapter: a direção que faltava. O adapter é espelho, não dono.
    const pararSeries = seriesStore.subscribe(({ itens }) => {
      adapter.definirSeries(itens.filter((i) => i.status === 'ok'));
      atualizarMinimapa();
    });
    const pararMandatos = mandateStore.subscribe(({ mandatos }) => {
      adapter.definirFaixas(mandatos);
      atualizarMinimapa();
    });
    // A janela volta para o gráfico quando a store muda — inclusive quando quem mudou foi o
    // minimapa. E a MESMA janela vai para o minimapa: é ele que desenha a cortina (§2).
    const pararJanela = viewportStore.subscribe((j) => {
      adapter.definirJanela(j);
      navigator.mostrarJanela(j);
    });

    // O mandato é contexto: se os governos não vierem, o gráfico segue (§9.3).
    carregarMandatos();

    return () => {
      pararSeries(); pararMandatos(); pararJanela();
      navigator.destruir();
      adapter.destruir();
    };
  });
</script>

<div bind:this={container} class="h-[480px] w-full" data-testid="grafico"></div>
<div bind:this={containerMini} class="mt-2 h-[48px] w-full" data-testid="minimapa"></div>

<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { criarAdapter } from '../chart/adapter.js';
  import { criarNavigator } from '../chart/navigator.js';
  import { seriesStore } from '../stores/series.js';
  import { axesStore, recalcularEixos } from '../stores/axes.js';
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

    // As séries `ok` na forma que o `axesStore` entende (`{id, unit, data}`), como na fatia 05.
    const seriesOk = () => get(seriesStore).itens.filter((i) => i.status === 'ok');
    const paraEixo = (i) => ({ id: i.id, unit: i.series?.unit, data: i.series?.data ?? [] });

    // O minimapa desenha faixas E séries: as duas fontes podem chegar em qualquer ordem.
    // Por isso ele é atualizado tanto pela mudança das SÉRIES quanto pela dos MANDATOS —
    // sem isto, os mandatos que chegam depois da última série nunca viram faixa no minimapa.
    const atualizarMinimapa = () => {
      const ok = get(seriesStore).itens.filter((i) => i.status === 'ok');
      navigator.definirFaixas(get(mandateStore).mandatos, ok.flatMap((i) => i.series?.data ?? []));
    };

    // ⚠ A ORDEM IMPORTA (§5): o eixo é DERIVADO das séries, então `recalcularEixos` roda
    //   aqui — depois de as séries ficarem `ok` e ANTES de o adapter desenhar. O desenho em si
    //   não é feito neste subscriber: ele é feito no de `axesStore`, logo abaixo. Assim o
    //   adapter nunca recebe uma atribuição um passo atrás do que está na tela.
    const pararSeries = seriesStore.subscribe(() => {
      recalcularEixos(seriesOk().map(paraEixo));
      atualizarMinimapa();
    });
    // store → adapter: a terceira assinatura. Aqui o adapter recebe a atribuição de eixo JUNTO
    // com as séries — as duas coisas saem juntas, então não há como ficarem dessincronizadas.
    const pararEixos = axesStore.subscribe(({ atribuicao }) => {
      adapter.definirSeries(seriesOk(), atribuicao);
    });
    // As faixas são REANEXADAS só quando a LISTA de mandatos muda: um clique de seleção não
    // deve recriar a primitiva (nem apagar, por um instante, o realce que ela acabou de pintar).
    let mandatosAnteriores;
    const pararMandatos = mandateStore.subscribe(({ mandatos, selecionado }) => {
      if (mandatos !== mandatosAnteriores) {
        mandatosAnteriores = mandatos;
        adapter.definirFaixas(mandatos);
        atualizarMinimapa();
      }
      // §8.1 — store → adapter: aqui a SELEÇÃO é ESPELHADA, nunca decidida. O trilho escreve
      // no `mandateStore` (`selecionarMandato`/`limparSelecao`); este é o outro lado que
      // faltava ligar (T3 da fatia 09). `null` apaga o realce — clicar de novo limpa.
      adapter.destacarMandato(selecionado);
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
      pararSeries(); pararEixos(); pararMandatos(); pararJanela();
      navigator.destruir();
      adapter.destruir();
    };
  });
</script>

<div bind:this={container} class="h-[480px] w-full" data-testid="grafico"></div>
<div bind:this={containerMini} class="mt-2 h-[48px] w-full" data-testid="minimapa"></div>

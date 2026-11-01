<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { criarAdapter } from '../chart/adapter.js';
  import { criarNavigator } from '../chart/navigator.js';
  import ChartLegend from './ChartLegend.svelte';
  import ChartTooltip from './ChartTooltip.svelte';
  import { seriesStore, dataMaximaStore } from '../stores/series.js';
  import { axesStore, recalcularEixos } from '../stores/axes.js';
  import { mandateStore, carregarMandatos, aplicarMandato } from '../stores/mandate.js';
  import { viewportStore, definirJanela, aoEscolherJanela } from '../stores/viewport.js';
  import { definirCursor, limparCursor } from '../stores/cursor.js';

  let container;
  let containerMini;
  /** Largura REAL da escala de preço da esquerda, em px (0 quando ela não é desenhada).
   *  A legenda do gráfico usa isto para não cobrir os rótulos dela no caso de DOIS eixos. */
  let margemEsquerda = $state(0);
  /** Largura REAL da escala de preço da DIREITA, em px — a caixa do cursor não pode passar por
   *  cima dela (2026-11-01, a pedido do usuário: "não sobrepor o eixo Y"). */
  let margemDireita = $state(0);
  /** Área ocupada pela LEGENDA dentro do pane, relativa ao canto do pane: `{x,y,w,h}` ou `null`.
   *  Medida aqui porque quem conhece o contêiner é este componente; a caixa só recebe o número. */
  let caixaLegenda = $state(null);
  /** Tamanho do pane, em px. `bind:clientWidth/clientHeight` no próprio div — `container` é uma
   *  variável comum (o `bind:this` dela não é reativo), e a caixa do cursor precisa do número
   *  atualizado a cada mudança de layout. Sem isto ela calculava a área útil com largura 0 e
   *  encostava no canto (defeito pego em 2026-11-01). */
  let paneLargura = $state(0);
  let paneAltura = $state(0);

  // A caixa do cursor não pode cobrir a legenda — então a legenda é medida, não adivinhada. Roda
  // quando o conjunto de séries muda (a lista encolhe/cresce) e quando as escalas mudam de largura
  // (a legenda anda com `deslocamento`).
  $effect(() => {
    const n = $seriesStore.itens.length;
    const esq = margemEsquerda;
    void paneLargura; // a legenda se reposiciona quando o pane muda de largura
    if (!container || n === 0 || esq === undefined) {
      caixaLegenda = null;
      return;
    }
    const el = container.querySelector('[data-testid="legenda-grafico"]');
    if (!el) {
      caixaLegenda = null;
      return;
    }
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    caixaLegenda = { x: r.x - c.x, y: r.y - c.y, w: r.width, h: r.height };
  });

  onMount(() => {
    // adapter → store: o callback EXPLÍCITO (§8.1). O gráfico não é dono do estado.
    const adapter = criarAdapter(container, {
      aoMudarJanela: (j) => definirJanela(j),
      // Cursor (§2026-11-01): a data sob o mouse vai para a store, e a LEGENDA desenha o valor.
      // O gráfico continua espelho — ele publica, não renderiza número.
      aoMoverCursor: (iso, x, y) => definirCursor(iso, x, y),
    });
    const navigator = criarNavigator(containerMini, {
      // Arrastar no minimapa muda a janela — e a mudança entra pelo MESMO caminho (a store).
      // ⚠ E `escolhaDoUsuario`: quem arrastou foi o usuário, então o enquadramento automático para
      //   e uma série adicionada depois NÃO move a janela (§8.1). O eco do gráfico (`definirJanela`
      //   do adapter, acima) não declara nada — ele é reação, não escolha.
      aoMudarJanela: (j) => definirJanela(j, { escolhaDoUsuario: true }),
      // Clique (sem arrasto) numa faixa escolhe o MANDATO — a mesma regra do chip e do trilho
      // (`aplicarMandato`), aqui só a ponte do gráfico para a store. O minimapa NÃO escreve
      // estado: ele avisa, e `aplicarMandato` é quem seleciona e move a janela (§8.1).
      aoEscolherMandato: (id) => aplicarMandato(id, get(dataMaximaStore)),
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
    // ...e o adapter precisa saber se ESSA janela é do usuário: o filtro de tempo e o minimapa
    // avisam por aqui (o eco do próprio adapter não). É o que separa "re-enquadre" de "não mexa".
    const pararEscolha = aoEscolherJanela((doUsuario) => adapter.aJanelaEDoUsuario(doUsuario));

    // O minimapa cobre a MESMA área de plotagem do gráfico grande (§2): as escalas de preço
    // reservam faixas nas pontas, e sem isto a cortina e as faixas do minimapa não caem sob as
    // do gráfico acima. O sinal é a geometria do adapter — não um número fixo, que mentiria
    // assim que um rótulo mudasse de largura. Detalhe e números em `navigator.alinharCom`.
    const sincronizarPlotagem = () => {
      const larguras = adapter.largurasDasEscalas();
      margemEsquerda = Math.round(larguras.esquerda ?? 0);
      margemDireita = Math.round(larguras.direita ?? 0);
      navigator.alinharCom(() => larguras);
    };
    adapter.aoMudarPlotagem(sincronizarPlotagem);
    sincronizarPlotagem();

    // O mandato é contexto: se os governos não vierem, o gráfico segue (§9.3).
    carregarMandatos();

    return () => {
      pararSeries(); pararEixos(); pararMandatos(); pararJanela(); pararEscolha();
      // Sem isto, desmontar o gráfico com o cursor em cima deixaria a caixa com a última data.
      limparCursor();
      navigator.destruir();
      adapter.destruir();
    };
  });
</script>

<div class="flex min-h-0 flex-1 flex-col gap-2">
  <!-- `relative` é da LEGENDA: ela é `absolute` no canto superior esquerdo, dentro do gráfico
       (o padrão do TradingView). O `data-testid="grafico"` fica no div da lib — a geometria dos
       testes mede ele, e a legenda é filha absoluta (não entra na caixa). -->
  <div
    bind:this={container}
    bind:clientWidth={paneLargura}
    bind:clientHeight={paneAltura}
    class="relative min-h-0 flex-1"
    data-testid="grafico"
  >
    <ChartLegend deslocamento={margemEsquerda} />
    <ChartTooltip
      largura={paneLargura}
      altura={paneAltura}
      {margemEsquerda}
      {margemDireita}
      legenda={caixaLegenda}
    />
    <!-- A ESCALA DE PREÇO é desenhada em canvas, então não existe como elemento. O passo
         "arraste para reduzir ou aumentar" do tour de primeira visita precisa de um alvo:
         este div publica a área dela para o DOM, com a largura que o adapter mediu. Sem
         ponteiro (`pointer-events-none`) para não roubar o arrasto do gráfico, e fora da
         árvore de acessibilidade porque não há nada para anunciar. -->
    <div
      class="pointer-events-none absolute top-0 right-0 bottom-0"
      style:width="{margemDireita}px"
      data-testid="escala-y"
      aria-hidden="true"
    ></div>
  </div>
  <div bind:this={containerMini} class="h-10 md:h-12 shrink-0" data-testid="minimapa"></div>
</div>

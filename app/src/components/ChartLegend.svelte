<script>
  // LEGENDA DENTRO DO GRÁFICO (2026-10-31, a pedido do usuário) — o padrão do TradingView:
  // bolinha da cor + nome da série, e à direita o olho (esconder) e o "×" (remover).
  //
  // ⚠ NÃO substitui a legenda da gaveta (seção "Cores"): os papéis são distintos e a decisão
  // foi explícita. Aqui é LEITURA e CONTROLE rápido — "o que está no gráfico?", esconder,
  // remover. Lá é EDIÇÃO do objeto: trocar a cor, voltar à paleta e ver o aviso de cor parecida
  // (que é diagnóstico, não controle). Duas listas, sim; duas listas com o MESMO papel, não.
  //
  // Por que ela pode morar aqui, se a §12.2 tirou os rótulos de dentro do gráfico: aquilo era o
  // `title` da lib, que desenha o rótulo NA PONTA de cada linha — com 10 séries a pilha ocupava
  // 80% da altura. Esta é uma lista fixa no canto, uma linha por série, fora do pane.
  //
  // `pointer-events-none` no invólucro e `auto` só na linha: o resto do canto continua sendo
  // gráfico — dá para arrastar e dar zoom por cima da legenda, exceto em cima dos botões.
  import { seriesStore, alternarVisibilidade, removerSerie } from '../stores/series.js';

  // O topo do pane é dela: desde 2026-11-01 (variante B) o gráfico grande não desenha mais o
  // rótulo das faixas de governo — eles ficam no minimapa, alinhados às mesmas datas.
  /** Largura da escala de preço da ESQUERDA, em px (0 quando ela não existe). Sem isto, no caso
   *  de dois eixos a legenda senta em cima dos rótulos da escala — medido em 2026-11-01 com 9
   *  séries (dois eixos), onde os números apareciam por baixo das linhas da legenda. */
  let { deslocamento = 0 } = $props();

  const itens = $derived($seriesStore.itens);

  // 🗑 O VALOR POR SÉRIE SAIU DAQUI (2026-11-01): chegou a existir nesta legenda, e o usuário
  //    escolheu a CAIXA FLUTUANTE (`ChartTooltip`), que lê a data e os valores como um bloco só.
  //    A leitura do cursor (`cursorStore`) e a regra de valor por data ficam lá.
</script>

<ul
  data-testid="legenda-grafico"
  aria-label="Séries no gráfico"
  style="left:{deslocamento}px"
  class="pointer-events-none absolute top-0 z-10 flex max-h-[45%] max-w-[70%] flex-col items-start gap-1 overflow-y-auto p-2"
>
  {#each itens as item (item.id)}
    <li
      class="pointer-events-auto flex w-fit max-w-full items-center gap-2 rounded bg-[#0e1117]/70 px-2 py-1 text-[13px] leading-5"
    >
      <span
        class="h-2 w-2 shrink-0 rounded-full"
        style="background:{item.cor}"
        aria-hidden="true"
      ></span>
      <span class="min-w-0 truncate {item.oculta ? 'text-slate-500' : 'text-slate-200'}"
        >{item.name}</span
      >

      <!-- Esconder/mostrar. Os dois controles existem nos DOIS layouts. O alvo é o ícone com
           `p-1` (~22px) — é overlay de gráfico, não barra de ferramentas; a superfície de toque
           grande continua sendo a gaveta.
           ⚠ DENSIDADE: 13px + `py-1` é a leitura escolhida (2026-11-01) — a versão apertada
           (11px, sem padding) foi testada e REPROVADA pelo usuário: "linhas muito pequenas e
           próximas". O caso de MUITAS séries é exceção e é contido pelo teto de 45% com rolagem
           interna, não por encolher a linha de todo mundo (9 séries em 12px mediam 266px = 35%
           da plotagem; a lição da §12.2 é sobre o caso extremo, não sobre o normal). -->
      <button
        type="button"
        aria-pressed={item.oculta}
        aria-label={item.oculta ? `Mostrar ${item.name}` : `Esconder ${item.name}`}
        class="shrink-0 p-1 text-slate-400 hover:text-slate-100"
        onclick={() => alternarVisibilidade(item.id)}
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          {#if item.oculta}
            <path d="M3 3l18 18"></path>
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path>
            <path d="M9.4 5.2A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.4 4.2"></path>
            <path d="M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4.2-.9"></path>
          {:else}
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          {/if}
        </svg>
      </button>

      <button
        type="button"
        aria-label="Remover {item.name} do gráfico"
        class="shrink-0 p-1 text-slate-400 hover:text-red-300"
        onclick={() => removerSerie(item.id)}
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12"></path>
          <path d="M18 6 6 18"></path>
        </svg>
      </button>

    </li>
  {/each}
</ul>

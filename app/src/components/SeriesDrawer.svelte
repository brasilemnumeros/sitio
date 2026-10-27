<script>
  // GAVETA DIREITA (T7) — séries, cores e eixos num lugar fixo (§1 do desenho do terminal).
  //
  // São DOIS elementos, não um:
  //   · o TRILHO (`aside[data-testid="trilho-direito"]`, 34px) fica sempre visível — é o gatilho
  //     e o índice da gaveta. É ele que carrega o ponto de atenção quando há série em erro;
  //   · o PAINEL (`aside[data-testid="gaveta-direita"]`, 320px) entra em fluxo ao lado do
  //     gráfico. Em fluxo, e não por cima: abrir a gaveta ENCOLHE o gráfico (que é `flex-1`),
  //     em vez de tapá-lo. E `hidden` quando fechada — um painel só deslocado por `translate`
  //     continuaria na árvore de acessibilidade e focável por TAB.
  //
  // A vista é ÚNICA e rolável, sem abas, com três seções nesta ordem: séries (chips), cores
  // (legenda) e eixos (`AxesPanel`). Os três atalhos do trilho NÃO trocam de painel: rolam até a
  // seção — é a mesma vista, só levada ao ponto certo.
  //
  // O estado `aberta` mora na `App` (é ela que decide a prioridade do `Esc` na T9), por isso a
  // prop é `$bindable`: o gatilho alterna, a App continua sendo a dona do estado.
  //
  // Nada aqui escreve em `viewport` ou `mandate` (§Moldura): abrir e fechar a gaveta é só
  // geometria — o recorte de tempo e o mandato em cena não podem ser zerados por um clique de UI.
  import SeriesChips from './SeriesChips.svelte';
  import SeriesLegend from './SeriesLegend.svelte';
  import AxesPanel from './AxesPanel.svelte';
  import { seriesStore } from '../stores/series.js';

  let {
    aberta = $bindable(false),
    aoFechar = () => {},
    aoAbrirBusca = () => {},
  } = $props();

  /** O gatilho principal — para onde o foco volta quando a gaveta fecha (Esc). */
  let gatilho = $state(null);
  /** O painel — alvo da rolagem dos atalhos (só existe um, e é este). */
  let painel = $state(null);

  const itens = $derived($seriesStore.itens);

  // §Estados: erro PARCIAL e gaveta fechada → o aviso tem de caber no trilho, porque o chip de
  // erro está DENTRO da gaveta. Aberta, o chip já diz o que houve e o ponto sairia de contexto.
  const temErro = $derived(itens.some((i) => i.status === 'erro'));

  function alternar() {
    aberta = !aberta;
  }

  /** Atalho do trilho: leva a vista até a seção. Não troca de painel (§1 — vista única). */
  function irPara(secao) {
    painel?.querySelector(`[data-secao="${secao}"]`)?.scrollIntoView({ block: 'start' });
  }

  /**
   * `Esc` fecha a gaveta e devolve o foco ao gatilho — sem isto o foco ficaria num elemento que
   * acabou de sair da árvore (`hidden`) e o próximo TAB recomeçaria do topo da página.
   *
   * `defaultPrevented` é o que impede o `Esc` da BUSCA de fechar as duas camadas de uma vez: a
   * modal trata a tecla primeiro (o evento sobe do campo até aqui) e marca a tecla como tratada.
   * A prioridade ENTRE camadas é centralizada na T9; aqui só se respeita quem já tratou.
   */
  function aoTeclar(evento) {
    if (evento.key !== 'Escape' || !aberta || evento.defaultPrevented) return;
    evento.preventDefault();
    aoFechar();
    gatilho?.focus();
  }
</script>

<svelte:window onkeydown={aoTeclar} />

<!-- TRILHO · 34px, sempre visível. `aria-expanded`/`aria-controls` descrevem a gaveta que ele
     abre; o `aria-label` inclui o estado de erro porque o ponto é só uma bolinha — quem não vê
     a cor precisa ouvir o motivo. -->
<aside
  data-testid="trilho-direito"
  class="flex w-[34px] shrink-0 flex-col items-center gap-1 border-l border-slate-800 py-1"
  aria-label="Gaveta de séries"
>
  <button
    type="button"
    bind:this={gatilho}
    aria-label={temErro && !aberta ? 'Séries e eixos — há séries com erro' : 'Séries e eixos'}
    aria-expanded={aberta}
    aria-controls="gaveta-direita"
    class="relative flex w-full items-center justify-center rounded px-1 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-slate-100"
    title="Séries e eixos"
    onclick={alternar}
  >
    <span class="[writing-mode:vertical-rl]">Séries</span>
    {#if temErro && !aberta}
      <span
        class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500"
        aria-hidden="true"
      ></span>
    {/if}
  </button>

  <!-- Atalhos: existem só com a gaveta aberta (§1 — fechada, só o gatilho). -->
  {#if aberta}
    <button
      type="button"
      class="w-full rounded px-1 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      onclick={() => irPara('cores')}
    >
      <span class="[writing-mode:vertical-rl]">Cores</span>
    </button>
    <button
      type="button"
      class="w-full rounded px-1 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-slate-100"
      onclick={() => irPara('eixos')}
    >
      <span class="[writing-mode:vertical-rl]">Eixos</span>
    </button>
  {/if}
</aside>

<!-- PAINEL · 320px, em fluxo. `hidden` (e não só `translate`) quando fechado: sem a classe
     `flex` nesse estado, para o `display:flex` do autor não atropelar o `display:none` do
     atributo — é o detalhe que faria a gaveta "fechada" continuar pintando. -->
<aside
  id="gaveta-direita"
  data-testid="gaveta-direita"
  hidden={!aberta}
  aria-label="Séries, cores e eixos"
  class={aberta
    ? 'flex w-[320px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-800 p-3'
    : ''}
>
  <section data-secao="series" class="flex flex-col gap-2">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Séries</h2>
      <button
        type="button"
        class="shrink-0 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-slate-100"
        onclick={aoAbrirBusca}
      >
        + Série
      </button>
    </div>
    <!-- `data-bloco="chips"` sobrevive (§1): o bloco saiu da página, não do produto. -->
    <SeriesChips />
  </section>

  <section data-secao="cores" class="flex flex-col gap-2">
    <h2 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Cores</h2>
    <SeriesLegend />
  </section>

  <section data-secao="eixos" class="flex flex-col gap-2">
    <h2 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Eixos</h2>
    <AxesPanel />
  </section>
</aside>

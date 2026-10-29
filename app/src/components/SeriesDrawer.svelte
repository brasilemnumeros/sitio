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
  // (legenda) e eixos (`AxesPanel`). Os três botões do trilho NÃO trocam de painel nem fecham a
  // gaveta: rolam até a seção — é a mesma vista, só levada ao ponto certo. Fechar é o "×" do
  // cabeçalho (sempre alcançável, porque o cabeçalho é grudado) ou `Esc`.
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
    inativa = false,
  } = $props();

  /** O gatilho principal — para onde o foco volta quando a gaveta fecha (Esc ou "×"). */
  let gatilho = $state(null);
  /**
   * O painel — alvo REAL da rolagem dos atalhos.
   *
   * 🔴 `bind:this` é obrigatório: sem ele `painel` fica `null` para sempre e os atalhos viram
   * botões mortos. O `?.` que havia antes escondia exatamente esse defeito (o clique não fazia
   * nada e nenhum erro aparecia) — por isso o acesso abaixo é direto e denuncia a montagem
   * quebrada em vez de sumir em silêncio.
   */
  let painel = $state(null);

  const itens = $derived($seriesStore.itens);

  // §Estados: erro PARCIAL e gaveta fechada → o aviso tem de caber no trilho, porque o chip de
  // erro está DENTRO da gaveta. Aberta, o chip já diz o que houve e o ponto sairia de contexto.
  const temErro = $derived(itens.some((i) => i.status === 'erro'));

  /**
   * O trilho é um ÍNDICE, não um interruptor. Aberta a gaveta, os TRÊS botões fazem a mesma
   * coisa — levam a vista até a sua seção. O principal não pode se comportar diferente das
   * vizinhas: um botão rotulado "Séries" que fecha a gaveta mente sobre o que faz. Fechar tem
   * dois caminhos explícitos: o "×" do cabeçalho e `Esc`.
   */
  function aoGatilho() {
    if (!aberta) {
      aberta = true;
      return;
    }
    irPara('series');
  }

  /** Atalho do trilho: leva a vista até a seção. Não troca de painel (§1 — vista única). */
  function irPara(secao) {
    if (!painel) throw new Error('gaveta direita sem painel montado (falta `bind:this`)');
    const alvo = painel.querySelector(`[data-secao="${secao}"]`);
    if (!alvo) throw new Error(`gaveta direita sem a seção "${secao}"`);
    alvo.scrollIntoView({ block: 'start' });
  }

  /**
   * Fecha a gaveta e devolve o foco ao gatilho — o mesmo caminho do `Esc` e do "×" do cabeçalho.
   * Sem o foco de volta, ele ficaria num elemento que acabou de sair da árvore (`hidden`) e o
   * próximo TAB recomeçaria do topo da página.
   */
  function fechar() {
    aoFechar();
    gatilho?.focus();
  }

  /**
   * §Teclado (T9) — a gaveta não escuta mais `Esc`: a PRIORIDADE entre camadas (busca → direita
   * → inferior) é da `App`, num listener só. Aqui ficam os dois lados do FOCO, observando o
   * estado: ao abrir, o primeiro controle da gaveta recebe o foco (o "×" do cabeçalho); ao
   * fechar — por `Esc`, "×" ou troca de camada —, ele volta ao gatilho.
   */
  let jaAberta = false;
  $effect(() => {
    if (aberta === jaAberta) return;
    jaAberta = aberta;
    if (aberta) painel?.querySelector('button')?.focus();
    else gatilho?.focus();
  });
</script>

<!-- TRILHO · 44px, sempre visível. `aria-expanded`/`aria-controls` descrevem a gaveta que ele
     abre; o `aria-label` inclui o estado de erro porque o ponto é só uma bolinha — quem não vê
     a cor precisa ouvir o motivo. -->
<aside
  data-testid="trilho-direito"
  inert={inativa}
  class="flex w-10 shrink-0 flex-col items-center gap-1.5 border-l border-slate-800 py-1.5 md:w-11"
  aria-label="Gaveta de séries"
>
  <button
    type="button"
    bind:this={gatilho}
    aria-label={temErro && !aberta ? 'Séries e eixos — há séries com erro' : 'Séries e eixos'}
    aria-expanded={aberta}
    aria-controls="gaveta-direita"
    class="relative flex min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:min-h-0 md:text-[13px]"
    title={aberta ? 'Ir para as séries' : 'Abrir séries e eixos'}
    onclick={aoGatilho}
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
      class="w-full min-h-11 rounded px-1 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:min-h-0 md:text-[13px]"
      onclick={() => irPara('cores')}
    >
      <span class="[writing-mode:vertical-rl]">Cores</span>
    </button>
    <button
      type="button"
      class="w-full min-h-11 rounded px-1 py-2.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:min-h-0 md:text-[13px]"
      onclick={() => irPara('eixos')}
    >
      <span class="[writing-mode:vertical-rl]">Eixos</span>
    </button>
  {/if}
</aside>

<!-- VÉU da folha lateral no celular (T9). Fica FORA do `<aside>`: um `fixed` dentro de um
     ancestral com `overflow-y-auto` é frágil de raciocinar. `md:hidden` porque no desktop a
     gaveta é uma coluna em fluxo, não uma folha. Só existe com a gaveta aberta. -->
{#if aberta}
  <button
    type="button"
    class="fixed inset-0 z-30 cursor-default border-0 bg-black/40 p-0 md:hidden"
    aria-label="Tocar fora para fechar a gaveta"
    onclick={fechar}
  ></button>
{/if}

<!-- PAINEL · 320px, em fluxo. `hidden` (e não só `translate`) quando fechado: sem a classe
     `flex` nesse estado, para o `display:flex` do autor não atropelar o `display:none` do
     atributo — é o detalhe que faria a gaveta "fechada" continuar pintando.
     `bind:this={painel}`: é ELE que os atalhos do trilho rolam (sem isto, botão morto).
     No celular (T9) vira folha lateral de 88% da largura, por cima do gráfico. -->
<aside
  id="gaveta-direita"
  data-testid="gaveta-direita"
  bind:this={painel}
  hidden={!aberta}
  inert={inativa}
  aria-label="Séries, cores e eixos"
  class={aberta
    ? 'flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-slate-800 bg-[#0e1117] max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:w-[88%] max-md:shadow-2xl'
    : ''}
>
  <!-- Cabeçalho grudado: com a gaveta rolada até o fim, o botão de fechar continua alcançável.
       O fundo é próprio (`bg-slate-900`) para o conteúdo não passar por baixo do título — e NÃO a
       classe-canário do `<main>`, que aparece uma vez só (§10.3). O padding mora AQUI e nas
       seções (não no `<aside>`): com padding no invólucro, sobrava uma faixa transparente acima
       do cabeçalho grudado e o conteúdo aparecia por ela durante a rolagem. -->
  <div
    class="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2"
  >
    <h2 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Séries e eixos</h2>
    <button
      type="button"
      class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded px-2 text-lg leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:min-h-0 md:min-w-0"
      aria-label="Fechar séries"
      title="Fechar séries"
      onclick={fechar}
    >
      ×
    </button>
  </div>

  <div class="flex flex-col gap-4 p-3">
    <section data-secao="series" class="flex scroll-mt-10 flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Séries</h3>
        <button
          type="button"
          class="min-h-11 shrink-0 rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-slate-100 md:min-h-0"
          onclick={aoAbrirBusca}
        >
          + Série
        </button>
      </div>
      <!-- `data-bloco="chips"` sobrevive (§1): o bloco saiu da página, não do produto. -->
      <SeriesChips />
    </section>

    <section data-secao="cores" class="flex scroll-mt-10 flex-col gap-2">
      <h3 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Cores</h3>
      <SeriesLegend />
    </section>

    <section data-secao="eixos" class="flex scroll-mt-10 flex-col gap-2">
      <h3 class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Eixos</h3>
      <AxesPanel />
    </section>
  </div>
</aside>

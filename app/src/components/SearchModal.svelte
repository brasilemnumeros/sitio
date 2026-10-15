<script>
  // §1.1 — a modal de busca: cascata de três colunas (grupo → indicador → ficha).
  //
  // A cascata é a FORMA da lista; a digitação colapsa tudo numa lista só. Os dois modos
  // convivem sobre o mesmo estado de foco (§12.1).
  //
  // §8 — nada de estado global: o dado vem TODO das stores (`catalogStore`, `seriesStore`),
  // e aqui só vive estado de UI efêmero (o termo digitado e o foco por teclado). O
  // componente não conhece a Lightweight Charts nem mexe em `window`.
  import { catalogStore, indicadoresDoGrupo, buscarIndicadores } from '../stores/catalog.js';
  import {
    seriesStore,
    adicionarSerie,
    motivoDoLimite,
    LIMITE_SERIES,
  } from '../stores/series.js';

  /** Prop única: chamada ao fechar por ESC ou clique fora (§1.1). */
  let { aoFechar } = $props();

  let termo = $state('');
  let focoColuna = $state(1); // 1 = grupos · 2 = indicadores
  let focoGrupo = $state(0);
  let focoIndicador = $state(0);
  /** O indicador cuja ficha está aberta na coluna 3 — distinto do foco (§12.1: ⏎ ABRE a ficha). */
  let indicadorAberto = $state(null);
  let buscaEl = $state(null);

  let buscando = $derived(termo.trim() !== '');
  let grupos = $derived(Object.entries($catalogStore.groups));
  let grupoAtivo = $derived(grupos[focoGrupo]?.[0] ?? null);

  // `$catalogStore.indicators` é lido de propósito: registra a dependência reativa para a
  // lista se recompor quando o catálogo termina de carregar (o `buscarIndicadores` lê a
  // store por dentro, o que não basta para o rastreio de runes).
  let lista = $derived.by(() => {
    void $catalogStore.indicators;
    return buscando ? buscarIndicadores(termo) : indicadoresDoGrupo(grupoAtivo);
  });

  // §9.5 — o teto é da PALETA, não do layout. A frase do motivo vem pronta da store; aqui
  // só se decide QUANDO mostrá-la. `$seriesStore` é lido para a derivação reagir à seleção.
  let itens = $derived($seriesStore.itens);
  let noLimite = $derived(itens.length >= LIMITE_SERIES);

  const jaNoGrafico = (id) => itens.some((i) => i.id === id);

  const prender = (i, n) => (n === 0 ? 0 : Math.max(0, Math.min(n - 1, i)));

  const classeLinha = (ativo) =>
    [
      'block w-full rounded px-3 py-2 text-left text-sm',
      ativo
        ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    ].join(' ');

  // Foco automático no campo de busca ao abrir (§12.1) — por efeito, não pelo atributo
  // `autofocus` (o atributo dispara aviso de a11y do Svelte).
  $effect(() => {
    buscaEl?.focus();
  });

  function abrirFicha(ind) {
    if (ind) indicadorAberto = ind;
  }

  function escolherGrupo(i) {
    focoColuna = 1;
    focoGrupo = i;
    focoIndicador = 0;
  }

  function escolherIndicador(ind, i) {
    focoColuna = 2;
    focoIndicador = i;
    abrirFicha(ind);
  }

  /**
   * Uma regra só de teclado, presa aos elementos interativos (input e botões) — nunca a um
   * contêiner não-interativo, o que dispararia aviso de a11y do Svelte. Como o foco vive num
   * item e não numa coluna (§12.1), os elementos compartilham este handler.
   */
  function aoTeclado(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // §12.1 — fechar a ficha primeiro; sem ficha com ação própria nesta tarefa, ESC fecha a modal.
      aoFechar();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      if (focoColuna === 1 && !buscando) {
        focoGrupo = prender(focoGrupo + dir, grupos.length);
        focoIndicador = 0;
      } else {
        focoIndicador = prender(focoIndicador + dir, lista.length);
      }
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // §12.1 — durante a digitação, ←→ fica inerte.
      if (buscando) return;
      e.preventDefault();
      focoColuna = focoColuna === 1 ? 2 : 1;
      if (focoColuna === 2) focoIndicador = 0;
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (focoColuna === 1 && !buscando) {
        // ⏎ no grupo entra na coluna dos indicadores, focando o primeiro.
        focoColuna = 2;
        focoIndicador = 0;
      } else {
        abrirFicha(lista[focoIndicador]);
      }
    }
  }
</script>

<div class="fixed inset-0 z-40">
  <!-- Clique fora fecha (§1.1). É um <button>, não um <div onclick>: um <div> com onclick
       dispara dois avisos de a11y do Svelte (R31). -->
  <button
    type="button"
    class="absolute inset-0 cursor-default border-0 bg-black/40 p-0"
    aria-label="Fechar a busca"
    onclick={aoFechar}
    onkeydown={aoTeclado}
  ></button>

  <div
    role="dialog"
    aria-modal="true"
    aria-label="Buscar indicadores"
    class="absolute left-1/2 top-16 flex max-h-[80vh] w-[min(1000px,92vw)] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
  >
    <!-- busca — disponível sobre as três colunas; digitar colapsa a cascata numa lista (§1.1) -->
    <div class="border-b border-slate-200 p-3 dark:border-slate-700">
      <input
        bind:this={buscaEl}
        bind:value={termo}
        onkeydown={aoTeclado}
        oninput={() => (focoIndicador = 0)}
        type="search"
        aria-label="Buscar indicador"
        placeholder="Buscar indicador…"
        class="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
      />
    </div>

    <div class="flex min-h-0 flex-1">
      {#if buscando}
        <!-- digitação: a cascata vira uma lista só, cobrindo as três colunas (§1.1) -->
        <ul
          data-coluna="resultados"
          aria-label="Resultados da busca"
          class="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {#if lista.length === 0}
            <li class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
              Nenhum indicador para «{termo}».
            </li>
          {/if}
          {#each lista as ind, i (ind.id)}
            <li class="flex items-center gap-2">
              <input
                type="checkbox"
                disabled
                checked={jaNoGrafico(ind.id)}
                aria-label={jaNoGrafico(ind.id)
                  ? `${ind.name}: já está no gráfico`
                  : `${ind.name}: não está no gráfico`}
                class="h-4 w-4 shrink-0"
              />
              <button
                type="button"
                onclick={() => escolherIndicador(ind, i)}
                onkeydown={aoTeclado}
                class={classeLinha(focoIndicador === i)}
              >
                {ind.name}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <!-- coluna 1 · grupos — os 7 do `indicators.json` (§1.1) -->
        <ul
          data-coluna="1"
          aria-label="Grupos"
          class="min-h-0 w-56 shrink-0 overflow-y-auto border-r border-slate-200 p-2 dark:border-slate-700"
        >
          {#each grupos as [id, g], i (id)}
            <li>
              <button
                type="button"
                onclick={() => escolherGrupo(i)}
                onkeydown={aoTeclado}
                class={classeLinha(focoColuna === 1 && focoGrupo === i)}
              >
                {g.name}
              </button>
            </li>
          {/each}
        </ul>

        <!-- coluna 2 · indicadores do grupo, com caixa de seleção (§1.1) -->
        <ul
          data-coluna="2"
          aria-label="Indicadores do grupo"
          class="min-h-0 w-72 shrink-0 overflow-y-auto border-r border-slate-200 p-2 dark:border-slate-700"
        >
          {#if lista.length === 0}
            <li class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
              Escolha um grupo.
            </li>
          {/if}
          {#each lista as ind, i (ind.id)}
            <li class="flex items-center gap-2">
              <input
                type="checkbox"
                disabled
                checked={jaNoGrafico(ind.id)}
                aria-label={jaNoGrafico(ind.id)
                  ? `${ind.name}: já está no gráfico`
                  : `${ind.name}: não está no gráfico`}
                class="h-4 w-4 shrink-0"
              />
              <button
                type="button"
                onclick={() => escolherIndicador(ind, i)}
                onkeydown={aoTeclado}
                class={classeLinha(focoColuna === 2 && focoIndicador === i)}
              >
                {ind.name}
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <!-- coluna 3 · a ficha.
           TODO(T2): trocar este bloco por <Ficha indicador={indicadorAberto} {noLimite}
           motivo={motivoDoLimite()} aoAdicionar={(ind) => adicionarSerie(ind)} /> — a ficha
           traz unidade, granularidade, período, nº de pontos, fonte e o AVISO DE ESCALA (§1.1,
           §5). O `data-bloco="ficha"` sobrevive à troca (R29). -->
      <div
        data-bloco="ficha"
        class="min-h-0 w-72 shrink-0 overflow-y-auto p-4"
      >
        {#if indicadorAberto}
          <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {indicadorAberto.name}
          </h3>

          {#if noLimite}
            <!-- §9.5 — visível, desabilitado e DIZENDO o motivo (a paleta). -->
            <p class="mt-2 text-xs text-amber-700 dark:text-amber-400">{motivoDoLimite()}</p>
          {/if}

          <button
            type="button"
            onclick={() => adicionarSerie(indicadorAberto)}
            onkeydown={aoTeclado}
            disabled={noLimite || jaNoGrafico(indicadorAberto.id)}
            class="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {jaNoGrafico(indicadorAberto.id) ? 'Já está no gráfico' : 'Adicionar'}
          </button>
        {:else}
          <p class="text-sm text-slate-500 dark:text-slate-400">
            Escolha um indicador para ver a ficha.
          </p>
        {/if}
      </div>
    </div>
  </div>
</div>

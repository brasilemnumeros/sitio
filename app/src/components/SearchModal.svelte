<script>
  // §1.1 — a modal de busca: cascata de três colunas (grupo → indicador → ficha).
  //
  // A cascata é a FORMA da lista; a digitação colapsa tudo numa lista só. Os dois modos
  // convivem sobre o mesmo estado de foco (§12.1).
  //
  // §12.1 — em `< 768px` (o `md` do Tailwind) a cascata dá lugar à **"lista com contexto"**:
  // busca fixa no topo, **chips** roláveis dos grupos, lista de uma coluna com cabeçalho de
  // grupo **grudado**, **distintivo de escala** em cada linha e a ficha em **folha deslizante**.
  // Tocar na linha NÃO adiciona — abre a ficha; adicionar exige confirmar.
  //
  // Os dois desenhos coexistem no DOM, alternados por `md:` — **nada em `window`** (§8), logo
  // nada de `matchMedia`. Quem decide o layout é o CSS; o teclado é UMA regra só (§12.1).
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
  import Ficha from './Ficha.svelte';

  /** Prop única: chamada ao fechar por ESC ou clique fora (§1.1). */
  let { aoFechar } = $props();

  let termo = $state('');
  let focoColuna = $state(1); // 1 = grupos · 2 = indicadores
  let focoGrupo = $state(0);
  let focoIndicador = $state(0);
  /** O indicador cuja ficha está aberta na coluna 3 — distinto do foco (§12.1: ⏎ ABRE a ficha). */
  let indicadorAberto = $state(null);
  let buscaEl = $state(null);
  /** §12.1 — o filtro da fileira de chips do celular: `null` = "Todos"; senão um id de grupo. */
  let filtroMobile = $state(null);

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

  // §12.1 — a contagem por grupo nos chips vem do catálogo inteiro (já carregado). Decidido
  // mostrar a contagem: cabe em 320px (medido) e dá o tamanho do grupo sem abrir.
  let contagens = $derived.by(() => {
    const m = {};
    for (const i of $catalogStore.indicators) m[i.group] = (m[i.group] ?? 0) + 1;
    return m;
  });

  // §12.1 — a lista mobile é UMA coluna, com cabeçalho de grupo grudado. Achatada numa
  // sequência de linhas (cabeçalho ou item) para o cabeçalho poder ser `sticky` direto no
  // contêiner de rolagem. `idx` é o índice do item na sequência — é o que o teclado foca.
  let mobileLinhas = $derived.by(() => {
    void $catalogStore.indicators;
    const saida = [];
    let idx = 0;
    const ids = filtroMobile ? [filtroMobile] : grupos.map(([id]) => id);
    for (const gid of ids) {
      const itens = indicadoresDoGrupo(gid);
      if (itens.length === 0) continue;
      saida.push({ tipo: 'cabecalho', gid, nome: $catalogStore.groups[gid]?.name ?? gid });
      for (const ind of itens) saida.push({ tipo: 'item', ind, idx: idx++ });
    }
    return saida;
  });
  let itensMobile = $derived(mobileLinhas.filter((l) => l.tipo === 'item').map((l) => l.ind));

  // §9.5 — o teto é da PALETA, não do layout. A frase do motivo vem pronta da store; aqui
  // só se decide QUANDO mostrá-la. `$seriesStore` é lido para a derivação reagir à seleção.
  let itens = $derived($seriesStore.itens);
  let noLimite = $derived(itens.length >= LIMITE_SERIES);

  // §9.5 — a frase do motivo vem PRONTA de `motivoDoLimite()`, que lê a store por `get()` e por
  // isso NÃO registra dependência em runes. Derivá-la de `noLimite` (que É reativo) evita a frase
  // ficar presa no `null` da primeira renderização — sem isto, o botão desabilita mudo.
  let motivoLimite = $derived(noLimite ? motivoDoLimite() : null);

  const jaNoGrafico = (id) => itens.some((i) => i.id === id);

  const prender = (i, n) => (n === 0 ? 0 : Math.max(0, Math.min(n - 1, i)));

  const classeLinha = (ativo) =>
    [
      'flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm',
      ativo
        ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    ].join(' ');

  const chipClasse = (ativo) =>
    [
      'flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs',
      ativo
        ? 'border-slate-400 bg-slate-200 font-semibold text-slate-900 dark:border-slate-500 dark:bg-slate-700 dark:text-white'
        : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
    ].join(' ');

  // §12.1 — o **distintivo de escala**: a classe de escala do indicador, derivada da unidade
  // do PRÓPRIO catálogo. É a peça que mantém o aviso visível **antes** da escolha — dá para
  // varrer procurando o que não colide sem abrir ficha. NÃO é o veredito da §5 (esse exige a
  // amplitude da série e vive na ficha): é o rótulo da escala, curto por construção.
  const ESCALA = {
    percentage: { texto: '%', rotulo: 'percentual' },
    currency: { texto: 'R$', rotulo: 'moeda' },
    number: { texto: 'nº', rotulo: 'contagem' },
  };
  function distintivo(ind) {
    const u = ind.unit;
    if (!u || !u.type) return null;
    const base = ESCALA[u.type] ?? { texto: u.symbol || '?', rotulo: u.symbol || u.type };
    return { ...base, simbolo: u.symbol || '' };
  }

  function abrirFicha(ind) {
    if (ind) indicadorAberto = ind;
  }

  function fecharFicha() {
    indicadorAberto = null;
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

  /** §12.1 — tocar num chip do celular troca o grupo da lista (ou volta para "Todos"). */
  function escolherGrupoMobile(id) {
    filtroMobile = id;
    focoIndicador = 0;
  }

  /** §12.1 — ⏎ com a ficha aberta confirma o Adicionar. A store já guarda o teto e a duplicata. */
  function confirmarAdicionar() {
    if (indicadorAberto) adicionarSerie(indicadorAberto);
  }

  // Foco automático no campo de busca ao abrir (§12.1) — por efeito, não pelo atributo
  // `autofocus` (o atributo dispara aviso de a11y do Svelte).
  $effect(() => {
    buscaEl?.focus();
  });

  /**
   * Uma regra só de teclado, presa aos elementos interativos (input e botões) — nunca a um
   * contêiner não-interativo, o que dispararia aviso de a11y do Svelte. Como o foco vive num
   * item e não numa coluna (§12.1), os elementos compartilham este handler.
   *
   * §12.1 — a MESMA regra vale para os dois layouts; o que muda é só a realização do eixo
   * horizontal: no desktop `←→` anda entre as COLUNAS (grupo ↔ indicador); no celular, entre
   * os CHIPS (grupo anterior/seguinte). Não há uma segunda regra — há um handler só, e ele
   * sabe em que superfície está: pelo elemento que recebeu a tecla, ou, quando é o campo
   * de busca (compartilhado), pelo CSS — a lista do celular só existe sob `md:hidden`.
   */
  function emMobile(el) {
    if (el?.closest?.('[data-mobile]')) return true;
    const lista = document.querySelector('[data-lista-mobile]');
    return !!lista && getComputedStyle(lista).display !== 'none';
  }

  function aoTeclado(e) {
    const mobile = emMobile(e.currentTarget);
    const noCampo = e.currentTarget.tagName === 'INPUT';

    if (e.key === 'Escape') {
      e.preventDefault();
      // §12.1 — fechar a ficha primeiro; sem ficha aberta, fecha a modal.
      if (indicadorAberto) {
        fecharFicha();
        return;
      }
      aoFechar();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      if (mobile) {
        focoIndicador = prender(focoIndicador + dir, itensMobile.length);
      } else if (noCampo) {
        focoIndicador = prender(focoIndicador + dir, lista.length);
      } else if (focoColuna === 1 && !buscando) {
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
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      if (mobile) {
        // celular: os chips são "Todos" + os 7 grupos, nesta ordem.
        const n = grupos.length + 1;
        const atual = filtroMobile === null ? 0 : grupos.findIndex(([id]) => id === filtroMobile) + 1;
        const proximo = prender(atual + dir, n);
        filtroMobile = proximo === 0 ? null : grupos[proximo - 1][0];
        focoIndicador = 0;
        return;
      }
      // desktop: coluna anterior/seguinte, focando o primeiro item dela.
      focoColuna = focoColuna === 1 ? 2 : 1;
      if (focoColuna === 2) focoIndicador = 0;
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      // §12.1 — com a ficha aberta, ⏎ confirma o Adicionar.
      if (indicadorAberto) {
        confirmarAdicionar();
        return;
      }
      if (mobile) {
        abrirFicha(itensMobile[focoIndicador]);
        return;
      }
      if (focoColuna === 1 && !buscando && !noCampo) {
        // ⏎ no grupo entra na coluna dos indicadores, focando o primeiro.
        focoColuna = 2;
        focoIndicador = 0;
        return;
      }
      abrirFicha(lista[focoIndicador]);
    }
  }

  // §12.1 — a linha da lista: caixa · nome · **distintivo de escala** · botão "i".
  // Tocar na linha NÃO adiciona: abre a ficha (o "i" faz o mesmo — o alvo é maior).
  // O distintivo e o "i" só existem no celular (`md:hidden`); no desktop a linha é a da §1.1.
</script>

{#snippet linhaItem(ind, i, ativo, classe = '')}
  <li class="flex items-center gap-2 {classe}">
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
      class={classeLinha(ativo)}
    >
      <span class="min-w-0 flex-1 truncate">{ind.name}</span>
      {#if distintivo(ind)}
        <span
          class="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-slate-600 md:hidden dark:bg-slate-700 dark:text-slate-200"
          aria-label="Escala: {distintivo(ind).rotulo}"
          title="Escala: {distintivo(ind).rotulo}{distintivo(ind).simbolo
            ? ` (${distintivo(ind).simbolo})`
            : ''}"
          >{distintivo(ind).texto}</span
        >
      {/if}
    </button>
    <button
      type="button"
      class="shrink-0 rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-600 md:hidden dark:border-slate-600 dark:text-slate-300"
      aria-label="Ver a ficha de {ind.name}"
      onclick={() => abrirFicha(ind)}
      onkeydown={aoTeclado}>i</button
    >
  </li>
{/snippet}

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
    class="absolute inset-x-0 top-16 mx-auto flex max-h-[85vh] w-[calc(100%-1rem)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl md:w-[min(1000px,92vw)] dark:border-slate-700 dark:bg-slate-900"
  >
    <!-- busca — fixa no topo das duas formas: no celular ela não rola junto com a lista (§12.1);
         no desktop, disponível sobre as três colunas (§1.1) -->
    <div class="shrink-0 border-b border-slate-200 p-3 dark:border-slate-700">
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

    <!-- §12.1 — véu da folha deslizante: só no celular e só com a folha aberta. Tocar fora
         fecha a folha (não a modal). Fica acima do diálogo e abaixo da folha (z-50). -->
    {#if indicadorAberto}
      <button
        type="button"
        class="fixed inset-0 z-40 cursor-default border-0 bg-black/30 p-0 md:hidden"
        aria-label="Fechar a ficha"
        onclick={fecharFicha}
      ></button>
    {/if}

    <div class="flex min-h-0 flex-1">
      {#if buscando}
        <!-- digitação: a cascata vira uma lista só, cobrindo as três colunas (§1.1) -->
        <ul
          data-coluna="resultados"
          aria-label="Resultados da busca"
          class="min-h-0 min-w-0 flex-1 overflow-y-auto p-2"
        >
          {#if lista.length === 0}
            <li class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
              Nenhum indicador para «{termo}».
            </li>
          {/if}
          {#each lista as ind, i (ind.id)}
            {@render linhaItem(ind, i, focoIndicador === i)}
          {/each}
        </ul>
      {:else}
        <!-- coluna 1 · grupos — os 7 do `indicators.json` (§1.1); só no desktop -->
        <ul
          data-coluna="1"
          aria-label="Grupos"
          class="hidden min-h-0 w-56 shrink-0 overflow-y-auto border-r border-slate-200 p-2 md:block dark:border-slate-700"
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

        <!-- coluna 2 · indicadores do grupo, com caixa de seleção (§1.1); só no desktop -->
        <ul
          data-coluna="2"
          aria-label="Indicadores do grupo"
          class="hidden min-h-0 w-72 shrink-0 overflow-y-auto border-r border-slate-200 p-2 md:block dark:border-slate-700"
        >
          {#if lista.length === 0}
            <li class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
              Escolha um grupo.
            </li>
          {/if}
          {#each lista as ind, i (ind.id)}
            {@render linhaItem(ind, i, focoColuna === 2 && focoIndicador === i)}
          {/each}
        </ul>

        <!-- §12.1 — celular: chips roláveis + lista de uma coluna com cabeçalho grudado -->
        <div class="flex min-h-0 min-w-0 flex-1 flex-col md:hidden" data-mobile data-bloco="lista-mobile">
          <div
            role="group"
            aria-label="Grupos"
            class="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 p-2 dark:border-slate-700"
          >
            <button
              type="button"
              onclick={() => escolherGrupoMobile(null)}
              onkeydown={aoTeclado}
              class={chipClasse(filtroMobile === null)}>Todos</button
            >
            {#each grupos as [id, g] (id)}
              <button
                type="button"
                onclick={() => escolherGrupoMobile(id)}
                onkeydown={aoTeclado}
                class={chipClasse(filtroMobile === id)}
              >
                {g.name}
                <span
                  class="ml-1.5 rounded-full bg-black/10 px-1.5 text-[10px] leading-4 tabular-nums dark:bg-white/15"
                  aria-label="{contagens[id] ?? 0} indicadores"
                  >{contagens[id] ?? 0}</span
                >
              </button>
            {/each}
          </div>

          <ul
            aria-label="Indicadores"
            class="min-h-0 flex-1 overflow-y-auto pb-2"
            data-lista-mobile
          >
            {#if mobileLinhas.length === 0}
              <li class="px-3 py-6 text-sm text-slate-500 dark:text-slate-400">
                Nenhum indicador neste grupo.
              </li>
            {/if}
            {#each mobileLinhas as linha (`${linha.tipo}-${linha.tipo === 'item' ? linha.ind.id : linha.gid}`)}
              {#if linha.tipo === 'cabecalho'}
                <li
                  class="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-400"
                >
                  {linha.nome}
                </li>
              {:else}
                {@render linhaItem(linha.ind, linha.idx, focoIndicador === linha.idx, 'px-2')}
              {/if}
            {/each}
          </ul>
        </div>
      {/if}

      <!-- §12.1 — a ficha: no desktop é a 3ª coluna (§1.1); no celular vira uma **folha
           deslizante** ancorada embaixo. Traz unidade, granularidade, período, nº de pontos,
           fonte e o AVISO DE ESCALA antes da escolha (§5). O `data-bloco="ficha"` sobrevive (R29). -->
      <div
        data-bloco="ficha-folha"
        class="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl transition-transform duration-200 md:static md:inset-auto md:z-auto md:max-h-none md:w-72 md:shrink-0 md:translate-y-0 md:rounded-none md:border-t-0 md:border-l md:shadow-none md:transition-none dark:border-slate-700 dark:bg-slate-900 {indicadorAberto
          ? 'translate-y-0'
          : 'translate-y-full'}"
      >
        <!-- alça + fechar: só na folha do celular -->
        <div class="relative flex justify-center pt-2 md:hidden">
          <span class="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden="true"
          ></span>
          <button
            type="button"
            class="absolute right-2 top-1 rounded-full px-2 text-lg leading-none text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Fechar a ficha"
            onclick={fecharFicha}>×</button
          >
        </div>
        <Ficha
          indicador={indicadorAberto}
          {noLimite}
          motivo={motivoLimite}
          aoAdicionar={(ind) => adicionarSerie(ind)}
          {aoTeclado}
        />
      </div>
    </div>
  </div>
</div>

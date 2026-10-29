<script>
  // BARRA SUPERIOR do terminal (fatia 12, posição 1). Saiu daqui a busca solta da T5: o topo
  // agora tem lugar fixo para cada coisa — marca, busca, as CINCO janelas do gráfico, o chip do
  // preset, o chip de MANDATO (2026-10-28), a saída para o blog e as ações de permalink/tela cheia.
  //
  // A barra NÃO fala com o gráfico: as janelas são o `TimeFilters` de sempre (que só escreve na
  // store `viewport`) e o preset escreve o conjunto de séries numa única chamada a
  // `substituirSeries` — nenhum dos dois conhece a lib do gráfico (§8.1).
  //
  // No celular (abaixo de `md`) ficam só marca, busca e janela — é o topo de 36px da spec.
  // As janelas continuam visíveis: quem rola é a PRÓPRIA barra (`overflow-x-auto`), nunca o
  // documento (o `testar-mobile` do build mede 375px e não pode achar transbordo).
  import { onMount, onDestroy } from 'svelte';
  import TimeFilters from './TimeFilters.svelte';
  import { seriesStore, substituirSeries, dataMaximaStore } from '../stores/series.js';
  import { indicadorPorId } from '../stores/catalog.js';
  import { mandateStore, aplicarMandato } from '../stores/mandate.js';
  import { PRESETS, presetDoDia, presetDosIds, dataEmSaoPaulo } from '../data/presets.js';

  let { aoAbrirBusca } = $props();

  let itens = $derived($seriesStore.itens);
  let menuAberto = $state(false);
  let copiado = $state(false);
  let podeTelaCheia = $state(false);
  /** Elemento do chip e da raiz do menu — o foco volta para o chip ao fechar com Esc. */
  let chip = $state(null);
  let raizChip = $state(null);
  let timerCopiado = null;

  // ─── CHIP DE MANDATO (2026-10-28, a pedido do usuário) ───
  // O seletor de mandatos só existia DENTRO da gaveta inferior, e ela nasce recolhida — o
  // usuário perdeu os filtros de vista. O chip devolve o controle à barra superior, sem gastar
  // altura de gráfico. É o MESMO estado do trilho (`mandateStore` + `aplicarMandato`), não um
  // segundo dono da janela: escolher por aqui desmarca lá e vice-versa.
  let menuMandatoAberto = $state(false);
  let chipMandato = $state(null);
  let raizMandato = $state(null);
  let mandatos = $derived($mandateStore.mandatos);
  let mandatoAtual = $derived(mandatos.find((m) => m.id === $mandateStore.selecionado) ?? null);
  /** A data de referência vem do ESTADO (§8) — a mesma do trilho e do filtro de tempo; o mandato
   *  EM CURSO termina nela. */
  let dataMaxima = $derived($dataMaximaStore);

  /** Escolhe (ou limpa, com `null`) o mandato em cena — a regra inteira mora em `aplicarMandato`. */
  function escolherMandato(id) {
    menuMandatoAberto = false;
    aplicarMandato(id, dataMaxima);
  }

  /** Teclado no menu: `Esc` fecha e devolve o foco ao chip. O FOCO em si anda por `menuitem`,
   *  que é o papel de uma lista de escolha (o `Menu` do `SearchModal` é outro componente). */
  function aoTeclarMandato(evento) {
    if (evento.key !== 'Escape' || !menuMandatoAberto) return;
    evento.preventDefault();
    evento.stopPropagation(); // o `Esc` é DESTE menu, não das gavetas (prioridade da App)
    menuMandatoAberto = false;
    chipMandato?.focus();
  }

  /** O preset DO DIA, resolvido uma vez na montagem: a rotação é por dia de São Paulo, não
   *  pelo fuso do navegador (o mesmo dia devolve o mesmo preset para todo mundo). */
  const doDia = presetDoDia(dataEmSaoPaulo());

  /** Rótulo do chip: preset nomeado quando o conjunto em cena é EXATAMENTE o dele; seleção
   *  montada à mão (ou `?series=` arbitrário) é "Personalizado"; sem nada, "Presets". */
  let nomePreset = $derived(
    presetDosIds(itens.map((i) => i.id))?.nome ?? (itens.length ? 'Personalizado' : 'Presets'),
  );

  /** Resolve os ids contra o catálogo, descarta o que não existe e troca o conjunto INTEIRO
   *  numa escrita só (`substituirSeries`) — sem estados intermediários na tela nem na URL. */
  async function escolher(preset) {
    menuAberto = false;
    const entries = preset.indicadores.map(indicadorPorId).filter(Boolean);
    await substituirSeries(entries);
  }

  /** Permalink: copia a URL do estado atual e confirma no rótulo por 1,5 s. Sem Clipboard API
   *  (contexto inseguro, permissão negada) o rótulo NÃO mente e nada é logado. */
  async function copiarPermalink() {
    try {
      await navigator.clipboard.writeText(location.href);
    } catch {
      return;
    }
    copiado = true;
    clearTimeout(timerCopiado);
    timerCopiado = setTimeout(() => (copiado = false), 1500);
  }

  /** Tela cheia é opcional na spec: se o navegador recusar, engole a rejeição — sem alarde. */
  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Política do navegador, iframe sem `allowfullscreen`, permissão negada: fica como está.
    }
  }

  function aoTeclar(evento) {
    if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
      evento.preventDefault();
      aoAbrirBusca();
      return;
    }
    if (evento.key === 'Escape' && menuAberto) {
      menuAberto = false;
      chip?.focus();
    }
  }

  // Clique fora fecha o menu — sem overlay, para não bloquear o gráfico.
  $effect(() => {
    if (!menuAberto) return;
    const fechar = (evento) => {
      if (!raizChip?.contains(evento.target)) menuAberto = false;
    };
    document.addEventListener('pointerdown', fechar);
    return () => document.removeEventListener('pointerdown', fechar);
  });

  // Idem para o menu de mandatos — e ABRIR um fecha o outro: dois menus abertos ao mesmo tempo
  // seriam dois painéis sobre o gráfico, e o usuário não saberia qual está na frente.
  $effect(() => {
    if (!menuMandatoAberto) return;
    const fechar = (evento) => {
      if (!raizMandato?.contains(evento.target)) menuMandatoAberto = false;
    };
    document.addEventListener('pointerdown', fechar);
    return () => document.removeEventListener('pointerdown', fechar);
  });

  onMount(() => {
    // `fullscreenEnabled` não existe no servidor e pode ser `false` por política: o botão só
    // aparece quando a ação é possível (um botão que não faz nada é pior que nenhum).
    podeTelaCheia = Boolean(document.fullscreenEnabled);
  });

  onDestroy(() => clearTimeout(timerCopiado));
</script>

<svelte:window onkeydown={aoTeclar} />

<header
  data-testid="barra-superior"
  class="relative z-20 flex h-11 min-w-0 shrink-0 items-center gap-2.5 overflow-x-auto border-b border-slate-800 px-3 text-[13px] max-md:h-9 md:overflow-visible md:text-sm"
>
  <!-- Marca: identidade, NÃO link para a própria home (a spec veta a ilha de navegação).
       O texto fica no DOM mesmo quando encolhe (`truncate`). -->
  <div class="flex min-w-0 items-center gap-1.5">
    <span class="h-2.5 w-2.5 shrink-0 rounded-sm bg-sky-500" aria-hidden="true"></span>
    <span class="truncate font-semibold text-slate-200">Brasil em Números</span>
  </div>

  <!-- Busca: pílula no desktop; no celular vira só o ícone, com o texto em `sr-only` para o
       nome acessível continuar sendo "Buscar indicador…" nos dois tamanhos. -->
  <button
    type="button"
    class="flex shrink-0 items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
    onclick={aoAbrirBusca}
    title="Buscar indicador (⌘K)"
  >
    <svg
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7"></circle>
      <path d="m20 20-3.5-3.5"></path>
    </svg>
    <span class="max-md:sr-only">Buscar indicador…</span>
    <kbd class="hidden rounded border border-slate-700 px-1.5 text-[11px] text-slate-400 md:inline" aria-hidden="true"
      >⌘K</kbd
    >
  </button>

  <!-- As quatro janelas: as mesmas de sempre, na forma compacta. O "30a" saiu em 2026-10-28
       (era o mesmo que "Tudo") — ver a nota em TimeFilters. -->
  <TimeFilters compacto />

  <!-- Chip do preset + menu. Escondido no celular: o topo de 36px é marca+busca+janela. -->
  <div class="relative max-md:hidden" bind:this={raizChip}>
    <button
      type="button"
      data-testid="preset-chip"
      bind:this={chip}
      class="flex items-center gap-1 rounded border border-slate-700 px-2.5 py-1 text-slate-200 hover:bg-slate-800"
      aria-haspopup="menu"
      aria-expanded={menuAberto}
      aria-controls="menu-presets"
      onclick={() => {
        menuAberto = !menuAberto;
        menuMandatoAberto = false; // um menu por vez (ver o `$effect` abaixo)
      }}
    >
      <span class="max-w-[9rem] truncate">{nomePreset}</span>
      <svg
        class="h-3.5 w-3.5 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </button>

    {#if menuAberto}
      <div
        id="menu-presets"
        data-testid="menu-presets"
        role="menu"
        aria-label="Presets de indicadores"
        class="absolute top-full left-0 z-50 mt-1 w-52 rounded border border-slate-700 bg-[#161b22] p-1 shadow-lg"
      >
        {#each PRESETS as preset (preset.id)}
          <button
            type="button"
            role="menuitem"
            class="block w-full rounded px-2 py-1 text-left text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
            onclick={() => escolher(preset)}
          >
            {preset.nome}
          </button>
        {/each}
        {#if doDia}
          <button
            type="button"
            role="menuitem"
            class="mt-1 block w-full rounded border-t border-slate-700 px-2 py-1 text-left text-slate-300 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
            onclick={() => escolher(doDia)}
          >
            Do dia · {doDia.nome}
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- CHIP DE MANDATO + menu. Mesmo padrão do chip de preset (abre, escolhe, fecha), e a MESMA
       regra de estado (`aplicarMandato`). Sem governos carregados, o chip MANTÉM o lugar e fica
       desabilitado (§9.1 — a barra não pula), e o `title` diz por quê.
       Escondido no celular pelo mesmo motivo do preset: o topo de 36px é marca+busca+janela; lá
       o caminho é o trilho da gaveta inferior, que continua ali. -->
  <div class="relative max-md:hidden" bind:this={raizMandato} onkeydown={aoTeclarMandato}>
    <button
      type="button"
      data-testid="mandate-chip"
      bind:this={chipMandato}
      class="flex items-center gap-1 rounded border px-2.5 py-1 {mandatoAtual
        ? 'border-sky-500 text-sky-200 hover:bg-sky-950'
        : 'border-slate-700 text-slate-200 hover:bg-slate-800'}"
      aria-haspopup="menu"
      aria-expanded={menuMandatoAberto}
      aria-controls="menu-mandatos"
      disabled={mandatos.length === 0}
      title={mandatos.length === 0
        ? 'Mandatos ainda não carregaram'
        : mandatoAtual
          ? `Mandato em cena: ${mandatoAtual.rotulo} · ${mandatoAtual.partido}`
          : 'Filtrar o gráfico por mandato'}
      onclick={() => {
        menuMandatoAberto = !menuMandatoAberto;
        menuAberto = false; // um menu por vez
      }}
    >
      <svg
        class="h-3.5 w-3.5 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M4 5h16M4 12h16M4 19h10"></path>
      </svg>
      <span class="max-w-[9rem] truncate">{mandatoAtual ? `${mandatoAtual.rotulo} · ${mandatoAtual.partido}` : 'Mandato'}</span>
      <svg
        class="h-3.5 w-3.5 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6"></path>
      </svg>
    </button>

    {#if menuMandatoAberto}
      <div
        id="menu-mandatos"
        data-testid="menu-mandatos"
        role="menu"
        aria-label="Filtrar por mandato"
        class="absolute top-full left-0 z-50 mt-1 max-h-[60dvh] w-56 overflow-y-auto rounded border border-slate-700 bg-[#161b22] p-1 shadow-lg"
      >
        <button
          type="button"
          role="menuitem"
          aria-current={mandatoAtual ? undefined : 'true'}
          class="block w-full rounded px-2 py-1 text-left text-slate-200 hover:bg-slate-800 focus:bg-slate-800 focus:outline-none"
          onclick={() => escolherMandato(null)}
        >
          Todos
        </button>
        {#each mandatos as m (m.id)}
          <button
            type="button"
            role="menuitem"
            aria-current={m.id === mandatoAtual?.id ? 'true' : undefined}
            class="block w-full rounded px-2 py-1 text-left hover:bg-slate-800 focus:bg-slate-800 focus:outline-none {m.id ===
            mandatoAtual?.id
              ? 'text-sky-200'
              : 'text-slate-200'}"
            onclick={() => escolherMandato(m.id)}
          >
            {m.rotulo} · {m.partido}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Saída para o conteúdo: sem ela a home vira uma ilha. Discreta e fora do celular. -->
  <a
    href="/blog"
    class="hidden shrink-0 rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:inline"
    >Artigos</a
  >

  <button
    type="button"
    data-testid="botao-permalink"
    class="hidden shrink-0 items-center gap-1 rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:flex"
    aria-label={copiado ? 'Link copiado' : 'Copiar link do estado atual'}
    title="Copiar link do estado atual"
    onclick={copiarPermalink}
  >
    <svg
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path>
      <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path>
    </svg>
    <span>{copiado ? 'Copiado' : 'Permalink'}</span>
  </button>

  {#if podeTelaCheia}
    <button
      type="button"
      class="hidden shrink-0 items-center gap-1 rounded px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:flex"
      aria-label="Tela cheia"
      title="Tela cheia"
      onclick={alternarTelaCheia}
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M4 9V4h5"></path>
        <path d="M20 15v5h-5"></path>
        <path d="M15 4h5v5"></path>
        <path d="M9 20H4v-5"></path>
      </svg>
    </button>
  {/if}
</header>

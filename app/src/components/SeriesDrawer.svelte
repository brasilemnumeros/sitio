<script>
  // GAVETA DE CONFIGURAÇÕES (T7) — séries, cores e eixos num lugar fixo (§1 do desenho do
  // terminal). Ficava à DIREITA até 2026-11-01; hoje o trilho fica colado na borda esquerda e o
  // painel abre à direita dele (ver o comentário do lado no `App.svelte`).
  //
  // São DOIS elementos, não um:
  //   · o TRILHO (`aside[data-testid="trilho"]`, 44px) fica sempre visível — é o gatilho
  //     e o índice da gaveta, e carrega os controles fixos do gráfico, nesta ordem: engrenagem
  //     (abre), limpar filtros (2026-10-30), permalink e tela cheia (os dois últimos mudaram
  //     para cá em 2026-10-30, porque no topo eram `hidden md:*` e não existiam no celular). É
  //     ele que carrega o ponto de atenção quando há série em erro;
  //   · o PAINEL (`aside[data-testid="gaveta-config"]`, 320px) entra em fluxo ao lado do
  //     gráfico. Em fluxo, e não por cima: abrir a gaveta ENCOLHE o gráfico (que é `flex-1`),
  //     em vez de tapá-lo. E `hidden` quando fechada — um painel só deslocado por `translate`
  //     continuaria na árvore de acessibilidade e focável por TAB.
  //
  // A vista é ÚNICA e rolável, sem abas, com três seções nesta ordem: séries (chips), cores
  // (legenda) e eixos (`AxesPanel`). O gatilho do trilho é uma ENGRENAGEM: o trilho abre a
  // gaveta inteira, não só a lista de séries; aberta, a engrenagem leva a vista de volta ao topo.
  // Fechar é o "×" do cabeçalho (sempre alcançável, porque o cabeçalho é grudado) ou `Esc`.
  //
  // O estado `aberta` mora na `App` (é ela que decide a prioridade do `Esc` na T9), por isso a
  // prop é `$bindable`: o gatilho alterna, a App continua sendo a dona do estado.
  //
  // §Moldura — abrir e fechar a gaveta é SÓ geometria: nenhuma ação de `viewport` ou `mandate`
  // sai daqui. A ÚNICA escrita nesses stores que este arquivo faz é o "limpar filtros", e ela é
  // ESCOLHA do usuário — a mesma regra única do chip e do minimapa (`aplicarMandato(null)`), não
  // efeito colateral de um clique de UI (2026-10-30).
  import SeriesChips from './SeriesChips.svelte';
  import SeriesLegend from './SeriesLegend.svelte';
  import AxesPanel from './AxesPanel.svelte';
  import { seriesStore } from '../stores/series.js';
  import { filtroAtivo, resetarFiltros } from '../stores/filtros.js';
  import { onMount, onDestroy } from 'svelte';

  let {
    aberta = $bindable(false),
    aoFechar = () => {},
    aoAbrirBusca = () => {},
    aoAbrirTour = () => {},
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

  /** "Há filtro em cena?" (janela recortada ou mandato escolhido) — é o que faz o botão de
   *  limpar existir no trilho. A regra mora em `stores/filtros.js`, não aqui. */
  const temFiltro = $derived($filtroAtivo);

  /**
   * A DICA de primeiro uso (2026-10-30, a pedido do usuário): na PRIMEIRA vez em que um filtro
   * entra em cena, um balão aponta para o "limpar". Aparece uma vez por navegador — a chave é
   * gravada ao MOSTRAR, não ao fechar: quem nunca fechar não pode ver a mesma dica de novo.
   *
   * ⚠ `localStorage` pode lançar (modo privado, política do navegador). No erro a dica nasce
   * "vista": ensinar de novo é melhor que quebrar a tela.
   */
  const CHAVE_DICA = 'dica-limpar-filtros';
  let dicaJaVista = (() => {
    try { return localStorage.getItem(CHAVE_DICA) === '1'; } catch { return true; }
  })();
  let mostrarDica = $state(false);

  $effect(() => {
    if (!temFiltro || dicaJaVista) return;
    // ⚠ Espera o estado ASSENTAR (600ms): no carregamento a janela aparece recortada por ~150ms,
    // enquanto o adapter ainda não devolveu o `fitContent` do horizonte — medido no app — e a
    // dica disparava sem ninguém ter filtrado nada, queimando a chave de "já viu". O efeito
    // re-roda quando `temFiltro` muda, então o `clearTimeout` abaixo cancela o falso positivo.
    const t = setTimeout(() => {
      dicaJaVista = true; // `let` comum, fora da reatividade: não re-dispara o efeito
      try { localStorage.setItem(CHAVE_DICA, '1'); } catch { /* ver a nota acima */ }
      mostrarDica = true;
    }, 600);
    return () => clearTimeout(t);
  });

  /** Qualquer gesto ou `Esc` tira a dica do caminho — ela nunca pede confirmação.
   *  ⚠ Os primeiros 400ms são ignorados: a dica NASCE do clique que ligou o filtro, e sem a
   *  carência o próprio gesto que a fez aparecer a apagava no mesmo instante (medido). Cobre
   *  também o clique duplo de quem está com pressa. */
  $effect(() => {
    if (!mostrarDica) return;
    const nasceu = performance.now();
    const fechar = () => {
      if (performance.now() - nasceu < 400) return;
      mostrarDica = false;
    };
    const tecla = (e) => { if (e.key === 'Escape') mostrarDica = false; };
    document.addEventListener('pointerdown', fechar);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fechar);
      document.removeEventListener('keydown', tecla);
    };
  });

  function limparFiltros() {
    mostrarDica = false;
    resetarFiltros();
  }

  /**
   * PERMALINK e TELA CHEIA moram aqui desde 2026-10-30 (pedido do usuário; vieram da barra
   * superior). O motivo não é estético: no topo os dois eram `hidden md:*`, então **não existiam
   * no celular** — e compartilhar é a conversão do produto. O trilho está nos dois layouts.
   *
   * Sem o rótulo textual, a confirmação do copiar é o ícone (link → check) mais o balão
   * "Link copiado": sem isso o clique não teria resposta visível nenhuma.
   */
  let copiado = $state(false);
  let podeTelaCheia = $state(false);
  let timerCopiado = null;

  /** Sem Clipboard API (contexto inseguro, permissão negada) o rótulo NÃO mente e nada é logado. */
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

  onMount(() => {
    // `fullscreenEnabled` não existe no servidor e pode ser `false` por política: o botão só
    // aparece quando a ação é possível (um botão que não faz nada é pior que nenhum).
    podeTelaCheia = Boolean(document.fullscreenEnabled);
  });

  onDestroy(() => clearTimeout(timerCopiado));

  // §Estados: erro PARCIAL e gaveta fechada → o aviso tem de caber no trilho, porque o chip de
  // erro está DENTRO da gaveta. Aberta, o chip já diz o que houve e o ponto sairia de contexto.
  const temErro = $derived(itens.some((i) => i.status === 'erro'));

  /**
   * O trilho tem dois controles fixos aqui: a ENGRENAGEM (abre a gaveta; aberta, leva a vista de
   * volta ao topo) e o LIMPAR FILTROS (2026-10-30). Nenhum dos dois sai do trilho quando não se
   * aplica: o que muda é o estado — o limpar fica desabilitado sem filtro. Fechar a gaveta tem
   * dois caminhos explícitos: o "×" do cabeçalho e `Esc`. (Os atalhos "Cores"/"Eixos" que
   * apareciam embaixo do gatilho saíram em 2026-10-28, a pedido do usuário: duplicavam os títulos
   * das seções.)
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
    if (!painel) throw new Error('gaveta de configurações sem painel montado (falta `bind:this`)');
    const alvo = painel.querySelector(`[data-secao="${secao}"]`);
    if (!alvo) throw new Error(`gaveta de configurações sem a seção "${secao}"`);
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
{#snippet balao(texto)}
  <!-- Tooltip PRÓPRIO, e não `title`: o nativo só aparece depois de ~1s e esse atraso é do
       navegador — não há como encurtá-lo (2026-10-30, a pedido do usuário).
       ⚠ SÓ HOVER — nada de `focus-within`: fechar a gaveta devolve o foco ao gatilho (contrato
       do §Teclado), e o balão ficava preso na tela até o usuário clicar em outro lugar (defeito
       relatado). O nome acessível vive no `aria-label` do botão, e o balão é `aria-hidden` para
       o leitor de tela não dizer duas vezes. -->
  <span
    aria-hidden="true"
    class="pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded border border-slate-700 bg-[#161b22] px-2 py-1 text-xs whitespace-nowrap text-slate-200 opacity-0 shadow-lg transition-opacity duration-75 group-hover:opacity-100"
    >{texto}</span
  >
{/snippet}

<aside
  data-testid="trilho"
  inert={inativa}
  class="relative flex w-10 shrink-0 flex-col items-center gap-1 border-r border-slate-800 py-1.5 md:w-11"
  aria-label="Controles do gráfico"
>
  <div class="group relative flex w-full justify-center">
    <button
      type="button"
      bind:this={gatilho}
      aria-label={temErro && !aberta ? 'Configurações do gráfico — há séries com erro' : 'Configurações do gráfico'}
      aria-expanded={aberta}
      aria-controls="gaveta-config"
      class="relative flex min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:min-h-0"
      onclick={aoGatilho}
    >
      <!-- Engrenagem: o trilho é a gaveta de CONFIGURAÇÕES (séries, cores e eixos), não um atalho
           só para séries. O rótulo textual saiu em 2026-10-28 — o nome acessível vive no
           `aria-label`. Os atalhos "Cores"/"Eixos" que apareciam embaixo dele saíram no mesmo dia,
           porque duplicavam os títulos das seções dentro da própria gaveta. -->
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        ></path>
      </svg>
      {#if temErro && !aberta}
        <span
          class="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500"
          aria-hidden="true"
        ></span>
      {/if}
    </button>
    {#if !mostrarDica}{@render balao(aberta ? 'Ir para as séries' : 'Abrir séries e eixos')}{/if}
  </div>

  <!-- LIMPAR FILTROS — sempre no trilho (2026-10-30, a pedido do usuário): esconder o botão
       fazia o trilho mudar de tamanho sozinho e a pessoa não descobria que dava para limpar.
       Sem filtro em cena ele fica DESABILITADO, não invisível — a mesma língua da alça da
       gaveta inferior (§9.1) e dos filtros de tempo: o lugar é estável e o estado se lê. -->
  <div class="group relative flex w-full justify-center">
    <button
      type="button"
      data-testid="limpar-filtros"
      aria-label="Limpar filtros"
      disabled={!temFiltro}
      class="flex min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent md:min-h-0"
      onclick={limparFiltros}
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
      </svg>
    </button>
    {#if !mostrarDica}
      {@render balao(temFiltro ? 'Limpar filtros' : 'Nenhum filtro ativo')}
    {/if}

    {#if mostrarDica}
      <!-- A dica de primeiro uso: aponta PARA o botão (seta à direita) e não pede confirmação —
           qualquer gesto ou `Esc` a tira do caminho. `role="status"` para quem ouve a página. -->
      <div
        role="status"
        class="pointer-events-none absolute top-1/2 left-full z-50 ml-3 -translate-y-1/2 rounded border border-sky-700 bg-[#0b1a26] px-2 py-1.5 text-xs whitespace-nowrap text-sky-100 shadow-lg"
      >
        <span class="text-sky-300" aria-hidden="true">←</span> Limpar os filtros
      </div>
    {/if}
  </div>

  <!-- PERMALINK · a conversão do produto, agora alcançável no celular também (no topo era
       `hidden md:flex`). O feedback do copiar é o ícone virando check + o balão "Link copiado". -->
  <div class="group relative flex w-full justify-center">
    <button
      type="button"
      data-testid="botao-permalink"
      aria-label={copiado ? 'Link copiado' : 'Copiar link do estado atual'}
      class="flex min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:min-h-0"
      onclick={copiarPermalink}
    >
      {#if copiado}
        <svg
          class="h-4 w-4 text-emerald-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m5 13 4 4L19 7"></path>
        </svg>
      {:else}
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"></path>
          <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"></path>
        </svg>
      {/if}
    </button>
    {@render balao(copiado ? 'Link copiado' : 'Copiar link')}
  </div>

  {#if podeTelaCheia}
    <div class="group relative flex w-full justify-center">
      <button
        type="button"
        aria-label="Tela cheia"
        class="flex min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:min-h-0"
        onclick={alternarTelaCheia}
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9V4h5"></path>
          <path d="M20 15v5h-5"></path>
          <path d="M15 4h5v5"></path>
          <path d="M9 20H4v-5"></path>
        </svg>
      </button>
      {@render balao('Tela cheia')}
    </div>
  {/if}

  <!-- TOUR. `hidden lg:flex` porque abaixo de 1024px o tour não roda (ver `domain/tour.js`):
       um botão que não faz nada é pior que um botão ausente. Fica no pé do trilho, longe dos
       controles de uso diário, para não competir com a engrenagem. -->
  <div class="group relative mt-auto flex w-full justify-center">
    <button
      type="button"
      data-testid="botao-tour"
      aria-label="Ver o tour de novo"
      class="hidden min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100 lg:flex md:min-h-0"
      onclick={aoAbrirTour}
    >
      <svg
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9"></circle>
        <path d="M9.5 9.2a2.6 2.6 0 1 1 3.4 2.5c-.7.3-.9.8-.9 1.6"></path>
        <path d="M12 17h.01"></path>
      </svg>
    </button>
    {@render balao('Ver o tour')}
  </div>
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
  id="gaveta-config"
  data-testid="gaveta-config"
  bind:this={painel}
  hidden={!aberta}
  inert={inativa}
  aria-label="Séries, cores e eixos"
  class={aberta
    ? 'flex w-[320px] shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-[#0e1117] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[88%] max-md:shadow-2xl'
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

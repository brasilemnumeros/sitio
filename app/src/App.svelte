<script>
  import { onMount, onDestroy } from 'svelte';
  import { catalogStore, carregarCatalogo, recarregarCatalogo } from './stores/catalog.js';
  import { seriesStore, adicionarSerie, tentarNovamente } from './stores/series.js';
  import { carregarMandatos } from './stores/mandate.js';
  import Chart from './components/Chart.svelte';
  import EstadoInicial from './components/EstadoInicial.svelte';
  import Esqueleto from './components/Esqueleto.svelte';
  import ErroTotal from './components/ErroTotal.svelte';
  import SearchModal from './components/SearchModal.svelte';
  import HomeToolbar from './components/HomeToolbar.svelte';
  import SeriesDrawer from './components/SeriesDrawer.svelte';
  import BottomDrawer from './components/BottomDrawer.svelte';
  import Tour from './components/Tour.svelte';
  import { deveMostrarTour, CHAVE_TOUR } from './domain/tour.js';
  import { EXEMPLO_IDS } from './data/exemplo.js';
  import { retomarPermalink } from './permalink-init.js';
  // 🔴 Só se importa o que JÁ EXISTE. Um import de arquivo inexistente QUEBRA O BUILD.
  // Os controles das gavetas vivem no seu lugar fixo, não numa pilha de blocos: a de
  // configurações (chips, legenda e eixos) veio na T7 e mora à ESQUERDA desde 2026-11-01;
  // a inferior (mandatos e comparação) veio na T8.
  // Os FILTROS DE TEMPO voltaram pela T6, dentro da barra superior (`HomeToolbar`).

  let buscaAberta = $state(false);
  /** A gaveta de configurações é dona da própria abertura? NÃO: o estado vive aqui, porque a prioridade
   *  do `Esc` entre camadas (busca → gavetas) é da `App` (T9). O componente recebe `bind:aberta`
   *  para o gatilho do trilho poder alternar sem duplicar a fonte da verdade. */
  let configAberta = $state(false);
  /** O tour de primeira visita é a camada mais externa de todas: ele cobre a tela inteira
   *  com o overlay do `driver.js`, então o `Esc` fecha ele antes de encostar numa gaveta. */
  let tourAberto = $state(false);
  /** A gaveta inferior (mandatos + comparação) também é da `App`, pelo mesmo motivo: a
   *  prioridade do `Esc` entre camadas é daqui (T9). `mostrarCasca` é a regra §9.1 — sem série
   *  a alça existe DESABILITADA (a moldura não pula), e o conteúdo nem é montado. */
  let fundoAberto = $state(false);
  let itens = $derived($seriesStore.itens);

  /** `true` quando a URL CHEGOU com `?series=` — lido no `main.js`, antes de qualquer escrita
   *  (ver a nota de lá: o preset do dia entra na URL e faria toda visita parecer compartilhada).
   *  Link compartilhado não abre tour: quem abriu veio ver um gráfico. */
  let { entrouComSeries = false } = $props();

  /**
   * `?gaveta=fundo` — a gaveta inferior ABRE na entrada (2026-10-28).
   *
   * Sem isto, quem compartilhava o link com um mandato escolhido recebia a tela sem sinal nenhum
   * de que havia um filtro em cena (a gaveta nasce recolhida). É LEITURA de link, como o
   * `?series=`: acontece uma vez na montagem e NÃO escreve em `viewport`/`mandate` — a leitura é
   * só de geometria, e a escrita é só para tirar a chave da URL (o resto é preservado).
   */
  onMount(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('gaveta') !== 'fundo') return;
    fundoAberto = true;
    params.delete('gaveta');
    const q = params.toString();
    history.replaceState(null, '', `${location.pathname}${q ? `?${q}` : ''}${location.hash}`);
  });

  /**
   * §9 (2026-11-01) — os TRÊS estados do CATÁLOGO, que passou a vir por HTTP. Eles vêm ANTES
   * dos estados das séries na área do gráfico: sem lista não há série para escolher, e o convite
   * "Selic × IPCA" — que resolve os dois ids NO catálogo — ficaria INERTE na tela (§9.1).
   *
   * `ready` é o único que devolve a decisão para `itens`; `idle`/`loading` são a espera
   * (`Esqueleto`) e `error` é o erro total da LISTA, com a mensagem crua do fetch e o retry.
   */
  let catalogoPronto = $derived($catalogStore.status === 'ready');
  let catalogoFalhou = $derived($catalogStore.status === 'error');

  // §9.3 — erro TOTAL é quando NADA carregou; com uma série de pé, é degradação PARCIAL e o
  // chip de erro cuida dela. Estes dois ramos leem só o `status` dos itens (§8).
  let todosEmErro = $derived(itens.length > 0 && itens.every((i) => i.status === 'erro'));
  let todosCarregando = $derived(
    itens.length > 0 && itens.every((i) => i.status === 'carregando'),
  );

  /** §9.1 — a MESMA regra de divulgação progressiva dos blocos: sem série NÃO há o que
   *  comparar, e enquanto TUDO carrega a barra inferior é INERTE (§Estados). A gaveta inferior
   *  recebe isto como `mostrarCasca`: com `false` a alça continua no lugar (a moldura não
   *  pula), desabilitada, e o conteúdo nem é montado. */
  let mostrarCasca = $derived(itens.length > 0 && !todosCarregando);

  /**
   * O DISPARO do tour de primeira visita (desenho de 2026-11-01).
   *
   * Duas esperas, cada uma com motivo: a primeira é o GRÁFICO existir (`itens.length > 0` — sem
   * série não há legenda para o passo 5 apontar); a segunda são os 600ms que o `fitContent` do
   * horizonte leva para assentar, o mesmo cuidado da dica do "limpar filtros", que disparava
   * sozinha no carregamento e queimava a chave.
   *
   * `jaTentouTour` é um `let` comum, fora da reatividade: escrever num `$state` aqui dentro
   * re-dispararia o próprio efeito.
   *
   * ⚠ O timer NÃO volta como limpeza do efeito. Ele voltava, e o efeito re-roda quando `itens`
   * muda de "carregando" para "ok" — a limpeza cancelava o `setTimeout` e o guarda já impedia
   * reagendar, então o tour nunca abria a partir do preset do dia (medido em 2026-11-01).
   */
  let jaTentouTour = false;
  let timerTour = null;
  $effect(() => {
    // `itens.length > 0` NÃO serve: o item entra na store com `status: 'carregando'` antes do
    // `fetch`, então o teste ficaria verdadeiro sobre o esqueleto. O tour abria com 4 dos 6
    // passos (legenda e escala ainda não existem) e queimava a chave, fazendo a pessoa perder
    // esses dois para sempre. Exigir uma série `ok` prova que o gráfico está montado.
    if (jaTentouTour || !itens.some((i) => i.status === 'ok')) return;
    jaTentouTour = true;

    timerTour = setTimeout(() => {
      // No erro de `localStorage` (modo privado, política do navegador) nasce "visto":
      // ensinar de novo é melhor que quebrar a home.
      let jaVisto = true;
      try {
        jaVisto = localStorage.getItem(CHAVE_TOUR) === '1';
      } catch {
        /* acima */
      }

      const deve = deveMostrarTour({
        largura: window.innerWidth,
        urlTemSeries: entrouComSeries,
        jaVisto,
      });
      if (!deve) return;

      // Gravada ao ABRIR, não ao fechar: quem fecha no passo 2 não vê o roteiro de novo.
      try {
        localStorage.setItem(CHAVE_TOUR, '1');
      } catch {
        /* acima */
      }
      tourAberto = true;
    }, 600);
  });

  onDestroy(() => clearTimeout(timerTour));

  // O motivo vem das PRÓPRIAS séries: a mensagem do validador já diz o que houve — uma unidade
  // desconhecida, por exemplo, chega com o código da regra (§6). NUNCA "erro desconhecido":
  // o vazio sempre diz por quê (§9). Várias séries → um motivo por linha.
  let motivoErro = $derived.by(() => {
    const falhas = itens.filter((i) => i.status === 'erro' && i.error);
    if (falhas.length === 0) return null;
    if (falhas.length === 1) return falhas[0].error;
    return falhas.map((i) => `${i.nome}: ${i.error}`).join('\n');
  });

  // §9.1 — o atalho de primeiro uso. Os IDs moram em `data/exemplo.js` (quem confere a
  // existência deles no catálogo precisa do MESMO literal); o par "Selic × IPCA" é
  // RESOLVIDO no catálogo carregado NA HORA DE ADICIONAR — nada de hardcodar nome nem URL aqui.
  function pedirExemplo() {
    const { indicadores } = $catalogStore;
    for (const id of EXEMPLO_IDS) {
      const entry = indicadores.find((i) => i.id === id);
      if (entry) adicionarSerie(entry);
    }
  }

  /** O "tentar de novo" do erro total: refaz o fetch de CADA série (uma a uma, como no add). */
  function tentarTodas() {
    for (const item of itens) tentarNovamente(item.id);
  }

  /**
   * O "Tentar de novo" do CATÁLOGO — o mesmo handler na home e na busca.
   *
   * Refaz o fetch e, quando ele volta, RETOMA o permalink: com o catálogo quebrado no boot,
   * `iniciarPermalink` saiu antes de aplicar `?series=` e de assinar a URL, então sem isto o
   * retry devolveria a lista e deixaria o gráfico VAZIO com o link ainda pedindo as séries —
   * quem clicou justamente queria o próprio link de volta. Retry que FALHA não escreve nada
   * (`retomarPermalink` sai cedo se o catálogo não estiver `ready`).
   */
  async function tentarCatalogoNovamente() {
    await recarregarCatalogo();
    if ($catalogStore.status === 'ready') await retomarPermalink();
  }

  onMount(() => {
    carregarCatalogo();
    carregarMandatos();
  });

  /**
   * §Teclado — a prioridade do `Esc` entre as camadas mora AQUI, num lugar só: busca (que trata
   * a própria tecla) → gaveta de configurações → gaveta inferior. Cada gaveta não escuta mais o teclado:
   * duas donas da mesma tecla fechariam duas camadas de uma vez. O foco de volta ao gatilho é
   * do componente (o `$effect` dele observa `aberta`), não desta função.
   */
  function aoTeclar(evento) {
    if (evento.key !== 'Escape' || evento.defaultPrevented) return;
    // A modal de busca é a camada do topo e cuida do próprio `Esc`; aqui só se evita fechar
    // a gaveta que está ATRÁS dela.
    if (buscaAberta) return;
    // O tour se fecha sozinho (`driver.js` escuta o `Esc`); aqui só se evita fechar a gaveta
    // que está por baixo dele no mesmo gesto.
    if (tourAberto) return;
    if (configAberta) {
      evento.preventDefault();
      configAberta = false;
      return;
    }
    if (fundoAberto) {
      evento.preventDefault();
      fundoAberto = false;
    }
  }
</script>

<svelte:window onkeydown={aoTeclar} />

<!-- MOLDURA DO TERMINAL (fatia 12). A §1 do desenho antigo descrevia uma PILHA de seis blocos
     numerados; ela morre aqui. Fica o arranjo A: barra superior, miolo (gráfico + trilho) e
     barra inferior, tudo dentro de um <main> de ALTURA FIXA (`h-dvh`). A página NÃO rola —
     quem rola são as gavetas (Tasks 7/8). Sem isto o gráfico continuaria com 480px e o
     terminal seria uma pilha de blocos com um canvas no meio. -->
<!-- O `bg` arbitrário no <main> é a CLASSE-CANÁRIO (§10.3): o fundo do app, com a mesma
     cor (#0e1117) do adapter/navigator. ATENÇÃO: escrever a classe aqui, num comentário,
     NÃO é permitido — o Tailwind também varre comentário e criaria um SEGUNDO produtor,
     o que cegaria o canário. A classe aparece UMA vez só, no <main> abaixo. Se o Tailwind
     parar de varrer `app/src`, ela some do `main.dist.css` e `scripts/checar-canario.sh`
     falha o build. O sufixo de opacidade cheia existe para não colidir com a forma nua
     que também aparece em `docs/plans/`, que o Tailwind varre — ela daria falso OK. -->
<main class="flex h-dvh flex-col overflow-hidden bg-[#0e1117]/100">
  <!-- 1 · barra superior (44px; 36px no celular). A T6 pôs aqui a marca, a busca, as cinco
       janelas, o chip do preset e as ações — tudo dentro de `HomeToolbar`. A BUSCA deixou de
       ser um botão solto e passou a morar na barra: o affordance duplicado do estado vazio
       (um segundo "Buscar indicador…" na mesma tela) continua desfeito. -->
  <HomeToolbar aoAbrirBusca={() => (buscaAberta = true)} />

  <!-- MIOLO: a coluna do gráfico (`flex-1`) e o trilho de controles (44px, marcador da T7). O
       `min-h-0` é o que permite o gráfico ENCOLHER quando a gaveta inferior abrir (T8);
       sem ele um filho flex recusa ficar menor que o próprio conteúdo e a moldura estoura. -->
  <div class="flex min-h-0 flex-1">
    <!-- 2 · gaveta de configurações: trilho de 44px, sempre visível, MAIS o painel de 320px que
         entra em fluxo ao lado do gráfico (`hidden` quando fechado). Em fluxo, e não por cima:
         abrir encolhe o gráfico em vez de tapá-lo, e nada rola junto com a área do gráfico.
         O componente é um só porque as duas peças compartilham o estado e a rolagem das seções.
         🔴 LADO (2026-11-01, a pedido do usuário): era o trilho DIREITO. Aqui ele vem ANTES da
         coluna do gráfico no DOM, então fica colado na borda esquerda e NÃO se move quando o
         painel abre — o painel nasce à direita dele e o gráfico cede pela esquerda. Na ordem
         antiga o trilho andava ~320px para dentro ao abrir.
         Os nomes acompanharam (2026-11-01): `trilho` e `gaveta-config` no lugar de
         `trilho-direito`/`gaveta-direita`, que passariam a mentir sobre o lado. O `id` do painel
         e o `aria-controls` mudaram junto; os specs foram atualizados na mesma rodada. -->
    <SeriesDrawer
      bind:aberta={configAberta}
      aoFechar={() => (configAberta = false)}
      aoAbrirBusca={() => (buscaAberta = true)}
      aoAbrirTour={() => (tourAberto = true)}
      inativa={fundoAberto && !configAberta}
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- A ÁREA DO GRÁFICO é o único filho flexível da coluna: os quatro estados se revezam
           DENTRO dela e a moldura não muda de tamanho (§9.2 — carregar não pode dar salto).
           `relative` fica para a marca d'água e os overlays das próximas tarefas.
           `overflow-y-auto`: o conteúdo dos ESTADOS pode ser mais alto que a área (o erro
           total lista um motivo por série). Quem rola é a ÁREA, nunca o documento — a moldura
           não muda e nada pinta por cima do footer. O gráfico em si nunca estoura: ele é
           `flex-1` da própria área, então quando ele está montado não há o que rolar. -->
      <div
        data-regiao="grafico"
        inert={configAberta || fundoAberto}
        class="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {#if catalogoFalhou}
          <!-- §9 — erro total do CATÁLOGO: sem a lista não há o que escolher, e o vazio diz por
               quê (a mensagem crua do fetch, não "erro desconhecido"). O retry refaz só esta
               passada; as séries de pé (se houver) não são tocadas. -->
          <ErroTotal
            titulo="Não foi possível carregar a lista de indicadores"
            motivo={$catalogStore.error}
            aoTentarNovamente={tentarCatalogoNovamente}
          />
        {:else if !catalogoPronto}
          <!-- §9.2 — o catálogo ainda está vindo (`idle` de primeira pintura ou `loading`): a
               FORMA do conteúdo, para a moldura não pular quando ele chega. -->
          <Esqueleto />
        {:else if itens.length === 0}
          <EstadoInicial aoPedirExemplo={pedirExemplo} />
        {:else if todosEmErro}
          <!-- §9.3 — erro TOTAL: nada carregou. Sem marcador próprio (R29) — é um ramo a mais. -->
          <ErroTotal
            titulo="Não foi possível carregar os dados"
            motivo={motivoErro}
            aoTentarNovamente={tentarTodas}
          />
        {:else if todosCarregando}
          <Esqueleto />
        {:else}
          <Chart />
        {/if}
      </div>
    </div>
  </div>

  <!-- 3 · gaveta inferior (36px fechada; 32px no celular). O QUE ERA UM PLACEHOLDER NA T5 é agora a alça de
       mandatos/comparação (`BottomDrawer`): fechada mostra o resumo (`N séries · M eixos`),
       aberta cresce para cima e o gráfico cede — em fluxo, nunca por cima. Abrir/fechar não
       escreve em `viewport` nem em `mandate` (§Moldura). -->
  <BottomDrawer
    aberta={fundoAberto}
    aoAlternar={() => (fundoAberto = !fundoAberto)}
    mostrarCasca={mostrarCasca}
    inativa={configAberta}
  />

  {#if tourAberto}
    <Tour aberto={true} aoFechar={() => (tourAberto = false)} />
  {/if}

  {#if buscaAberta}
    <!-- A modal traz o próprio overlay (é um <button>, não um <div> — R31) e fecha por ESC
         ou clique fora, chamando `aoFechar`. -->
    <SearchModal
      aoFechar={() => (buscaAberta = false)}
      aoTentarCatalogo={tentarCatalogoNovamente}
    />
  {/if}
</main>

<style>
  /* A MOLDURA NÃO ROLA — quem rola são as gavetas (T7/T8). O `overflow-hidden` do <main>
     cobre o caso normal; esta regra fecha a raiz do documento porque o harness de dev
     (`app/index.html`) não carrega o `<body class="h-dvh overflow-hidden">` do `Home.astro`,
     e o teste de viewport mede o `documentElement`, não o <main>.
     ⚠ O bloco também mantém o `app.css` presente no build: o `preparar-publico` exige
     `app.css` ao lado do `app.js`, e um bundle vazio aborta a cadeia do `npm run build`
     antes do Astro. (Desde a T8 os componentes com CSS escopado — chips, legenda, trilho e
     matriz — voltaram à árvore pelas duas gavetas; esta regra segue valendo para a raiz.) */
  :global(html),
  :global(body) {
    overflow: hidden;
  }
</style>

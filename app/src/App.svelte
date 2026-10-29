<script>
  import { onMount } from 'svelte';
  import { catalogStore, carregarCatalogo } from './stores/catalog.js';
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
  // 🔴 Só se importa o que JÁ EXISTE. Um import de arquivo inexistente QUEBRA O BUILD.
  // Os controles das gavetas vivem no seu lugar fixo, não numa pilha de blocos: a direita
  // (chips, legenda e eixos) veio na T7; a inferior (mandatos e comparação) chega aqui na T8.
  // Os FILTROS DE TEMPO voltaram pela T6, dentro da barra superior (`HomeToolbar`).

  let buscaAberta = $state(false);
  /** A gaveta direita é dona da própria abertura? NÃO: o estado vive aqui, porque a prioridade
   *  do `Esc` entre camadas (busca → gavetas) é da `App` (T9). O componente recebe `bind:aberta`
   *  para o gatilho do trilho poder alternar sem duplicar a fonte da verdade. */
  let direitaAberta = $state(false);
  /** A gaveta inferior (mandatos + comparação) também é da `App`, pelo mesmo motivo: a
   *  prioridade do `Esc` entre camadas é daqui (T9). `mostrarCasca` é a regra §9.1 — sem série
   *  a alça existe DESABILITADA (a moldura não pula), e o conteúdo nem é montado. */
  let fundoAberto = $state(false);
  let itens = $derived($seriesStore.itens);

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

  // O motivo vem das PRÓPRIAS séries: a mensagem do validador já diz o que houve — um `schema`
  // não suportado, por exemplo, chega com a palavra "schema" (§6). NUNCA "erro desconhecido":
  // o vazio sempre diz por quê (§9). Várias séries → um motivo por linha.
  let motivoErro = $derived.by(() => {
    const falhas = itens.filter((i) => i.status === 'erro' && i.error);
    if (falhas.length === 0) return null;
    if (falhas.length === 1) return falhas[0].error;
    return falhas.map((i) => `${i.name}: ${i.error}`).join('\n');
  });

  // §9.1 — o atalho de primeiro uso. Os IDs vivem no `indicators.json`; o par "Selic × IPCA" é
  // RESOLVIDO no catálogo carregado NA HORA DE ADICIONAR — nada de hardcodar nome nem URL aqui.
  const EXEMPLO_IDS = ['selic-meta-acum-12m', 'ipca-acum-12m'];

  function pedirExemplo() {
    const { indicators } = $catalogStore;
    for (const id of EXEMPLO_IDS) {
      const entry = indicators.find((i) => i.id === id);
      if (entry) adicionarSerie(entry);
    }
  }

  /** O "tentar de novo" do erro total: refaz o fetch de CADA série (uma a uma, como no add). */
  function tentarTodas() {
    for (const item of itens) tentarNovamente(item.id);
  }

  onMount(() => {
    carregarCatalogo();
    carregarMandatos();
  });

  /**
   * §Teclado — a prioridade do `Esc` entre as camadas mora AQUI, num lugar só: busca (que trata
   * a própria tecla) → gaveta direita → gaveta inferior. Cada gaveta não escuta mais o teclado:
   * duas donas da mesma tecla fechariam duas camadas de uma vez. O foco de volta ao gatilho é
   * do componente (o `$effect` dele observa `aberta`), não desta função.
   */
  function aoTeclar(evento) {
    if (evento.key !== 'Escape' || evento.defaultPrevented) return;
    // A modal de busca é a camada do topo e cuida do próprio `Esc`; aqui só se evita fechar
    // a gaveta que está ATRÁS dela.
    if (buscaAberta) return;
    if (direitaAberta) {
      evento.preventDefault();
      direitaAberta = false;
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

  <!-- MIOLO: a coluna do gráfico (`flex-1`) e o trilho direito (44px, marcador da T7). O
       `min-h-0` é o que permite o gráfico ENCOLHER quando a gaveta inferior abrir (T8);
       sem ele um filho flex recusa ficar menor que o próprio conteúdo e a moldura estoura. -->
  <div class="flex min-h-0 flex-1">
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
        inert={direitaAberta || fundoAberto}
        class="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {#if itens.length === 0}
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

    <!-- 2 · gaveta direita (T7): trilho de 44px, sempre visível, MAIS o painel de 320px que
         entra em fluxo ao lado do gráfico (`hidden` quando fechado). Em fluxo, e não por cima:
         abrir encolhe o gráfico em vez de tapá-lo, e nada rola junto com a área do gráfico.
         O componente é um só porque as duas peças compartilham o estado e a rolagem das seções. -->
    <SeriesDrawer
      bind:aberta={direitaAberta}
      aoFechar={() => (direitaAberta = false)}
      aoAbrirBusca={() => (buscaAberta = true)}
      inativa={fundoAberto && !direitaAberta}
    />
  </div>

  <!-- 3 · gaveta inferior (36px fechada; 32px no celular). O QUE ERA UM PLACEHOLDER NA T5 é agora a alça de
       mandatos/comparação (`BottomDrawer`): fechada mostra o resumo (`N séries · M eixos`),
       aberta cresce para cima e o gráfico cede — em fluxo, nunca por cima. Abrir/fechar não
       escreve em `viewport` nem em `mandate` (§Moldura). -->
  <BottomDrawer
    aberta={fundoAberto}
    aoAlternar={() => (fundoAberto = !fundoAberto)}
    mostrarCasca={mostrarCasca}
    inativa={direitaAberta}
  />

  {#if buscaAberta}
    <!-- A modal traz o próprio overlay (é um <button>, não um <div> — R31) e fecha por ESC
         ou clique fora, chamando `aoFechar`. -->
    <SearchModal aoFechar={() => (buscaAberta = false)} />
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

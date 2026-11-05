<script>
  // GAVETA INFERIOR (T8) — a comparação por mandato num lugar fixo (§1 do desenho do terminal).
  //
  // A barra de 36px deixou de ser um placeholder: ela é a ALÇA da gaveta e, fechada, mostra o
  // RESUMO do que está em cena (`N séries · M eixos`) à direita e o rótulo "Comparação por
  // mandato" à esquerda. O resumo mora aqui, e não no gráfico, porque é a única frase que cabe
  // na barra e responde "o que estou vendo?".
  //
  // ⚠ O TRILHO de mandatos (`MandateRail`) saiu em 2026-10-30: ele era um TERCEIRO caminho para
  // o mesmo estado (`mandateStore` + `aplicarMandato`), ao lado do chip da barra superior e da
  // faixa do minimapa — e a gaveta nasce recolhida, então era o caminho que ninguém via. O que
  // sobra aqui é a LEITURA (a matriz), não o controle. Não voltar a pôr um seletor nesta gaveta
  // sem remover um dos outros dois.
  //
  // ⚠ Ele saiu por um dia (2026-10-28) na tentativa de liberar o canto direito para a atribuição
  // do TradingView. A atribuição foi para o canto da BARRA SUPERIOR e o resumo voltou: sem ele a
  // barra virava um rótulo solto, e o usuário perdeu a leitura de séries/eixos.
  //
  // O estado `aberta` NÃO vive neste componente: a gaveta é irmã da gaveta de configurações, e a
  // PRIORIDADE do `Esc` entre camadas (busca → direita → inferior) é da `App` (T9). Aqui só
  // existe a geometria e o gatilho; `aoAlternar` é o caminho único de abrir/fechar.
  //
  // §Moldura — abrir e fechar é SÓ geometria: nenhuma ação de `viewport` ou `mandate` é
  // chamada. O recorte de tempo e o mandato em cena não podem ser zerados por um clique de UI.
  // (Quem escreve nesses stores é o chip da barra superior e o minimapa, e só quando o USUÁRIO
  // escolhe um governo.)
  //
  // A gaveta fica ABAIXO do miolo (gráfico + trilho) e cresce para cima: no desktop ela é
  // `max-h-[min(360px,45dvh)]` em FLUXO e com altura de CONTEÚDO, então crescer ENCOLHE o
  // gráfico em vez de tapá-lo, e uma matriz curta não deixa faixa morta. No celular ela é um
  // bottom sheet (`max-md:fixed`) acima da barra, com véu que fecha ao toque e arrasto para
  // baixo na alça (> 80px) — a matriz rola por dentro, como manda a spec mobile.
  import ComparisonPanel from './ComparisonPanel.svelte';
  import { seriesStore } from '../stores/series.js';
  import { axesStore } from '../stores/axes.js';
  import { deveFecharAoArrastar } from '../domain/gesto.js';

  let { aberta = false, aoAlternar = () => {}, mostrarCasca = false, inativa = false } = $props();


  /** O gatilho — para onde o foco volta quando a gaveta fecha (`Esc` ou "×"). */
  let alca = $state(null);

  const itens = $derived($seriesStore.itens);

  // M = 2 quando as séries ocupam os DOIS eixos, senão 1 (`axesStore` é a fonte da atribuição —
  // o mesmo dado que a gaveta de configurações edita). Conta os LADOS usados, não "existe alguma à
  // direita": com o eixo-base na direita (2026-10-30) toda atribuição contém `right`, e o resumo
  // diria "2 eixos" com uma série só.
  const eixos = $derived(new Set(Object.values($axesStore.atribuicao)).size || 1);

  // Concordância com o NÚMERO (`1 série · 1 eixo`, `2 séries · 2 eixos`). O preset do dia pode
  // ter UMA série só, e `1 séries` é o tipo de erro que faz a barra parecer quebrada. A regra
  // de plural fica em UMA função, usada pelos dois substantivos — não há caso especial.
  const plural = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
  const resumo = $derived(
    `${plural(itens.length, 'série', 'séries')} · ${plural(eixos, 'eixo', 'eixos')}`,
  );

  /**
   * O que a gaveta mostra é `aberta` E `mostrarCasca`. As duas condições são diferentes de
   * propósito: `aberta` é a INTENÇÃO do usuário, `mostrarCasca` é a possibilidade (§9.1 —
   * sem série as alças ficam DESABILITADAS, não escondidas). Se a última série sair com a
   * gaveta aberta, a intenção continua guardada e a gaveta simplesmente recolhe — em vez de
   * ficar um painel vazio de 45% da tela.
   */
  const expandida = $derived(aberta && mostrarCasca);

  /**
   * Abrir/fechar. `arrasteFechou` absorve o `click` que o navegador dispara DEPOIS de um
   * arrasto: sem isto, arrastar para baixo fecharia e reabriria na mesma soltura.
   */
  let inicioY = null;
  let arrasteFechou = false;

  function alternar() {
    if (arrasteFechou) {
      arrasteFechou = false;
      return;
    }
    aoAlternar();
  }

  function fechar() {
    aoAlternar();
    alca?.focus();
  }

  function aoPressionar(evento) {
    // Qualquer toque novo cancela a absorção pendente: se o `click` pós-arrasto não vier (a
    // alça pode sair de baixo do dedo), `arrasteFechou` ficaria `true` para sempre e engoliria
    // o PRÓXIMO toque — o usuário tocaria e nada abriria.
    arrasteFechou = false;
    if (!expandida) return;
    inicioY = evento.clientY;
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId);
    } catch {
      // capture é uma conveniência: sem ela o `pointerup` pode chegar fora da alça e o
      // arrasto é cancelado (mais abaixo) — nunca um estado preso.
    }
  }

  function aoSoltar(evento) {
    if (inicioY === null) return;
    const deslocamento = evento.clientY - inicioY;
    inicioY = null;
    try {
      evento.currentTarget.releasePointerCapture(evento.pointerId);
    } catch {
      /* idem acima */
    }
    // 80px é o limiar da spec mobile (uma regra só, em `domain/gesto.js`): menos que isso é
    // toque/hesitação, não intenção de fechar.
    if (deveFecharAoArrastar(deslocamento)) {
      arrasteFechou = true;
      // Mesmo caminho de fechar do `×`/`Esc`: o foco volta para a alça. Sem isto, quem fechou
      // arrastando fica com o foco no vazio (no celular o foco sai do painel que acabou de
      // sumir) e o próximo TAB recomeça do topo do documento.
      fechar();
    }
  }

  function aoCancelar() {
    inicioY = null;
  }

  /**
   * §Teclado (T9) — o `Esc` da gaveta não mora mais aqui: a prioridade entre camadas (busca →
   * direita → inferior) é da `App`, num listener só, para uma tecla não fechar duas.
   *
   * O FOCO continua sendo desta gaveta: ao abrir, o "×" (agora na barra) recebe o foco; ao
   * fechar — por `Esc`, "×", véu ou arrasto —, ele volta para a alça.
   * `expandida` (e não `aberta`) é o que conta: sem casca o painel nem é montado.
   */
  let jaExpandida = false;
  let botaoFechar = $state(null);
  $effect(() => {
    if (expandida === jaExpandida) return;
    jaExpandida = expandida;
    if (expandida) botaoFechar?.focus();
    else alca?.focus();
  });

  // 🔴 `$derived` — não `const`. Uma `const` que lê `expandida` congela no primeiro render
  // (medido: a barra ficava com a altura antiga para sempre e o painel crescia PARA FORA da moldura).
  const CLASSE_CASCA = $derived(
    expandida
      ? // Aberta: a altura ACOMPANHA O CONTEÚDO (2026-10-30, a pedido do usuário). Antes era
        // `h-[45dvh]` fixo e, como a matriz raramente enche isso, sobrava uma área cinza morta
        // embaixo dela. O teto continua em 360px / 45dvh — passando disso, a matriz rola por
        // dentro (`CLASSE_PAINEL`). No celular a barra FICA em 32px: o painel é uma folha fixa
        // acima dela, e a moldura não pode pular entre os dois layouts.
        'max-h-[min(360px,45dvh)] max-md:h-8 max-md:max-h-none'
      : // Fechada: a barra de sempre. `36px` (32px no celular) é a medida da SPEC (T5/T11),
        // revista em 2026-10-28 para dar respiro à fonte de 13px.
        'h-9 max-md:h-8',
  );

  const CLASSE_PAINEL =
    'flex min-h-0 flex-1 flex-col border-t border-slate-800 bg-slate-900 ' +
    'max-md:fixed max-md:inset-x-0 max-md:bottom-8 max-md:z-40 ' +
    'max-md:max-h-[70dvh] max-md:rounded-t-xl max-md:border-t max-md:border-slate-700 ' +
    'max-md:shadow-2xl';
</script>

<!-- VÉU do bottom sheet (celular). Fica FORA do `<footer>` de propósito: um `position: fixed`
     dentro de um ancestral com `overflow: hidden` é frágil de raciocinar, e o véu precisa cobrir
     a tela inteira. Fecha ao toque — e o `aria-label` é diferente de "Fechar comparação" porque
     o E2E da T9 mira o "×" da barra por nome (dois iguais dariam ambiguidade). -->
{#if expandida}
  <button
    type="button"
    inert={inativa}
    class="fixed inset-0 z-30 cursor-default border-0 bg-black/40 p-0 md:hidden"
    aria-label="Fechar gaveta inferior ao tocar fora"
    onclick={() => aoAlternar()}
  ></button>
{/if}

<!-- A BARRA/folha. Ele é `<footer>` de propósito desde a T5: o rodapé do SITE não existe no app,
     e o teste de casca exclui este `data-testid` da proibição. `relative z-40` põe a alça acima
     do véu (z-30) no celular; na mesma camada da modal de busca, que vem depois na árvore. -->
<footer
  data-testid="barra-inferior"
  inert={inativa}
  class="relative z-40 flex shrink-0 flex-col overflow-hidden max-md:z-30 {CLASSE_CASCA}"
>
  <!-- A BARRA · 36px (32px no celular): a ALÇA da gaveta e, aberta, também o "×" que a fecha.
       O "×" mora AQUI, e não numa faixa própria dentro do painel (2026-10-30, a pedido do
       usuário): aquela faixa era uma linha inteira só com o "×" — altura de gráfico gastada
       para nada —, e o painel ficava com DOIS títulos iguais ("Comparação por mandato" aqui na
       barra e de novo no topo da matriz). Agora o título é UM: o da barra, que já está sempre à
       vista; a matriz fica sem `h2` e mantém o nome pela `aria-label` da seção. -->
  <div class="flex h-8 shrink-0 items-stretch border-t border-slate-800 md:h-9">
    <!-- A ALÇA. É um `<button>` de verdade (não um `<div>` com `onclick`) porque ela carrega
         ESTADO (`aria-expanded`) e a gaveta que ela controla (`aria-controls`).
         DESABILITADA — nunca escondida — quando não há série: a moldura não pula (§9.1). -->
    <button
      type="button"
      bind:this={alca}
      aria-expanded={expandida}
      aria-controls="gaveta-inferior"
      disabled={!mostrarCasca}
      title={!mostrarCasca
        ? 'Adicione uma série para comparar por mandato'
        : expandida
          ? 'Recolher comparação por mandato'
          : 'Abrir comparação por mandato'}
      class="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent md:text-[13px]"
      onclick={alternar}
      onpointerdown={aoPressionar}
      onpointerup={aoSoltar}
      onpointercancel={aoCancelar}
    >
      <!-- O gatilho se ANUNCIA: chevron apontando para o lado em que a gaveta vai (para cima quando
         fechada, para baixo quando aberta). O `▬` de antes não dizia direção nenhuma — parecia um
         minimizar. Um ícone só, girado por estado: a transição conta o movimento. -->
    <svg
      class="h-3 w-3 shrink-0 text-slate-400 transition-transform duration-200 {expandida
        ? 'rotate-180'
        : ''}"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 15 6-6 6 6"></path>
    </svg>
      <span class="min-w-0 flex-1 truncate uppercase tracking-wide">Comparação por mandato</span>
      <span class="shrink-0 tabular-nums">{resumo}</span>
    </button>

    <!-- AVISO SOBRE OS DADOS (2026-11-01) — o gráfico é o produto, e até aqui a `/` não tinha
         NENHUMA menção a termos ou a erro de dado: o `Home.astro` não carrega rodapé e a barra
         superior é marca + busca + janela. Este link é a única superfície do aviso na home; ele
         é curto de propósito (a barra tem 36px) e leva ao texto completo nos Termos de Uso, que
         dizem que os dados são reproduzidos de fonte pública, sem garantia de exatidão.
         No desktop o rótulo aparece; no celular sobra só "Termos", que cabe nos 32px da barra.
         Fora do `<button>` da alça: link dentro de botão não é clicável nem anunciado direito. -->
    <a
      href="/termos-de-uso.html"
      title="Dados reproduzidos de fontes públicas, sujeitos a revisão e sem garantia de exatidão"
      class="flex shrink-0 items-center gap-1 px-2 text-[11px] text-slate-400 no-underline hover:bg-slate-800 hover:text-slate-200"
    >
      <span class="hidden md:inline">Dados públicos · </span>Termos
    </a>

    <!-- O "×": o caminho de fechar que NÃO depende de teclado (no celular o arrasto e o véu
         também fecham, mas nenhum dos dois é descobrível sozinho). Só existe ABERTA — fechada,
         a barra é só a alça. -->
    {#if expandida}
      <button
        type="button"
        bind:this={botaoFechar}
        class="flex w-8 shrink-0 items-center justify-center text-base leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:w-9"
        aria-label="Fechar comparação"
        title="Fechar comparação"
        onclick={fechar}
      >
        ×
      </button>
    {/if}
  </div>

  <!-- PAINEL · montado só quando há casca. Fechado leva `hidden` (e NENHUMA classe de
       `display`): um painel só deslocado por `translate` continuaria na árvore de
       acessibilidade e focável por TAB. O ternário abaixo existe porque `display: flex` do
       autor atropelaria o `display: none` de `[hidden]` — o defeito que faria a gaveta
       "fechada" continuar pintando. -->
  {#if mostrarCasca}
    <div
      id="gaveta-inferior"
      data-testid="gaveta-inferior"
      hidden={!expandida}
      class={expandida ? CLASSE_PAINEL : ''}
    >
      <!-- A vista é única e rola AQUI: só a matriz, sem título (o título é o da barra).
           `min-h-0` é o que permite o filho rolar em vez de esticar o painel. -->
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        <ComparisonPanel />
      </div>
    </div>
  {/if}
</footer>

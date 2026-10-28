<script>
  // GAVETA INFERIOR (T8) — mandatos e comparação num lugar fixo (§1 do desenho do terminal).
  //
  // A barra de 26px deixou de ser um placeholder: ela é a ALÇA da gaveta e, fechada, mostra o
  // RESUMO do que está em cena (`N séries · M eixos`). O resumo mora aqui, e não no gráfico,
  // porque é a única frase que cabe em 26px e responde "o que estou vendo?".
  //
  // O estado `aberta` NÃO vive neste componente: a gaveta é irmã da gaveta direita, e a
  // PRIORIDADE do `Esc` entre camadas (busca → direita → inferior) é da `App` (T9). Aqui só
  // existe a geometria e o gatilho; `aoAlternar` é o caminho único de abrir/fechar.
  //
  // §Moldura — abrir e fechar é SÓ geometria: nenhuma ação de `viewport` ou `mandate` é
  // chamada. O recorte de tempo e o mandato em cena não podem ser zerados por um clique de UI.
  // (Quem escreve nesses stores é o `MandateRail`, e só quando o USUÁRIO escolhe um governo.)
  //
  // A gaveta fica ABAIXO do miolo (gráfico + trilho) e cresce para cima: no desktop ela é
  // `h-[45dvh] max-h-[360px]` em FLUXO, então crescer ENCOLHE o gráfico em vez de tapá-lo. No
  // celular ela é um bottom sheet (`max-md:fixed`) acima da barra, com véu que fecha ao toque e
  // arrasto para baixo na alça (> 80px) — a matriz rola por dentro, como manda a spec mobile.
  import MandateRail from './MandateRail.svelte';
  import ComparisonPanel from './ComparisonPanel.svelte';
  import { seriesStore } from '../stores/series.js';
  import { axesStore } from '../stores/axes.js';

  let { aberta = false, aoAlternar = () => {}, mostrarCasca = false } = $props();

  /** O gatilho — para onde o foco volta quando a gaveta fecha (`Esc` ou "×"). */
  let alca = $state(null);

  const itens = $derived($seriesStore.itens);

  // M = 2 quando ALGUMA série está no eixo da direita, senão 1 (`axesStore` é a fonte da
  // atribuição — o mesmo dado que a gaveta direita edita). Sem série não há atribuição: 1 eixo.
  const eixos = $derived(Object.values($axesStore.atribuicao).includes('right') ? 2 : 1);

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
    // 80px é o limiar da spec mobile: menos que isso é toque/hesitação, não intenção de fechar.
    if (deslocamento > 80) {
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
   * `Esc` fecha a gaveta (e devolve o foco à alça). `defaultPrevented` respeita quem tratou a
   * tecla antes — a MODAL de busca está montada depois na árvore e trata o `Esc` primeiro. A
   * prioridade ENTRE as gavetas é centralizada na `App` (T9); aqui só se evita fechar duas.
   */
  function aoTeclar(evento) {
    if (evento.key !== 'Escape' || !expandida || evento.defaultPrevented) return;
    evento.preventDefault();
    fechar();
  }

  // 🔴 `$derived` — não `const`. Uma `const` que lê `expandida` congela no primeiro render
  // (medido: a barra ficava em 26px para sempre e o painel crescia PARA FORA da moldura).
  const CLASSE_CASCA = $derived(
    expandida
      ? // Aberta: cresce para cima e o gráfico (`flex-1`) cede. No celular a barra FICA em 26px —
        // o painel é uma folha fixa acima dela, e a moldura não pode pular entre os dois layouts.
        'h-[45dvh] max-h-[360px] max-md:h-[26px] max-md:max-h-none'
      : // Fechada: a barra de sempre. `26px` é medida da SPEC (T5/T11), não um chute.
        'h-[26px]',
  );

  const CLASSE_PAINEL =
    'flex min-h-0 flex-1 flex-col border-t border-slate-800 bg-slate-900 ' +
    'max-md:fixed max-md:inset-x-0 max-md:bottom-[26px] max-md:z-40 max-md:h-[45dvh] ' +
    'max-md:max-h-[70dvh] max-md:rounded-t-xl max-md:border-t max-md:border-slate-700 ' +
    'max-md:shadow-2xl';
</script>

<svelte:window onkeydown={aoTeclar} />

<!-- VÉU do bottom sheet (celular). Fica FORA do `<footer>` de propósito: um `position: fixed`
     dentro de um ancestral com `overflow: hidden` é frágil de raciocinar, e o véu precisa cobrir
     a tela inteira. Fecha ao toque — e o `aria-label` é diferente de "Fechar comparação" porque
     o E2E da T9 mira o botão do cabeçalho por nome (dois iguais dariam ambiguidade). -->
{#if expandida}
  <button
    type="button"
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
  class="relative z-40 flex shrink-0 flex-col overflow-hidden {CLASSE_CASCA}"
>
  <!-- A ALÇA · 26px. É um `<button>` de verdade (não um `<div>` com `onclick`) porque ela
       carrega ESTADO (`aria-expanded`) e a gaveta que ela controla (`aria-controls`).
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
        ? 'Recolher mandatos e comparação'
        : 'Abrir mandatos e comparação'}
    class="flex h-[26px] w-full shrink-0 items-center gap-2 border-t border-slate-800 px-2 text-left text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:text-slate-600 disabled:hover:bg-transparent"
    onclick={alternar}
    onpointerdown={aoPressionar}
    onpointerup={aoSoltar}
    onpointercancel={aoCancelar}
  >
    <span class="text-slate-500" aria-hidden="true">▬</span>
    <span class="min-w-0 flex-1 truncate">Comparação por mandato</span>
    <span class="shrink-0 tabular-nums">{resumo}</span>
  </button>

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
      <!-- Cabeçalho com o "×": o caminho de fechar que NÃO depende de teclado (no celular o
           arrasto e o véu também fecham, mas nenhum dos dois é descobrível sozinho). -->
      <div
        class="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-2 py-1"
      >
        <h2 class="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
          Mandatos e comparação
        </h2>
        <button
          type="button"
          class="shrink-0 rounded px-2 text-base leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Fechar comparação"
          title="Fechar comparação"
          onclick={fechar}
        >
          ×
        </button>
      </div>

      <!-- A vista é única e rola AQUI: o `MandateRail` no topo e a matriz abaixo, na ordem da
           spec. `min-h-0` é o que permite o filho rolar em vez de esticar o painel. -->
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
        <MandateRail />
        <ComparisonPanel />
      </div>
    </div>
  {/if}
</footer>

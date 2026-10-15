<script>
  // §1.1 — a terceira coluna da modal: a FICHA do indicador.
  //
  // Ela existe por um motivo específico da §5: o aviso de compatibilidade de escala tem de vir
  // ANTES da escolha, não depois como erro. O chip é pequeno demais e o gráfico já está desenhado
  // quando o problema aparece — a ficha transforma um erro futuro em informação presente. É a
  // diferença entre informar e punir.
  //
  // §6 — cada campo vem do PRÓPRIO DADO (a série), não do catálogo: unidade, granularidade,
  // período coberto, nº de pontos e fonte. O catálogo só tem esses campos durante a transição;
  // a série é a fonte canônica. Por isso a ficha carrega a série sob demanda com `loadSeries` —
  // o MESMO cache por URL do resto do app, então reabrir a mesma ficha custa zero.
  //
  // §5 — o aviso é calculado sobre a SÉRIE INTEIRA, nunca sobre a janela visível: um aviso que se
  // recalcula no zoom pisca na tela e ensina o usuário a ignorá-lo.
  //
  // §8 — nada de `window`; runes, nunca `$:`. Nenhuma frase de UI é reescrita aqui: o motivo do
  // limite chega PRONTO da store (`motivoDoLimite()`), via prop.
  import { loadSeries } from '../data/series.js';
  import { seriesStore } from '../stores/series.js';
  import { comparabilidade } from '../domain/scales.js';

  /** `aoTeclado` é a regra única de teclado da modal (§12.1) — repassada para o Adicionar não
   *  perder `Esc`/setas quando ele está focado. */
  let { indicador = null, noLimite = false, motivo = null, aoAdicionar, aoTeclado = undefined } =
    $props();

  /** Estado do carregamento da PRÓPRIA série da ficha (ela é sobre um dado ainda não escolhido). */
  let estado = $state({ status: 'idle', series: null, error: null });

  // Carrega a série quando o indicador muda. O cache de módulo do `loadSeries` torna a reabertura
  // gratuita — o mesmo `datafile` não é baixado duas vezes.
  $effect(() => {
    const ind = indicador;
    if (!ind) {
      estado = { status: 'idle', series: null, error: null };
      return;
    }
    let vivo = true;
    estado = { status: 'carregando', series: null, error: null };
    loadSeries(ind.datafile, { expectedId: ind.id })
      .then((s) => {
        if (vivo) estado = { status: 'ok', series: s, error: null };
      })
      .catch((e) => {
        if (vivo) estado = { status: 'erro', series: null, error: e.message };
      });
    return () => {
      vivo = false;
    };
  });

  // §5 — as séries que já estão no gráfico, com dado carregado. A própria ficha é EXCLUÍDA: se o
  // indicador já está no gráfico, o aviso dele vive na legenda, não aqui.
  let carregadas = $derived(
    $seriesStore.itens.filter((i) => i.series && i.id !== indicador?.id).map((i) => i.series),
  );

  let aviso = $derived.by(() => {
    const s = estado.series;
    if (!s || carregadas.length === 0) return { veredito: 'convive', ratio: 1, contra: null };
    return comparabilidade(s, carregadas);
  });

  /** Nome da série culpada — a que produziu a pior razão (§5). */
  let nomeContra = $derived.by(() => {
    const id = aviso.contra?.id;
    if (!id) return null;
    return $seriesStore.itens.find((i) => i.id === id)?.name ?? id;
  });

  let jaNoGrafico = $derived($seriesStore.itens.some((i) => i.id === indicador?.id));

  const TIPO = { percentage: 'percentual', number: 'contagem', currency: 'moeda' };
  const GRANULARIDADE = { daily: 'diária', monthly: 'mensal', annual: 'anual' };

  /** Vírgula é a convenção dos números em português. */
  const numero = (n) => n.toLocaleString('pt-BR');
  const dataBr = (iso) => {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  };

  let periodo = $derived.by(() => {
    const d = estado.series?.data;
    if (!d || d.length === 0) return null;
    return `${dataBr(d[0].date)} – ${dataBr(d[d.length - 1].date)}`;
  });
</script>

<!-- O `data-bloco="ficha"` sobrevive à troca (R29) — é o que torna a ordem da §1 conferível por DOM. -->
<div data-bloco="ficha" class="min-h-0 w-72 shrink-0 overflow-y-auto p-4">
  {#if !indicador}
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Escolha um indicador para ver a ficha.
    </p>
  {:else}
    <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{indicador.name}</h3>
    {#if indicador.description}
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{indicador.description}</p>
    {/if}

    {#if estado.status === 'carregando'}
      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Carregando…</p>
    {:else if estado.status === 'erro'}
      <!-- §9 — o vazio sempre diz por quê: a mensagem do validador/rede chega crua, não "erro desconhecido". -->
      <p class="mt-3 text-xs text-red-600 dark:text-red-400">
        Não foi possível carregar a série: {estado.error}
      </p>
    {:else if estado.status === 'ok'}
      <!-- §1.1 — unidade, granularidade, período, nº de pontos e fonte. Tudo do dado, nada inventado. -->
      <dl class="mt-3 space-y-1 text-xs">
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Unidade</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">
            {estado.series.unit.symbol}
            <span class="text-slate-400 dark:text-slate-500">({TIPO[estado.series.unit.type]})</span>
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Granularidade</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">
            {GRANULARIDADE[estado.series.granularity]}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Período</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">{periodo}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Pontos</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">
            {numero(estado.series.data.length)}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="shrink-0 text-slate-500 dark:text-slate-400">Fonte</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">{estado.series.source}</dd>
        </div>
      </dl>

      <!-- §5 — o AVISO DE ESCALA, em dois graus: `avisa` (> 50×) e `ilegivel` (> 1.000.000×).
           Vem ANTES da escolha, como informação: informa, NÃO bloqueia. -->
      {#if aviso.veredito !== 'convive'}
        <div
          class="mt-4 rounded border p-3 text-xs {aviso.veredito === 'ilegivel'
            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
            : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}"
        >
          <p class="font-medium">
            ⚠ Escala incompatível — razão ≈ {numero(Math.round(aviso.ratio))}× com «{nomeContra}».
          </p>
          <p class="mt-1">
            {#if aviso.veredito === 'ilegivel'}
              Nem dois eixos tornam esta combinação legível: na mesma escala, a série de menor
              amplitude vira uma reta colada no zero.
            {:else}
              Acima do limite de 50× de amplitude, a série não é legível no mesmo eixo das que já
              estão no gráfico.
            {/if}
          </p>
        </div>
      {/if}
    {/if}

    <!-- §9.5 — no teto, o botão fica VISÍVEL e desabilitado, dizendo o motivo (a paleta). Nada é
         removido para abrir espaço. -->
    <div class="mt-4">
      <button
        type="button"
        onclick={() => aoAdicionar?.(indicador)}
        onkeydown={aoTeclado}
        disabled={noLimite || jaNoGrafico}
        class="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {jaNoGrafico ? 'Já está no gráfico' : 'Adicionar'}
      </button>

      {#if noLimite && motivo}
        <!-- A frase vem PRONTA de `motivoDoLimite()` (o motivo é a PALETA, não o layout). -->
        <p class="mt-2 text-xs text-amber-700 dark:text-amber-400">{motivo}</p>
      {/if}
    </div>
  {/if}
</div>

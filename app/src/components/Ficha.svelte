<script>
  // §1.1 — a terceira coluna da modal: a FICHA do indicador.
  //
  // Ela existe para a §5 — mas não com um aviso de escala. Até 2026-11-01 havia aqui um bloco
  // "escala incompatível" que vinha ANTES da escolha; ele saiu porque descrevia um impedimento
  // inexistente (ver o comentário grande mais abaixo). O que a ficha faz hoje é o que sempre fez
  // de fato: mostrar os campos do DADO antes de a pessoa decidir.
  //
  // §6 — cada campo vem do PRÓPRIO DADO (a série), não do catálogo: unidade, granularidade,
  // período coberto, nº de pontos e fonte. O catálogo só tem esses campos durante a transição;
  // a série é a fonte canônica. Por isso a ficha carrega a série sob demanda com `loadSeries` —
  // o MESMO cache por URL do resto do app, então reabrir a mesma ficha custa zero.
  //
  // §8 — nada de `window`; runes, nunca `$:`. Nenhuma frase de UI é reescrita aqui: o motivo do
  // limite chega PRONTO da store (`motivoDoLimite()`), via prop.
  import { loadSeries } from '../data/series.js';
  import { seriesStore } from '../stores/series.js';
  import { rotuloDaGranularidade, rotuloDaUnidade } from '../domain/format.js';

  /** `aoTeclado` é a regra única de teclado da modal (§12.1) — repassada para o Adicionar não
   *  perder `Esc`/setas quando ele está focado. */
  let {
    indicador = null,
    noLimite = false,
    motivo = null,
    aoAdicionar,
    aoRemover,
    aoSubstituir,
    aoTeclado = undefined,
  } = $props();

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

  // 🗑 O AVISO DE ESCALA SAIU DAQUI em 2026-11-01 (a pedido do usuário) — e a razão importa para
  //    ele não voltar: o bloco dizia "escala incompatível / não é legível no mesmo eixo" quando o
  //    app JÁ resolvia o caso, mandando a série para o eixo esquerdo (`stores/axes.js`) sem
  //    bloquear nada. Um aviso que descreve um impedimento inexistente faz a pessoa desistir de
  //    adicionar. O app não explica escala em lugar nenhum: a tela mostra duas escalas, e quem
  //    quiser trocar o lado usa o botão `esq./dir.` da seção Eixos (ver
  //    docs/specs/2026-11-01-aviso-de-escala-design.md).

  let jaNoGrafico = $derived($seriesStore.itens.some((i) => i.id === indicador?.id));

  /** A troca só faz sentido quando há o QUE trocar e o indicador ainda não está no gráfico
   *  (com ele já lá, o botão da ficha é "Remover"). */
  let podeTrocar = $derived(!jaNoGrafico && $seriesStore.itens.length > 0);

  // Unidade e granularidade NÃO têm mapa local: os rótulos moram em `domain/format.js`, com
  // teste. O eixo (C4) é o que separa "contagem" de "taxa por mil"/"taxa por 100 mil" — pelo
  // `unidade.tipo` sozinho, as três seriam "numero".
  /** C5 do contrato — o que o número É. `granularidade` diz de quanto em quanto tempo há ponto. */
  const MEDIDA = {
    nivel: 'valor no período',
    'acumulado-12m': 'acumulado em 12 meses',
    'variacao-anual': 'variação anual',
    estoque: 'total no período',
    participacao: 'participação no total',
  };

  /** Vírgula é a convenção dos números em português. */
  const numero = (n) => n.toLocaleString('pt-BR');
  const dataBr = (iso) => {
    const [a, m, d] = iso.split('-');
    return `${d}/${m}/${a}`;
  };

  let periodo = $derived.by(() => {
    const d = estado.series?.dados;
    if (!d || d.length === 0) return null;
    return `${dataBr(d[0].data)} – ${dataBr(d[d.length - 1].data)}`;
  });
</script>

<!-- O `data-bloco="ficha"` sobrevive à troca (R29) — é o que torna a ordem da §1 conferível por DOM.
     A largura não é fixa aqui: no desktop é a 3ª coluna (`md:w-72` no invólucro) e no celular é a
     folha deslizante de largura total; por isso `w-full flex-1` — quem manda é o invólucro (§12.1). -->
<div data-bloco="ficha" class="min-h-0 w-full flex-1 overflow-y-auto p-4">
  {#if !indicador}
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Escolha um indicador para ver a ficha.
    </p>
  {:else}
    <h3 class="text-sm font-semibold text-slate-900 dark:text-slate-100">{indicador.nome}</h3>
    {#if indicador.descricao}
      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{indicador.descricao}</p>
    {/if}

    <!-- LINK DE AUDITORIA (2026-11-03) — o endereço vem do catálogo (`urlNotebook`), não do
         bundle; o `validar.py` (K9) garante que o notebook existe. Fica no topo, antes do bloco
         de metadados, para continuar visível quando a série falha ao carregar: é justamente o
         caminho para conferir o método do que não carregou. -->
    <a
      href={indicador.urlNotebook}
      target="_blank"
      rel="noopener noreferrer"
      class="mt-2 inline-block text-xs text-sky-700 underline hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
    >
      Ver o notebook que gera estes dados <span aria-hidden="true">↗</span><span class="sr-only">
        (abre em nova aba)</span
      >
    </a>

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
            {estado.series.unidade.simbolo}
            <span class="text-slate-400 dark:text-slate-500"
              >({rotuloDaUnidade(estado.series.eixo, estado.series.unidade.tipo)})</span
            >
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Granularidade</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">
            {rotuloDaGranularidade(estado.series.granularidade)}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Medida</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">
            {MEDIDA[estado.series.medida] ?? estado.series.medida}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Período</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">{periodo}</dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-slate-500 dark:text-slate-400">Pontos</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">
            {numero(estado.series.dados.length)}
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="shrink-0 text-slate-500 dark:text-slate-400">Fonte</dt>
          <dd class="text-right text-slate-700 dark:text-slate-200">{estado.series.fonte}</dd>
        </div>
      </dl>

      <!-- AVISO DE PROVENIÊNCIA (2026-11-01). Fica na ficha porque é aqui que a pessoa examina
           um número antes de usá-lo: diz que o dado é de terceiro e que pode ter sido revisado
           na origem depois da extração. Sem isto, o único lugar que falava em revisão era o 5.2
           dos Termos — que quem olha o gráfico nunca abre. Texto curto de propósito: a ficha é
           uma coluna de 288px. -->
      <p class="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        Reproduzido de fonte pública; pode ter sido revisado na origem depois da extração.
        Confira no órgão produtor antes de usar — os dados não têm garantia de exatidão
        (<a href="/termos-de-uso.html" class="underline hover:text-slate-300">Termos</a>).
      </p>
    {/if}

    <!-- O botão é CHAVE DE DUAS POSIÇÕES (2026-11-01, a pedido do usuário): o estado "está no
         gráfico" deixou de ser um `checkbox` desabilitado na lista e passou a ser a própria ação —
         "Adicionar ao gráfico" ou "Remover do gráfico". Um estado, um lugar: o controle que age.
         §9.5 — no teto, o Adicionar fica VISÍVEL e desabilitado, dizendo o motivo (a paleta);
         nada é removido para abrir espaço. Remover continua habilitado: o teto não é prisão. -->
    <div class="mt-4">
      {#if jaNoGrafico}
        <button
          type="button"
          onclick={() => aoRemover?.(indicador)}
          onkeydown={aoTeclado}
          class="w-full rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Remover do gráfico
        </button>
      {:else}
        <button
          type="button"
          onclick={() => aoAdicionar?.(indicador)}
          onkeydown={aoTeclado}
          disabled={noLimite}
          class="w-full rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Adicionar ao gráfico
        </button>

        {#if noLimite && motivo}
          <!-- A frase vem PRONTA de `motivoDoLimite()` (o motivo é a PALETA, não o layout). -->
          <p class="mt-2 text-xs text-amber-700 dark:text-amber-400">{motivo}</p>
        {/if}

        {#if podeTrocar}
          <!-- AÇÃO SECUNDÁRIA (2026-11-04): "o gráfico está cheio do preset do dia e eu queria só
               esta". Explícita e destrutiva — o rótulo diz que o resto sai. Sem diálogo, sem
               "não perguntar mais" (ver docs/specs/2026-11-04-trocar-o-grafico-design.md).
               Habilitada mesmo no teto: é a saída do limite sem remover uma a uma. O rótulo NÃO
               começa com "Adicionar" para não colidir com o locator do E2E. -->
          <button
            type="button"
            onclick={() => aoSubstituir?.(indicador)}
            onkeydown={(e) => {
              // Só o Esc passa: reusar `aoTeclado` faria ⏎ aqui chamar `confirmarAcao()` —
              // adicionar em vez de trocar. ⏎ neste botão é a ativação nativa.
              if (e.key === 'Escape') {
                e.preventDefault();
                aoTeclado?.(e);
              }
            }}
            class="mt-2 w-full rounded px-3 py-1 text-xs font-medium text-slate-500 underline decoration-slate-400 underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:decoration-slate-500 dark:hover:text-slate-100"
          >
            Trocar o gráfico por esta série
          </button>
        {/if}
      {/if}
    </div>
  {/if}
</div>

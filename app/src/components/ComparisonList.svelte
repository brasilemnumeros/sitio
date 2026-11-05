<script>
  // A LISTA de comparação por mandato — a forma do celular (2026-11-05).
  //
  // É a mesma leitura da matriz: DENTRO de um cartão, o mesmo indicador entre os nove governos.
  // Comparar indicadores diferentes na vertical continua sem sentido, então cada série tem o seu
  // cartão, em vez de uma grade que obrigue a rolar na horizontal.
  //
  // O conteúdo dos quatro estados vem de `ConteudoCelula`, o mesmo componente que a matriz usa:
  // estado de célula não pode ser reimplementado em dois lugares.
  import { deltaNoMandato } from '../domain/mandates.js';
  import { rotuloDaUnidade } from '../domain/format.js';
  import ConteudoCelula from './ConteudoCelula.svelte';

  /** @type {{ itens: Array<object>, mandatos: Array<object> }} */
  let { itens = [], mandatos = [] } = $props();

  /** "R$ · moeda", "% · percentual" — o símbolo é o da série, não o da comparação. */
  const rotuloDaSerie = (item) =>
    [item.unidade?.simbolo, rotuloDaUnidade(item.series?.eixo, item.unidade?.tipo)]
      .filter(Boolean)
      .join(' · ');
</script>

<div class="flex flex-col gap-3 md:hidden" data-bloco="comparacao-lista">
  {#each itens as item (item.id)}
    <section
      data-cartao-indicador
      aria-label={item.nome}
      class="overflow-hidden rounded border border-slate-200 dark:border-slate-700"
    >
      <header
        class="flex items-start gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60"
      >
        <span
          class="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
          style="background:{item.cor}"
          aria-hidden="true"
        ></span>
        <div class="min-w-0">
          <h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.nome}</h3>
          {#if item.status === 'ok' && item.series}
            <p class="text-[10px] text-slate-500 dark:text-slate-400">{rotuloDaSerie(item)}</p>
          {/if}
        </div>
      </header>

      {#if item.status === 'ok' && item.series}
        <ul class="divide-y divide-slate-100 dark:divide-slate-800">
          {#each mandatos as m (m.id)}
            {@const celula = deltaNoMandato(item.series, m)}
            <li
              data-linha-mandato
              data-estado={celula.estado}
              data-em-curso={m.emCurso}
              class="relative flex items-start gap-2 px-3 py-1.5"
            >
              {#if m.emCurso}
                <!-- A mesma hachura do gráfico e do cabeçalho da matriz, agora na borda da linha:
                     o mandato em aberto se lê igual nas três superfícies, sem depender de cor. -->
                <span
                  aria-hidden="true"
                  class="absolute inset-y-0 left-0 w-1"
                  style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(100,116,139,.55) 2px, rgba(100,116,139,.55) 4px)"
                ></span>
              {/if}
              <span class="pt-0.5 text-xs text-slate-600 dark:text-slate-300"
                >{m.rotulo} · {m.partido}</span
              >
              <span class="ml-auto text-right">
                <ConteudoCelula {celula} unidade={item.unidade ?? item.series.unidade} />
              </span>
            </li>
          {/each}
        </ul>
      {:else}
        <!-- §9.3 — uma série que ainda não tem dado não some da comparação: ela diz o estado. -->
        <p class="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500">
          {item.status === 'erro'
            ? `não carregou: ${item.error ?? 'erro desconhecido'}`
            : 'carregando…'}
        </p>
      {/if}
    </section>
  {/each}
</div>

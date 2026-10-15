<script>
  // O PAINEL DE COMPARAÇÃO (§4, posição 6 da página — SEMPRE visível, largura total, não é aba).
  //
  // É uma MATRIZ: uma linha por série selecionada, uma coluna por governo. Cada célula vale
  //   Δ = último valor do mandato − primeiro valor do mandato,
  // na unidade do indicador (§4) — SEM normalização percentual e SEM campo de direção ("queda é
  // bom"). O Δ é absoluto de propósito: o percentual distorce nos mandatos de base pequena
  // (medido: PIB da Dilma I daria −124%).
  //
  // A matriz é comparável NA HORIZONTAL (mesmo indicador entre mandatos) e NÃO na vertical
  // (14 p.p. de juros e 0,3% de PIB são coisas incomparáveis) — limitação assumida, não escondida.
  //
  // §8.1 — este componente NÃO fala com o gráfico: lê `seriesStore` e `mandateStore` e chama a
  // função PURA `deltaNoMandato` (domínio). Nenhum import de `chart/`, nada em `window`, runes.
  // §9 — nenhum vazio silencioso: sem séries ou sem governos, o painel diz por quê.
  // §7.3.4 — a identificação do mandato é TEXTO (`Lula III · PT`); NUNCA cor de partido.
  import { seriesStore } from '../stores/series.js';
  import { mandateStore } from '../stores/mandate.js';
  import { deltaNoMandato, ordenarMandatos } from '../domain/mandates.js';
  import Celula from './Celula.svelte';

  let itens = $derived($seriesStore.itens);
  // A store já entrega ordenado (§7.3.6); reordenar é barato e mantém a regra verdadeira.
  let mandatos = $derived(ordenarMandatos($mandateStore.mandatos));

  // As linhas com dado carregado viram a matriz de Δ. As demais (carregando/erro) ganham linha
  // própria com o estado, para que nenhuma série selecionada fique de fora em silêncio (§9.3).
  const colunas = () => mandatos.length + 1; // +1 = a coluna do rótulo do indicador
</script>

<section class="w-full" data-bloco="comparacao" aria-label="Comparação por mandato">
  <h2 class="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
    Comparação por mandato
  </h2>

  {#if itens.length === 0}
    <!-- §9 — vazio com motivo, nunca um quadro mudo. -->
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Adicione um indicador para comparar a variação entre governos.
    </p>
  {:else if mandatos.length === 0}
    <p class="text-sm text-slate-500 dark:text-slate-400">
      Os dados de governo não carregaram — a comparação por mandato volta quando eles chegarem.
    </p>
  {:else}
    <!-- §9.5 — a matriz ROLA com o cabeçalho dos mandatos FIXO (`sticky`), para o usuário não
         perder a referência de qual coluna lê com 10 linhas. O rótulo do indicador também fica
         preso à esquerda, pelo mesmo motivo simétrico. -->
    <div class="max-h-[70vh] overflow-auto rounded border border-slate-200 dark:border-slate-700">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              class="sticky top-0 left-0 z-20 border-b border-slate-200 bg-white px-2 py-1.5 text-left text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
            >
              Indicador
            </th>
            {#each mandatos as m (m.id)}
              <th
                class="sticky top-0 z-10 border-b border-l border-slate-200 bg-white px-2 py-1.5 text-left align-bottom text-xs font-medium whitespace-nowrap text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                class:hachurada={m.emCurso}
              >
                <span class="block">{m.rotulo} · {m.partido}</span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each itens as item (item.id)}
            <tr class="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <th
                scope="row"
                class="sticky left-0 z-10 bg-white px-2 py-1.5 text-left align-top font-normal whitespace-nowrap dark:bg-slate-900"
              >
                <span class="flex items-center gap-2">
                  <span
                    class="inline-block h-3 w-3 shrink-0 rounded-full"
                    style="background:{item.cor}"
                    aria-hidden="true"
                  ></span>
                  <span class="text-slate-700 dark:text-slate-200">{item.name}</span>
                </span>
              </th>

              {#if item.status === 'ok' && item.series}
                {#each mandatos as m (m.id)}
                  <Celula celula={deltaNoMandato(item.series, m)} unit={item.unit ?? item.series.unit} />
                {/each}
              {:else}
                <!-- §9.3 — uma série que ainda não tem dado NÃO some da matriz: ela diz o estado. -->
                <td
                  colspan={colunas() - 1}
                  class="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500"
                >
                  {item.status === 'erro'
                    ? `não carregou: ${item.error ?? 'erro desconhecido'}`
                    : 'carregando…'}
                </td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  /* §7.3.5 — o mandato EM CURSO leva hachura, a mesma linguagem da faixa no gráfico e do trilho:
     um período em aberto se lê igual nas três superfícies, e sem depender de cor. */
  th.hachurada {
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      rgba(100, 116, 139, 0.18) 4px,
      rgba(100, 116, 139, 0.18) 8px
    );
  }
</style>

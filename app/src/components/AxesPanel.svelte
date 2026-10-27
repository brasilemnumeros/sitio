<script>
  // EIXOS (§5, §9.5) — a terceira seção da gaveta direita (T7).
  //
  // Esta peça nasceu da LEGENDA: o botão `esq.`/`dir.` e o aviso de escala viviam lá, e a partir
  // da T7 passam a morar aqui, sozinhos. Não há duplicata de propósito: dois controles do mesmo
  // eixo em duas superfícies dariam dois lugares para o mesmo clique — e um deles ficaria
  // desatualizado se alguém esquecesse de ligar o outro.
  //
  // Só existem DOIS eixos (§9.5): o botão mostra o lado ATUAL e alterna para o outro. Não há
  // terceiro valor — `moverParaEixo` ignora qualquer outro em silêncio.
  //
  // Runes do Svelte 5; os stores continuam por auto-subscrição (`$store`).
  import { seriesStore } from '../stores/series.js';
  import { axesStore, moverParaEixo } from '../stores/axes.js';

  const itens = $derived($seriesStore.itens);

  // O aviso de ESCALA vem do `axesStore`, indexado por ID — NÃO por posição (fatia 05): a lista
  // é plana e só traz as séries que não conviveram com as que já estavam à esquerda.
  const avisoEscala = (id) => $axesStore.avisos.find((a) => a.id === id);
</script>

<ul class="flex flex-col gap-1" aria-label="Eixos das séries" data-painel="eixos">
  {#if itens.length === 0}
    <li class="text-sm text-slate-500 dark:text-slate-400">Nenhuma série no gráfico.</li>
  {/if}
  {#each itens as item (item.id)}
    <li class="flex flex-wrap items-center gap-2 text-sm">
      <span class="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{item.name}</span>

      {#if avisoEscala(item.id)}
        {@const escala = avisoEscala(item.id)}
        <!-- Dois graus: `avisa` (> 50×) e `ilegivel` (> 1.000.000×). Informa, NÃO bloqueia. -->
        <span
          class="text-xs {escala.veredito === 'ilegivel'
            ? 'font-semibold text-red-600 dark:text-red-400'
            : 'text-amber-600 dark:text-amber-400'}"
          title="Razão de amplitude {escala.ratio.toFixed(0)}× — {escala.veredito === 'ilegivel'
            ? 'nem dois eixos tornam esta combinação legível'
            : 'acima do limite de 50×'}"
        >
          ⚠ escala {escala.ratio.toFixed(0)}×
        </span>
      {/if}

      <!-- Mesmo nome acessível de sempre: o rótulo é o eixo ATUAL (`esq.`/`dir.`) e o clique
           alterna. A store diz o lado; o componente não decide nada (§8.1). -->
      <button
        type="button"
        class="shrink-0 rounded border border-slate-300 px-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
        title="Trocar de eixo"
        onclick={() =>
          moverParaEixo(item.id, $axesStore.atribuicao[item.id] === 'left' ? 'right' : 'left')}
      >
        {$axesStore.atribuicao[item.id] === 'left' ? 'esq.' : 'dir.'}
      </button>
    </li>
  {/each}
</ul>

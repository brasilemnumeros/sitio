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

  // 🗑 O SELO DE ESCALA (`⚠ escala N×`) SAIU EM 2026-11-01, junto com o bloco da ficha: os dois
  //    diziam a mesma coisa e nenhum dos dois bloqueava nada — o app já põe a série incompatível
  //    no eixo esquerdo automaticamente. Quem quiser trocar o lado usa o botão abaixo, que é o
  //    controle de verdade. Ver docs/specs/2026-11-01-aviso-de-escala-design.md.
</script>

<ul class="flex flex-col gap-1" aria-label="Eixos das séries" data-painel="eixos">
  {#if itens.length === 0}
    <li class="text-sm text-slate-500 dark:text-slate-400">Nenhuma série no gráfico.</li>
  {/if}
  {#each itens as item (item.id)}
    <li class="flex flex-wrap items-center gap-2 text-sm">
      <span class="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{item.name}</span>

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

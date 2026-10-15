<script>
  // O TRILHO DE MANDATOS (§3, posição 5 da página).
  //
  // É um SELETOR, não uma régua temporal. Uma caixa por governo, TODAS DE LARGURA IGUAL,
  // desacoplada do eixo do tempo do gráfico — de propósito. Alinhar o trilho ao tempo daria
  // ~27 px para a Dilma II (1,7 ano contra 4 dos mandatos cheios), onde não cabe nem o nome
  // nem o alvo de clique; e um trilho que não acompanha o zoom faria o gráfico saltar ao
  // clique enquanto ele fica parado (teleporte). NÃO "melhorar" para régua.
  //
  // §8.1 — ESTE COMPONENTE NÃO FALA COM O GRÁFICO. Ele lê e escreve só a `mandateStore`
  // (`mandatos`, `selecionado`) e as ações `selecionarMandato` / `limparSelecao`. Por isso
  // não há — e não pode haver — nenhum import de `chart/` aqui, nem nada em `window`: o
  // gráfico é espelho, não dono do estado.
  //
  // §1 e §7.3.4 — a identificação é por TEXTO (`Lula III · PT`), NUNCA por cor de partido:
  // cor por partido colide entre siglas e, pior, exigiria afirmar uma classificação no lugar
  // de publicar um dado. Sem cor, o trilho fica com uma paleta só e o partido se lê pela sigla.
  import { mandateStore, selecionarMandato, limparSelecao } from '../stores/mandate.js';
  import { ordenarMandatos } from '../domain/mandates.js';

  // A store já guarda os mandatos ordenados (§7.3.6); reordenar é barato e mantém a regra
  // ("cronológica, com o em curso na ponta direita") verdadeira mesmo se a store mudar.
  let ordenados = $derived(ordenarMandatos($mandateStore.mandatos));
  let selecionado = $derived($mandateStore.selecionado);

  const CLASSE_BASE =
    'w-full rounded border px-2 py-1 text-xs leading-tight font-medium transition-colors';
  const CLASSE_SELECIONADO =
    'border-slate-900 bg-slate-100 text-slate-900 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-50';
  const CLASSE_APAGADO =
    'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

  const classeCaixa = (m) =>
    `${CLASSE_BASE} ${m.id === selecionado ? CLASSE_SELECIONADO : CLASSE_APAGADO}`;

  /** Clicar seleciona; clicar de novo limpa (§3 — um clique, um efeito: seleção, não zoom). */
  function alternar(id) {
    if (id === selecionado) limparSelecao();
    else selecionarMandato(id);
  }
</script>

<div class="flex flex-col gap-2" data-bloco="trilho">
  <span class="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
    Mandato
  </span>

  {#if ordenados.length > 0}
    <!-- Largura IGUAL e desacoplada do eixo do tempo: grid de colunas `1fr` (§3). O número de
         colunas acompanha os mandatos — a caixa nunca é proporcional à duração do governo. -->
    <ol
      class="grid gap-1"
      style="grid-template-columns: repeat({ordenados.length}, minmax(0, 1fr))"
      aria-label="Selecionar mandato"
    >
      {#each ordenados as m (m.id)}
        <li>
          <button
            type="button"
            class={classeCaixa(m)}
            class:hachurada={m.emCurso}
            aria-pressed={m.id === selecionado}
            onclick={() => alternar(m.id)}
          >
            <!-- Governo e sigla POR TEXTO — a única identificação de partido permitida (§1). -->
            <span class="block">{m.rotulo} · {m.partido}</span>
          </button>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  /* §3 / §7.3.4 — o mandato em curso leva HACHURA, a mesma linguagem da faixa no gráfico, para
     que o seletor e a faixa falem a mesma língua sobre cobertura parcial. */
  .hachurada {
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      rgba(100, 116, 139, 0.18) 4px,
      rgba(100, 116, 139, 0.18) 8px
    );
  }
</style>

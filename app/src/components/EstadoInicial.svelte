<script>
  // §9.1 — estado inicial: nenhum indicador escolhido.
  //
  // Rejeitada de propósito a TELA DE BOAS-VINDAS com texto explicativo: ela reaparece toda vez
  // que o usuário limpa a seleção, e quem já conhece o site paga pedágio em toda visita. No
  // lugar dela fica só o atalho de exemplo para o primeiro uso.
  //
  // A BUSCA NÃO MORA AQUI. Ela é o bloco 1 da §1 — a barra do topo, presente em todo estado da
  // página. Havia um segundo campo nesta caixa e ele era um affordance DUPLICADO: no estado em
  // que não há nada para controlar, a tela mostrava dois "Buscar indicador…". Fica um só.
  //
  // NÃO lê store (§8). Recebe uma ação do App e apenas a dispara — quem resolve o par
  // "Selic × IPCA" por ID no catálogo é o App, na hora de adicionar (§9.1: nada de
  // hardcodar nome nem URL aqui).
  //
  // `disponivel` é a decisão do App (`exemploDisponivel`): catálogo `ready` sem os ids do
  // exemplo deixa o atalho INERTE — o clique não teria o que adicionar. Nesse estado o botão
  // fica desabilitado e a caixa diz o motivo; nunca se oferece um botão que não faz nada.
  let { aoPedirExemplo, disponivel = true } = $props();
</script>

<div
  data-bloco="inicial"
  class="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"
>
  <p class="text-sm text-slate-500 dark:text-slate-400">
    Ainda não há série no gráfico.
    {#if disponivel}
      Comece por um exemplo:
    {:else}
      O atalho de exemplo não está disponível:
    {/if}
    <button
      type="button"
      class="font-medium text-sky-700 underline hover:text-sky-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-sky-400 dark:hover:text-sky-200 dark:disabled:text-slate-500"
      onclick={aoPedirExemplo}
      disabled={!disponivel}
      aria-describedby={disponivel ? undefined : 'exemplo-indisponivel-motivo'}
    >
      Selic × IPCA
    </button>
  </p>
  {#if !disponivel}
    <p
      id="exemplo-indisponivel-motivo"
      data-motivo="exemplo-indisponivel"
      class="text-xs text-slate-500 dark:text-slate-400"
    >
      O catálogo em uso não publica os indicadores do exemplo. Use a busca acima para escolher
      um indicador.
    </p>
  {/if}
</div>

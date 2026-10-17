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
  // "Selic × IPCA" por ID no `indicators.json` é o App, na hora de adicionar (§9.1: nada de
  // hardcodar nome nem URL aqui).
  let { aoPedirExemplo } = $props();
</script>

<div
  data-bloco="inicial"
  class="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"
>
  <p class="text-sm text-slate-500 dark:text-slate-400">
    Ainda não há série no gráfico. Comece por um exemplo:
    <button
      type="button"
      class="font-medium text-sky-700 underline hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-200"
      onclick={aoPedirExemplo}
    >
      Selic × IPCA
    </button>
  </p>
</div>

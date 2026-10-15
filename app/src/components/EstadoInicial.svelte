<script>
  // §9.1 — estado inicial: nenhum indicador escolhido.
  //
  // Rejeitada de propósito a TELA DE BOAS-VINDAS com texto explicativo: ela reaparece toda vez
  // que o usuário limpa a seleção, e quem já conhece o site paga pedágio em toda visita. No
  // lugar dela ficam só duas coisas — um campo que abre a busca e um atalho de exemplo para o
  // primeiro uso.
  //
  // NÃO lê store (§8). Recebe duas ações do App e apenas as dispara — quem resolve o par
  // "Selic × IPCA" por ID no `indicators.json` é o App, na hora de adicionar (§9.1: nada de
  // hardcodar nome nem URL aqui).
  let { aoAbrirBusca, aoPedirExemplo } = $props();
</script>

<div
  data-bloco="inicial"
  class="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"
>
  <!-- O "campo" é um <button> de verdade: um <input> inerte não abriria nada e seria um vazio
       silencioso — a regra que governa a §9 inteira. Ele abre a modal de busca (fatia 08). -->
  <button
    type="button"
    class="flex w-full max-w-md items-center gap-2 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-left text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
    onclick={aoAbrirBusca}
  >
    <span aria-hidden="true">🔍</span>
    Buscar indicador…
  </button>

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

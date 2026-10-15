<script>
  // §9.3 — erro TOTAL: nada carregou. Mesma linguagem da degradação parcial (o chip de erro),
  // só que no nível da tela: título, motivo e botão de tentar de novo. Uma série que falha não
  // chega aqui — isso é degradação parcial, e o chip cuida dela.
  //
  // O `motivo` é texto que o CHAMADOR monta — nunca "erro desconhecido": um `schema` não
  // suportado, por exemplo, chega aqui com a mensagem do próprio validador, que diz que é
  // schema (§6, §9.3). A §9 é explícita: o vazio sempre diz por quê.
  let { titulo, motivo, aoTentarNovamente } = $props();
</script>

<!-- Sem `data-bloco` de propósito (R29): não havia marcador para este estado — ele entra como
     um ramo a mais no `{#if}` do bloco 3. Identificável por `role="alert"`. -->
<div
  role="alert"
  class="flex flex-col items-start gap-2 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
>
  <h2 class="font-semibold">{titulo}</h2>
  {#if motivo}
    <p class="whitespace-pre-line">{motivo}</p>
  {/if}
  <button
    type="button"
    class="rounded border border-red-300 px-2.5 py-1 font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
    onclick={aoTentarNovamente}
  >
    Tentar de novo
  </button>
</div>

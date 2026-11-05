<script>
  // O CONTEÚDO de uma célula de comparação (§9.4), compartilhado pela matriz (desktop) e pela
  // lista (celular). Os quatro estados vêm PRONTOS da `deltaNoMandato`; este componente só os
  // apresenta — e é o único lugar onde isso acontece, para as duas formas não divergirem.
  import { COBERTURA, formatarPeriodo } from '../domain/mandates.js';
  import { valorNaUnidade } from '../domain/format.js';

  /** @type {{ celula: {estado:string, delta:number|null, pontos:number,
   *                     periodo:{inicio:string,fim:string}|null, motivo:string|null},
   *            unidade: object|null }} */
  let { celula, unidade = null } = $props();
</script>

{#if celula.estado === COBERTURA.CALCULAVEL}
  <span class="tabular-nums text-slate-800 dark:text-slate-100">
    {valorNaUnidade(celula.delta, unidade)}
  </span>
{:else if celula.estado === COBERTURA.PARCIAL}
  <span class="tabular-nums text-slate-800 dark:text-slate-100">
    {valorNaUnidade(celula.delta, unidade)}
  </span>
  <em class="block text-[10px] text-slate-500 dark:text-slate-400">
    parcial {formatarPeriodo(celula.periodo)}
  </em>
{:else if celula.estado === COBERTURA.SEM}
  <span class="text-xs text-slate-400 dark:text-slate-500">{celula.motivo}</span>
{:else if celula.estado === COBERTURA.PONTO_UNICO}
  <span class="text-xs text-amber-600 dark:text-amber-400">ponto único — sem Δ</span>
{/if}

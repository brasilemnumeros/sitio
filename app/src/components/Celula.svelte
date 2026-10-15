<script>
  // A CÉLULA da matriz (§9.4). Ela materializa UM dos quatro estados que a `deltaNoMandato`
  // devolve — não inventa nenhum, não reclassifica:
  //
  //   1. Δ calculável     → o número, na unidade do indicador
  //   2. cobertura parcial → o número COM o período real usado (§7.3.5: verboso de propósito,
  //                          porque a cobertura varia POR SÉRIE e nenhum cabeçalho a resume)
  //   3. sem cobertura    → cinza apagado, DIZENDO POR QUÊ (o `motivo` vem pronto do domínio)
  //   4. ponto único      → âmbar, explicitamente SEM Δ
  //
  // §9 — nenhum estado é `0` nem `—`: com um ponto EXISTE dado, e "—" faria o usuário concluir
  // que falta dado que existe; `0` seria falso nos dois casos. Por isso o texto, não o símbolo.
  //
  // §8 — runes, nunca `$:`; nenhum import de `chart/` nem nada em `window`. O Δ é calculado no
  // domínio e chega PRONTO aqui; esta peça só o apresenta.
  import { COBERTURA, formatarPeriodo } from '../domain/mandates.js';
  import { valorNaUnidade } from '../domain/format.js';

  /** @type {{ celula: {estado:string, delta:number|null, pontos:number,
   *                     periodo:{inicio:string,fim:string}|null, motivo:string|null},
   *            unit: object|null }} */
  let { celula, unit = null } = $props();

  // A distinção visual entre "calculável" e "parcial" NÃO é só a legenda embaixo: a parcial leva
  // também uma borda tracejada à esquerda, para que a diferença se leia antes de o olho chegar ao
  // texto — e sem depender de cor (funciona no claro, no escuro e para quem não distingue cor).
  const CLASSE_BASE = 'px-2 py-1.5 align-top';
  const CLASSE_POR_ESTADO = {
    [COBERTURA.CALCULAVEL]: 'border-l-2 border-transparent',
    [COBERTURA.PARCIAL]: 'border-l-2 border-dashed border-slate-400 dark:border-slate-500',
    [COBERTURA.SEM]: 'border-l-2 border-transparent',
    [COBERTURA.PONTO_UNICO]: 'border-l-2 border-transparent',
  };
</script>

<td
  class="{CLASSE_BASE} {CLASSE_POR_ESTADO[celula.estado] ?? CLASSE_POR_ESTADO[COBERTURA.CALCULAVEL]}"
  data-estado={celula.estado}
>
  {#if celula.estado === COBERTURA.CALCULAVEL}
    <span class="tabular-nums text-slate-800 dark:text-slate-100">
      {valorNaUnidade(celula.delta, unit)}
    </span>
  {:else if celula.estado === COBERTURA.PARCIAL}
    <span class="tabular-nums text-slate-800 dark:text-slate-100">
      {valorNaUnidade(celula.delta, unit)}
    </span>
    <em class="block text-[10px] text-slate-500 dark:text-slate-400">
      parcial {formatarPeriodo(celula.periodo)}
    </em>
  {:else if celula.estado === COBERTURA.SEM}
    <span class="text-xs text-slate-400 dark:text-slate-500">{celula.motivo}</span>
  {:else if celula.estado === COBERTURA.PONTO_UNICO}
    <span class="text-xs text-amber-600 dark:text-amber-400">ponto único — sem Δ</span>
  {/if}
</td>

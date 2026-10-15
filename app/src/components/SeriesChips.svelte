<script>
  // Faixa de chips das séries selecionadas (§1, posição 2 da página).
  //
  // O estado de cada chip vem TODO da store (§8): o componente não espelha nada em
  // estado local `$state`. As três formas do chip — carregando / ok / erro — são as
  // mesmas três do `item.status`, e o erro é POR SÉRIE: uma série que falha não
  // derruba a tela, vira um chip de erro com as duas ações de §9.3.
  import {
    seriesStore,
    LIMITE_SERIES,
    removerSerie,
    tentarNovamente,
    definirCor,
    restaurarCor,
    motivoDoLimite,
  } from '../stores/series.js';
  import { avisoDeColisao } from '../domain/color.js';

  let itens = $derived($seriesStore.itens);

  // §9.5 — a FRASE do motivo já existe pronta em `stores/series.js`. Aqui só se decide
  // QUANDO mostrá-la (ao bater o teto da paleta); NÃO reescrever o texto na UI.
  let motivoDoTeto = $derived(
    $seriesStore.itens.length >= LIMITE_SERIES ? motivoDoLimite() : null,
  );

  // O aviso de colisão é DERIVADO das cores atuais (§1): confere e avisa, com a
  // distância medida, mas NUNCA bloqueia — a série continua no gráfico.
  let avisos = $derived(
    itens
      .map((item) => {
        const outras = itens.filter((i) => i.id !== item.id);
        const aviso = avisoDeColisao(
          item.cor,
          outras.map((i) => i.cor),
        );
        return { item, aviso, contra: outras[aviso.contra] ?? null };
      })
      .filter((a) => a.aviso.colide),
  );

  /** A régua do projeto é a ΔE_ok; vírgula é a convenção dos números em português. */
  const formatarDistancia = (d) => d.toFixed(3).replace('.', ',');
</script>

<div class="flex flex-col gap-2" data-bloco="chips">
  {#if itens.length > 0}
    <ul class="flex flex-wrap items-center gap-2" aria-label="Séries selecionadas">
      {#each itens as item (item.id)}
        {#if item.status === 'erro'}
          <!-- §9.3 — erro de uma série é degradação parcial: o chip vira erro com as
               duas ações possíveis, e o resto da tela segue usável. -->
          <li
            data-status="erro"
            class="flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            <span
              class="inline-block h-3 w-3 shrink-0 rounded-full bg-red-400 dark:bg-red-500"
              aria-hidden="true"
            ></span>
            <span class="font-medium">{item.name}</span>
            <span class="text-xs opacity-75">falhou ao carregar</span>
            <button
              type="button"
              class="rounded border border-red-300 px-2 py-0.5 text-xs font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
              onclick={() => tentarNovamente(item.id)}
            >
              Tentar de novo
            </button>
            <button
              type="button"
              class="rounded border border-red-300 px-2 py-0.5 text-xs font-medium hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
              aria-label="Remover {item.name}"
              onclick={() => removerSerie(item.id)}
            >
              Remover
            </button>
          </li>
        {:else}
          <li
            data-status={item.status}
            class="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <!-- Clicar na cor abre o seletor nativo do sistema; a escolha entra pelo
                 `definirCor` (a store), não pelo DOM do gráfico (§8.1). -->
            <input
              type="color"
              class="amostra h-4 w-4 shrink-0 cursor-pointer"
              value={item.cor}
              aria-label="Cor da série {item.name}"
              oninput={(e) => definirCor(item.id, e.currentTarget.value)}
            />
            <span class="font-medium">{item.name}</span>

            {#if item.status === 'carregando'}
              <!-- §9.2 — o progresso é POR SÉRIE, não um indicador global: as séries
                   vêm de arquivos diferentes e uma pode demorar mais que a outra. -->
              <span
                class="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"
                role="status"
                aria-label="Carregando {item.name}"
              >
                <span
                  class="inline-block h-2 w-2 animate-pulse rounded-full bg-current"
                  aria-hidden="true"
                ></span>
                carregando…
              </span>
            {/if}

            {#if item.corPessoal}
              <button
                type="button"
                class="text-xs text-slate-500 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                aria-label="Restaurar a cor padrão de {item.name}"
                onclick={() => restaurarCor(item.id)}
              >
                restaurar padrão
              </button>
            {/if}

            <button
              type="button"
              class="shrink-0 rounded-full px-1 text-base leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Remover {item.name}"
              onclick={() => removerSerie(item.id)}
            >
              ×
            </button>
          </li>
        {/if}
      {/each}
    </ul>

    {#if avisos.length > 0}
      <!-- §1 — o seletor AVISA com a distância medida e NÃO bloqueia. -->
      <div class="flex flex-col gap-1" role="status">
        {#each avisos as { item, aviso, contra } (item.id)}
          <p class="text-xs text-amber-700 dark:text-amber-400">
            A cor de «{item.name}» fica a ΔE_ok {formatarDistancia(aviso.distancia)} da cor de «{contra?.name
            }» — perto demais para distinguir. A série continua no gráfico; o aviso não bloqueia.
          </p>
        {/each}
      </div>
    {/if}

    {#if motivoDoTeto}
      <p class="text-xs text-slate-500 dark:text-slate-400">{motivoDoTeto}</p>
    {/if}
  {/if}
</div>

<style>
  /* O seletor nativo de cor vira uma bolinha de amostra — sem isto ele vem com
     borda e padding internos do sistema. */
  input[type='color'].amostra {
    -webkit-appearance: none;
    appearance: none;
    padding: 0;
    border: 0;
    border-radius: 9999px;
    overflow: hidden;
    background: none;
  }
  input[type='color'].amostra::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  input[type='color'].amostra::-webkit-color-swatch {
    border: none;
    border-radius: 9999px;
  }
  input[type='color'].amostra::-moz-color-swatch {
    border: none;
    border-radius: 9999px;
  }
</style>

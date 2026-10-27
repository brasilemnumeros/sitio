<script>
  // A LEGENDA é o canal redundante de identificação (§1, §12.2). Ela vive FORA do gráfico de
  // propósito: com 10 séries os rótulos da lib ocupam 80% da altura da área de plot (314px de
  // 392, medido) e um deles some — por isso a identificação por texto saiu de dentro do
  // gráfico. Sem esta legenda, identificar uma série dependeria só da COR — que é justamente o
  // canal que falha no daltonismo (§1: `#309aff`/`#9581ff` a ΔE 0,006 sob deuteranopia).
  //
  // Ela produz UMA classe de aviso: colisão de COR (`avisoDeColisao`, fatia 04, via
  // `avisosDeColisao`) — UMA mensagem por PAR, só a série de MAIOR índice fala, para não duplicar
  // simetricamente (T2). O aviso de ESCALA NÃO mora mais aqui: desde a T7 ele é do `AxesPanel`,
  // junto do botão `esq.`/`dir.` — os dois controles de eixo ficam na mesma seção da gaveta
  // direita, e uma superfície só não pode ficar uma atualização atrás da outra.
  //
  // A cor continua aqui (é identificação e edição do mesmo objeto) e a colisão também: informa,
  // não bloqueia (§1, §5). O que saiu foi só o que virou seção própria.
  //
  // Runes do Svelte 5; os stores continuam funcionando por auto-subscrição (`$store`).
  import { seriesStore, definirCor, restaurarCor, removerSerie } from '../stores/series.js';
  import { avisosDeColisao, LIMIAR_COLISAO } from '../domain/color.js';

  const itens = $derived($seriesStore.itens);
  // R25 — a distância é o PIOR CASO entre as quatro visões, não a visão normal. E é uma por
  // par: `avisosDeColisao` atribui o aviso à série de maior índice (o `i` do `{#each}`).
  const avisos = $derived(avisosDeColisao(itens));

  /** Vírgula é a convenção dos números em português (igual aos chips). */
  const formatarDistancia = (d) => d.toFixed(3).replace('.', ',');
</script>

<!-- A legenda QUEBRA EM LINHAS (§1): com 10 séries ela não pode virar uma tira horizontal.
     Tailwind + `dark:` (não existem tokens --cor-* neste projeto). -->
<ul class="flex flex-wrap gap-x-4 gap-y-2" data-testid="legenda-series">
  {#each itens as item, i (item.id)}
    <li class="flex items-center gap-2 text-sm">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="color"
          class="amostra h-3.5 w-3.5 shrink-0 cursor-pointer"
          value={item.cor}
          aria-label="Cor da série {item.name}"
          oninput={(e) => definirCor(item.id, e.currentTarget.value)}
        />
        <span class="text-slate-700 dark:text-slate-200">{item.name}</span>
      </label>

      {#if item.corPessoal}
        <button
          type="button"
          class="text-xs text-slate-500 underline hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          title="Voltar à cor da paleta"
          onclick={() => restaurarCor(item.id)}
        >
          restaurar
        </button>
      {/if}

      {#if avisos[i].colide}
        <!-- §1 — informa, NÃO bloqueia: a série continua no gráfico. Uma mensagem por PAR. -->
        <span
          class="text-xs text-amber-600 dark:text-amber-400"
          title="ΔE_ok {formatarDistancia(avisos[i].distancia)} — abaixo do envelope {LIMIAR_COLISAO}"
        >
          ⚠ parecida
        </span>
      {/if}

      <button
        type="button"
        class="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        aria-label="Remover {item.name} do gráfico"
        title="Remover do gráfico"
        onclick={() => removerSerie(item.id)}
      >
        ✕
      </button>
    </li>
  {/each}
</ul>

<style>
  /* O seletor nativo de cor vira uma bolinha de amostra — o mesmo tratamento dos chips, para
     as duas superfícies lerem igual. Sem isto ele vem com borda e padding internos do sistema. */
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

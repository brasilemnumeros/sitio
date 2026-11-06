<script>
  // RELATO DE ERRO DE DADO (2026-11-06) — o diálogo que termina numa issue do repo `dados`.
  //
  // Nasce no trilho, não na ficha: quem reporta está olhando um número no gráfico, e a ficha
  // descreve um indicador que ainda NÃO está lá (ela vive dentro da busca).
  //
  // `<dialog>` NATIVO com `showModal()`: camada superior (acima de qualquer `z-index`, inclusive
  // o overlay do `driver.js`), foco preso, `Esc` e devolução do foco no elemento anterior vêm de
  // graça. Por isso a `App` só precisa IGNORAR o `Esc` desta camada — não há cadeia manual aqui.
  //
  // A AÇÃO é um `<a href>` calculado, não um botão: o teste lê o `href` sem navegar para o
  // GitHub, e o navegador abre outra aba. Sem texto no relato o link não existe — não se cria
  // issue vazia.
  import { untrack } from 'svelte';
  import { montarRelato } from '../domain/relato.js';
  import { seriesStore } from '../stores/series.js';
  import { catalogStore } from '../stores/catalog.js';
  import { viewportStore } from '../stores/viewport.js';
  import { mandateStore } from '../stores/mandate.js';
  import { dataEmSaoPaulo } from '../data/presets.js';

  let { aberto = false, aoFechar = () => {} } = $props();

  let el = $state(null);
  let serieId = $state(null);
  let periodo = $state('');
  let texto = $state('');
  let valorVisto = $state('');
  let valorEsperado = $state('');
  let fonte = $state('');
  let resumoAberto = $state(false);

  /** Só série que CARREGOU entra: sem dado não há valor para confrontar. A escondida pelo olho
   *  continua valendo — ela está no gráfico e no permalink, só não está desenhada. */
  const okItens = $derived($seriesStore.itens.filter((i) => i.status === 'ok'));
  const serieAtual = $derived(okItens.find((i) => i.id === serieId) ?? okItens[0] ?? null);
  const registro = $derived(
    ($catalogStore.indicadores ?? []).find((i) => i.id === serieAtual?.id) ?? null
  );
  const ids = $derived(okItens.map((i) => i.id));
  const janela = $derived($viewportStore);
  const mandatoAtual = $derived(
    $mandateStore.mandatos.find((m) => m.id === $mandateStore.selecionado) ?? null
  );

  const pode = $derived(serieAtual !== null && texto.trim() !== '');

  /** Lido do navegador AQUI, não no domínio: a função pura recebe `urlBase` por parâmetro. É o
   *  que também descarta `utm_*` e qualquer parâmetro de campanha da URL de chegada. */
  const relato = $derived(
    serieAtual
      ? montarRelato({
          id: serieAtual.id,
          nome: serieAtual.nome,
          periodo,
          texto,
          valorVisto,
          valorEsperado,
          fonte,
          ids,
          urlBase: location.origin + location.pathname,
          janela: janela.de && janela.ate ? janela : null,
          mandato: mandatoAtual?.rotulo ?? null,
          data: dataEmSaoPaulo() ?? '',
        })
      : null
  );

  $effect(() => {
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    else if (!aberto && el.open) el.close();
  });

  // Cada abertura começa do zero: relato é um ato, não um rascunho guardado.
  // `untrack` porque escrevemos estado que o efeito não deve observar (só `aberto` importa).
  $effect(() => {
    if (!aberto) return;
    untrack(() => {
      // A série já vem escolhida (a primeira do gráfico): o seletor nunca nasce vazio. Ler
      // `okItens` aqui dentro é intencional — muda a série enquanto o diálogo está aberto não
      // pode reescrever a escolha da pessoa.
      serieId = okItens[0]?.id ?? null;
      periodo = '';
      texto = '';
      valorVisto = '';
      valorEsperado = '';
      fonte = '';
      resumoAberto = false;
    });
  });
</script>

<dialog
  bind:this={el}
  data-testid="dialogo-relatar"
  aria-labelledby="titulo-relato"
  onclose={aoFechar}
  class="m-auto w-[470px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-700 bg-[#161b22] p-0 text-slate-200 shadow-2xl backdrop:bg-black/60 max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:m-0 max-md:w-full max-md:max-w-none max-md:rounded-b-none"
>
  <div class="flex max-h-[85dvh] flex-col">
    <header class="shrink-0 border-b border-slate-700 px-4 pt-3 pb-2">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="titulo-relato" class="text-[15px] font-semibold text-slate-100">
            Reportar problema nos dados
          </h2>
          <p class="mt-1 text-xs leading-snug text-slate-400">
            Abre uma issue no GitHub com o contexto já preenchido. Você revisa antes de enviar.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onclick={aoFechar}
          class="-mt-1 rounded px-1.5 py-0.5 text-lg leading-none text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          ×
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <!-- AVISO DE METODOLOGIA: antes de acusar um erro, a pessoa precisa saber que o número
           pode ser composição de fontes ou cálculo próprio. O resumo vem do catálogo (o MESMO
           texto da ficha) e o notebook é a memória de cálculo. Sem os dois, o relato vira
           "o IBGE diz outro número" sem que o site tenha errado. -->
      <div
        class="rounded border border-slate-800 border-l-2 border-l-amber-700 bg-[#0d1117] px-2.5 py-2 text-[11.5px] leading-relaxed text-slate-400"
      >
        <p>
          Alguns indicadores <b class="font-medium text-slate-200"
            >combinam fontes ou usam cálculo próprio</b
          > — o número aqui pode não ser o valor bruto publicado por um órgão. Antes de reportar,
          confira o método: o resumo está na ficha do indicador e a memória de cálculo, no notebook
          que gera a série.
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {#if registro?.descricao}
            <button
              type="button"
              data-testid="relato-resumo"
              aria-expanded={resumoAberto}
              onclick={() => (resumoAberto = !resumoAberto)}
              class="text-sky-300 underline underline-offset-2 hover:text-sky-100"
            >
              {resumoAberto ? 'Ocultar o resumo' : 'Ver o resumo'}
            </button>
          {/if}
          {#if registro?.urlNotebook}
            <a
              href={registro.urlNotebook}
              target="_blank"
              rel="noopener noreferrer"
              class="text-sky-300 underline underline-offset-2 hover:text-sky-100"
            >
              Ver o notebook que gera estes dados ↗
            </a>
          {/if}
        </div>
        {#if resumoAberto && registro?.descricao}
          <p class="mt-2 text-slate-300">{registro.descricao}</p>
        {/if}
      </div>

      <div class="mt-3 space-y-2.5">
        <div>
          <label for="relato-serie" class="block text-[11px] text-slate-400">Série</label>
          {#if okItens.length === 0}
            <p class="mt-1 text-xs text-slate-400" data-testid="relato-sem-serie">
              Não há série no gráfico para reportar. Adicione uma série e volte aqui.
            </p>
          {:else}
            <select
              id="relato-serie"
              data-testid="relato-serie"
              bind:value={serieId}
              class="mt-1 w-full rounded border border-slate-600 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-100"
            >
              {#each okItens as item (item.id)}
                <option value={item.id}>{item.nome}</option>
              {/each}
            </select>
          {/if}
        </div>

        <div>
          <label for="relato-periodo" class="block text-[11px] text-slate-400">Período</label>
          <input
            id="relato-periodo"
            data-testid="relato-periodo"
            bind:value={periodo}
            placeholder="ex.: mai/2026 ou 2019–2025"
            class="mt-1 w-full rounded border border-slate-600 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label for="relato-texto" class="block text-[11px] text-slate-400">
            O que está errado?
          </label>
          <textarea
            id="relato-texto"
            data-testid="relato-texto"
            bind:value={texto}
            rows="3"
            placeholder="ex.: o valor de mai/2026 aparece como 4,72%, mas no SIDRA é 4,84%."
            class="mt-1 w-full resize-none rounded border border-slate-600 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600"
          ></textarea>
        </div>

        <div class="flex gap-2">
          <div class="flex-1">
            <label for="relato-valor-visto" class="block text-[11px] text-slate-400">
              Valor que aparece
            </label>
            <input
              id="relato-valor-visto"
              data-testid="relato-valor-visto"
              bind:value={valorVisto}
              class="mt-1 w-full rounded border border-slate-600 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-100"
            />
          </div>
          <div class="flex-1">
            <label for="relato-valor-esperado" class="block text-[11px] text-slate-400">
              Valor esperado
            </label>
            <input
              id="relato-valor-esperado"
              data-testid="relato-valor-esperado"
              bind:value={valorEsperado}
              class="mt-1 w-full rounded border border-slate-600 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-100"
            />
          </div>
        </div>

        <div>
          <label for="relato-fonte" class="block text-[11px] text-slate-400">
            Link da fonte oficial (opcional, mas ajuda)
          </label>
          <input
            id="relato-fonte"
            data-testid="relato-fonte"
            bind:value={fonte}
            placeholder="https://sidra.ibge.gov.br/…"
            class="mt-1 w-full rounded border border-slate-600 bg-[#0d1117] px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600"
          />
        </div>

        <!-- O que o site manda: o link do gráfico e NADA do navegador. -->
        <p class="text-[11px] leading-snug text-slate-500">
          O link do gráfico vai junto. <b class="font-medium text-slate-400">Não</b> enviamos nada
          pessoal nem do seu navegador.
        </p>
      </div>
    </div>

    <footer
      class="flex shrink-0 items-center justify-between gap-3 border-t border-slate-700 bg-[#12161d] px-4 py-2.5"
    >
      <span class="text-[11px] text-slate-500">
        Destino: <b class="font-medium text-slate-300">brasilemnumeros/dados</b>
      </span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={aoFechar}
          class="rounded border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          Cancelar
        </button>
        <a
          data-testid="relato-abrir"
          target="_blank"
          rel="noopener noreferrer"
          href={pode && relato ? relato.url : undefined}
          aria-disabled={!pode}
          tabindex={pode ? 0 : -1}
          onclick={(e) => {
            if (!pode) e.preventDefault();
          }}
          class="rounded border px-3 py-1.5 text-xs font-semibold {pode
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-500'
            : 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'}"
        >
          Abrir issue no GitHub <span aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>
  </div>
</dialog>

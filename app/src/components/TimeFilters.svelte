<script>
  // Barra de filtros de tempo (§1, posição 4) — saiu da modal de configuração e virou
  // um controle fixo, logo abaixo do gráfico.
  //
  // §8.1 — ESTA BARRA NÃO FALA COM O GRÁFICO. Ela só ESCREVE no store `viewport`
  // (`definirJanela` / `resetarJanela`); quem reage é o adapter, que assina a store. Por
  // isso não há — e não pode haver — nenhum import de `chart/` aqui: o gráfico é espelho,
  // não dono do estado.
  //
  // A data de referência vem do ESTADO (§8): a última data de `item.series.data` entre as
  // séries com `status === 'ok'` em `$seriesStore.itens`. Nunca se pergunta ao gráfico.
  import { seriesStore, dataMaximaStore } from '../stores/series.js';
  import { viewportStore, definirJanela, resetarJanela } from '../stores/viewport.js';
  import { mandateStore, limparSelecao } from '../stores/mandate.js';

  let itens = $derived($seriesStore.itens);
  let janela = $derived($viewportStore);
  // ⚠ Um DONO por vez (§3, emenda de 2026-10-19): com um mandato escolhido a janela é DELE, e a
  // barra não acende preset nenhum — nem o "Tudo". A duração de um mandato quase nunca casa com um
  // preset (4 anos ficam a 1,0 do "5a", fora da tolerância), mas "quase" não é guarda: sem esta
  // linha a tela diria duas coisas na coincidência, e a coincidência depende do dado.
  let selecionado = $derived($mandateStore.selecionado);

  /** A data mais recente entre TODAS as séries com dados, em ISO 'AAAA-MM-DD'. Vem da store
   * (fonte única): o trilho de mandatos precisa da MESMA para fechar a janela do mandato em curso. */
  let dataMaxima = $derived($dataMaximaStore);

  /** A data mais antiga entre TODAS as séries com dados, em ISO 'AAAA-MM-DD' — o par de
   * `dataMaxima`, para reconhecer quando a janela já É o intervalo completo. */
  let dataMinima = $derived.by(() => {
    let min = null;
    for (const item of itens) {
      if (item.status !== 'ok' || !Array.isArray(item.series?.data)) continue;
      for (const { date } of item.series.data) {
        if (min === null || date < min) min = date;
      }
    }
    return min;
  });

  const temDados = $derived(dataMaxima !== null);

  /** §9 — nada vazio em silêncio: sem série `ok`, a barra diz POR QUE está desabilitada. */
  let motivo = $derived(
    itens.length === 0
      ? 'Nenhuma série selecionada — os filtros de tempo aparecem com uma série carregada.'
      : 'Nenhuma série com dados ainda — os filtros de tempo liberam quando a primeira série carregar.',
  );

  /** Subtrai N anos de uma data ISO 'AAAA-MM-DD' e devolve a mesma forma.
   * Puro, sem `Date` local — o construtor lê em fuso local e desloca o dia. O 29/02 num
   * ano não bissexto recua para 28/02, o dia existente mais próximo. */
  function subtrairAnos(iso, n) {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const alvo = ano - n;
    const ultimoDia = new Date(Date.UTC(alvo, mes, 0)).getUTCDate(); // dia 0 do mês seguinte
    const d = Math.min(dia, ultimoDia);
    return `${String(alvo).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  /** Os quatro presets de janela relativa; "Tudo" não é ano — é `resetarJanela()`. */
  const PRESETS = [
    { id: '1a', anos: 1, nome: 'Janela de 1 ano' },
    { id: '5a', anos: 5, nome: 'Janela de 5 anos' },
    { id: '10a', anos: 10, nome: 'Janela de 10 anos' },
    { id: '30a', anos: 30, nome: 'Janela de 30 anos' },
  ];

  const fromDe = (preset) => subtrairAnos(dataMaxima, preset.anos);

  function aplicar(preset) {
    if (!temDados) return;
    // O preset TOMA a janela do mandato (§3): a seleção do trilho sai, senão o realce diria
    // "Lula II" enquanto a janela mostra o último ano.
    limparSelecao();
    // ⚠ `to: dataMaxima` é o que a doc acima já dizia ("ancora a janela na última data") e
    //   NÃO era declarado: o adapter preenchia a ponta direita com a janela ATUAL — que, com um
    //   mandato escolhido, está no PASSADO. Resultado medido em 2026-10-19: `from = 2015-10`,
    //   `to = 2006-12`, e a lib lançou `right should be >= left` (só em DEV; em produção
    //   desenharia errado, em silêncio). Com as duas pontas o preset não depende do que está na tela.
    //
    // ⚠ `escolhaDoUsuario`: clicar num preset é o usuário ESCOLHENDO a janela. Sem isto o fit
    //   automático do adapter (adiado 150ms) voltava e jogava a escolha no lixo — e o preset
    //   "não pegava" (medido 2026-10-19).
    definirJanela({ from: fromDe(preset), to: dataMaxima }, { escolhaDoUsuario: true });
  }

  const ANO_MS = 365.25 * 24 * 60 * 60 * 1000;

  /** Duração da janela em anos, do store. `null` se faltar uma das pontas. */
  function duracaoAnos(j) {
    if (!j.from || !j.to) return null;
    return (Date.parse(j.to) - Date.parse(j.from)) / ANO_MS;
  }

  // O preset "aceso" é DERIVADO da store — nunca de estado local. Compara por DURAÇÃO, não
  // por igualdade de `from`: a lib assenta a borda esquerda no primeiro dado (§8.1), então um
  // `from` que pede antes do início da série volta um pouco à frente — igualdade exata apagaria
  // o realce do "30a" justamente onde ele pediu mais do que existe. Se o usuário arrastar no
  // minimapa, a duração deixa de casa com qualquer preset e nenhum acende: correto.
  const ativo = (preset) => {
    if (selecionado) return false;    // a janela é do mandato — ver a nota do `selecionado`
    const d = duracaoAnos(janela);
    return temDados && d !== null && Math.abs(d - preset.anos) < 0.5;
  };

  /** "Tudo" cobre tanto o reset (store `{null, null}`) quanto a janela completa que o
   * adapter ecoa de volta depois de um `fitContent` — senão a barra ficaria sem nada aceso
   * justamente quando a tela mostra o intervalo inteiro. Nulo = sem limite daquele lado. */
  let tudoAtivo = $derived(
    !selecionado &&
      temDados &&
      (janela.from === null || janela.from <= dataMinima) &&
      (janela.to === null || janela.to >= dataMaxima),
  );

  const CLASSE_BASE =
    'rounded border px-2.5 py-1 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';
  const CLASSE_ACESO =
    'border-sky-500 bg-sky-50 text-sky-800 dark:border-sky-400 dark:bg-sky-950 dark:text-sky-200';
  const CLASSE_APAGADO =
    'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';
  const classeBotao = (aceso) => `${CLASSE_BASE} ${aceso ? CLASSE_ACESO : CLASSE_APAGADO}`;
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-2" data-bloco="filtros">
  <span class="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
    Janela de tempo
  </span>

  <div
    class="flex flex-wrap items-center gap-1"
    role="group"
    aria-label="Janela de tempo do gráfico"
  >
    {#each PRESETS as preset (preset.id)}
      {@const aceso = ativo(preset)}
      <button
        type="button"
        class={classeBotao(aceso)}
        aria-label={preset.nome}
        aria-pressed={aceso}
        disabled={!temDados}
        onclick={() => aplicar(preset)}
      >
        {preset.id}
      </button>
    {/each}

    <button
      type="button"
      class={classeBotao(tudoAtivo)}
      aria-label="Janela completa"
      aria-pressed={tudoAtivo}
      disabled={!temDados}
      onclick={() => {
        limparSelecao();
        resetarJanela();
      }}
    >
      Tudo
    </button>
  </div>

  {#if !temDados}
    <!-- §9 — o motivo fica visível, não só no `title`: barra cinza sem explicação é lida
         como defeito, e o usuário não tem como distinguir de um estado sem dado. -->
    <p class="text-xs text-slate-500 dark:text-slate-400" role="status">{motivo}</p>
  {/if}
</div>

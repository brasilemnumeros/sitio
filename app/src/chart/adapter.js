import { createChart, LineSeries } from 'lightweight-charts';
import { paraPontosDaBiblioteca, paraISO } from './points.js';
import { criarPrimitivaDeFaixas } from './bands.js';

const FUNDO = '#0e1117';

/**
 * Monta o gráfico numa FUNÇÃO — nunca em singleton de módulo (§8, nada em `window`).
 * O gráfico é espelho do store: a única direção é store → adapter, e o retorno da janela
 * visível é o callback explícito (§8.1).
 */
export function criarAdapter(container, { aoMudarJanela } = {}) {
  const chart = createChart(container, {
    layout: { background: { color: FUNDO }, textColor: '#c9d1d9' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    // §5: existem DOIS eixos, e os dois ficam visíveis — senão o eixo que a atribuição manda
    // usar não teria onde aparecer e o `priceScaleId` cairia num eixo invisível.
    leftPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
    rightPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.10)' },
  });
  const porId = new Map();          // id -> ISeriesApi

  // 🔴 `setVisibleRange` e `fitContent` LANÇAM num gráfico sem NENHUMA barra. Medido em
  // 2026-10-15 (sonda no navegador, os dois builds): `setData([])` e depois `setVisibleRange`
  // dá `Value is null`; com UMA barra já não lança. **Não é o range que importa** — com dado
  // na tela, um range degenerado `{X,X}` é aceito e vira no-op. É a AUSÊNCIA de dado.
  //
  // Alcançável em produção: remover a última série enquanto um preset de janela está ativo
  // (a barra de filtros escreve `from`, o adapter reage, o gráfico está vazio, lança). Achado
  // pela T3 da fatia 07, fora do escopo dela — o defeito é daqui.
  let temDado = false;
  let primitivaDeFaixas = null;

  // 🔴 O app abre no TODO, não no default da lib (≈ últimos 150 pontos).
  // Duas armadilhas medidas, e a segunda só apareceu na revisão:
  //  1. `fitContent()` chamado NA MESMA VOLTA do `setData` é no-op — precisa do frame seguinte.
  //  2. **No app real as séries entram UMA A UMA** (`adicionarSerie` faz um `store.set` por
  //     série). Com um flag `jaAjustou`, o fit rodava depois da PRIMEIRA e enquadrava só o
  //     domínio dela. O harness da T4 carregava as 10 juntas e escondia isso — "verdadeiro no
  //     harness, falso no app".
  // Por isso: DEBOUNCE (o fit espera a rajada assentar) + o usuário assume no primeiro gesto.
  let usuarioAssumiu = false;
  let fitAgendado = null;
  let fitNoFrame = null;
  const assumir = () => {
    usuarioAssumiu = true;
    // ⚠ O fit adiado tem DUAS etapas (`setTimeout` → `requestAnimationFrame`). Cancelar só o
    //   timeout deixa o rAF já agendado rodar `fitContent()` DEPOIS da escolha, e a janela vai
    //   para o alcance total. Medido 2026-10-19: é uma corrida de UM frame (o timeout dispara,
    //   o rAF fica pendente, o usuário clica no preset, o rAF enquadra tudo) — foi o que fez
    //   "redimensionar" falhar 1/30 com o teste correto.
    clearTimeout(fitAgendado);
    if (fitNoFrame != null) cancelAnimationFrame(fitNoFrame);
    fitNoFrame = null;
  };
  container.addEventListener('pointerdown', assumir, { once: true });
  container.addEventListener('wheel', assumir, { once: true, passive: true });

  /** Quem decide se a janela é do usuário (§8.1): um gesto NO GRÁFICO (acima) ou uma escolha feita
   *  FORA dele — o preset do filtro de tempo e o arrasto do minimapa avisam por aqui. Sem isto a
   *  escolha era desfeita pela próxima série adicionada: o fit automático voltava e a janela ia
   *  para o alcance total (medido 2026-10-19). `false` (o "Tudo") devolve a janela ao fit. */
  const aJanelaEDoUsuario = (doUsuario) => {
    if (doUsuario) return assumir();
    usuarioAssumiu = false;         // "Tudo" não é janela: o enquadramento automático volta a mandar
  };

  // 📌 O clique chega pelo `subscribeClick` da lib: ela consulta o `hitTest` da primitiva
  //    e devolve o `externalId` (o id da faixa) em `hoveredInfo.objectId`. SEM esta assinatura,
  //    `aoClicar` nunca dispara e a faixa jamais é selecionada — a primitiva funciona (provado
  //    chamando `destacarMandato` direto), mas ninguém entregava o clique a ela.
  chart.subscribeClick((param) => {
    const id = param.hoveredInfo?.objectId ?? param.hoveredObjectId;
    if (id != null) destacarMandato(id);
  });

  // §2: zoom é gesto separado e explícito — arrastar, scroll E duplo-clique. A lib NÃO trata
  // duplo-clique como zoom por padrão (medido na T4: `getVisibleRange` não mudava), então o
  // gesto tem de ser ligado aqui. Aproxima para METADE da janela, centrado onde o usuário clicou.
  chart.subscribeDblClick(({ point }) => {
    if (!point) return;                       // ponto indefinido = clique fora da área de plot
    const ts = chart.timeScale();
    const r = ts.getVisibleRange();
    if (!r) return;
    const t0 = ts.coordinateToTime(point.x);
    if (t0 == null) return;                    // sem barra sob o cursor: não há centro para o zoom
    const meia = (r.to - r.from) / 4;
    ts.setVisibleRange({ from: t0 - meia, to: t0 + meia });
  });

  // A janela visível SÓ sai por aqui, e a direção é store → adapter (§8.1).
  // `subscribeVisibleTIME...`, não `...Logical...`: o range lógico são ÍNDICES de barra, e
  // convertê-los para data exigiria passar pelo array de dados. O de tempo já entrega
  // `{from, to}` em segundos — que é o que o store guarda.
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!range) return aoMudarJanela?.({ from: null, to: null });
    aoMudarJanela?.({ from: paraISO(range.from), to: paraISO(range.to) });
  });

  /** Devolve a janela que o `setData`/`removeSeries` moveu. Vai no FRAME SEGUINTE: `setVisibleRange`
   *  na MESMA volta do `setData` não pega (medido 2026-10-19 — o mesmo motivo pelo qual o fit
   *  também é adiado por um frame). `setVisibleRange` sobre gráfico SEM barra LANÇA — daí a guarda. */
  function devolverJanela(antes) {
    if (!antes || !temDado) return;
    requestAnimationFrame(() => {
      if (!temDado) return;             // o gráfico pode ter esvaziado entre o `setData` e o frame
      const agora = chart.timeScale().getVisibleRange();
      if (agora && agora.from === antes.from && agora.to === antes.to) return;
      chart.timeScale().setVisibleRange(antes);
    });
  }

  /** Cria, atualiza ou REUSA uma LineSeries por id. Série que sai do store é removida do gráfico.
   * `atribuicao` vem do `axesStore` (fatia 05) — o ADAPTER não decide eixo, só obedece (§8.1). */
  function definirSeries(itens, atribuicao = {}) {
    // 🔴 `setData` de uma série cuja data ESTENDE o domínio de tempo MOVE a janela visível — a lib
    //    a desloca (medido 2026-10-19: `selic-meta-acum-12m`, 320 barras, levou `2015-06→2025-06`
    //    a `2020-08→2025-10`; re-setar a MESMA data não move). Se a janela é do usuário, uma
    //    atualização de DADO não pode movê-la: guardamos aqui e devolvemos no fim.
    const janelaAntes = usuarioAssumiu ? chart.timeScale().getVisibleRange() : null;
    const vivos = new Set(itens.map((i) => i.id));
    for (const [id, serie] of porId) {
      if (!vivos.has(id)) { chart.removeSeries(serie); porId.delete(id); }
    }
    for (const item of itens) {
      const eixo = atribuicao[item.id] === 'left' ? 'left' : 'right';
      let serie = porId.get(item.id);
      if (!serie) {
        serie = chart.addSeries(LineSeries, {
          color: item.cor,
          // ⚠ SEM `title` — a §12.2 decidiu que a ponta da linha NÃO é o canal redundante
          //   (com 10 séries a pilha de rótulos come 80% da altura do gráfico).
          //   `lastValueVisible` fica LIGADO: o número do último valor é informação.
          title: '',
          lastValueVisible: true,
          priceLineVisible: false,
          lineWidth: 2,
          priceScaleId: eixo,        // ← §5: o lado que o `axesStore` mandou (padrão é 'right')
        });
        porId.set(item.id, serie);
      } else {
        // O eixo pode ter mudado (recalcularEixos/moverParaEixo): reaplicar SEMPRE.
        serie.applyOptions({ color: item.cor, priceScaleId: eixo });
      }
      serie.setData(paraPontosDaBiblioteca(item.series?.data ?? []));
    }
    // "Há alguma barra na tela?" — é o que decide se a lib aceita mexer na janela.
    temDado = itens.some((i) => (i.series?.data?.length ?? 0) > 0);
    // O fit enquadra a UNIÃO de todas as séries: espera a rajada de carga assentar (debounce) e
    // re-agenda a cada chamada, de modo que só o ÚLTIMO `definirSeries` da rajada dispara o fit —
    // com todas as séries já no gráfico. Uma vez que o usuário TENHA a janela (§8.1 — gesto NO
    // gráfico, preset do filtro de tempo, ou arrasto do minimapa), paramos de re-enquadrar para
    // sempre: a partir dali o zoom é dele — e nem uma atualização de DADO a move (o `devolverJanela`
    // acima devolve o que o `setData`/`removeSeries` empurrou). O fit é adiado por um frame porque
    // `fitContent()` na mesma volta do `setData` é no-op (medido na T4).
    if (usuarioAssumiu) {
      // A janela do usuário manda: uma atualização de DADO não a move — ver `devolverJanela`.
      devolverJanela(janelaAntes);
      return;
    }
    if (porId.size === 0) return;
    clearTimeout(fitAgendado);
    fitAgendado = setTimeout(() => {
      fitNoFrame = requestAnimationFrame(() => {
        fitNoFrame = null;
        chart.timeScale().fitContent();
      });
    }, 150);   // a rajada de carga assenta; o último enquadra a UNIÃO de todas
  }

  /** Anexa a primitiva no PANE — as faixas atravessam o gráfico e não pertencem a uma série. */
  function definirFaixas(mandatos) {
    const pane = chart.panes()[0];
    if (primitivaDeFaixas) pane.detachPrimitive(primitivaDeFaixas);
    primitivaDeFaixas = criarPrimitivaDeFaixas(mandatos, {
      aoClicar: (id) => destacarMandato(id),
      // O mandato em curso hachura até o ÚLTIMO DADO, não até hoje (§7.3.5).
      ultimoDadoPorSerie: (m) => {
        let maior = null;
        for (const serie of porId.values()) {
          const d = serie.data();
          const ultimo = d[d.length - 1]?.time;
          if (ultimo != null && (maior == null || ultimo > maior)) maior = ultimo;
        }
        return maior == null ? null : paraISO(maior);
      },
    });
    pane.attachPrimitive(primitivaDeFaixas);
  }

  /** Repinta a faixa clicada e esmaece as outras (§2). Não mexe no viewport — clique ≠ zoom. */
  function destacarMandato(id) {
    primitivaDeFaixas?.selecionar?.(id);
  }

  const janelaEmTempo = (from, to) => ({
    from: from ? Math.floor(Date.parse(`${from}T00:00:00Z`) / 1000) : null,
    to: to ? Math.floor(Date.parse(`${to}T00:00:00Z`) / 1000) : null,
  });

  /** Quem observa a geometria da plotagem (o minimapa se alinha por aqui). */
  let aoMudarPlotagemCb = null;

  return {
    /** §8.1 — quem ESCOLHEU a janela (filtro de tempo, minimapa) avisa a autoria por aqui;
     *  o eco do próprio gráfico não declara nada. */
    aJanelaEDoUsuario,
    /** As larguras das DUAS escalas de preço (§5) — é o que a área de plotagem reserva nas pontas.
     *  O minimapa precisa delas para cobrir exatamente o mesmo intervalo de x.
     *
     *  ⚠ `width()` devolve 0 para escala invisível (medido), então `minimumWidth` não substitui
     *  isto: com a escala invisível a lib não reserva nada. */
    largurasDasEscalas() {
      return { esquerda: chart.priceScale('left').width(), direita: chart.priceScale('right').width() };
    },
    /** Avisa quando a LARGURA DA PLOTAGEM muda — o sinal certo para re-alinhar o minimapa.
     *  Não é um poll: a mudança de rótulo (uma série com números maiores) alarga a escala e
     *  estreita o pane, e é a lib quem avisa aqui. */
    aoMudarPlotagem(cb) {
      aoMudarPlotagemCb = cb;
      chart.timeScale().subscribeSizeChange(cb);
    },
    definirSeries,
    definirFaixas,
    destacarMandato,
    /** Direção store → adapter: o adapter NÃO devolve nada por aqui (§8.1). */
    definirJanela({ from, to } = {}) {
      if (!temDado) return;                  // sem barra na tela, a lib lança — ver `temDado`
      const t = janelaEmTempo(from, to);
      if (t.from == null && t.to == null) return chart.timeScale().fitContent();
      // ⚠ Com só UMA ponta, a outra tem de vir do que está na tela — NÃO de 0.
      // `{from: 0, to: 1}` é 1970: a janela saltaria para o início dos tempos, em silêncio.
      const atual = chart.timeScale().getVisibleRange();
      chart.timeScale().setVisibleRange({
        from: t.from ?? atual?.from ?? t.to,
        to: t.to ?? atual?.to ?? t.from,
      });
    },
    resetarJanela() { if (temDado) chart.timeScale().fitContent(); },
    serieVisivel: () => porId.size,
    destruir() {
      // ⚠ Limpa o timer E os dois listeners do container: com `{ once: true }` eles só se
      // removem sozinhos SE dispararem. Se o usuário nunca interagir, sobrevivem ao adapter e,
      // num app Svelte com navegação, vazam (o container é desanexado, os handlers ficam).
      clearTimeout(fitAgendado);
      fitAgendado = null;
      // ⚠ E o rAF também: com ele pendente, o `fitContent` rodaria num gráfico já removido.
      if (fitNoFrame != null) cancelAnimationFrame(fitNoFrame);
      fitNoFrame = null;
      // A assinatura de geometria morre com o gráfico — quem observava não pode ser chamado depois.
      if (aoMudarPlotagemCb) chart.timeScale().unsubscribeSizeChange(aoMudarPlotagemCb);
      aoMudarPlotagemCb = null;
      container.removeEventListener('pointerdown', assumir);
      container.removeEventListener('wheel', assumir);
      if (primitivaDeFaixas) chart.panes()[0].detachPrimitive(primitivaDeFaixas);
      primitivaDeFaixas = null;
      chart.remove();
      porId.clear();
    },
  };
}

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
  let primitivaDeFaixas = null;
  let jaAjustou = false;            // o fitContent do intervalo completo roda só na PRIMEIRA carga

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

  /** Cria, atualiza ou REUSA uma LineSeries por id. Série que sai do store é removida do gráfico.
   * `atribuicao` vem do `axesStore` (fatia 05) — o ADAPTER não decide eixo, só obedece (§8.1). */
  function definirSeries(itens, atribuicao = {}) {
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
    // Achado da T4 (E): a lib abre no seu default (≈ últimos 150 pontos), não no intervalo
    // COMPLETO. E o `fitContent()` só tem efeito no FRAME seguinte ao `setData` — medido: chamado
    // na mesma volta, é um no-op e a janela fica no default. Por isso o fit é ADIADO por um frame.
    // `jaAjustou` garante que isto roda uma vez só: depois disso o zoom do usuário manda.
    if (!jaAjustou && porId.size > 0) {
      jaAjustou = true;
      requestAnimationFrame(() => chart.timeScale().fitContent());
    }
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

  return {
    definirSeries,
    definirFaixas,
    destacarMandato,
    /** Direção store → adapter: o adapter NÃO devolve nada por aqui (§8.1). */
    definirJanela({ from, to } = {}) {
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
    resetarJanela() { chart.timeScale().fitContent(); },
    serieVisivel: () => porId.size,
    destruir() {
      if (primitivaDeFaixas) chart.panes()[0].detachPrimitive(primitivaDeFaixas);
      primitivaDeFaixas = null;
      chart.remove();
      porId.clear();
    },
  };
}

import { createChart, LineSeries } from 'lightweight-charts';
import { paraPontosDaBiblioteca, paraISO } from './points.js';
import { criarPrimitivaDeFaixas, emSegundos } from './bands.js';
import { ancorasDoHorizonte } from '../domain/horizonte.js';
import { deveMostrarMarcadores } from '../domain/marcadores.js';
import { rotuloDaCruz } from '../domain/format.js';
import { dataEmSaoPaulo } from '../data/presets.js';

const FUNDO = '#0e1117';

/**
 * Monta o gráfico numa FUNÇÃO — nunca em singleton de módulo (§8, nada em `window`).
 * O gráfico é espelho do store: a única direção é store → adapter, e o retorno da janela
 * visível é o callback explícito (§8.1).
 */

/**
 * Rótulo de um tick do eixo de preço. Puro e no módulo, e não dentro do `createChart`, porque a
 * lib chama isto a cada redesenho da escala — e os `Intl` são construídos UMA vez, não por tick.
 */
const FORMATO_COMPACTO = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const FORMATO_CURTO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const FORMATO_DECIMAL = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function rotuloDoEixo(valor) {
  const abs = Math.abs(valor);
  // O corte é em 1 MILHÃO, não em 100 mil: "320 mil" tem exatamente a mesma largura de "320.000"
  // (medido em 2026-11-01) — compactar milhar não economiza pixel e ainda quebrava a coerência
  // dentro do MESMO eixo (topo "300 mil", base "80.000"). A partir do milhão o ganho é real:
  // "216.000.000" → "216 mi".
  if (abs >= 1_000_000) return FORMATO_COMPACTO.format(valor);
  if (abs >= 10) return FORMATO_CURTO.format(valor); // 320.000 · 20.000 · 250
  return FORMATO_DECIMAL.format(valor); // 9,62 · 0,5
}

export function criarAdapter(container, { aoMudarJanela, aoMoverCursor } = {}) {
  const chart = createChart(container, {
    // A ALTURA vem do container (`flex-1` da moldura); `autoSize` faz a lib seguir o container.
    autoSize: true,
    // 📏 RÓTULOS DO EIXO EM pt-BR, COMPACTOS ACIMA DE 6 DÍGITOS (2026-11-01). Medido num celular
    //    de 390px: `População Total` + `MVG-R Nominal` gastavam 86px + 108px = 194px de 350 de
    //    pane para os DOIS eixos, sobrando 156px de gráfico. Era o padrão da lib (en-US): ponto
    //    decimal e o número inteiro ("320000.00"). "320 mil" / "216 mi" cortam mais da metade.
    //    Abaixo de 100.000 o valor é exato: arredondar `9,62%` só esconderia dígito sem ganhar
    //    espaço nenhum.
    locale: 'pt-BR',
    // `timeFormatter` é o rótulo da CRUZ no eixo do tempo (a lib não localiza o mês dele pelo
    // `locale`): sem isto, a caixa do cursor dizia "jan/2013" e o eixo, "01 Jan '13".
    localization: { priceFormatter: rotuloDoEixo, timeFormatter: rotuloDaCruz },
    layout: { background: { color: FUNDO }, textColor: '#c9d1d9' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.04)' }, horzLines: { color: 'rgba(255,255,255,0.04)' } },
    // §5 — existem DOIS eixos, mas só a escala do lado que TEM série é desenhada. Antes as duas
    // ficavam sempre visíveis "para a atribuição ter onde aparecer"; com o eixo-base na direita
    // (2026-10-30), isso virava uma faixa morta de ~54px à esquerda — ~14% da largura no celular.
    // Agora `definirSeries` liga a esquerda só quando alguma série está nela. A lib reserva 0 para
    // escala invisível (`largurasDasEscalas`), então o minimapa se alinha sozinho nos dois estados.
    leftPriceScale: { visible: false, borderVisible: false },
    rightPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
    // 🔴 ARRASTAR É PAN, NUNCA ZOOM (2026-11-03). Sem estas duas opções, arrastar para a
    //    esquerda no enquadramento "Tudo" pedia tempo ANTES de 1995; a lib não rola para fora do
    //    dado e, para caber o pedido, ENCOLHIA o espaçamento — o intervalo diminuía a cada passo
    //    (medido num harness isolado: 31,9 anos → 25,9 num arrasto de 200px). O gesto virava o
    //    MESMO zoom da roda, que já existe. Prender as pontas ao dado deixa o arrasto ser só pan;
    //    no "Tudo" ele simplesmente não anda, porque não há horizonte fora de 1995→hoje.
    timeScale: {
      borderColor: 'rgba(255,255,255,0.10)',
      fixLeftEdge: true,
      fixRightEdge: true,
    },
    // 📌 O CURSOR GRUDA NO PONTO, NÃO NA GRADE DO EIXO (2026-11-03). As âncoras mensais do
    //    horizonte existem para o eixo x ter calendário, mas entravam também na grade de snap da
    //    lib: com série ANUAL o cursor reportava um mês qualquer (mai/2008, set/2011…) e a caixa
    //    do cursor ficava em "—" até o ponteiro chegar perto de janeiro. Com esta opção a lib
    //    ignora as séries invisíveis e prende a cruz ao ponto mais próximo de uma série VISÍVEL.
    //    A regra do valor não muda: a caixa segue mostrando o valor só quando há ponto NA DATA —
    //    o que muda é a data que a cruz aponta, que agora é sempre a de um ponto de verdade.
    crosshair: { doNotSnapToHiddenSeriesIndices: true },
  });
  const porId = new Map();          // id -> ISeriesApi
  /** Série INVISÍVEL que só carrega as âncoras mensais do horizonte (1995 → hoje).
   *  O eixo não pode nascer do dado: sem ela, `fitContent` enquadra a união das séries e
   *  o mesmo mandato muda de lugar conforme o indicador carregado (ver `domain/horizonte`).
   *  Fica FORA de `porId`: não é série do usuário, não entra na legenda nem no eixo. */
  let serieDoHorizonte = null;
  /** Ids das séries que estão OCULTAS agora. Serve para aplicar `autoscaleInfoProvider` só na
   *  TRANSIÇÃO: reaplicar em toda sincronização mexia no autoescalonamento a cada atualização e
   *  deslocava a plotagem no meio de um arrasto (medido em 2026-11-01: dois specs de arrasto do
   *  minimapa ficaram intermitentes). */
  const ocultas = new Set();
  /** Tempos de cada série (segundos, crescentes) — a régua das bolinhas roda a cada mudança de
   *  janela, e `serie.data()` devolveria uma cópia do array inteiro a cada arrasto. */
  const temposPorSerie = new Map();
  /** Estado ATUAL das bolinhas por id. `applyOptions` só na transição, pelo mesmo motivo de
   *  `ocultas` acima: reaplicar opção a cada frame de arrasto mexe no desenho sem necessidade. */
  const comMarcadores = new Map();

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
  /** União dos tempos das séries na tela, em segundos. As faixas de governo precisam dela para
   *  achar as pontas quando o mandato começa no dia 1º e a série carimba no fim do mês — ver
   *  `indicesDaFaixa`. Recalculada só quando o DADO muda, não a cada desenho. */
  let temposDoDado = [];
  /** Última janela que o gráfico PUBLICOU (ISO, como vai para a store). Serve para não devolver
   *  o próprio eco: `setVisibleRange` com a janela que a lib acabou de reportar reenquadra o
   *  desenho no meio do gesto, e o arrasto vira zoom (medido em 2026-11-03). */
  let ultimoEco = null;

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
    // As bolinhas dependem do ESPAÇAMENTO na janela: dar zoom numa série mensal as liga, e o
    // caminho de volta as desliga (regra em `domain/marcadores`).
    atualizarMarcadores(range);
    if (!range) {
      ultimoEco = null;
      return aoMudarJanela?.({ from: null, to: null });
    }
    ultimoEco = { from: paraISO(range.from), to: paraISO(range.to) };
    aoMudarJanela?.(ultimoEco);
  });

  // O CURSOR (§2026-11-01, "valor no ponto"): a lib entrega o `time` da barra sob o cursor em
  // segundos. `param.time` ausente = cursor fora da área de plot (ou sobre a legenda, que tem
  // `pointer-events` próprio) → `null`, e a legenda apaga os valores. A direção continua
  // adapter → store (§8.1): quem desenha o número é a legenda, não o gráfico.
  chart.subscribeCrosshairMove((param) => {
    const t = param?.time;
    if (t == null) return aoMoverCursor?.(null, 0, 0);
    // ⚠ Com o snap ligado, a lib escolhe o ponto mais próximo MESMO que ele esteja FORA da
    //   janela (acontece quando a janela cai num vão entre dois pontos, ex.: anual com zoom de
    //   poucos meses). Aí a cruz nem é desenhada, e uma caixa com número de uma data que não
    //   está à vista é leitura sem referência — melhor não dizer nada.
    const janela = chart.timeScale().getVisibleRange();
    if (janela && (t < janela.from || t > janela.to)) {
      // Nada visível para ler: some com a cruz E com a caixa. Sem o `clearCrosshairPosition` a
      // lib deixa a cruz presa na borda (o ponto mais próximo está fora da janela) enquanto o
      // ponteiro anda no meio — o que se lê como defeito, não como ausência de dado.
      chart.clearCrosshairPosition();
      aoMoverCursor?.(null, 0, 0);
      return;
    }
    // `point` é a posição do cursor DENTRO do pane, em px — a caixa flutuante (variante B) usa
    // para colar no ponto em vez de ficar parada num canto.
    aoMoverCursor?.(paraISO(t), param?.point?.x ?? 0, param?.point?.y ?? 0);
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

  // 📏 A LARGURA DA PLOTAGEM MUDA DEPOIS DO FIT (medido em 2026-11-03: 1192 → 1184px, 8px, quando
  //    o rótulo do último valor aparece). Com as pontas presas ao dado (`timeScale`), esse
  //    estreitamento come uma borda — e o eixo deixaria de chegar a hoje. Enquanto a janela é
  //    AUTOMÁTICA (o usuário não tomou o zoom), reenquadrar é o comportamento certo.
  const aoMudarTamanho = () => {
    if (usuarioAssumiu || !temDado) return;
    requestAnimationFrame(() => {
      if (!usuarioAssumiu && temDado) chart.timeScale().fitContent();
    });
  };
  chart.timeScale().subscribeSizeChange(aoMudarTamanho);

  /** Liga/desliga as bolinhas de cada série conforme o espaçamento NA JANELA VISÍVEL.
   *  Regra pura em `domain/marcadores.js`; aqui só a ponte com a lib (ADR 0001).
   *
   *  `range` opcional: a assinatura de janela já entrega o intervalo novo, e pedi-lo de novo à
   *  lib no meio do gesto pode devolver o anterior. `applyOptions` só quando o estado MUDA —
   *  arrastar dispara isto a cada frame. */
  function atualizarMarcadores(range = chart.timeScale().getVisibleRange()) {
    if (!range || porId.size === 0) return;
    const largura = chart.timeScale().width();
    if (!Number.isFinite(largura) || largura <= 0) return;
    for (const [id, serie] of porId) {
      const mostrar = deveMostrarMarcadores(temposPorSerie.get(id) ?? [], {
        from: range.from,
        to: range.to,
        largura,
      });
      if (mostrar === comMarcadores.get(id)) continue;
      serie.applyOptions(
        mostrar
          ? { pointMarkersVisible: true, pointMarkersRadius: 2.5 }
          : { pointMarkersVisible: false },
      );
      comMarcadores.set(id, mostrar);
    }
  }

  /** Cria, atualiza ou REUSA uma LineSeries por id. Série que sai do store é removida do gráfico.
   * `atribuicao` vem do `axesStore` (fatia 05) — o ADAPTER não decide eixo, só obedece (§8.1). */
  function definirSeries(itens, atribuicao = {}) {
    // 🔴 `setData` de uma série cuja data ESTENDE o domínio de tempo MOVE a janela visível — a lib
    //    a desloca (medido 2026-10-19: `selic-meta`, 320 barras, levou `2015-06→2025-06`
    //    a `2020-08→2025-10`; re-setar a MESMA data não move). Se a janela é do usuário, uma
    //    atualização de DADO não pode movê-la: guardamos aqui e devolvemos no fim.
    const janelaAntes = usuarioAssumiu ? chart.timeScale().getVisibleRange() : null;
    const vivos = new Set(itens.map((i) => i.id));
    for (const [id, serie] of porId) {
      if (!vivos.has(id)) {
        chart.removeSeries(serie);
        porId.delete(id);
        ocultas.delete(id);
        temposPorSerie.delete(id);
        comMarcadores.delete(id);
      }
    }
    // O horizonte é do EIXO, não da série: as âncoras valem mesmo com zero série carregada.
    const ancoras = ancorasDoHorizonte(dataEmSaoPaulo());
    if (!serieDoHorizonte) {
      serieDoHorizonte = chart.addSeries(LineSeries, {
        visible: false,
        lastValueVisible: false,
        priceLineVisible: false,
        priceScaleId: 'horizonte',
        // A série é só uma ÂNCORA de tempo: os valores 0 (necessários para a lib manter os
        // pontos, inclusive os que estão DEPOIS do último dado real) não podem entrar no
        // autoescalonamento do eixo de preço, senão puxariam a escala para o zero.
        autoscaleInfoProvider: () => null,
      });
      // Escala própria e INVISÍVEL: se a âncora ficasse no eixo `right`, os zeros virariam
      // rótulos (-0,60…0,70) ao lado do dado — o eixo mentiria sobre o que a série mede.
      chart.priceScale('horizonte').applyOptions({ visible: false, borderVisible: false });
    }
    serieDoHorizonte.setData(ancoras.map((iso) => ({ time: emSegundos(iso), value: 0 })));
    for (const item of itens) {
      const eixo = atribuicao[item.id] === 'left' ? 'left' : 'right';
      // `oculta` (2026-10-31) é estado de TELA: a série continua na store, mas não é desenhada.
      // `autoscaleInfoProvider: () => null` é o que a tira do autoescalonamento — sem isto uma
      // linha oculta continuaria esticando o eixo (mesma técnica da âncora do horizonte).
      const oculta = item.oculta === true;
      const escalaDaOculta = oculta ? () => null : undefined;
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
          visible: !oculta,
          priceScaleId: eixo,        // ← §5: o lado que o `axesStore` mandou (padrão é 'right')
        });
        porId.set(item.id, serie);
      } else {
        // O eixo pode ter mudado (recalcularEixos/moverParaEixo) e a visibilidade também
        // (olho da legenda): reaplicar SEMPRE.
        serie.applyOptions({ color: item.cor, priceScaleId: eixo, visible: !oculta });
      }
      // Só na TRANSIÇÃO de visibilidade (ver `ocultas` acima).
      if (oculta !== ocultas.has(item.id)) {
        serie.applyOptions({ autoscaleInfoProvider: escalaDaOculta });
        if (oculta) ocultas.add(item.id); else ocultas.delete(item.id);
      }
      serie.setData(paraPontosDaBiblioteca(item.series?.dados ?? []));
      // A régua das bolinhas precisa dos tempos em segundos; guardar agora evita pedir
      // `serie.data()` (cópia do array inteiro) a cada frame de zoom.
      temposPorSerie.set(
        item.id,
        (item.series?.dados ?? []).map((p) => emSegundos(p.data)),
      );
    }
    // §5 (2026-10-30) — a escala da ESQUERDA existe só quando alguma série está nela. Vem DEPOIS
    // da atribuição de `priceScaleId` acima e ANTES de qualquer saída antecipada: esconder uma
    // escala que ainda tem série faria a linha sumir.
    const temEsquerda = Object.values(atribuicao).includes('left');
    chart.priceScale('left').applyOptions({ visible: temEsquerda, borderVisible: temEsquerda });
    // "Há alguma barra na tela?" — é o que decide se a lib aceita mexer na janela.
    temDado = itens.some((i) => (i.series?.dados?.length ?? 0) > 0);
    // A grade de tempo do gráfico é a UNIÃO das séries + as âncoras do horizonte (é dela que a
    // lib monta a escala, e é ela que a primitiva das faixas usa para posicionar as datas).
    const tempos = new Set();
    for (const lista of temposPorSerie.values()) for (const t of lista) tempos.add(t);
    for (const iso of ancoras) tempos.add(emSegundos(iso));
    temposDoDado = [...tempos].sort((a, b) => a - b);
    // O espaçamento dos pontos pode ter mudado com os dados NOVOS (série trocada, zoom mantido).
    atualizarMarcadores();
    // O fit enquadra o HORIZONTE (1995 → hoje), que é a união das séries com as âncoras do
    // eixo. Espera a rajada de carga assentar (debounce) e re-agenda a cada chamada, de modo que
    // só o ÚLTIMO `definirSeries` da rajada dispara o fit — com todas as séries já no gráfico.
    // Uma vez que o usuário TENHA a janela (§8.1 — gesto NO
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
        // `fitContent` muda a janela sem passar pela assinatura de range em toda situação;
        // reavaliar aqui garante o estado certo logo no primeiro enquadramento.
        atualizarMarcadores();
      });
    }, 150);   // a rajada de carga assenta; o último enquadra a UNIÃO de todas
  }

  /** Anexa a primitiva no PANE — as faixas atravessam o gráfico e não pertencem a uma série. */
  function definirFaixas(mandatos) {
    const pane = chart.panes()[0];
    if (primitivaDeFaixas) pane.detachPrimitive(primitivaDeFaixas);
    primitivaDeFaixas = criarPrimitivaDeFaixas(mandatos, {
      aoClicar: (id) => destacarMandato(id),
      // SEM rótulo de faixa no gráfico grande (decisão de 2026-11-01, variante B): o topo do
      // pane pertence à legenda das séries (`ChartLegend`). A identificação textual do governo
      // continua na MESMA linha do tempo, logo abaixo, no minimapa — que é rotulado e alinhado
      // às mesmas datas —, além do chip da barra superior e da matriz de comparação. A faixa
      // aqui vira CONTEXTO (sombra + hachura do mandato em curso), não rótulo.
      rotulos: false,
      // A grade do gráfico, lida no recálculo — nunca copiada para dentro da primitiva.
      temposDoDado: () => temposDoDado,
      // O mandato em curso hachura até HOJE, não até o último dado (§7.3.5 emendado em
      // 2026-10-29): o eixo agora vai até hoje e uma faixa que parasse antes deixaria um vão
      // que se lê como "sem governo".
      fimDoMandatoEmCurso: () => dataEmSaoPaulo(),
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
      // Eco do PRÓPRIO gráfico não volta para ele: reaplicar a janela que a lib acabou de
      // reportar reenquadra o desenho no meio do gesto, e o arrasto vira zoom (medido em
      // 2026-11-03: 10,00 → 11,50 anos num arrasto de 200px, mesmo com as pontas presas ao dado).
      if (ultimoEco && from === ultimoEco.from && to === ultimoEco.to) return;
      if (!temDado) return;                  // sem barra na tela, a lib lança — ver `temDado`
      const t = janelaEmTempo(from, to);
      if (t.from == null && t.to == null) return chart.timeScale().fitContent();
      // ⚠ Com só UMA ponta, a outra tem de vir do que está na tela — NÃO de 0.
      // `{from: 0, to: 1}` é 1970: a janela saltaria para o início dos tempos, em silêncio.
      const atual = chart.timeScale().getVisibleRange();
      const alvo = {
        from: t.from ?? atual?.from ?? t.to,
        to: t.to ?? atual?.to ?? t.from,
      };
      // 🔴 Um par INVERTIDO (`to` antes de `from`) não pode chegar à lib: em DEV ela lança
      //    (`right should be >= left`), mas o build de produção REMOVE as asserções e desenha
      //    errado, em SILÊNCIO — a armadilha que o AGENTS registra.
      //    Aconteceu de verdade (2026-10-19): o preset escrevia só o `from` e a ponta direita
      //    herdada era a de um MANDATO (no passado). Aqui o gráfico não se mexe e o aviso sai —
      //    a fonte foi corrigida junto (o preset declara as duas pontas), mas o adapter é a
      //    última linha antes da lib.
      if (alvo.from != null && alvo.to != null && alvo.to < alvo.from) {
        console.warn('[janela] intervalo invertido ignorado — nada foi aplicado ao gráfico', alvo);
        return;
      }
      chart.timeScale().setVisibleRange(alvo);
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
      chart.timeScale().unsubscribeSizeChange(aoMudarTamanho);
      container.removeEventListener('pointerdown', assumir);
      container.removeEventListener('wheel', assumir);
      if (primitivaDeFaixas) chart.panes()[0].detachPrimitive(primitivaDeFaixas);
      primitivaDeFaixas = null;
      chart.remove();
      porId.clear();
    },
  };
}

import { createChart, LineSeries } from 'lightweight-charts';
import { criarPrimitivaDeFaixas } from './bands.js';
import { paraISO, paraPontosDaBiblioteca } from './points.js';

const FUNDO = '#0e1117';

/**
 * O mapa de navegação. É um SEGUNDO gráfico: a lib não tem minimapa nativo.
 * Mostra sempre o intervalo completo, e desenha por cima a janela visível do gráfico grande.
 * Arrastar aqui move a janela do grande — é o que devolve o "voltar de qualquer zoom".
 */
export function criarNavigator(container, { aoMudarJanela } = {}) {
  const chart = createChart(container, {
    height: 48,
    // ⚠ Sem `autoSize` a lib NÃO segue o container: ela dimensiona uma vez e pronto. E o
    // minimapa MUDA de largura por construção — é assim que ele se alinha à plotagem do gráfico
    // grande (`alinharCom`). Medido sem esta linha: container de 1010px com canvas de **1120px**
    // transbordando, e as faixas continuavam na escala antiga (116/266/415… contra 106/240/375…
    // do gráfico). `autoSize` liga o `ResizeObserver` e é o que faz a margem virar tamanho.
    autoSize: true,
    layout: { background: { color: FUNDO }, textColor: 'transparent', fontSize: 9 },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    rightPriceScale: { visible: false },
    timeScale: { visible: false },
    handleScroll: false,     // o scroll daqui não é o do gráfico grande
    handleScale: false,
    crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
  });

  // 🔴 MEDIDO (2026-10-14, sonda no navegador): **um gráfico SEM série não tem domínio de tempo.**
  // `timeToCoordinate()` e `getVisibleRange()` devolvem `null`, e a primitiva das faixas — que
  // depende de `timeToCoordinate` — não desenharia NADA (todas as faixas cairiam no filtro de
  // `x1 !== null`). A saída é uma série **invisível**: ela dá o domínio sem desenhar nada.
  // A decisão de produto continua a mesma (§2: faixas + janela, sem as séries na tela) — só
  // descobrimos que ela precisa de uma âncora invisível para funcionar.
  let ancora = null;

  let janela = { from: null, to: null, de: null, ate: null };
  let primitiva = null;
  let cortinaAnexada = false;
  let gesto = null;            // { modo: 'mover'|'redimensionar', lado?, agarrePx }
  let pedirRedesenho = null;   // vem do `attached` da cortina — a lib redesenha por aqui
  let alinhado = { esquerda: -1, direita: -1 }; // margens já aplicadas (o alinhamento é idempotente)
  let destruido = false;

  /**
   * Os dois gestos da §2, com nome: **mover** a janela inteira e **redimensionar** uma ponta.
   *
   * 🔴 MEDIDO (2026-10-15): o gesto era ABSOLUTO — cada `pointermove` re-centrava a janela no
   * cursor (`from = centro - meia`). Efeito: agarrar a janela e mover o mouse **10px** saltava
   * ~5 anos (janela de 30 anos, minimapa de 1120px), e como o fim bate no limite do dado, a
   * janela colapsava na borda — o "zoom numa fatia minúscula" que o usuário relatou. E como
   * `meia` era constante, as PONTAS não tinham alça nenhuma: não havia como redimensionar.
   *
   * Agora o gesto é RELATIVO: guarda-se ONDE o ponteiro agarrou e aplica-se a DIFERENÇA.
   */
  const PEGA = 6; // px de tolerância em cada borda, para pegar a ponta

  /**
   * 🔴 O espaço do PONTEIRO (o container) não é, em geral, o espaço do GRÁFICO: a lib reserva
   * faixas para as escalas de preço, então o *pane* é mais estreito que o container. Comparar a
   * borda da janela (espaço do gráfico) com `ev.clientX - r.left` (espaço do container) erra por
   * esse tanto — foi o que fez `ladoPegavel` NUNCA casar e o redimensionar não existir (medido
   * em 2026-10-15).
   *
   * ⚠ Desde o alinhamento de 2026-10-19 (`alinharCom`), o container do minimapa **é** a área de
   * plotagem — ele não tem escala nenhuma e o pane ocupa tudo. Então esta função devolve 0 e é
   * uma rede de segurança: `panes()[0].getWidth()` **não existe** nesta versão da lib (por isso
   * o `?.`), e o fallback é a largura do container — que é o pane de fato aqui.
   */
  function deslocamentoDoPane() {
    try {
      const r = container.getBoundingClientRect();
      const larguraPane = Math.round(chart.panes()[0]?.getWidth?.() ?? r.width);
      const alvo = [...container.querySelectorAll('canvas')]
        .find((c) => Math.round(c.getBoundingClientRect().width) === larguraPane);
      return alvo ? alvo.getBoundingClientRect().left - r.left : 0;
    } catch {
      return 0;
    }
  }

  /** Converte duas bordas em PIXEL (no espaço do minimapa) numa janela ISO, presa ao alcance. */
  function paraJanela(x1, x2) {
    const ts = chart.timeScale();
    const largura = container.clientWidth || 1;
    // ⚠ O CLAMP é em PIXEL, não em tempo. Comparar `coordinateToTime()` (segundos, ~1,7e9) com
    //   uma coordenada (pixel, ~800) satura tudo no mesmo valor e devolve `null` sempre — foi o
    //   que fiz na primeira versão desta função. Segunda vez neste arquivo que unidades
    //   diferentes se disfarçam; por isso os nomes aqui dizem a unidade.
    const a = Math.max(0, Math.min(largura, x1));
    const b = Math.max(0, Math.min(largura, x2));
    const t1 = ts.coordinateToTime(a);
    const t2 = ts.coordinateToTime(b);
    if (t1 == null || t2 == null || t2 <= t1) return null;
    return { from: paraISO(t1), to: paraISO(t2) };
  }

  /** Espera `x` no espaço do GRÁFICO (o do pane), não no do container — ver `deslocamentoDoPane`. */
  function ladoPegavel(x) {
    const { from, to } = janela;
    if (from == null || to == null) return null;
    if (Math.abs(x - from) <= PEGA) return 'esquerda';
    if (Math.abs(x - to) <= PEGA) return 'direita';
    return null;
  }

  /** Recalcula os PIXELS da janela a partir do ISO guardado. É isto que mantém a cortina e o
   *  arrasto coerentes quando a escala do minimapa muda (`fitContent` no `definirFaixas`). */
  function ressincronizarPixels() {
    const ts = chart.timeScale();
    // ⚠ `timeToCoordinate` quer SEGUNDOS UNIX, não a string ISO que o store guarda.
    const seg = (iso) => (iso ? Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000) : null);
    janela = {
      ...janela,
      from: seg(janela.de) == null ? null : ts.timeToCoordinate(seg(janela.de)),
      to: seg(janela.ate) == null ? null : ts.timeToCoordinate(seg(janela.ate)),
    };
    pedirRedesenho?.();
  }

  function aoPressionar(ev) {
    const r = container.getBoundingClientRect();
    // Tudo daqui para baixo é ESPAÇO DO GRÁFICO — a conversão acontece uma vez, aqui.
    const x = ev.clientX - r.left - deslocamentoDoPane();
    const lado = ladoPegavel(x);
    if (lado) {
      gesto = { modo: 'redimensionar', lado };
    } else if (x >= (janela.from ?? 0) && x <= (janela.to ?? Infinity)) {
      // Agarra a janela ONDE ELA ESTÁ. Este número é o que torna o gesto relativo.
      gesto = { modo: 'mover', agarrePx: x - (janela.from ?? 0) };
    } else {
      // Fora da janela: aqui o salto é o esperado — centra no ponto clicado.
      gesto = { modo: 'mover', agarrePx: ((janela.to ?? 0) - (janela.from ?? 0)) / 2 };
    }
    container.setPointerCapture?.(ev.pointerId);
  }

  function aoMover(ev) {
    if (!gesto) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left - deslocamentoDoPane();

    if (gesto.modo === 'redimensionar') {
      const nova = gesto.lado === 'esquerda'
        ? paraJanela(x, janela.to)
        : paraJanela(janela.from, x);
      if (nova) aoMudarJanela?.(nova);
      return;
    }
    // Mover: desloca a janela pela DIFERENÇA, mantendo a largura.
    const largura = (janela.to ?? 0) - (janela.from ?? 0);
    const deslocada = paraJanela(x - gesto.agarrePx, x - gesto.agarrePx + largura);
    if (deslocada) aoMudarJanela?.(deslocada);
  }
  function aoSoltar() { gesto = null; }

  // A cortina é uma primitiva de pane, como as faixas — mesmo mecanismo, sem inventar outro.
  const cortina = {
    paneViews: () => [{
      zOrder: () => 'top',
      renderer: () => ({
        draw: (target) => target.useBitmapCoordinateSpace(({ context, bitmapSize, horizontalPixelRatio: r }) => {
          const x1 = janela.from == null ? 0 : Math.round(janela.from * r);
          const x2 = janela.to == null ? bitmapSize.width : Math.round(janela.to * r);
          if (x2 <= x1) return;
          // Fora da janela fica escurecido; dentro fica limpo. Ler "onde eu estou" tem de ser
          // imediato — por isso a cortina é o canal, e não um contorno fino.
          context.fillStyle = 'rgba(0,0,0,0.55)';
          context.fillRect(0, 0, x1, bitmapSize.height);
          context.fillRect(x2, 0, bitmapSize.width - x2, bitmapSize.height);
          context.strokeStyle = 'rgba(255,255,255,0.55)';
          context.lineWidth = Math.max(1, Math.floor(r));
          context.strokeRect(x1, 0, x2 - x1, bitmapSize.height);
        }),
      }),
    }],
    updateAllViews() {},
    attached({ requestUpdate }) { pedirRedesenho = requestUpdate; },
    detached() { pedirRedesenho = null; },
    /** O cursor diz o que o gesto vai fazer — alça nas pontas, mão no meio (§2). */
    hitTest(x) {
      const lado = ladoPegavel(x);
      if (lado) return { externalId: `alca-${lado}`, zOrder: 'top', cursorStyle: 'ew-resize', hitTestPriority: 0 };
      const dentro = x >= (janela.from ?? 0) && x <= (janela.to ?? Infinity);
      return { externalId: dentro ? 'dentro' : 'fora', zOrder: 'top', cursorStyle: dentro ? 'grab' : 'pointer', hitTestPriority: 0 };
    },
  };

  container.addEventListener('pointerdown', aoPressionar);
  container.addEventListener('pointermove', aoMover);
  container.addEventListener('pointerup', aoSoltar);
  container.addEventListener('pointercancel', aoSoltar);

  // A LARGURA do minimapa muda quando ele é alinhado (ou quando a janela do navegador muda).
  // O `janela.from/to` está em PIXEL: se a escala mudou e os pixels não, a cortina desenha
  // deslocada e o arrasto parte de um valor falso — então ela é recalculada aqui.
  //
  // ⚠ RESÍDUO MEDIDO e aceito (2026-10-19): as duas áreas de plotagem são idênticas (erro 0,0px
  // nas pontas), mas o `fitContent` do minimapa deixa um range lógico FRACIONÁRIO (`0,709…358`)
  // contra `0…358` do gráfico grande, e a mesma data cai até **1,5px** à esquerda aqui (0,15% de
  // 1010px — antes do alinhamento eram 28px). Tentado e NÃO pegou: `setVisibleLogicalRange(0…n−1)`
  // e `setVisibleRange` com as pontas do dado — a lib renormaliza o range do minimapa depois do
  // resize, e o valor volta a 0,709. Não vale mais código para 1,5px.
  chart.timeScale().subscribeSizeChange(() => { if (!destruido) ressincronizarPixels(); });

  return {
    /** As faixas do navegador são as MESMAS do gráfico grande — um só dado, dois desenhos. */
    definirFaixas(mandatos, dadosParaAncora = []) {
      const pane = chart.panes()[0];
      if (primitiva) pane.detachPrimitive(primitiva);

      // A âncora invisível: só existe para o gráfico ter domínio de tempo (ver acima).
      // Recebe o mesmo dado das séries do gráfico grande — é o intervalo completo que a §2 pede.
      //
      // ⚠ A âncora é uma SÉRIE DA LIB: `setData` quer `{time,value}` e REJEITA tempos repetidos
      //   ou fora de ordem. O dado que chega é o PUBLICADO (`{date,value}`) e vem de VÁRIAS
      //   séries — logo, é preciso converter e DEDUPLICAR por tempo. Sem isto a lib lança
      //   ("data must be asc ordered by time") e a exceção sobe pelo subscriber do `Chart.svelte`,
      //   que morre: o gráfico grande fica preso na primeira série que desenhou.
      if (!ancora) ancora = chart.addSeries(LineSeries, { visible: false });
      const porTempo = new Map();
      for (const p of paraPontosDaBiblioteca(dadosParaAncora)) porTempo.set(p.time, p);
      ancora.setData([...porTempo.values()].sort((a, b) => a.time - b.time));
      chart.timeScale().fitContent();
      // `fitContent` MUDA A ESCALA — e os pixels da janela guardados antes apontariam para o
      // lugar errado (a cortina desenharia deslocada e o arrasto partiria de um valor falso).
      if (janela.de != null) ressincronizarPixels();

      // A MESMA primitiva da T2 — sem opção nova.
      primitiva = criarPrimitivaDeFaixas(mandatos, {});
      pane.attachPrimitive(primitiva);
      // ⚠ Só UMA vez: sem a guarda, chamar `definirFaixas` duas vezes anexaria a cortina
      // duas vezes, e a lib desenharia a sobreposição em dobro.
      if (!cortinaAnexada) { pane.attachPrimitive(cortina); cortinaAnexada = true; }
    },
    /** Onde o gráfico grande está, em ISO — vem do callback DELE; a direção é sempre essa (§8.1).
     *  Guarda as duas formas de propósito: `from`/`to` em PIXEL (para desenhar a cortina) e
     *  `de`/`ate` em ISO (para o arrasto). Misturar as duas em um nome só foi o que me fez
     *  escrever o bug do `LogicalRange` — os nomes agora dizem a unidade. */
    mostrarJanela({ from, to } = {}) {
      // Guarda as duas formas de propósito: `from`/`to` em PIXEL (para desenhar a cortina e para
      // agarrar) e `de`/`ate` em ISO (para o arrasto). Misturar as duas em um nome só foi o que
      // me fez escrever o bug do `LogicalRange` — os nomes agora dizem a unidade.
      janela = { ...janela, de: from, ate: to };
      ressincronizarPixels();
    },
    /**
     * Alinha o minimapa à ÁREA DE PLOTAGEM do gráfico grande.
     *
     * 🔴 MEDIDO (2026-10-19, app real a 1280px): o pane do gráfico grande é `[54, 1064)` — as
     * duas escalas de preço (§5) reservam 54px à esquerda e 56px à direita — enquanto o
     * minimapa, sem escala nenhuma, ocupa `[0, 1120)`. **Não é deslocamento, é ESCALA
     * diferente**: a mesma data cai em −28px (2003), +1,6px (2011) e +31px (2019), e o erro
     * chega a ~55px nas pontas. A cortina e as faixas do minimapa não ficavam sob as do
     * gráfico acima — e é justamente sob elas que o usuário lê "onde eu estou".
     *
     * `minimumWidth` NÃO resolve: com a escala invisível a lib reserva **0** (medido:
     * `priceScale().width()` = 0 e o canvas ocupa os 600px inteiros do teste). Por isso a
     * margem: o container do minimapa passa a ter a largura do pane, e o pane dele — que não
     * tem escala — é a própria área de plotagem.
     *
     * ⚠ As larguras vêm de fora (`medirEscalas`), porque quem as conhece é o adapter do
     * gráfico grande.
     */
    alinharCom(medirEscalas) {
      if (destruido) return;
      let medidas = null;
      try { medidas = medirEscalas?.() ?? null; } catch { medidas = null; }
      if (!medidas) return;
      const esquerda = Math.round(medidas.esquerda ?? 0);
      const direita = Math.round(medidas.direita ?? 0);
      if (esquerda === alinhado.esquerda && direita === alinhado.direita) return;
      alinhado = { esquerda, direita };
      // Margem, não padding: com padding a lib posiciona o canvas a partir da borda do padding
      // box e o pane continuaria largo. Com margem a caixa do container é a própria plotagem.
      container.style.marginLeft = `${esquerda}px`;
      container.style.marginRight = `${direita}px`;
      // A largura mudou: `subscribeSizeChange` recalculou os pixels da janela; este pedido é a
      // rede de segurança do caso em que o tamanho não muda (mesma soma, lados diferentes).
      requestAnimationFrame(() => { if (!destruido) ressincronizarPixels(); });
    },
    destruir() {
      destruido = true;
      container.removeEventListener('pointerdown', aoPressionar);
      container.removeEventListener('pointermove', aoMover);
      container.removeEventListener('pointerup', aoSoltar);
      container.removeEventListener('pointercancel', aoSoltar);
      chart.remove();
    },
  };
}

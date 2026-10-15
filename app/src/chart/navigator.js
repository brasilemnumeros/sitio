import { createChart } from 'lightweight-charts';
import { criarPrimitivaDeFaixas } from './bands.js';
import { paraISO } from './points.js';

const FUNDO = '#0e1117';

/**
 * O mapa de navegação. É um SEGUNDO gráfico: a lib não tem minimapa nativo.
 * Mostra sempre o intervalo completo, e desenha por cima a janela visível do gráfico grande.
 * Arrastar aqui move a janela do grande — é o que devolve o "voltar de qualquer zoom".
 */
export function criarNavigator(container, { aoMudarJanela } = {}) {
  const chart = createChart(container, {
    height: 48,
    layout: { background: { color: FUNDO }, textColor: 'transparent', fontSize: 9 },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    rightPriceScale: { visible: false },
    timeScale: { visible: false },
    handleScroll: false,     // o scroll daqui não é o do gráfico grande
    handleScale: false,
    crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
  });

  let janela = { from: null, to: null, de: null, ate: null };
  let primitiva = null;
  let arrastando = null;
  let pedirRedesenho = null;   // vem do `attached` da cortina — a lib redesenha por aqui

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
    /** Arrastar dentro da janela move; clicar fora centraliza. */
    hitTest(x) {
      return { externalId: x >= (janela.from ?? 0) && x <= (janela.to ?? Infinity) ? 'dentro' : 'fora',
               zOrder: 'top', cursorStyle: 'grab', hitTestPriority: 0 };
    },
  };

  function aoPressionar(ev) {
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    arrastando = x;
    container.setPointerCapture?.(ev.pointerId);
  }
  function aoMover(ev) {
    if (arrastando == null) return;
    const r = container.getBoundingClientRect();
    const x = ev.clientX - r.left;
    const ts = chart.timeScale();
    // A largura da janela, em SEGUNDOS — as duas pontas são tempo, então a subtração é válida.
    const de = ts.coordinateToTime(janela.from ?? 0);
    const ate = ts.coordinateToTime(janela.to ?? 0);
    if (de == null || ate == null) return;
    const meia = (ate - de) / 2;
    const centro = ts.coordinateToTime(x);
    if (centro == null) return;
    aoMudarJanela?.({ from: paraISO(centro - meia), to: paraISO(centro + meia) });
  }
  function aoSoltar() { arrastando = null; }

  container.addEventListener('pointerdown', aoPressionar);
  container.addEventListener('pointermove', aoMover);
  container.addEventListener('pointerup', aoSoltar);
  container.addEventListener('pointercancel', aoSoltar);

  return {
    /** As faixas do navegador são as MESMAS do gráfico grande — um só dado, dois desenhos. */
    definirFaixas(mandatos) {
      const pane = chart.panes()[0];
      if (primitiva) pane.detachPrimitive(primitiva);
      // A MESMA primitiva da T2 — sem opção nova. O rótulo dela já se auto-limita por
      // `largura > 70 * r`, então em 48px de altura ele simplesmente não aparece nas faixas
      // estreitas. Se atrapalhar na tela, aí sim vale uma opção — e ela nasce medida, na T4.
      primitiva = criarPrimitivaDeFaixas(mandatos, {});
      pane.attachPrimitive(primitiva);
      pane.attachPrimitive(cortina);
    },
    /** Onde o gráfico grande está, em ISO — vem do callback DELE; a direção é sempre essa (§8.1).
     *  Guarda as duas formas de propósito: `from`/`to` em PIXEL (para desenhar a cortina) e
     *  `de`/`ate` em ISO (para o arrasto). Misturar as duas em um nome só foi o que me fez
     *  escrever o bug do `LogicalRange` — os nomes agora dizem a unidade. */
    mostrarJanela({ from, to } = {}) {
      const ts = chart.timeScale();
      janela = {
        de: from, ate: to,
        from: from ? ts.timeToCoordinate(from) : null,
        to: to ? ts.timeToCoordinate(to) : null,
      };
      pedirRedesenho?.();
    },
    destruir() {
      container.removeEventListener('pointerdown', aoPressionar);
      container.removeEventListener('pointermove', aoMover);
      container.removeEventListener('pointerup', aoSoltar);
      container.removeEventListener('pointercancel', aoSoltar);
      chart.remove();
    },
  };
}

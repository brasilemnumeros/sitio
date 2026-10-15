/**
 * Faixas de governo (spec §2, §7.3.4, §7.3.5). Camada 3: puro para as funções de
 * janela/tom; a primitiva desenha em canvas e por isso NÃO tem teste de unidade
 * (o `vite.config.js` roda em `node`, sem DOM — §10.7). A verificação é visual (Tarefa 4).
 */

/** Faixas que TOCAM a janela. `null` em qualquer ponta significa "sem limite" — é o estado
 * inicial (`from`/`to` nulos) e o mandato em curso (`fim` nulo). */
export function faixasVisiveis(mandatos, { from, to }) {
  const de = from ?? '0000-01-01';
  const ate = to ?? '9999-12-31';
  return mandatos.filter((m) => m.inicio <= ate && (m.fim ?? '9999-12-31') >= de);
}

/** Dois tons neutros, alternados. São AUSÊNCIA de cor de partido — não escolha estética (§2):
 * a identificação vem do rótulo (`Lula III · PT`), nunca do fundo. */
export const TONS_DE_FAIXA = ['rgba(255,255,255,0.030)', 'rgba(255,255,255,0.065)'];
export function tomDaFaixa(indice) {
  return TONS_DE_FAIXA[indice % TONS_DE_FAIXA.length];
}

/**
 * Primitiva de pane das faixas de governo (§2). A lib não tem anotação nativa — este é o
 * código que passa a ser nosso para manter (ADR, "negativas").
 * Requisitos: pintar ao FUNDO (`zOrder: 'bottom'`); clique SELECIONA, não dá zoom;
 * hachura no mandato em curso, cortando no último dado disponível (§7.3.5).
 */
export function criarPrimitivaDeFaixas(mandatos, { aoClicar, ultimoDadoPorSerie } = {}) {
  let chart = null;
  let pedirAtualizacao = null;
  let selecionado = null;
  // x em pixels de MÍDIA (não bitmap) — o draw multiplica pelo parâmetro de escala.
  let faixasPx = [];

  function recalcular() {
    if (!chart) return faixasPx = [];
    const ts = chart.timeScale();
    faixasPx = mandatos.map((m, i) => {
      const x1 = ts.timeToCoordinate(m.inicio);
      // O mandato em curso termina no ÚLTIMO DADO, não na data de hoje (§7.3.5).
      const fim = m.fim ?? ultimoDadoPorSerie?.(m) ?? null;
      const x2 = fim ? ts.timeToCoordinate(fim) : null;
      return { id: m.id, indice: i, x1, x2, emCurso: Boolean(m.emCurso) };
    }).filter((f) => f.x1 !== null);
  }

  const view = {
    zOrder: () => 'bottom',
    renderer: () => ({
      draw: (target) => target.useBitmapCoordinateSpace(({ context, bitmapSize, horizontalPixelRatio: r }) => {
        for (const f of faixasPx) {
          const x1 = Math.round(f.x1 * r);
          const x2 = Math.round((f.x2 ?? bitmapSize.width / r) * r);
          const largura = x2 - x1;
          if (largura <= 0) continue;

          context.fillStyle = f.id === selecionado ? 'rgba(255,255,255,0.11)' : tomDaFaixa(f.indice);
          context.fillRect(x1, 0, largura, bitmapSize.height);

          // Hachura diagonal: convenção de "período em aberto", e NÃO depende de cor (§7.3.5).
          if (f.emCurso) {
            context.save();
            context.beginPath();
            context.rect(x1, 0, largura, bitmapSize.height);
            context.clip();
            context.strokeStyle = 'rgba(255,255,255,0.18)';
            context.lineWidth = Math.max(1, Math.floor(r));
            for (let x = x1 - bitmapSize.height; x < x2 + bitmapSize.height; x += 8 * r) {
              context.beginPath();
              context.moveTo(x, bitmapSize.height);
              context.lineTo(x + bitmapSize.height, 0);
              context.stroke();
            }
            context.restore();
          }

          // O RÓTULO é o canal de identificação — texto, nunca cor (§2, §7.3.4).
          // ⚠ O `clip` não é decorativo: sem ele, um rótulo longo ("FHC II · PSDB") numa faixa
          // estreita VAZA para a faixa vizinha, e o limiar de 70px não garante o contrário.
          if (largura > 70 * r) {
            context.save();
            context.beginPath();
            context.rect(x1, 0, largura, bitmapSize.height);
            context.clip();
            context.font = `${11 * r}px -apple-system, system-ui, sans-serif`;
            context.fillStyle = 'rgba(255,255,255,0.62)';
            context.textBaseline = 'top';
            context.fillText(rotuloDe(f.id), x1 + 6 * r, 6 * r);
            context.restore();
          }
        }
      }),
    }),
  };

  const porId = new Map(mandatos.map((m) => [m.id, m]));
  const rotuloDe = (id) => {
    const m = porId.get(id);
    return m ? `${m.rotulo} · ${m.partido}` : '';
  };

  // ⚠ Referência ESTÁVEL, criada uma vez. Os typings avisam (L2145-46): "a lib usa caches
  // internos baseados em REFERÊNCIA de array — devolva o MESMO array se nada mudou". Devolver
  // `[view]` novo a cada chamada invalida o cache e força redesenho. Não é incorreção; é custo.
  const VISOES = [view];

  return {
    attached({ chart: c, requestUpdate }) { chart = c; pedirAtualizacao = requestUpdate; recalcular(); },
    detached() { chart = null; pedirAtualizacao = null; faixasPx = []; },
    paneViews() { return VISOES; },
    updateAllViews() { recalcular(); },
    /** Clique SELECIONA — quem trata o evento decide que não é zoom (§2). */
    hitTest(x) {
      const f = faixasPx.find((f) => x >= f.x1 && x <= (f.x2 ?? Infinity));
      if (!f) return null;
      // `externalId` E `zOrder` são OBRIGATÓRIOS em PrimitiveHoveredItem (typings L3847/3851) —
      // não são opcionais. Em JS omitir não quebra, mas é o primeiro suspeito se o cursor/clique
      // falhar na Tarefa 4.
      return { externalId: f.id, zOrder: 'bottom', cursorStyle: 'pointer', hitTestPriority: 0 };
    },
    selecionar(id) { selecionado = id; pedirAtualizacao?.(); },
    destruir() { /* nada a liberar: o detached da lib cuida das refs */ },
  };
}

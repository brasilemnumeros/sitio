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

/** ISO -> segundos UNIX (UTC), que é o tempo da lib. */
export function emSegundos(iso) {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 1000);
}

/** Último índice cujo tempo é ≤ `alvo`; `null` se nem o primeiro ponto cabe. */
function ultimoAte(tempos, alvo) {
  let baixo = 0;
  let alto = tempos.length;
  while (baixo < alto) {
    const meio = (baixo + alto) >> 1;
    if (tempos[meio] <= alvo) baixo = meio + 1;
    else alto = meio;
  }
  return baixo > 0 ? baixo - 1 : null;
}

/**
 * A posição de uma data na grade de tempos do gráfico, como **índice lógico fracionário**
 * (`2.5` = metade do caminho entre o 3º e o 4º ponto). `null` quando não há grade.
 *
 * 🔴 Por que isto existe (medido em 2026-10-28): a faixa era posicionada com
 * `timeScale().timeToCoordinate(data)`, que devolve `null` quando a data **não é um ponto do
 * gráfico**. Mandatos começam no dia 1º e a Selic/IGP-M carimbam no FIM do mês — todas as faixas
 * sumiam no preset de Juros e apareciam no de Inflação: o contexto passava a depender da série.
 *
 * O primeiro conserto foi encaixar cada ponta no ponto mais próximo do dado. Era insuficiente:
 * com dado ANUAL, início do Temer (12/05/2016) virava 2017-01-01 e fim da Dilma II (31/08/2016)
 * virava 2016-01-15 — um buraco de ~1 ano que não existe no preset mensal. As faixas ficavam
 * diferentes entre presets.
 *
 * A regra agora é o CALENDÁRIO: interpola-se a data entre os pontos vizinhos, porque o eixo da
 * lib é uniforme por observação e a leitura entre barras é linear. Fora do alcance do dado a
 * posição extrapola (negativa à esquerda, maior que o último índice à direita) e quem desenha
 * recorta no pane — assim "o mandato começou antes do dado" não empurra a faixa para dentro.
 */
export function posicaoNaGrade(tempos, iso) {
  if (!tempos || tempos.length === 0) return null;
  const alvo = emSegundos(iso);
  const ultimo = tempos.length - 1;
  if (tempos.length === 1) return 0;
  if (alvo <= tempos[0]) {
    return (alvo - tempos[0]) / (tempos[1] - tempos[0]);
  }
  if (alvo >= tempos[ultimo]) {
    return ultimo + (alvo - tempos[ultimo]) / (tempos[ultimo] - tempos[ultimo - 1]);
  }
  const i = ultimoAte(tempos, alvo);
  return i + (alvo - tempos[i]) / (tempos[i + 1] - tempos[i]);
}

/**
 * Primitiva de pane das faixas de governo (§2). A lib não tem anotação nativa — este é o
 * código que passa a ser nosso para manter (ADR, "negativas").
 * Requisitos: pintar ao FUNDO (`zOrder: 'bottom'`); clique SELECIONA, não dá zoom;
 * hachura no mandato em curso, cortando no último dado disponível (§7.3.5).
 */
export function criarPrimitivaDeFaixas(mandatos, { aoClicar, ultimoDadoPorSerie, temposDoDado } = {}) {
  let chart = null;
  let pedirAtualizacao = null;
  let selecionado = null;
  // x em pixels de MÍDIA (não bitmap) — o draw multiplica pelo parâmetro de escala.
  let faixasPx = [];

  /** Coordenada de uma data, mesmo quando ela NÃO é um ponto do gráfico: interpola entre as
   * duas barras vizinhas (ver `posicaoNaGrade`). Sem grade — harness/teste — cai no caminho
   * exato de antes.
   *
   * ⚠ `logicalToCoordinate` NÃO aceita índice fracionário: `_internal_indexToCoordinate` faz
   * `if (!isInteger(index)) return 0` e devolve **0 em silêncio** (medido em 2026-10-28 — as
   * faixas sumiram, sem erro no console). Por isso a interpolação é feita aqui, entre duas
   * barras INTEIRAS. */
  function coordenadaDaData(ts, tempos, iso) {
    if (!tempos || tempos.length === 0) return ts.timeToCoordinate(iso);
    const posicao = posicaoNaGrade(tempos, iso);
    if (posicao == null) return null;
    const esquerda = Math.floor(posicao);
    const x0 = ts.logicalToCoordinate(esquerda);
    const x1 = ts.logicalToCoordinate(esquerda + 1);
    if (x0 == null || x1 == null) return null;
    return x0 + (x1 - x0) * (posicao - esquerda);
  }

  function recalcular() {
    if (!chart) return faixasPx = [];
    const ts = chart.timeScale();
    // A grade é lida a CADA recálculo: uma série adicionada depois muda os pontos do gráfico.
    const tempos = temposDoDado?.() ?? [];
    faixasPx = mandatos.map((m, i) => {
      const x1 = coordenadaDaData(ts, tempos, m.inicio);
      // O mandato em curso termina no ÚLTIMO DADO, não na data de hoje (§7.3.5).
      const fim = m.fim ?? ultimoDadoPorSerie?.(m) ?? null;
      const x2 = fim ? coordenadaDaData(ts, tempos, fim) : null;
      return { id: m.id, indice: i, x1, x2, emCurso: Boolean(m.emCurso) };
    }).filter((f) => f.x1 !== null);
  }

  const view = {
    zOrder: () => 'bottom',
    renderer: () => ({
      draw: (target) => target.useBitmapCoordinateSpace(({ context, bitmapSize, horizontalPixelRatio: r }) => {
        const larguraPane = bitmapSize.width / r;
        for (const f of faixasPx) {
          // ⚠ A posição pode EXTRAPOLAR o pane (mandato que começa antes do dado, ou em curso
          // sem último dado). Recortar aqui é o que impede um `fillRect` gigante com x negativo:
          // o desenho continua sendo "do calendário", só que cortado na borda.
          const x1 = Math.round(Math.max(0, f.x1) * r);
          const x2 = Math.round(Math.min(larguraPane, f.x2 ?? larguraPane) * r);
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
    /** A geometria das faixas na escala ATUAL (`x1`/`x2` em px de mídia). É o que o minimapa lê
     *  para saber sobre qual mandato o ponteiro caiu — o clique tem de concordar com o desenho. */
    faixasPx() { return faixasPx; },
    destruir() { /* nada a liberar: o detached da lib cuida das refs */ },
  };
}

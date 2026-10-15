### Tarefa 2: As faixas de governo (`chart/bands.js`) — o ponto de risco da fatia

**Arquivos:**
- Criar: `sitio/app/src/chart/bands.js`
- Teste: `sitio/app/src/chart/bands.test.js` (só a parte **pura**)

**Interfaces:**
- Consome: **nada de store nem de `domain/`** — a primitiva recebe o que precisa por parâmetro
  (o último dado vem do callback `ultimoDadoPorSerie`, não de importar `mandates.js`).
- Produz:
  - `faixasVisiveis(mandatos, {from, to}) -> Mandato[]` — **pura**
  - `tomDaFaixa(indice) -> string` — **pura**, alternância sutil entre vizinhos (§2)
  - `criarPrimitivaDeFaixas(mandatos, { aoClicar, ultimoDadoPorSerie }) -> IPanePrimitive`

> 🔴 **Correção de pré-voo (2026-10-14) — duas coisas erradas na versão anterior deste plano.**
>
> **1. O plano não especificava a primitiva.** Dizia só `/* guardar refs */` e chamava um
> `desenhar(target)` que não existia em lugar nenhum. Isso é a **regra que mais importa** violada:
> *campo não decidido não vira placeholder*. E logo na tarefa de maior risco.
>
> **2. O plano anexava a primitiva na SÉRIE — errado.** As faixas atravessam o gráfico inteiro,
> não pertencem a uma série. A API certa é a de **pane**: `chart.panes()[0].attachPrimitive(p)`.
> (`ISeriesPrimitive` existe também, mas é para desenho **relativo a uma série**; usá-la aqui
> faria a faixa depender de qual série estivesse por baixo.)
>
> **API conferida nos typings da 5.2.1 instalada — não é memória:**
> - `IChartApi.panes(): IPaneApi[]` · `IPaneApi.attachPrimitive(p: IPanePrimitive): void`
> - `IPanePrimitive` = `{ paneViews?(), updateAllViews?(), attached?(param), detached?(), hitTest?(x, y) }`
> - `IPanePrimitivePaneView` = `{ zOrder?(): 'bottom'|'normal'|'top', renderer(): IPrimitivePaneRenderer | null }`
> - `IPrimitivePaneRenderer.draw(target: CanvasRenderingTarget2D, utils?)`
> - O `target` traz `useBitmapCoordinateSpace(({context, mediaSize, bitmapSize, horizontalPixelRatio, verticalPixelRatio}) => …)` e `useMediaCoordinateSpace(...)`
> - `hitTest` devolve `PrimitiveHoveredItem = { distance?, hitTestPriority?, cursorStyle?, externalId?, zOrder? }`
>
> **⚠️ `useBitmapCoordinateSpace` NÃO é exportado pela `lightweight-charts`** — é método do
> `CanvasRenderingTarget2D`, que vem do `fancy-canvas`. Dentro do `draw` você o chama **no
> `target` recebido**; não importe nada de `fancy-canvas`.
>
> **Este código não tem teste de unidade** — o `vite.config.js` roda em `node`, sem DOM (§10.7),
> e a lib exige canvas. A verificação é **visual, na Tarefa 4**. É por isso que o plano dá o
> código inteiro: sem teste que pegue, o plano é a única barreira.

- [ ] **Passo 1: escrever os testes da parte pura que falham**

```js
import { faixasVisiveis, tomDaFaixa } from './bands.js';
import { PALETA_PADRAO } from '../domain/color.js';

const M = [
  { id: 'a', inicio: '1999-01-01', fim: '2002-12-31' },
  { id: 'b', inicio: '2003-01-01', fim: '2006-12-31' },
  { id: 'c', inicio: '2007-01-01', fim: null, emCurso: true },
];

describe('faixasVisiveis', () => {
  it('devolve só as faixas que TOCAM a janela', () => {
    expect(faixasVisiveis(M, { from: '2003-06-01', to: '2007-06-01' }).map((m) => m.id))
      .toEqual(['b', 'c']);
  });

  it('a faixa que começa antes e termina dentro conta como visível', () => {
    expect(faixasVisiveis(M, { from: '2002-06-01', to: '2003-06-01' }).map((m) => m.id))
      .toEqual(['a', 'b']);
  });

  it('janela sem fim (mandato em curso) vai até o infinito', () => {
    expect(faixasVisiveis(M, { from: '2008-01-01', to: null }).map((m) => m.id)).toEqual(['c']);
  });

  it('sem janela, devolve todas — é o estado inicial', () => {
    expect(faixasVisiveis(M, { from: null, to: null })).toHaveLength(3);
  });

  it('janela que não toca ninguém devolve vazio, não tudo', () => {
    expect(faixasVisiveis(M, { from: '1990-01-01', to: '1991-01-01' })).toEqual([]);
  });

  it('o limite é INCLUSIVO nas DUAS pontas — `>=` não pode virar `>`', () => {
    // Sem este caso, trocar `>=` por `>` passa despercebido: os fixtures acima têm folga e nunca
    // tocam o limite exato. Aqui a janela começa EXATAMENTE quando `x` termina.
    const J = [
      { id: 'x', inicio: '2000-01-01', fim: '2004-12-31' },
      { id: 'y', inicio: '2005-01-01', fim: '2009-12-31' },
    ];
    expect(faixasVisiveis(J, { from: '2004-12-31', to: '2005-01-01' }).map((m) => m.id))
      .toEqual(['x', 'y']);
  });
});

describe('tomDaFaixa', () => {
  it('alterna entre vizinhos e usa só DOIS tons (§2)', () => {
    expect(tomDaFaixa(0)).not.toBe(tomDaFaixa(1));
    expect(tomDaFaixa(0)).toBe(tomDaFaixa(2));
  });

  it('os tons são neutros — nenhuma cor de partido (§2, §7.3.4)', () => {
    // A regra é a AUSÊNCIA: o tom não pode coincidir com nenhuma cor da paleta das séries.
    expect(PALETA_PADRAO).not.toContain(tomDaFaixa(0));
    expect(PALETA_PADRAO).not.toContain(tomDaFaixa(1));
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA.

- [ ] **Passo 3: implementar a parte pura**

```js
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
```

- [ ] **Passo 4: implementar a primitiva (código completo — não há teste que pegue)**

```js
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
```

- [ ] **Passo 5: rodar e ver passar (as puras) → commitar**

```bash
cd sitio && git add app/src/chart/bands.js app/src/chart/bands.test.js
git commit -m "feat(chart): faixas de governo como primitiva de pane, sem cor de partido"
```

> **A verificação de verdade desta tarefa é visual, na Tarefa 4** — e é a única parte do projeto
> onde o teste de unidade não alcança. Ao revisar, conferir contra os typings instalados, não
> contra esta descrição.

> ✅ **Medido em 2026-10-14 — o espaço de coordenadas do `hitTest`, que era a única suposição em
> aberto.** Os typings só dizem *"Coordinate of mouse event"*, e se fosse **bitmap** o clique
> erraria por um fator de `devicePixelRatio`. Sonda no navegador
> (`~/.hermes/cache/scratch/probe-datas/hittest.html`) com cliques reais em posições conhecidas:
>
> | offset dentro do gráfico | `hitTest` recebeu — DPR=1 | `hitTest` recebeu — DPR=2 |
> |---|---|---|
> | 100 px | `x=99` | `x=99` |
> | 300 px | `x=299` | `x=299` |
> | 500 px | `x=499` | `x=499` |
>
> **É mídia** (CSS px relativos ao gráfico), **independente do DPR** — o mesmo espaço que
> `timeToCoordinate()` devolve, que é o que `faixasPx` guarda. `x0 >= f.x1 && x <= f.x2` está no
> espaço certo.

---


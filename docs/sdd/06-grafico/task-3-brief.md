### Tarefa 3: O adapter (`chart/adapter.js`) e o minimapa (`chart/navigator.js`)

**Arquivos:**
- Criar: `sitio/app/src/chart/adapter.js`, `sitio/app/src/chart/navigator.js`
- Teste: **não por ora** — nenhum dos dois é testável sem DOM (§10.7). A verificação é a
  montagem real, na Tarefa 4.

**Interfaces:**
- Consome: `lightweight-charts`, `./points.js` (T1), `./bands.js` (T2).
- Produz:
  - `criarAdapter(container, { aoMudarJanela }) -> Adapter`
  - `criarNavigator(container, { aoMudarJanela }) -> Navigator`
  - `Navigator = { definirFaixas(mandatos), mostrarJanela({from,to}), destruir() }`

> 🔴 **Terceira vez nesta fatia que o plano estava sub-especificado — e o padrão já é visível:**
> eu escrevo bem as partes que domino (a conversão pura, as funções de domínio) e deixo
> **placeholder** justamente nas que tocam a API de terceiro. Foi assim na T2 (a primitiva era
> `/* guardar refs */`) e era assim aqui: `definirSeries`, `destacarMandato` e `definirJanela`
> eram comentários, e o `criarNavigator` era **só a assinatura**. Código completo abaixo.

#### `chart/adapter.js`

```js
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
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.10)' },
    timeScale: { borderColor: 'rgba(255,255,255,0.10)' },
  });
  const porId = new Map();          // id -> ISeriesApi
  let primitivaDeFaixas = null;

  // A janela visível SÓ sai por aqui, e a direção é store → adapter (§8.1).
  // `subscribeVisibleTIME...`, não `...Logical...`: o range lógico são ÍNDICES de barra, e
  // convertê-los para data exigiria passar pelo array de dados. O de tempo já entrega
  // `{from, to}` em segundos — que é o que o store guarda.
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!range) return aoMudarJanela?.({ from: null, to: null });
    aoMudarJanela?.({ from: paraISO(range.from), to: paraISO(range.to) });
  });

  /** Cria, atualiza ou REUSA uma LineSeries por id. Série que sai do store é removida do gráfico. */
  function definirSeries(itens) {
    const vivos = new Set(itens.map((i) => i.id));
    for (const [id, serie] of porId) {
      if (!vivos.has(id)) { chart.removeSeries(serie); porId.delete(id); }
    }
    for (const item of itens) {
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
        });
        porId.set(item.id, serie);
      } else {
        serie.applyOptions({ color: item.cor });
      }
      serie.setData(paraPontosDaBiblioteca(item.series?.data ?? []));
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
```

#### `chart/navigator.js` — o mapa de navegação (§2)

> **O que a spec pede, literal:** *"um minimapa com o **intervalo temporal completo** e **todas as
> faixas**, sempre visível… mostra onde está a **janela visível** e permite voltar de qualquer
> zoom."* São **duas** coisas — faixas e janela. Série **não** está na lista, e num painel de 48px
> 10 linhas viram ruído. Então: **faixas + janela**, e nada de série. Se depois fizer falta o
> contorno dos dados, é aditivo.

```js
import { createChart, LineSeries } from 'lightweight-charts';
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
    definirFaixas(mandatos, dadosParaAncora = []) {
      const pane = chart.panes()[0];
      if (primitiva) pane.detachPrimitive(primitiva);

      // A âncora invisível: só existe para o gráfico ter domínio de tempo (ver acima).
      // Recebe o mesmo dado das séries do gráfico grande — é o intervalo completo que a §2 pede.
      if (!ancora) ancora = chart.addSeries(LineSeries, { visible: false });
      ancora.setData(dadosParaAncora);
      chart.timeScale().fitContent();

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
      const ts = chart.timeScale();
      // ⚠ `timeToCoordinate` quer SEGUNDOS UNIX, não a string ISO que o store guarda.
      const seg = (iso) => (iso ? Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000) : null);
      janela = {
        de: from, ate: to,
        from: seg(from) == null ? null : ts.timeToCoordinate(seg(from)),
        to: seg(to) == null ? null : ts.timeToCoordinate(seg(to)),
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
```

- [ ] **Passo 1:** implementar os dois arquivos acima.
- [ ] **Passo 2:** conferir contra os typings instalados **antes** de codar
      (`node_modules/lightweight-charts/dist/typings.d.ts`) — em especial `panes()`,
      `attachPrimitive/detachPrimitive`, `subscribeVisibleLogicalRangeChange`,
      `setVisibleRange`, `timeToCoordinate`, `coordinateToTime`, `removeSeries`.
      ⚠️ **Este é o plano mais fraco da fatia, e você é o filtro dele.** Escrevi esta T3 sem
      poder rodar nada — e na primeira versão **inventei duas APIs** (`semRotulo`, `atualizar`)
      e **usei `LogicalRange` onde o certo era `TimeRange`** (índices de barra ≠ segundos). O
      controlador corrigiu os três contra os typings, mas é o tipo de erro que só aparece na
      tela. **Se algo aqui não casar com o código real, PARE e me diga** — não contorne.
- [ ] **Passo 3:** a montagem real é verificada na **Tarefa 4**. Não inventar teste de DOM.

---


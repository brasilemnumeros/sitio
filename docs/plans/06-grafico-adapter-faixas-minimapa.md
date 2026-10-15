# Fatia 06 — O gráfico: adapter, faixas de governo e minimapa (§2, §8.1)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a única camada que conhece a Lightweight Charts. Desenha as séries, pinta
as faixas de governo por um `ISeriesPrimitive` customizado, mostra o minimapa e devolve a
janela visível ao store `viewport` por callback explícito.

**Arquitetura:** `src/chart/` é camada 4 — `components/` → `stores/` → `domain/` →
**`chart/` + `data/`** → estático (§8). **Só `Chart.svelte` fala com `chart/adapter`**
(§8.1, regra 2); trocar de biblioteca é mexer numa pasta.

**Stack:** `lightweight-charts` v5.x (Apache-2.0, ESM) + Svelte 5.

**Spec:** `...design.md` §2, §3, §8, §8.1, §7.3.5 · **ADR:** D3

## ✅ Portão de prontidão — RESOLVIDO em 2026-10-14

A **§12.2 foi fechada por medição** (Tarefa 0, abaixo). O resultado muda o desenho: a
Lightweight Charts até desenha e desconflita os 10 títulos, mas no pior caso a pilha de rótulos
ocupa **80% da altura da área de plot**, com caixas sobrepostas em 3 de 4 cenários e um rótulo
que não é desenhado. **Portanto: a ponta da linha vai SEM `title`.** O canal redundante é a
**legenda fora do gráfico** mais o rótulo sobre o crosshair.

⚠️ **A legenda é da fatia 07 (o shell), não desta.** A fatia 06 fica responsável por **não**
passar `title` às séries e por manter `lastValueVisible` — nada além disso.

## Restrições globais

- **Clique na faixa SELECIONA, não dá zoom.** O viewport não se move. Zoom é arraste,
  scroll e duplo-clique — gesto separado e explícito (§2).
- **Faixas sem cor de partido**: alternância sutil de tom entre mandatos vizinhos, e o
  rótulo traz **governo e sigla** (`Lula III · PT`). Texto, não cor (§2, §7.3.4).
- **Hachura diagonal** no mandato em curso, **cortando no último dado disponível** — não
  na data de hoje (§7.3.5).
- **As faixas não recortam nem filtram a série** (§2).
- **O gráfico é espelho do store, não dono do estado** (§8.1): store → adapter; a janela
  visível volta por **callback explícito**.
- Só `chart/` importa `lightweight-charts` (§8, regra 1); só `Chart.svelte` fala com
  `chart/adapter` (§8, regra 2).

---

### Tarefa 0: A medição dos rótulos na ponta das linhas (fecha a §12.2) — ✅ FEITA 2026-10-14

**Feita fora do repo:** o spike foi montado em `~/.hermes/cache/scratch/spike06/` (servido por
`python3 -m http.server`), **não** em `sitio/app/spikes/` — assim não há risco de entrar num
`git add`. Nada a apagar no repo. O que sobrevive é o texto da §12.2.

**Resultado (medido, lightweight-charts 5.2.1, plot de 392px):** a lib desenha o título de
**todas** as 10 séries e **desconflita** num passo de ~15,5px — mas no pior caso realista a pilha
ocupa **80% da área de plot** (314px de 392), em um cenário um rótulo **some** e em 3 de 4 há
caixas ainda sobrepostas. **Decisão: a ponta da linha NÃO é o canal redundante** — a legenda vai
**fora do gráfico**, com o rótulo sobre o crosshair como reforço; a ponta fica sem `title`.

**Consequência para a FATIA 07 (o shell)** — e não para a Tarefa 3 desta fatia, que é o
minimapa: ela precisa de uma **legenda externa** (10 linhas: cor + nome, quebrando em linhas).
É o que a §1 chama de canal redundante de identificação. **Esta fatia não desenha a legenda** —
só cumpre a parte dela, que é **não** dar `title` às séries e manter `lastValueVisible`.

**Interfaces:**
- Consome: `PALETA_PADRAO` (fatia 04) e 10 séries sintéticas.
- Produz: uma decisão escrita sobre o que fazer quando os rótulos colidem.

- [x] **Passo 1: montar a página de medição** — 4 cenários (A escalas misturadas, B só %,
      C pior caso realista, D todas no mesmo valor). Medição por dois caminhos independentes:
      `series.priceToCoordinate()` para a posição natural, e **análise de pixel** do canvas
      (`PIL`) para a posição renderizada.
- [x] **Passo 2: medir e decidir** — registrado na §12.2 com a tabela medida. A opção escolhida
      não é (a) nem (b) nem (c) isoladas: é **(c) legenda externa como canal principal + (a)
      rótulo no crosshair como reforço**. A (b) — anti-colisão na ponta — é justamente o que a
      lib já faz de fábrica, e a medição mostra que ela custa 80% da altura no pior caso.
- [x] **Passo 3: apagar o spike** — não foi criado no repo (ver acima); nada a apagar.

---

### Tarefa 1: A conversão pura (`chart/points.js`) — e a dependência

**Arquivos:**
- Criar: `sitio/app/src/chart/points.js`
- Teste: `sitio/app/src/chart/points.test.js`

**Interfaces:**
- Consome: nada (pura).
- Produz:
  - `paraPontosDaBiblioteca(data) -> {time, value}[]` — de `{date, value}` (a forma canônica,
    `validate.js`) para o tempo da lib, em **segundos UNIX UTC**, **ordenado por tempo**.
  - `paraISO(segundos) -> 'YYYY-MM-DD'` — o caminho de volta, para o callback da janela.

> 🔴 **Por que esta tarefa existe separada (correção de pré-voo, 2026-10-14).** A versão anterior
> deste plano punha a conversão **dentro** do `adapter.js` e o teste importava de lá. Só que o
> adapter importa `lightweight-charts` **e** `./bands.js` — e o `bands.js` só nasce na Tarefa 2.
> Resultado: a Tarefa 1 **não passaria no próprio teste** (módulo inexistente). Além disso, a
> conversão é a **única parte do gráfico testável sem DOM** (§10.7) — ela merece viver sozinha,
> sem arrastar a biblioteca para o teste.

- [ ] **Passo 0: a dependência**

`lightweight-charts` **não estava** no `app/package.json` (ela só é necessária de verdade a
partir da Tarefa 3, mas instalar aqui evita surpresa). É dependência de **runtime**:

```bash
cd sitio/app && NODE_ENV=development npm install lightweight-charts@^5.2.0
```

⚠️ **`NODE_ENV=development` é obrigatório** nesta máquina (R11). Conferido no pré-voo: resolve
para **5.2.1**, e `createChart`/`LineSeries`/`LineStyle`/`ISeriesPrimitive` existem nessa versão.

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/chart/points.test.js`:

```js
import { paraPontosDaBiblioteca, paraISO } from './points.js';

describe('paraPontosDaBiblioteca', () => {
  it('converte {date, value} para o tempo da lib (segundos UNIX UTC)', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-03-01', value: 42 },
      { date: '2004-04-01', value: 43 },
    ]);
    expect(pontos).toEqual([
      { time: 1078099200, value: 42 },
      { time: 1080777600, value: 43 },
    ]);
  });

  it('ordena por tempo — determinismo nosso, não exigência da lib', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-04-01', value: 43 },
      { date: '2004-03-01', value: 42 },
    ]);
    expect(pontos.map((p) => p.value)).toEqual([42, 43]);
  });

  it('corta a data em 10 caracteres — o dado é diário, não horário', () => {
    // O caminho publicado já teve data com hora; sem o corte, o fuso desloca o ponto de dia.
    const [p] = paraPontosDaBiblioteca([{ date: '2004-03-01T23:00:00-03:00', value: 1 }]);
    expect(p.time).toBe(1078099200);
  });

  it('série vazia devolve lista vazia, não quebra', () => {
    expect(paraPontosDaBiblioteca([])).toEqual([]);
  });
});

describe('paraISO', () => {
  it('volta de segundos UNIX para YYYY-MM-DD', () => {
    expect(paraISO(1078099200)).toBe('2004-03-01');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA (`Cannot find module './points.js'`).

- [ ] **Passo 3: implementar**

`sitio/app/src/chart/points.js`:

```js
/** Pura: {date,value} -> {time,value} no formato da lib, ordenado por tempo.
 * O tempo da lib é em SEGUNDOS UNIX UTC. O corte em 10 caracteres não é cosmético: o dado
 * já veio com hora em algum arquivo, e sem ele o fuso desloca o ponto de dia. */
export function paraPontosDaBiblioteca(data) {
  // Medido em 2026-10-14 (sonda no navegador, lightweight-charts 5.2.1): a lib **aceita**
  // tanto fora de ordem quanto `time` repetido — não lança, e guarda todos os pontos. O `sort`
  // é nosso, para o resultado não depender da ordem de chegada do arquivo, não uma exigência
  // dela. `.map` antes do `.sort` para não mutar a entrada.
  return data
    .map(({ date, value }) => ({
      time: Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000),
      value,
    }))
    .sort((a, b) => a.time - b.time);
}

/** O caminho de volta, para o callback da janela visível (§8.1). */
export function paraISO(segundos) {
  return new Date(segundos * 1000).toISOString().slice(0, 10);
}
```

- [ ] **Passo 4: rodar e ver passar.**

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/chart/points.js app/src/chart/points.test.js app/package.json app/package-lock.json
git commit -m "feat(chart): conversao pura para o formato da lib, testada sem DOM"
```

---

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
          if (largura > 70 * r) {
            context.save();
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

---

### Tarefa 3: O adapter (`chart/adapter.js`) e o minimapa (`chart/navigator.js`)

**Arquivos:**
- Criar: `sitio/app/src/chart/adapter.js`, `sitio/app/src/chart/navigator.js`
- Teste: **não por ora** — nenhum dos dois é testável sem DOM (§10.7). A verificação é a
  montagem real, na Tarefa 4 e na fatia 07.

**Por que os dois juntos:** o adapter é a única camada que conhece a lib (§8, regra 1) e o
minimapa é uma segunda instância dela. Separá-los em duas tarefas só criaria uma dependência
de import entre tarefas — o defeito que o pré-voo acabou de corrigir na Tarefa 1.

**Interfaces:**
- Consome: `lightweight-charts`, `./points.js` (Tarefa 1), `./bands.js` (Tarefa 2).
- Produz:
  - `criarAdapter(container, { aoMudarJanela }) -> Adapter`, com
    `Adapter = { definirSeries(itens), definirFaixas(mandatos), destacarMandato(id),
    definirJanela({from,to}), resetarJanela(), destruir() }`.
  - `criarNavigator(container, { intervalo, faixas, aoMudarJanela }) -> { atualizar(janela), destruir() }`

```js
import { createChart, LineSeries } from 'lightweight-charts';
import { paraPontosDaBiblioteca, paraISO } from './points.js';
import { criarPrimitivaDeFaixas } from './bands.js';

export function criarAdapter(container, { aoMudarJanela }) {
  const chart = createChart(container, {
    layout: { background: { color: '#0e1117' }, textColor: '#c9d1d9' },
    // tema escuro por decisão (D4); a medição da paleta vale para este fundo (§1)
  });
  const porId = new Map();
  let primitivaDeFaixas = null;

  // A janela visível SÓ sai por aqui, e a direção é store -> adapter (§8.1).
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!range) return aoMudarJanela({ from: null, to: null });
    aoMudarJanela({ from: paraISO(range.from), to: paraISO(range.to) });
  });

  return {
    definirSeries(itens) {
      // cria/atualiza/reusa UMA LineSeries por id, com a cor do item.
      // ⚠ NÃO passar `title` — a decisão da §12.2 é que a ponta vai sem rótulo
      //   (`lastValueVisible` fica ligado: o número do último valor é informação).
    },
    definirFaixas(mandatos) {
      // ⚠ Anexa no PANE, não na série: as faixas atravessam o gráfico inteiro e não pertencem
      // a nenhuma série. `series.attachPrimitive` faria a faixa depender de qual série está por
      // baixo — e a lib ainda oferece as duas APIs, então é fácil escolher a errada.
      if (primitivaDeFaixas) chart.panes()[0].detachPrimitive(primitivaDeFaixas);
      primitivaDeFaixas = criarPrimitivaDeFaixas(mandatos, {
        aoClicar: (id) => destacarMandato(id),
        ultimoDadoPorSerie: (m) => ultimoDadoDaSerieEm(m),
      });
      chart.panes()[0].attachPrimitive(primitivaDeFaixas);
    },
    destacarMandato(id) { /* repinta a faixa clicada e esmaece as outras (§2) */ },
    definirJanela({ from, to }) { /* chart.timeScale().setVisibleRange(...) */ },
    resetarJanela() { chart.timeScale().fitContent(); },
    destruir() {
      if (primitivaDeFaixas) chart.panes()[0].detachPrimitive(primitivaDeFaixas);
      primitivaDeFaixas = null;
      chart.remove();
      porId.clear();
    },
  };
}
```

> **A API confere com a 5.2.1 instalada** (conferido no pré-voo, não é suposição):
> `createChart` e `LineStyle` são funções/enums exportados; `LineSeries` é um **objeto
> `SeriesDefinition`** (`{ type: 'Line', isBuiltIn: true, defaultOptions }`) usado em
> `chart.addSeries(LineSeries, options)` — **não** existe mais `chart.addLineSeries(...)`.
> `ISeriesPrimitive` existe e é o parâmetro de `ISeriesApi.attachPrimitive`.

O minimapa mostra o **intervalo temporal completo e todas as faixas** e é o que torna o
clique-destaca seguro: sem ele, ao dar zoom o usuário perde a referência do todo (§2).

- [ ] **Passo 1:** implementar `adapter.js` (acima) e `navigator.js`.
- [ ] **Passo 2:** conferir contra os typings instalados **antes** de codar —
      `node_modules/lightweight-charts/dist/typings.d.ts`. O plano dá a forma, não substitui a
      leitura dos tipos: o gráfico é a única camada que depende de uma biblioteca de terceiro, e
      é onde o teste de unidade **não** alcança.
- [ ] **Passo 3:** a montagem real é verificada na **Tarefa 4** (e na fatia 07). Não inventar
      teste de DOM — o `vite.config.js` roda em `node` (§10.7).

```bash
cd sitio && git add app/src/chart/navigator.js app/src/chart/navigator.test.js
git commit -m "feat(chart): minimapa com o intervalo completo"
```

---

### Tarefa 4: `components/Chart.svelte` — o único que fala com o adapter

**Arquivos:**
- Criar: `sitio/app/src/components/Chart.svelte`

**Interfaces:**
- Consome: `criarAdapter`, `criarNavigator`, `seriesStore`, `mandateStore`, `viewportStore`.
- Produz: o componente que **liga store → adapter** e **adapter → store** (§8.1).

- [ ] **Passo 1: escrever o componente**

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { criarAdapter } from '../chart/adapter.js';
  import { seriesStore } from '../stores/series.js';
  import { mandateStore } from '../stores/mandate.js';
  import { viewportStore, definirJanela } from '../stores/viewport.js';

  let container;

  onMount(() => {
    // A ÚNICA direção é store -> adapter; o retorno é o callback explícito (§8.1).
    const adapter = criarAdapter(container, { aoMudarJanela: (j) => definirJanela(j) });
    const pararSeries = seriesStore.subscribe(({ itens }) =>
      adapter.definirSeries(itens.filter((i) => i.status === 'ok')),
    );
    const pararMandatos = mandateStore.subscribe(({ mandatos }) => adapter.definirFaixas(mandatos));
    return () => {
      pararSeries();
      pararMandatos();
      adapter.destruir();
    };
  });
</script>

<div bind:this={container} class="h-[480px] w-full" data-testid="grafico"></div>
```

- [ ] **Passo 2: verificar o encaixe de verdade**

Run: `cd sitio/app && npm run dev` — com dados de mentira (fatia 10 liga o dado real),

**Esperado:** o gráfico monta, as 10 séries aparecem, as faixas pintam ao fundo, o
clique numa faixa destaca sem mexer no zoom, arrastar/scroll dão zoom, e o minimapa volta
ao intervalo completo. **Sem nenhum estado em `window`.**

- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/Chart.svelte
git commit -m "feat(chart): Chart.svelte liga store e adapter na direcao unica"
```

---

## Critérios de aceite da fatia 06

- [x] A **§12.2 está fechada** na spec (2026-10-14): a colisão dos rótulos foi **medida com 10 séries**
      (tabela de 4 cenários), e a decisão é legenda externa + rótulo no crosshair, **sem** `title`
      na ponta. A **fatia 07** precisa da legenda externa.
- [ ] **A conversão pura está testada sem DOM** (`points.test.js`): segundos UNIX UTC, ordem
      por tempo, corte da data em 10 caracteres, e série vazia devolvendo lista vazia.
- [ ] **Datas duplicadas no dado publicado** (medido em 2026-10-14: `caged` 3×, `mvgr-nominal`
      e `mvgr-real` 2×, `pib-real-anual` 2×) **não quebram o gráfico** — a lib aceita e desenha
      um segmento vertical no mesmo x. É problema de **dado**, não de conversão: vai para a
      **fatia 11**. A sonda provou que não lança.
- [ ] **Nenhuma série recebe `title`** (§12.2) e `lastValueVisible` segue ligado — conferido no
      código do adapter, não por impressão.
- [ ] `grep -rn "lightweight-charts" app/src` → só em `app/src/chart/` (§8, regra 1).
- [ ] `grep -rn "chart/adapter" app/src/components` → só `Chart.svelte` (§8, regra 2).
- [ ] **Clique na faixa não move o viewport** — conferido ao vivo, não por inspeção.
- [ ] Faixas **sem nenhuma cor de partido**; rótulo com `governo · SIGLA` (§2).
- [ ] Hachura no mandato em curso, **cortando no último dado** e não na data de hoje.
- [ ] Arrastar/scroll/duplo-clique dão zoom; o minimapa mantém a referência do todo.
- [ ] `grep -rn "window\." app/src/chart app/src/components/Chart.svelte` → sem resultado.
- [ ] Testes puros (`paraPontosDaBiblioteca`, `paraISO`, `faixasVisiveis`, `tomDaFaixa`) passam
      em node, sem DOM.

## Auto-revisão

- **Cobertura da spec:** §2 (clique seleciona, zoom separado, minimapa, faixas sem cor,
  hachura) → tarefas 1–4; §8/§8.1 (só `chart/` importa a lib, só `Chart.svelte` fala com
  o adapter, store → adapter) → tarefas 1 e 4; §7.3.5 (hachura cortando no último dado)
  → tarefa 2; §3 (o trilho é seletor **desacoplado** do eixo — não é régua) fica para a
  fatia 09.
- **Portão respeitado:** a tarefa 0 fecha a §12.2 **antes** de qualquer código de produção.
  Os **logos dos partidos** (§12.3) entram na fatia 09 (trilho e ficha), não aqui — o
  gráfico não os comporta (§2: ~27 px em 515).
- **Placeholder declarado:** o interior dos métodos do adapter é **esqueleto comentado**
  por natureza — a API da lib **deve** ser lida nos typings da versão instalada antes de
  codar. Os timestamps do teste (`1078099200`, `1080777600`) foram conferidos por cálculo.
- **Consistência de nomes:** `criarAdapter`, `paraPontosDaBiblioteca`, `criarPrimitivaDeFaixas`,
  `faixasVisiveis`, `tomDaFaixa`, `criarNavigator` — consumidos por `Chart.svelte` (aqui) e
  pela fatia 07.

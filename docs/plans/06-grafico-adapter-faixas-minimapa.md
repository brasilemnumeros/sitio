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
      `attachPrimitive/detachPrimitive`, `subscribeVisibleTIME RangeChange` (**não** a `Logical`),
      `setVisibleRange`, `getVisibleRange`, `timeToCoordinate`, `coordinateToTime`, `removeSeries`,
      e `addSeries(LineSeries, { visible: false })`.
      ⚠️ **Este é o plano mais fraco da fatia, e você é o filtro dele.** Escrevi esta T3 sem
      poder rodar nada — e na primeira versão **inventei duas APIs** (`semRotulo`, `atualizar`)
      e **usei `LogicalRange` onde o certo era `TimeRange`** (índices de barra ≠ segundos). O
      controlador corrigiu os três contra os typings, mas é o tipo de erro que só aparece na
      tela. **Se algo aqui não casar com o código real, PARE e me diga** — não contorne.
- [ ] **Passo 3:** a montagem real é verificada na **Tarefa 4**. Não inventar teste de DOM.

---

### Tarefa 4: `components/Chart.svelte` — e a prova visual

**Arquivos:**
- Criar: `sitio/app/src/components/Chart.svelte`
- Criar (temporário, **não versionar**): `sitio/app/dev-harness.html`

> 🔴 **Quarto plano sub-especificado desta fatia.** A versão anterior deste passo tinha quatro
> furos: não usava o **minimapa** (a T3 inteira ficaria órfã), **não carregava os mandatos** (sem
> faixas), tinha dois imports mortos, e — o mais sério — **só ligava adapter → store**. A §8.1
> exige as **duas** direções: a store é a dona do estado, então quando ela muda o adapter tem de
> reagir. Sem isso, mover a janela pelo minimapa não chegaria ao gráfico grande.

#### O componente

```svelte
<script>
  import { onMount } from 'svelte';
  import { criarAdapter } from '../chart/adapter.js';
  import { criarNavigator } from '../chart/navigator.js';
  import { seriesStore } from '../stores/series.js';
  import { mandateStore, carregarMandatos } from '../stores/mandate.js';
  import { viewportStore, definirJanela } from '../stores/viewport.js';

  let container;
  let containerMini;

  onMount(() => {
    // adapter → store: o callback EXPLÍCITO (§8.1). O gráfico não é dono do estado.
    const adapter = criarAdapter(container, { aoMudarJanela: (j) => definirJanela(j) });
    const navigator = criarNavigator(containerMini, {
      // Arrastar no minimapa muda a janela — e a mudança entra pelo MESMO caminho (a store).
      aoMudarJanela: (j) => definirJanela(j),
    });

    // store → adapter: a direção que faltava. O adapter é espelho, não dono.
    const pararSeries = seriesStore.subscribe(({ itens }) => {
      const ok = itens.filter((i) => i.status === 'ok');
      adapter.definirSeries(ok);
      // O minimapa precisa do mesmo dado — é a âncora que dá domínio de tempo a ele.
      navigator.definirFaixas($mandateStore.mandatos, ok.flatMap((i) => i.series?.data ?? []));
    });
    const pararMandatos = mandateStore.subscribe(({ mandatos }) =>
      adapter.definirFaixas(mandatos),
    );
    // A janela volta para o gráfico quando a store muda — inclusive quando quem mudou foi o minimapa.
    const pararJanela = viewportStore.subscribe((j) => adapter.definirJanela(j));

    // O mandato é contexto: se os governos não vierem, o gráfico segue (§9.3).
    carregarMandatos();

    return () => {
      pararSeries(); pararMandatos(); pararJanela();
      navigator.destruir();
      adapter.destruir();
    };
  });
</script>

<div bind:this={container} class="h-[480px] w-full" data-testid="grafico"></div>
<div bind:this={containerMini} class="mt-2 h-[48px] w-full" data-testid="minimapa"></div>
```

> ⚠️ **A âncora do minimapa precisa do dado cru (`data`), não dos pontos convertidos** — ela é
> uma série da lib, então `setData` espera o formato dela. O `navigator.definirFaixas` recebe as
> duas coisas: os mandatos e os dados para a âncora.

#### Passo A: a prova visual (o ponto da fatia)

O gráfico é a única parte do projeto **sem teste de unidade** — a lib exige canvas e o
`vite.config.js` roda em `node` (§10.7). Então a verificação é uma **tela de verdade**. Crie
`sitio/app/dev-harness.html` (temporário):

```html
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Gráfico — verificação</title>
<style>body{background:#0e1117;margin:0;padding:12px;font:13px system-ui;color:#d1d4dc}</style></head>
<body><div id="app"></div><script type="module" src="/src/dev-harness.js"></script></body></html>
```

E `src/dev-harness.js`, que monta o `Chart.svelte` com **10 séries de mentira + os 9 mandatos** —
incluindo **duas séries com escalas muito diferentes** (para o eixo duplo) e **um mandato em
curso** (para a hachura):

```js
import { mount } from 'svelte';
import Chart from './components/Chart.svelte';
import { adicionarSerie, limparSeries } from './stores/series.js';

// ⚠ Dado SINTÉTICO e descartável. A fatia 10 liga o dado real; aqui queremos ver o desenho.
const MANDATOS = [
  { id: 'fhc-2', rotulo: 'FHC II', partido: 'PSDB', inicio: '1999-01-01', fim: '2002-12-31' },
  { id: 'lula-1', rotulo: 'Lula I', partido: 'PT', inicio: '2003-01-01', fim: '2006-12-31' },
  // … até o Lula III, que é o EM CURSO (é ele que hachura)
  { id: 'lula-3', rotulo: 'Lula III', partido: 'PT', inicio: '2023-01-01', fim: null, emCurso: true },
];
```

- [ ] **Passo 1:** montar o harness com **10 séries**, escolhendo de propósito:
  - **8 séries de % (0–50)** — o caso comum;
  - **1 em R$ milhares** — escala distinta, força o eixo da direita;
  - **1 em milhões** — escala ilegível junto, para ver o aviso;
  - o **último mandato com `emCurso: true`** — sem a flag, a hachura não sai (é o defeito mais
    fácil de não notar).

- [ ] **Passo 2: olhar a tela e responder, com captura de tela:**
  1. As **10 séries** desenham, cada uma na cor da paleta?
  2. **Nenhuma** tem rótulo na ponta (§12.2) e **todas** têm o número do último valor?
  3. As **faixas de governo** pintam ao fundo, com o rótulo `Governo · SIGLA`?
  4. A faixa do **Lula III tem hachura**, e ela corta no **último dado** — não na borda direita?
  5. **Clicar** numa faixa destaca **sem mexer no zoom**? (conferir o `getVisibleRange()` antes e depois)
  6. O **minimapa** mostra as faixas e a **janela**; arrastar nele move o gráfico grande?
  7. **Nada em `window`**: `Object.keys(window).filter(k => /chart|grafic|adapter/i.test(k))` → vazio.

- [ ] **Passo 3: apagar o harness** — `rm sitio/app/dev-harness.html sitio/app/src/dev-harness.js`.
  *Mockup não é documentação*: o que sobrevive são as capturas no relatório e os critérios abaixo.

- [ ] **Passo 4: commitar**

```bash
cd sitio && git add app/src/components/Chart.svelte
git commit -m "feat(chart): Chart.svelte liga store e adapter nas duas direcoes, com o minimapa"
```

> **Este passo é o único que prova o desenho.** Se algo aqui não bater, **pare e me diga** — é
> exatamente o tipo de problema que nenhum teste verde pega.

---

### Tarefa 5: O eixo duplo (`adapter.js`) — o buraco entre duas fatias

**Arquivos:**
- Modificar: `sitio/app/src/chart/adapter.js` e `sitio/app/src/components/Chart.svelte`

> 🔴 **Achado da prova visual da T4 (2026-10-14), e é o mais grave da fatia.** Com 10 séries nas
> escalas reais, **9 ficam esmagadas num amontoado ilegível no fundo** e os rótulos de valor
> colidem na borda — a captura `01-montado.png` mostra isso sem ambiguidade. Motivo: **o eixo
> duplo nunca foi implementado por ninguém.**
>
> - A **fatia 05** calcula *onde* cada série deve ficar (`axesStore.atribuicao`, com a régua de
>   amplitude da §5) — e ninguém lê o resultado.
> - A **fatia 06** desenha tudo com `priceScaleId` padrão (um eixo só).
> - O **critério de aceite** desta fatia não cobrava o eixo. O plano mencionava "eixo da direita"
>   de passagem, num comentário do harness, e nunca virou passo.
>
> É o mesmo padrão do "a legenda não era de ninguém" (pré-voo da T1): uma promessa da §5 que cai
> **entre** duas fatias. A diferença é que a legenda eu peguei lendo; esta só apareceu **na tela**.

- [ ] **Passo 1: o adapter passa a honrar a atribuição de eixo**

`adapter.js` — em `definirSeries`, aceitar a atribuição e aplicá-la:

```js
  /** `atribuicao` vem do `axesStore` (fatia 05) — o ADAPTER não decide eixo, só obedece (§8.1). */
  function definirSeries(itens, atribuicao = {}) {
    // … o de sempre …
      const eixo = atribuicao[item.id] === 'left' ? 'left' : 'right';
      if (!serie) {
        serie = chart.addSeries(LineSeries, {
          color: item.cor,
          priceScaleId: eixo,        // ← o que faltava
          title: '', lastValueVisible: true, priceLineVisible: false, lineWidth: 2,
        });
        porId.set(item.id, serie);
      } else {
        serie.applyOptions({ color: item.cor, priceScaleId: eixo });
      }
    // …
  }
```

E o gráfico precisa saber que existem **dois** eixos visíveis:

```js
  const chart = createChart(container, {
    // …
    leftPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
    rightPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
  });
```

- [ ] **Passo 2: o componente liga o `axesStore`**

`Chart.svelte` — a terceira assinatura (a atribuição **também** é store → adapter):

```js
  import { axesStore, recalcularEixos } from '../stores/axes.js';
  // …
  const pararEixos = axesStore.subscribe(({ atribuicao }) => {
    adapter.definirSeries(seriesStoreItens(), atribuicao);   // reaproveita o caminho de séries
  });
```

> ⚠️ **A ordem importa:** o eixo é derivado das séries, então `recalcularEixos(seriesOk)` roda
> **depois** de as séries ficarem `ok`, e antes de o adapter desenhar. Se você virar isso, o
> eixo fica um passo atrás. **Se a mecânica do store não permitir essa ordem, PARE e me diga** —
> a saída pode ser o componente compor os dois, e isso é decisão de arquitetura, não de código.

- [ ] **Passo 3: provar na tela (a mesma prova da T4)**

Refazer o harness com 10 séries nas escalas reais e conferir, **na captura**:
1. As séries de % ficam **legíveis** num eixo, e as de R$/milhões no outro?
2. Os **dois eixos** aparecem, um de cada lado?
3. O **aviso de escala** da §5 aparece quando o par é incompatível — e a série **continua** no
   gráfico (informa, não bloqueia)?
4. Trocar o eixo pela **legenda** (fatia 07) muda o desenho? *(Se a legenda ainda não existe,
   registrar como pendência — não inventar.)*

- [ ] **Passo 4: commitar**

```bash
cd sitio && git add app/src/chart/adapter.js app/src/components/Chart.svelte
git commit -m "feat(chart): o adapter honra a atribuicao de eixo do store (§5)"
```

---

## Critérios de aceite da fatia 06

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
- [ ] Arrastar/scroll dão zoom; **duplo-clique também** (a T4 mediu que não dava); o minimapa
      mantém a referência do todo.
- [ ] **O eixo duplo funciona** (§5, Tarefa 5): as séries vão para o lado que o `axesStore`
      mandou, **os dois eixos aparecem**, e as séries de % ficam **legíveis** na captura — não
      esmagadas no fundo. Medido: sem isto, 9 de 10 séries ficam ilegíveis.
- [ ] **A janela inicial é o intervalo COMPLETO**, não o padrão da lib (a T4 mediu que vinha
      2007–2024). As faixas e o eixo têm de concordar sobre o domínio.
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

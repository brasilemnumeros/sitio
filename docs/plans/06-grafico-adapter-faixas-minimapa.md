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

## 🚧 Portão de prontidão — não comece sem isto

A §12.2 está **aberta**: *"com 10 séries os rótulos podem colidir. Verificar como a
Lightweight Charts trata o título de série no eixo de preço com 10 séries simultâneas e
decidir o que fazer se colidirem."* É o item que **sustenta o canal redundante de
identificação** — sem ele, a paleta medida perde a rede de segurança dela.

**Tarefa 0 existe para fechar isso antes de qualquer código de produção.** Não pular.

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

**Consequência para a Tarefa 3 (o shell):** precisa de uma **legenda externa** (10 linhas: cor +
nome). É o que a §1 chama de canal redundante de identificação.

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

### Tarefa 1: O adapter (`chart/adapter.js`)

**Arquivos:**
- Criar: `sitio/app/src/chart/adapter.js`
- Teste: `sitio/app/src/chart/adapter.test.js`

**Interfaces:**
- Consome: `lightweight-charts` (único import permitido, §8).
- Produz — uma fábrica **sem estado global**:
  - `criarAdapter(container, { aoMudarJanela }) -> Adapter`
  - `Adapter = { definirSeries(itens), definirFaixas(mandatos), destacarMandato(id),
    definirJanela({from,to}), resetarJanela(), destruir() }`
  - `aoMudarJanela({from, to})` — **callback explícito** para o store `viewport` (§8.1).

**Teste em `node` sem DOM:** o adapter não é testável sem navegador; a fatia 06 **não**
tem teste de unidade (coerente com §10.7 — "componente Svelte: não por ora"). O que se
testa aqui é a **única parte pura**: a conversão de `Series` para o formato de dados da
lib.

- [ ] **Passo 1: escrever o teste da parte pura que falha**

`sitio/app/src/chart/adapter.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { paraPontosDaBiblioteca } from './adapter.js';

describe('paraPontosDaBiblioteca', () => {
  it('converte {date, value} para o tempo da lib (segundos UNIX)', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-03-01', value: 42 },
      { date: '2004-04-01', value: 43 },
    ]);
    expect(pontos).toEqual([
      { time: 1078099200, value: 42 },
      { time: 1080777600, value: 43 },
    ]);
  });

  it('ordena por tempo — a lib exige série ordenada', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-04-01', value: 43 },
      { date: '2004-03-01', value: 42 },
    ]);
    expect(pontos.map((p) => p.value)).toEqual([42, 43]);
  });
});
```

> **Confirmar os timestamps.** Os segundos acima são o resultado esperado de
> `Date.parse('2004-03-01T00:00:00Z')/1000`. **Rodar e conferir** — se divergirem, o
> esperado é o que a implementação produzir em UTC, e o teste fixa isso.

- [ ] **Passo 2: rodar e ver falhar** → FALHA.

- [ ] **Passo 3: implementar o adapter**

`sitio/app/src/chart/adapter.js` — estrutura:

```js
import { createChart, LineSeries, LineStyle } from 'lightweight-charts';
import { criarPrimitivaDeFaixas } from './bands.js';

/** Pura: {date,value} -> {time,value} no formato da lib, ordenado por tempo. */
export function paraPontosDaBiblioteca(data) {
  return data
    .map(({ date, value }) => ({ time: Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000), value }))
    .sort((a, b) => a.time - b.time);
}

/**
 * Monta o gráfico numa função — nunca em singleton de módulo (§8, nada em window).
 * @param {HTMLElement} container
 * @param {{aoMudarJanela: (w:{from:string|null,to:string|null}) => void}} opcoes
 */
export function criarAdapter(container, { aoMudarJanela }) {
  const chart = createChart(container, {
    layout: { background: { color: '#0e1117' }, textColor: '#c9d1d9' },
    // tema escuro por decisão (D4); a medição de paleta vale para este fundo (§1)
  });
  const porId = new Map();

  // A janela visível SÓ sai por aqui, e a direção é store -> adapter (§8.1).
  chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!range) return aoMudarJanela({ from: null, to: null });
    aoMudarJanela({ from: paraISO(range.from), to: paraISO(range.to) });
  });

  return {
    definirSeries(itens) { /* cria/atualiza/reusa uma LineSeries por id, com a cor do item */ },
    definirFaixas(mandatos) { /* anexa criarPrimitivaDeFaixas(...) na série de referência */ },
    destacarMandato(id) { /* repinta a faixa clicada e esmaece as outras (§2) */ },
    definirJanela({ from, to }) { /* chart.timeScale().setVisibleRange(...) */ },
    resetarJanela() { chart.timeScale().fitContent(); },
    destruir() { chart.remove(); porId.clear(); },
  };
}

const paraISO = (t) => new Date(t * 1000).toISOString().slice(0, 10);
```

> **Verificar a API contra a versão instalada.** `createChart`/`addSeries`/`subscribe…`
> mudaram entre a v4 e a v5; conferir em
> `node_modules/lightweight-charts/dist/typings.d.ts` **antes** de codar. O plano descreve
> a forma, não substitui a leitura dos tipos.

- [ ] **Passo 4: rodar e ver passar** → o teste puro passa; o adapter é verificado na
      fatia 07 (montagem real).

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/chart/adapter.js app/src/chart/adapter.test.js
git commit -m "feat(chart): adapter da lib, com a janela visivel saindo por callback"
```

---

### Tarefa 2: As faixas de governo (`chart/bands.js`)

**Arquivos:**
- Criar: `sitio/app/src/chart/bands.js`
- Teste: `sitio/app/src/chart/bands.test.js`

**Interfaces:**
- Consome: `deltaNoMandato`/`COBERTURA` (fatia 03) para saber onde a hachura corta.
- Produz:
  - `faixasVisiveis(mandatos, {from, to}) -> Mandato[]` — **pura** (testável sem DOM)
  - `tomDaFaixa(indice) -> string` — alternância sutil entre vizinhos (§2)
  - `criarPrimitivaDeFaixas(mandatos, opcoes) -> ISeriesPrimitive` — o desenho

- [ ] **Passo 1: escrever os testes da parte pura que falham**

```js
import { describe, it, expect } from 'vitest';
import { faixasVisiveis, tomDaFaixa } from './bands.js';

const M = [
  { id: 'a', inicio: '1999-01-01', fim: '2002-12-31' },
  { id: 'b', inicio: '2003-01-01', fim: '2006-12-31' },
  { id: 'c', inicio: '2007-01-01', fim: null, emCurso: true },
];

describe('faixasVisiveis', () => {
  it('devolve as faixas que intersectam a janela', () => {
    expect(faixasVisiveis(M, { from: '2003-06-01', to: '2007-06-01' }).map((m) => m.id)).toEqual(['b', 'c']);
  });
  it('sem janela, devolve todas', () => {
    expect(faixasVisiveis(M, { from: null, to: null })).toHaveLength(3);
  });
});

describe('tomDaFaixa', () => {
  it('alterna entre vizinhos e não introduz cor de partido (§2)', () => {
    expect(tomDaFaixa(0)).not.toBe(tomDaFaixa(1));
    expect(tomDaFaixa(0)).toBe(tomDaFaixa(2)); // só dois tons, alternados
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA.

- [ ] **Passo 3: implementar**

Implementar as duas funções puras acima + `criarPrimitivaDeFaixas`, que implementa
`ISeriesPrimitive`:

```js
/**
 * Primitiva de faixas de governo (§2). A lib não tem anotação nativa — este é o código
 * que passa a ser nosso para manter (ADR, "negativas": ~200–400 linhas).
 * Requisitos: pintar ao FUNDO; clique = seleção (não zoom); sem cor de partido;
 * hachura no mandato em curso, cortando no último dado disponível (§7.3.5).
 */
export function criarPrimitivaDeFaixas(mandatos, { aoClicar, ultimoDadoPorSerie }) {
  return {
    attached({ chart, series, requestUpdate }) { /* guardar refs */ },
    detached() { /* limpar */ },
    paneViews() { return [{ renderer: () => ({ draw: (target) => desenhar(target) }) }]; },
    // hitTest define a área clicável de cada faixa (§2: clique = seleção)
  };
}
```

O `draw` usa o `Target` da lib (`useBitmapCoordinateSpace`) para converter tempo → pixel e
pintar retângulos com os dois tons + hachura diagonal via `createPattern`.

- [ ] **Passo 4: rodar e ver passar** (as puras) **→ commitar**

```bash
cd sitio && git add app/src/chart/bands.js app/src/chart/bands.test.js
git commit -m "feat(chart): faixas de governo como ISeriesPrimitive, sem cor de partido"
```

---

### Tarefa 3: O minimapa (`chart/navigator.js`)

**Arquivos:**
- Criar: `sitio/app/src/chart/navigator.js`
- Teste: `sitio/app/src/chart/navigator.test.js`

**Interfaces:**
- Consome: o adapter (tarefa 1).
- Produz: `criarNavigator(container, { intervalo, faixas, aoMudarJanela }) -> { atualizar(janela), destruir() }`

O minimapa mostra o **intervalo temporal completo e todas as faixas** e é o que torna o
clique-destaca seguro: sem ele, ao dar zoom o usuário perde a referência do todo (§2).

- [ ] **Passo 1–4:** implementar com o mesmo padrão da tarefa 1 (parte pura testada +
      montagem verificada na fatia 07).

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
      na ponta. A Tarefa 3 precisa da legenda externa.
- [ ] (critério antigo, manter)
      e a decisão está escrita, com o número.
- [ ] `grep -rn "lightweight-charts" app/src` → só em `app/src/chart/` (§8, regra 1).
- [ ] `grep -rn "chart/adapter" app/src/components` → só `Chart.svelte` (§8, regra 2).
- [ ] **Clique na faixa não move o viewport** — conferido ao vivo, não por inspeção.
- [ ] Faixas **sem nenhuma cor de partido**; rótulo com `governo · SIGLA` (§2).
- [ ] Hachura no mandato em curso, **cortando no último dado** e não na data de hoje.
- [ ] Arrastar/scroll/duplo-clique dão zoom; o minimapa mantém a referência do todo.
- [ ] `grep -rn "window\." app/src/chart app/src/components/Chart.svelte` → sem resultado.
- [ ] Testes puros (`paraPontosDaBiblioteca`, `faixasVisiveis`, `tomDaFaixa`) passam em
      node, sem DOM.

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

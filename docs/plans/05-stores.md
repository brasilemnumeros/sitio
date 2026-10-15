# Fatia 05 — Stores: a fonte única da verdade (§8)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** o estado do app em **stores nomeados**, um assunto por store, escritos por
ação nomeada — e **nada em `window`**. É a troca que resolve o problema que motivou a
reconstrução (§8, regra 4).

**Arquitetura:** `src/stores/` é a camada 2. Depende de `domain/` (camadas 1–4 das
fatias 01–04) e **não** conhece a Lightweight Charts — quem conhece é `chart/` (fatia 06),
e a direção é **store → adapter** (§8.1).

**Stack:** `svelte/store` (`writable`/`derived`) — Svelte sem DOM, testável em node.

**Spec:** `...design.md` §8, §8.1, §1 (limite de 10, cor customizada), §9.2, §9.3

## Restrições globais

- **Um assunto por store; escrita por ação nomeada.** Nada de mutação direta de fora (§8).
- **O gráfico é espelho do store, não dono do estado** (§8.1). A janela visível **volta**
  por callback explícito para o store `viewport` — nunca por leitura do gráfico em outro
  componente.
- **Nada em `window`** (§8, regra 4).
- **Limite de 10 séries** (§1, §9.5): ao atingir, o botão de adicionar fica **visível e
  desabilitado, com o motivo**, e **nada é removido automaticamente**.
- **Progresso por série**, não um indicador global único (§9.2).
- **Erro de uma série é degradação parcial** — o resto da tela segue usável (§9.3).

---

### Tarefa 1: `stores/catalog.js` — o catálogo de indicadores

**Arquivos:**
- Criar: `sitio/app/src/stores/catalog.js`
- Teste: `sitio/app/src/stores/catalog.test.js`

**Interfaces:**
- Consome: `loadCatalog` de `src/data/catalog.js` (fatia 01).
- Produz:
  - `catalogStore` — `{status: 'idle'|'loading'|'ready'|'error', groups, indicators, error}`
  - `carregarCatalogo({ fetchImpl } = {}) -> Promise<void>` — ação de escrita
  - `buscarIndicadores(termo) -> CatalogEntry[]` — filtra por `name`/`id`, insensível a
    caixa e acento
  - `indicadoresDoGrupo(groupId) -> CatalogEntry[]`

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/stores/catalog.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { catalogStore, carregarCatalogo, buscarIndicadores } from './catalog.js';

const CATALOGO = {
  groups: { monetary: { name: '🏦 Política Monetária' }, inflation: { name: '📈 Inflação' } },
  indicators: [
    { id: 'selic-meta-acum-12m', name: 'Taxa Selic Meta (%)', group: 'monetary', datafile: 'x', chartType: 'line', unit: { type: 'percentage', symbol: '%', decimals: 2 } },
    { id: 'ipca-acum-12m', name: 'IPCA (%)', group: 'inflation', datafile: 'y', chartType: 'line', unit: { type: 'percentage', symbol: '%', decimals: 2 } },
  ],
};

const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => catalogStore.set({ status: 'idle', groups: {}, indicators: [], error: null }));

describe('catalogStore', () => {
  it('começa em idle', () => {
    expect(get(catalogStore).status).toBe('idle');
  });

  it('carrega uma vez e vira ready', async () => {
    await carregarCatalogo({ fetchImpl: ok(CATALOGO) });
    expect(get(catalogStore).status).toBe('ready');
    expect(get(catalogStore).indicators).toHaveLength(2);
  });

  it('falha em voz alta — status error com a mensagem (§9.3)', async () => {
    await carregarCatalogo({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(catalogStore).status).toBe('error');
    expect(get(catalogStore).error).toMatch(/HTTP 500/);
  });

  it('busca por digitação ignora caixa e acento', async () => {
    await carregarCatalogo({ fetchImpl: ok(CATALOGO) });
    expect(buscarIndicadores('taxa selic').map((i) => i.id)).toEqual(['selic-meta-acum-12m']);
    expect(buscarIndicadores('ÍPCA').map((i) => i.id)).toEqual(['ipca-acum-12m']);
    expect(buscarIndicadores('')).toHaveLength(2);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA — `Failed to resolve import "./catalog.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/stores/catalog.js`:

```js
import { writable, get } from 'svelte/store';
import { loadCatalog } from '../data/catalog.js';

const inicial = { status: 'idle', groups: {}, indicators: [], error: null };

/** Camada 2 — não conhece a Lightweight Charts nem o DOM (§8). */
export const catalogStore = writable(inicial);

/** Ação nomeada: única forma de escrever no store (§8). */
export async function carregarCatalogo({ url, fetchImpl } = {}) {
  if (get(catalogStore).status === 'loading' || get(catalogStore).status === 'ready') return;
  catalogStore.set({ ...inicial, status: 'loading' });
  try {
    const { groups, indicators } = await loadCatalog({ url, fetchImpl });
    catalogStore.set({ status: 'ready', groups, indicators, error: null });
  } catch (error) {
    catalogStore.set({ ...inicial, status: 'error', error: error.message });
  }
}

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function buscarIndicadores(termo) {
  const { indicators } = get(catalogStore);
  const t = semAcento(termo.trim());
  if (t === '') return indicators;
  return indicators.filter((i) => semAcento(i.name).includes(t) || semAcento(i.id).includes(t));
}

export function indicadoresDoGrupo(groupId) {
  return get(catalogStore).indicators.filter((i) => i.group === groupId);
}
```

- [ ] **Passo 4: rodar e ver passar** → PASS.
- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/stores/catalog.js app/src/stores/catalog.test.js
git commit -m "feat(stores): catalogo de indicadores com status e busca por digitacao"
```

---

### Tarefa 2: `stores/series.js` — seleção, carga por série e o limite de 10

**Arquivos:**
- Criar: `sitio/app/src/stores/series.js`
- Teste: `sitio/app/src/stores/series.test.js`

**Interfaces:**
- Consome: `loadSeries`, `clearSeriesCache` de `src/data/series.js` (fatia 01).
- Produz:
  - `LIMITE_SERIES = 10`
  - `seriesStore` — `{itens: Item[]}`, `Item = {id, name, unit, cor, status:
    'carregando'|'ok'|'erro', series: Series|null, error: string|null}`
  - `adicionarSerie(entry, { fetchImpl, cor } = {}) -> Promise<void>`
  - `removerSerie(id) -> void`
  - `tentarNovamente(id, { fetchImpl } = {}) -> Promise<void>`
  - `atingiuLimite() -> boolean`
  - `motivoDoLimite() -> string|null`
  - `corDe(id) -> string|null`
  - `definirCor(id, hex) -> void` — override pessoal
  - `restaurarCor(id) -> void`

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/stores/series.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  LIMITE_SERIES, seriesStore, adicionarSerie, removerSerie, tentarNovamente,
  atingiuLimite, motivoDoLimite, corDe, definirCor, restaurarCor, limparSeries,
} from './series.js';
import { PALETA_PADRAO } from '../domain/color.js';

const entrada = (id) => ({ id, name: `Indicador ${id}`, datafile: `https://x/${id}.json`, unit: { type: 'percentage', symbol: '%', decimals: 2 } });
const okSerie = (id) => async () => ({
  ok: true, status: 200,
  json: async () => ({ schema: 1, id, unit: { type: 'percentage', symbol: '%', decimals: 2 }, granularity: 'monthly', source: 'fonte', data: [{ date: '2020-01-01', value: 1 }] }),
});

beforeEach(() => limparSeries());

describe('seriesStore', () => {
  it('adiciona e carrega, com status por série (§9.2)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    const [item] = get(seriesStore).itens;
    expect(item.status).toBe('ok');
    expect(item.series.id).toBe('a');
  });

  it('erro em uma série é degradação parcial — as outras seguem (§9.3)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    const itens = get(seriesStore).itens;
    expect(itens.map((i) => i.status)).toEqual(['ok', 'erro']);
    expect(itens[1].error).toMatch(/HTTP 500/);
  });

  it('tentar de novo recupera a série que falhou — NA URL ORIGINAL (R26)', async () => {
    await adicionarSerie(entrada('b'), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(seriesStore).itens[0].url).toBe('https://x/b.json'); // a url fica guardada

    // O fetch espia o argumento: a retentativa NÃO pode adivinhar o caminho a partir do id.
    const espiao = vi.fn(okSerie('b'));
    await tentarNovamente('b', { fetchImpl: espiao });
    expect(espiao).toHaveBeenCalledWith('https://x/b.json');
    expect(get(seriesStore).itens[0].status).toBe('ok');
  });

  it('o limite é 10 e o motivo é a PALETA, não o layout (§1, §9.5)', async () => {
    expect(LIMITE_SERIES).toBe(10);
    for (let i = 0; i < 10; i++) await adicionarSerie(entrada(`s${i}`), { fetchImpl: okSerie(`s${i}`) });
    expect(atingiuLimite()).toBe(true);
    expect(motivoDoLimite()).toMatch(/paleta/i);
  });

  it('no limite, adicionar NÃO remove nada automaticamente (§9.5)', async () => {
    for (let i = 0; i < 10; i++) await adicionarSerie(entrada(`s${i}`), { fetchImpl: okSerie(`s${i}`) });
    await adicionarSerie(entrada('s10'), { fetchImpl: okSerie('s10') });
    expect(get(seriesStore).itens).toHaveLength(10);
    expect(get(seriesStore).itens.map((i) => i.id)).not.toContain('s10');
  });

  it('a cor padrão sai da paleta, por índice, SEM ciclo (§1)', async () => {
    for (let i = 0; i < 10; i++) await adicionarSerie(entrada(`s${i}`), { fetchImpl: okSerie(`s${i}`) });
    expect(get(seriesStore).itens.map((i) => corDe(i.id))).toEqual([...PALETA_PADRAO]);
  });

  it('override pessoal é chaveado pelo ID e restaurável (§1)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    definirCor('a', '#123456');
    expect(corDe('a')).toBe('#123456');
    restaurarCor('a');
    expect(corDe('a')).toBe(PALETA_PADRAO[0]);
  });

  it('remover libera a vaga e reindexa as cores', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: okSerie('b') });
    removerSerie('a');
    expect(get(seriesStore).itens.map((i) => corDe(i.id))).toEqual([PALETA_PADRAO[0]]);
  });

  it('adicionar o mesmo id duas vezes não duplica', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    expect(get(seriesStore).itens).toHaveLength(1);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA.

- [ ] **Passo 3: implementação**

`sitio/app/src/stores/series.js`:

```js
import { writable, get } from 'svelte/store';
import { loadSeries } from '../data/series.js';
import { PALETA_PADRAO } from '../domain/color.js';

/** O teto vem da PALETA, não do layout (§1): sem ciclo, não há 11ª cor. */
export const LIMITE_SERIES = 10;

/** @typedef {{id:string, name:string, unit:object, cor:string,
 *             status:'carregando'|'ok'|'erro', series:object|null, error:string|null}} Item */

export const seriesStore = writable({ itens: [] });

const escrever = (fn) => seriesStore.update((s) => ({ ...s, itens: fn(s.itens) }));

/** Cores padrão por POSIÇÃO, sem ciclo — posição > 9 só acontece se o limite furar. */
function reindexarCores(itens) {
  const overrides = new Map(itens.filter((i) => i.corPessoal).map((i) => [i.id, i.cor]));
  return itens.map((item, i) => ({ ...item, cor: overrides.get(item.id) ?? PALETA_PADRAO[i] }));
}

export async function adicionarSerie(entry, { fetchImpl } = {}) {
  if (get(seriesStore).itens.some((i) => i.id === entry.id)) return;
  if (atingiuLimite()) return; // visível e desabilitado na UI; nada é removido (§9.5)
  escrever((itens) => reindexarCores([...itens, { id: entry.id, name: entry.name, url: entry.datafile, unit: entry.unit ?? null, cor: null, corPessoal: false, status: 'carregando', series: null, error: null }]));
  try {
    const series = await loadSeries(entry.datafile, { expectedId: entry.id, fetchImpl });
    // A unidade vem da SÉRIE, não do catálogo (§6) — o catálogo só a tem durante a transição.
    escrever((itens) => itens.map((i) => (i.id === entry.id ? { ...i, status: 'ok', series, unit: series.unit, error: null } : i)));
  } catch (error) {
    escrever((itens) => itens.map((i) => (i.id === entry.id ? { ...i, status: 'erro', series: null, error: error.message } : i)));
  }
}

export function removerSerie(id) {
  escrever((itens) => reindexarCores(itens.filter((i) => i.id !== id)));
}

export async function tentarNovamente(id, { fetchImpl } = {}) {
  const item = get(seriesStore).itens.find((i) => i.id === id);
  if (!item) return;
  escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'carregando', error: null } : i)));
  try {
    // A URL REAL, guardada ao adicionar. NÃO reconstruir a partir do id: o caminho publicado
    // inclui a família (`dados/selic/selic-meta-acum-12m.json`), e uma URL adivinhada daria
    // 404 — numa ação cujo propósito é justamente RECUPERAR de uma falha.
    const series = await loadSeries(item.url, { expectedId: id, fetchImpl });
    escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'ok', series, error: null } : i)));
  } catch (error) {
    escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'erro', error: error.message } : i)));
  }
}

export const atingiuLimite = () => get(seriesStore).itens.length >= LIMITE_SERIES;

export function motivoDoLimite() {
  return atingiuLimite()
    ? `Limite de ${LIMITE_SERIES} séries atingido — a paleta tem ${LIMITE_SERIES} cores sem repetição. Remova uma para adicionar outra.`
    : null;
}

export const corDe = (id) => get(seriesStore).itens.find((i) => i.id === id)?.cor ?? null;

export function definirCor(id, hex) {
  escrever((itens) => itens.map((i) => (i.id === id ? { ...i, cor: hex, corPessoal: true } : i)));
}

export function restaurarCor(id) {
  escrever((itens) => reindexarCores(itens.map((i) => (i.id === id ? { ...i, corPessoal: false } : i))));
}

/** Só para testes e para o atalho "limpar seleção" (§9.1). */
export function limparSeries() {
  seriesStore.set({ itens: [] });
}
```

- [ ] **Passo 4: rodar e ver passar** → PASS.
- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/stores/series.js app/src/stores/series.test.js
git commit -m "feat(stores): selecao de series, carga por serie e o limite de 10 pela paleta"
```

> **R26 — a URL é guardada, não adivinhada.** A versão anterior deste plano fazia
> `tentarNovamente` reconstruir a URL a partir do id. Medido: o caminho publicado inclui a
> **família** (`dados/selic/selic-meta-acum-12m.json`), então a URL adivinhada daria 404 —
> numa ação cujo propósito é **recuperar de uma falha**. O item passa a guardar
> `url: entry.datafile`, e o teste abaixo **espia a URL que o `fetchImpl` recebeu** (o teste
> antigo não pegava isso: o falso `fetchImpl` ignorava o argumento).

---

### Tarefa 3: `stores/mandate.js`, `stores/axes.js`, `stores/viewport.js`

**Arquivos:**
- Criar: `sitio/app/src/stores/mandate.js`, `sitio/app/src/stores/axes.js`,
  `sitio/app/src/stores/viewport.js`
- Teste: `sitio/app/src/stores/mandate.test.js`, `sitio/app/src/stores/axes.test.js`,
  `sitio/app/src/stores/viewport.test.js`

**Interfaces (conferidas contra o código das fatias 02 e 03 — não são suposição):**
- Consome: `comparabilidade(novaSerie, seriesExistentes) -> {veredito: 'convive'|'avisa'|'ilegivel', ratio, contra}`
  (fatia 02, `scales.js:60`) · `ordenarMandatos(mandatos)` (fatia 03, `mandates.js:101` —
  ordena por `inicio` crescente, com `emCurso` **por último**) · `deltaNoMandato(series, mandato)`
  (fatia 03, `mandates.js:56`) — **não** é reexportado por store nenhum.
- Produz:
  - `mandateStore` — `{mandatos: Mandato[], selecionado: string|null}`;
    `carregarMandatos({url, fetchImpl})`, `selecionarMandato(id)`, `limparSelecao()`,
    `mandatoSelecionado()`.
  - `axesStore` — `{atribuicao: Record<string,'left'|'right'>, avisos: Array}`;
    `recalcularEixos(seriesList)`, `moverParaEixo(id, 'left'|'right')`.
  - `viewportStore` — `{from: string|null, to: string|null}`; `definirJanela({from,to})`,
    `resetarJanela()`. **Este é o callback do adapter** (§8.1).

> **R27 — o store do mandato não lê o store das séries.** A versão anterior deste plano expunha
> `celulaDe(seriesId)`, que obrigaria `mandate.js` a importar `series.js` para achar a série —
> dois stores acoplados, e a mesma pergunta ("qual o Δ desta série neste mandato?" ) respondida em
> dois lugares. **O Δ é `deltaNoMandato(series, mandato)` composto pelo componente**, que já lê os
> dois stores. Um store, um assunto.

#### Passo 1: os testes

```js
// Crie: sitio/app/src/stores/mandate.test.js
import { get } from 'svelte/store';
import {
  mandateStore, carregarMandatos, selecionarMandato, limparSelecao, mandatoSelecionado,
} from './mandate.js';

const GOVERNOS = {
  schema: 1,
  mandatos: [
    { id: 'lula-3', titular: 'Lula', inicio: '2023-01-01', fim: null, emCurso: true },
    { id: 'bolsonaro', titular: 'Bolsonaro', inicio: '2019-01-01', fim: '2022-12-31', emCurso: false },
    { id: 'lula-1', titular: 'Lula', inicio: '2003-01-01', fim: '2005-12-31', emCurso: false },
  ],
};
const okGovernos = async () => ({ ok: true, status: 200, json: async () => GOVERNOS });

it('carrega ordenado (em curso por último) e começa SEM seleção', async () => {
  await carregarMandatos({ fetchImpl: okGovernos });
  const { mandatos, selecionado } = get(mandateStore);
  expect(mandatos.map((m) => m.id)).toEqual(['lula-1', 'bolsonaro', 'lula-3']);
  expect(selecionado).toBeNull();
});

it('governos fora do ar NÃO derrubam o app — o store só fica vazio', async () => {
  // O mandato é CONTEXTO: o eixo do tempo não depende dele (§9.3, espírito).
  await carregarMandatos({ fetchImpl: async () => { throw new Error('rede'); } });
  expect(get(mandateStore)).toEqual({ mandatos: [], selecionado: null });
  await carregarMandatos({ fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
  expect(get(mandateStore)).toEqual({ mandatos: [], selecionado: null });
});

it('seleciona e limpa', async () => {
  await carregarMandatos({ fetchImpl: okGovernos });
  selecionarMandato('bolsonaro');
  expect(mandatoSelecionado().id).toBe('bolsonaro');
  limparSelecao();
  expect(mandatoSelecionado()).toBeNull();
});

it('não expõe celulaDe — o Δ é composto pelo componente (R27)', async () => {
  const m = await import('./mandate.js');
  expect(m.celulaDe).toBeUndefined();
  expect(Object.keys(m)).not.toContain('seriesStore');
});
```

```js
// Crie: sitio/app/src/stores/axes.test.js
import { get } from 'svelte/store';
import { axesStore, recalcularEixos, moverParaEixo } from './axes.js';

const s = (id, unit) => ({ id, unit, pontos: [{ date: '2020-01-01', value: 1 }] });
// As amplitudes reais decidem o veredito (fatia 02): 1e11 vs 1 cabe em 'avisa'; 1e11 vs 1e-3 é 'ilegivel'.
const grande = { id: 'g', unit: { type: 'currency', symbol: 'R$' }, pontos: [{ date: '2020-01-01', value: 1e11 }] };
const pequeno = { id: 'p', unit: { type: 'currency', symbol: 'R$' }, pontos: [{ date: '2020-01-01', value: 1 }] };

it('com tudo convivendo, tudo fica num eixo só (§5)', () => {
  recalcularEixos([s('a'), s('b')]);
  const { atribuicao, avisos } = get(axesStore);
  expect(atribuicao).toEqual({ a: 'left', b: 'left' });
  expect(avisos).toEqual([]);
});

it('a série incompatível vai para a direita, e o aviso aponta a CULPADA', () => {
  recalcularEixos([grande, pequeno]);
  const { atribuicao, avisos } = get(axesStore);
  expect(atribuicao.left ?? atribuicao.g).toBe('left');
  expect(atribuicao.p).toBe('right');
  expect(avisos).toHaveLength(1);
  expect(avisos[0].id).toBe('p');
  expect(avisos[0].contra).toBe(grande);          // a culpada, não um booleano
  expect(['avisa', 'ilegivel']).toContain(avisos[0].veredito);
});

it('moverParaEixo move uma série para a direita', () => {
  recalcularEixos([s('a'), s('b')]);
  moverParaEixo('a', 'right');
  expect(get(axesStore).atribuicao.a).toBe('right');
});

it('só existem dois eixos — um terceiro valor é ignorado (§9.5)', () => {
  recalcularEixos([s('a')]);
  moverParaEixo('a', 'meio');
  expect(get(axesStore).atribuicao.a).toBe('left'); // inalterado
});
```

```js
// Crie: sitio/app/src/stores/viewport.test.js
import { get } from 'svelte/store';
import { viewportStore, definirJanela, resetarJanela } from './viewport.js';

it('definirJanela é a única escrita, e vem do adapter (§8.1)', () => {
  definirJanela({ from: '2020-01-01', to: '2021-01-01' });
  expect(get(viewportStore)).toEqual({ from: '2020-01-01', to: '2021-01-01' });
});

it('campos ausentes viram null, não undefined', () => {
  definirJanela({ from: '2020-01-01' });
  expect(get(viewportStore)).toEqual({ from: '2020-01-01', to: null });
});

it('resetarJanela volta ao intervalo completo', () => {
  definirJanela({ from: '2020-01-01', to: '2021-01-01' });
  resetarJanela();
  expect(get(viewportStore)).toEqual({ from: null, to: null });
});
```

#### Passo 2: `stores/mandate.js`

```js
import { writable, get } from 'svelte/store';
import { ordenarMandatos } from '../domain/mandates.js';

const URL_GOVERNOS = 'https://brasilemnumeros.github.io/dados/governos/federal.json';
const inicial = { mandatos: [], selecionado: null };

const store = writable(inicial);
export const mandateStore = { subscribe: store.subscribe };

/** O mandato é CONTEXTO, não dado do gráfico: se os governos não vierem, o app ainda mostra
 * as séries — por isso a falha é engolida e o store fica vazio em vez de propagar (§9.3). */
export async function carregarMandatos({ url = URL_GOVERNOS, fetchImpl = fetch } = {}) {
  try {
    const r = await fetchImpl(url);
    if (!r.ok) throw new Error(`HTTP ${r.status} ao buscar governos`);
    const dados = await r.json();
    store.set({ mandatos: ordenarMandatos(dados.mandatos ?? []), selecionado: null });
  } catch {
    store.set({ ...inicial });
  }
}

export function selecionarMandato(id) {
  store.update((s) => (s.mandatos.some((m) => m.id === id) ? { ...s, selecionado: id } : s));
}

export function limparSelecao() {
  store.update((s) => ({ ...s, selecionado: null }));
}

export function mandatoSelecionado() {
  const { mandatos, selecionado } = get(store);
  return mandatos.find((m) => m.id === selecionado) ?? null;
}
```

#### Passo 3: `stores/axes.js`

```js
import { writable, get } from 'svelte/store';
import { comparabilidade } from '../domain/scales.js';

const inicial = { atribuicao: {}, avisos: [] };
const store = writable(inicial);
export const axesStore = { subscribe: store.subscribe };

const EIXOS = ['left', 'right'];

/** Sugere eixo para cada série, na ordem dada: a primeira vai para a esquerda, e cada
 * seguinte fica à esquerda SE conviver com as que já estão lá — senão vai para a direita
 * com um aviso apontando a culpada (§5). Só existem dois eixos (§9.5): não há terceiro. */
export function recalcularEixos(seriesList) {
  const atribuicao = {};
  const avisos = [];
  const esquerda = [];
  for (const s of seriesList) {
    if (esquerda.length === 0) {
      atribuicao[s.id] = 'left';
      esquerda.push(s);
      continue;
    }
    const v = comparabilidade(s, esquerda);
    if (v.veredito === 'convive') {
      atribuicao[s.id] = 'left';
      esquerda.push(s);
    } else {
      atribuicao[s.id] = 'right';
      avisos.push({ ...v, id: s.id });
    }
  }
  store.set({ atribuicao, avisos });
}

/** Só `left` e `right`. Um terceiro valor é ignorado em silêncio — o app não inventa eixo. */
export function moverParaEixo(id, eixo) {
  if (!EIXOS.includes(eixo)) return;
  store.update((s) => ({ ...s, atribuicao: { ...s.atribuicao, [id]: eixo } }));
}
```

#### Passo 4: `stores/viewport.js`

```js
import { writable } from 'svelte/store';

const inicial = { from: null, to: null };
const store = writable(inicial);
export const viewportStore = { subscribe: store.subscribe };

/** A ÚNICA escrita deste store, e é o adapter (comando) que a chama (§8.1) — nenhum
 * componente lê a janela de volta do gráfico para escrevê-la aqui. */
export function definirJanela({ from = null, to = null } = {}) {
  store.set({ from, to });
}

export function resetarJanela() {
  store.set({ ...inicial });
}
```

#### Passo 5: rodar e commitar

```bash
cd sitio/app && NODE_ENV=development npm test    # 8 arquivos verdes viram 11
cd .. && git add app/src/stores/
git commit -m "feat(stores): mandato, eixos e janela visivel"
```

## Critérios de aceite da fatia 05

- [ ] `npm test` → verdes; `grep -rn "window\." app/src/stores/` → **sem resultado**.
- [ ] Todo store expõe **ações nomeadas**; nenhum módulo de fora de `stores/` faz
      `.set(`/`.update(` direto (revisão: `grep -rn "Store.set\|Store.update" app/src --include=!*test*`).
- [ ] **Limite de 10**: `atingiuLimite()` vira `true` na 10ª, `motivoDoLimite()` cita a
      **paleta**, e a 11ª tentativa **não** remove nem adiciona nada (§9.5).
- [ ] **Erro por série**: uma série com erro não derruba as outras nem o store (§9.3).
- [ ] **Cor**: padrão vem da paleta por posição, **sem ciclo**; override chaveado pelo
      **id**; `restaurarCor` volta ao padrão (§1).
- [ ] **`viewport`** só é escrito pela ação que o adapter chama — nenhum componente
      escreve nele lendo do gráfico (§8.1).
- [ ] **`mandate.js` não importa `series.js`** (R27): o Δ é `deltaNoMandato(series, mandato)`
      composto pelo componente; o store do mandato não conhece séries.
- [ ] **A `url` da série é guardada no item ao adicionar** e é ela que a retentativa usa — o
      teste espia o argumento do `fetchImpl` (R26). Reconstruir a URL a partir do id daria
      404, porque o caminho publicado inclui a família.
- [ ] Nenhum store importa `lightweight-charts`.

## Auto-revisão

- **Cobertura da spec:** §8 (um assunto por store, escrita por ação, nada em `window`) →
  tarefas 1–3; §8.1 (store → adapter, retorno por callback) → `viewport`; §9.2/§9.3
  (progresso por série, degradação parcial) → `series`; §1 + §9.5 (limite de 10 pela
  paleta, nada removido) → `series`; §5 (aviso de escala vira estado) → `axes`.
- **Onde a UI mora:** nada aqui desenha — as fatias 07–09 consomem estes stores.
- **Dívida declarada:** guardar `url` no item em vez de reconstruir — escrita no plano.
- **Consistência de nomes:** `seriesStore`, `catalogStore`, `mandateStore`, `axesStore`,
  `viewportStore`, `LIMITE_SERIES`, `atingiuLimite`, `motivoDoLimite`, `corDe`,
  `definirCor`, `restaurarCor`, `definirJanela` — consumidos pelas fatias 06–09.

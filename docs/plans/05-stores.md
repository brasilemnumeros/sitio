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

  it('tentar de novo recupera a série que falhou', async () => {
    await adicionarSerie(entrada('b'), { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    await tentarNovamente('b', { fetchImpl: okSerie('b') });
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
  escrever((itens) => reindexarCores([...itens, { id: entry.id, name: entry.name, unit: entry.unit ?? null, cor: null, corPessoal: false, status: 'carregando', series: null, error: null }]));
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
    const url = item.url ?? `https://brasilemnumeros.github.io/dados/${item.id}.json`;
    const series = await loadSeries(url, { expectedId: id, fetchImpl });
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

> **Nota de dívida assumida:** `tentarNovamente` reconstrói a URL a partir do id quando
> não a guardou. Guardar `url` no item ao adicionar é o certo — fazer isso antes de
> fechar a fatia (o teste não cobre, é revisão).

---

### Tarefa 3: `stores/mandate.js`, `stores/axes.js`, `stores/viewport.js`

**Arquivos:**
- Criar: `sitio/app/src/stores/mandate.js`, `sitio/app/src/stores/axes.js`,
  `sitio/app/src/stores/viewport.js`
- Teste: `sitio/app/src/stores/mandate.test.js`, `sitio/app/src/stores/axes.test.js`,
  `sitio/app/src/stores/viewport.test.js`

**Interfaces:**
- Consome: `comparabilidade` (fatia 02), `deltaNoMandato`/`ordenarMandatos` (fatia 03).
- Produz:
  - `mandateStore` — `{mandatos: Mandato[], selecionado: string|null}`;
    `carregarMandatos({fetchImpl})`, `selecionarMandato(id)`, `limparSelecao()`,
    `mandatoSelecionado()`, `celulaDe(seriesId)` → o Δ da série selecionada no mandato
    selecionado.
  - `axesStore` — `{atribuicao: Record<string,'left'|'right'>, avisos: Veredito[]}`;
    `recalcularEixos(seriesList)`, `moverParaEixo(id, 'left'|'right')`.
  - `viewportStore` — `{from: string|null, to: string|null}`; `definirJanela({from,to})`,
    `resetarJanela()`. **Este é o callback do adapter** (§8.1).

- [ ] **Passo 1: testes (resumo do essencial)**

```js
// mandate.test.js — o essencial
it('seleciona, agrega por titular e limpa', ...);
it('celulaDe devolve o Δ da série no mandato selecionado', ...);

// axes.test.js — o essencial
it('sugere um eixo só quando tudo convive (§5)', ...);
it('gera aviso para a série incompatível, apontando a culpada', ...);
it('moverParaEixo move uma série para a direita', ...);
it('mais de dois eixos não existe — só left/right', ...);

// viewport.test.js — o essencial
it('definirJanela é a única escrita e vem do adapter (§8.1)', ...);
it('resetarJanela volta ao intervalo completo', ...);
```

- [ ] **Passo 2–4:** implementar cada store no padrão da tarefa 2 (writable + ações
      nomeadas), com o teste correspondente passando.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/stores/
git commit -m "feat(stores): mandato, eixos e janela visivel"
```

---

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

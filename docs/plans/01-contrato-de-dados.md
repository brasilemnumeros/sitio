# Fatia 01 — Contrato de dados (§6)

> **Para quem executa:** sub-skill obrigatória: use `superpowers:subagent-driven-development`
> (recomendada) ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a camada `data/` — validar o schema canônico de série **recusando em voz
alta** o que não entende, memorizar por URL sem envenenar a nova tentativa, e validar o
catálogo de indicadores. Tudo puro e testável sem navegador.

**Arquitetura:** `src/data/` é a única camada (com `src/chart/`) que fala com o mundo
exterior (§8). A validação é função pura; `loadSeries`/`loadCatalog` são as cascas de
rede que a chamam. Erro de schema vira `SchemaError` — insumo dos estados da §9.

**Stack:** JS ESM puro + Vitest (ambiente `node`, `fetch` global do Node 24+).

**Spec:** `.../2026-10-14-camada-de-graficos-design.md` §6, §8 (regra 5), §9.3, §10.7

## Restrições globais

- **`value` substitui `rate`.** O app lê **apenas `value`**. A convivência de chaves
  (`{date, rate, value}`) é assunto do repo `dados` (fatia 11) e da ordem de deploy — o
  app entra **depois** de `dados` publicar `value`. Nenhum fallback para `rate` aqui.
- **`schema: 1` é recusado em voz alta** se divergir — nunca plotar vazio em silêncio
  (§6, §9.3).
- **`id` no arquivo** permite conferir se o dado que chegou é o que foi pedido (§6).
- **`indicatorName` não existe** no contrato (§6): a identidade é o `id`.
- **Sem rede real nos testes:** todo teste injeta `fetchImpl`.
- Custo zero; nada em `window`.

---

### Tarefa 1: Validação da série (`validateSeries`)

**Arquivos:**
- Criar: `sitio/app/src/data/validate.js`
- Teste: `sitio/app/src/data/validate.test.js`

**Interfaces:**
- Consome: `SCHEMA_VERSION` de `src/domain/schema.js` (fatia 00).
- Produz:
  - `class SchemaError extends Error` (campo `name === 'SchemaError'`).
  - `UNIT_TYPES` (Set), `GRANULARITIES` (Set), `ISO_DATE` (RegExp).
  - `validateUnit(unit, where = 'unit') -> {type, symbol, decimals}` — lança `SchemaError`.
  - `validateSeries(raw, { expectedId } = {}) -> Series`, onde `Series` normaliza cada
    ponto para `{date, value}` (campos extra, como `rate`, são descartados).
  - `@typedef Series` — `{schema, id, unit:{type,symbol,decimals}, granularity, source,
    data: Array<{date, value}>}`.

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/data/validate.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { SchemaError, validateSeries, validateUnit } from './validate.js';

// Pontos reais medidos (dados/selic/selic-meta-acum-12m.json, 2026-10-14) — não inventados.
const serieValida = {
  schema: 1,
  id: 'selic-meta-acum-12m',
  unit: { type: 'percentage', symbol: '%', decimals: 2 },
  granularity: 'monthly',
  source: 'Banco Central do Brasil',
  data: [
    { date: '1999-03-31', value: 44.22222222222222 },
    { date: '1999-04-30', value: 36.85 },
  ],
};

describe('validateSeries', () => {
  it('aceita uma série canônica e normaliza os pontos', () => {
    const s = validateSeries(serieValida, { expectedId: 'selic-meta-acum-12m' });
    expect(s.id).toBe('selic-meta-acum-12m');
    expect(s.data).toEqual([
      { date: '1999-03-31', value: 44.22222222222222 },
      { date: '1999-04-30', value: 36.85 },
    ]);
    expect(s.schema).toBe(1);
  });

  it('descarta a chave de convivência "rate" (§6)', () => {
    const comRate = {
      ...serieValida,
      data: [{ date: '1999-03-31', rate: 44.22, value: 44.22 }],
    };
    expect(validateSeries(comRate).data[0]).toEqual({ date: '1999-03-31', value: 44.22 });
  });

  it('recusa em voz alta um schema desconhecido (§6, §9.3)', () => {
    expect(() => validateSeries({ ...serieValida, schema: 2 })).toThrow(SchemaError);
    expect(() => validateSeries({ ...serieValida, schema: 2 })).toThrow(/schema 2/);
  });

  it('recusa quando o id não é o pedido (§6)', () => {
    expect(() => validateSeries(serieValida, { expectedId: 'ipca-acum-12m' })).toThrow(
      /o app pediu "ipca-acum-12m"/,
    );
  });

  it('recusa ponto sem "value" numérico', () => {
    const quebrada = { ...serieValida, data: [{ date: '1999-03-31', rate: 44.22 }] };
    expect(() => validateSeries(quebrada)).toThrow(/value/);
  });

  it('recusa data fora do formato ISO', () => {
    const quebrada = { ...serieValida, data: [{ date: '31/03/1999', value: 1 }] };
    expect(() => validateSeries(quebrada)).toThrow(/YYYY-MM-DD/);
  });

  it('recusa granularidade desconhecida', () => {
    expect(() => validateSeries({ ...serieValida, granularity: 'semanal' })).toThrow(
      /granularity/,
    );
  });

  it('recusa resposta que não é objeto', () => {
    expect(() => validateSeries(null)).toThrow(SchemaError);
    expect(() => validateSeries([])).toThrow(SchemaError);
  });
});

describe('validateUnit', () => {
  it('aceita as três unidades do contrato', () => {
    for (const type of ['percentage', 'number', 'currency']) {
      expect(validateUnit({ type, symbol: '%', decimals: 2 })).toEqual({
        type,
        symbol: '%',
        decimals: 2,
      });
    }
  });

  it('recusa tipo desconhecido', () => {
    expect(() => validateUnit({ type: 'peso', symbol: 'kg', decimals: 1 })).toThrow(
      /desconhecido/,
    );
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./validate.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/data/validate.js`:

```js
import { SCHEMA_VERSION } from '../domain/schema.js';

/** Erro de contrato — o app recusa em voz alta em vez de plotar vazio (§6). */
export class SchemaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchemaError';
  }
}

export const UNIT_TYPES = new Set(['percentage', 'number', 'currency']);
export const GRANULARITIES = new Set(['daily', 'monthly', 'annual']);
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {Object} Unit
 * @property {'percentage'|'number'|'currency'} type
 * @property {string} symbol
 * @property {number} decimals
 */

/**
 * @typedef {Object} Series
 * @property {1} schema
 * @property {string} id
 * @property {Unit} unit
 * @property {'daily'|'monthly'|'annual'} granularity
 * @property {string} source
 * @property {Array<{date: string, value: number}>} data
 */

export function validateUnit(unit, where = 'unit') {
  if (unit === null || typeof unit !== 'object' || Array.isArray(unit)) {
    throw new SchemaError(`${where}: ausente ou não é objeto`);
  }
  if (!UNIT_TYPES.has(unit.type)) {
    throw new SchemaError(`${where}.type "${unit.type}" desconhecido`);
  }
  if (typeof unit.symbol !== 'string' || unit.symbol === '') {
    throw new SchemaError(`${where}.symbol ausente ou vazio`);
  }
  if (!Number.isInteger(unit.decimals) || unit.decimals < 0) {
    throw new SchemaError(`${where}.decimals deve ser inteiro ≥ 0`);
  }
  return { type: unit.type, symbol: unit.symbol, decimals: unit.decimals };
}

/**
 * Valida e normaliza uma série. Lança SchemaError em qualquer divergência.
 * @param {unknown} raw
 * @param {{expectedId?: string}} [options]
 * @returns {Series}
 */
export function validateSeries(raw, { expectedId } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError('série não é um objeto JSON');
  }
  if (raw.schema !== SCHEMA_VERSION) {
    throw new SchemaError(
      `schema ${JSON.stringify(raw.schema)} não suportado; este app entende o schema ${SCHEMA_VERSION}`,
    );
  }
  if (typeof raw.id !== 'string' || raw.id === '') {
    throw new SchemaError('campo "id" ausente ou não textual');
  }
  if (expectedId !== undefined && raw.id !== expectedId) {
    throw new SchemaError(`veio o id "${raw.id}" mas o app pediu "${expectedId}"`);
  }
  const unit = validateUnit(raw.unit, 'unit');
  if (!GRANULARITIES.has(raw.granularity)) {
    throw new SchemaError(`granularity "${raw.granularity}" desconhecida`);
  }
  if (typeof raw.source !== 'string' || raw.source === '') {
    throw new SchemaError('campo "source" ausente');
  }
  if (!Array.isArray(raw.data)) {
    throw new SchemaError('campo "data" deve ser uma lista');
  }
  const data = raw.data.map((point, i) => {
    if (point === null || typeof point !== 'object' || Array.isArray(point)) {
      throw new SchemaError(`data[${i}] não é um objeto`);
    }
    if (typeof point.date !== 'string' || !ISO_DATE.test(point.date)) {
      throw new SchemaError(`data[${i}]: "date" deve ser YYYY-MM-DD, veio ${JSON.stringify(point.date)}`);
    }
    if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
      throw new SchemaError(`data[${i}]: "value" deve ser número finito, veio ${JSON.stringify(point.value)}`);
    }
    return { date: point.date, value: point.value };
  });

  return {
    schema: SCHEMA_VERSION,
    id: raw.id,
    unit,
    granularity: raw.granularity,
    source: raw.source,
    data,
  };
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde.

- [ ] **Passo 5: commitar**

```bash
cd sitio
git add app/src/data/validate.js app/src/data/validate.test.js
git commit -m "feat(app): validacao do contrato de serie, que recusa schema em voz alta"
```

---

### Tarefa 2: Carregamento com cache que não envenena (`loadSeries`)

**Arquivos:**
- Criar: `sitio/app/src/data/series.js`
- Teste: `sitio/app/src/data/series.test.js`

**Interfaces:**
- Consome: `validateSeries`, `SchemaError` de `./validate.js`.
- Produz:
  - `loadSeries(url, { expectedId, fetchImpl } = {}) -> Promise<Series>`
  - `clearSeriesCache() -> void` (usado pelos testes e por uma recarga explícita)

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/data/series.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSeries, clearSeriesCache } from './series.js';

const JSON_VALIDO = {
  schema: 1,
  id: 'ipca-acum-12m',
  unit: { type: 'percentage', symbol: '%', decimals: 2 },
  granularity: 'monthly',
  source: 'Banco Central do Brasil',
  data: [{ date: '1995-12-31', value: 1.64 }],
};

function respostaOk(body) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => clearSeriesCache());

describe('loadSeries', () => {
  it('busca, valida e devolve a série', async () => {
    const fetchImpl = vi.fn(async () => respostaOk(JSON_VALIDO));
    const s = await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    expect(s.id).toBe('ipca-acum-12m');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('memoriza por URL: segunda chamada não refaz a rede', async () => {
    const fetchImpl = vi.fn(async () => respostaOk(JSON_VALIDO));
    await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('não envenena o cache: falha e depois sucesso volta a buscar (§9.3 "tentar de novo")', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce(respostaOk(JSON_VALIDO));
    await expect(loadSeries('https://exemplo/ipca.json', { fetchImpl })).rejects.toThrow(/HTTP 500/);
    const s = await loadSeries('https://exemplo/ipca.json', { fetchImpl });
    expect(s.id).toBe('ipca-acum-12m');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propaga erro de rede com a URL no texto', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(loadSeries('https://exemplo/x.json', { fetchImpl })).rejects.toThrow(
      /falha de rede ao buscar https:\/\/exemplo\/x.json/,
    );
  });

  it('propaga o SchemaError de um schema desconhecido', async () => {
    const fetchImpl = vi.fn(async () => respostaOk({ ...JSON_VALIDO, schema: 99 }));
    await expect(loadSeries('https://exemplo/x.json', { fetchImpl })).rejects.toThrow(/schema 99/);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./series.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/data/series.js`:

```js
import { validateSeries } from './validate.js';

/** @type {Map<string, Promise<import('./validate.js').Series>>} */
const cache = new Map();

async function fetchAndValidate(url, expectedId, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new Error(`falha de rede ao buscar ${url}`, { cause });
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar ${url}`);
  }
  return validateSeries(await response.json(), { expectedId });
}

/**
 * Carrega e valida uma série, memorizando por URL. Uma falha NÃO fica no cache —
 * a próxima chamada tenta de novo (§9.3).
 * @param {string} url
 * @param {{expectedId?: string, fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<import('./validate.js').Series>}
 */
export async function loadSeries(url, { expectedId, fetchImpl = fetch } = {}) {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetchAndValidate(url, expectedId, fetchImpl);
    cache.set(url, pending);
  }
  try {
    return await pending;
  } catch (error) {
    cache.delete(url);
    throw error;
  }
}

export function clearSeriesCache() {
  cache.clear();
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde.

- [ ] **Passo 5: commitar**

```bash
cd sitio
git add app/src/data/series.js app/src/data/series.test.js
git commit -m "feat(app): carga de serie com cache por URL que nao envenena a nova tentativa"
```

---

### Tarefa 3: Catálogo de indicadores (`validateCatalog` / `loadCatalog`)

**Arquivos:**
- Criar: `sitio/app/src/data/catalog.js`
- Teste: `sitio/app/src/data/catalog.test.js`

**Interfaces:**
- Consome: `SchemaError`, `validateUnit` de `./validate.js`.
- Produz:
  - `validateCatalog(raw) -> { groups, indicators }` — cada indicador normalizado para
    `{id, name, group, datafile, chartType, unit, yAxisTitle}`.
  - `loadCatalog({ url = '/indicators.json', fetchImpl } = {}) -> Promise<{groups, indicators}>`

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/data/catalog.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateCatalog, loadCatalog } from './catalog.js';

const catalogoMinimo = {
  groups: { monetary: { name: '🏦 Política Monetária', description: '...' } },
  indicators: [
    {
      id: 'selic-meta-acum-12m',
      name: 'Taxa Selic Meta (%)',
      group: 'monetary',
      datafile: 'https://brasilemnumeros.github.io/dados/selic/selic-meta-acum-12m.json',
      chartType: 'line',
      unit: { type: 'percentage', symbol: '%', decimals: 2 },
      yAxisTitle: 'Taxa (%)',
    },
  ],
};

describe('validateCatalog', () => {
  it('aceita um catálogo bem-formado e normaliza o indicador', () => {
    const c = validateCatalog(catalogoMinimo);
    expect(c.indicators[0]).toEqual({
      id: 'selic-meta-acum-12m',
      name: 'Taxa Selic Meta (%)',
      group: 'monetary',
      datafile: 'https://brasilemnumeros.github.io/dados/selic/selic-meta-acum-12m.json',
      chartType: 'line',
      unit: { type: 'percentage', symbol: '%', decimals: 2 },
      yAxisTitle: 'Taxa (%)',
    });
  });

  it('recusa um indicador cujo grupo não existe em "groups"', () => {
    const ruim = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], group: 'inexistente' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/grupo "inexistente" não existe/);
  });

  it('recusa chartType fora de line|bar', () => {
    const ruim = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], chartType: 'pie' }],
    };
    expect(() => validateCatalog(ruim)).toThrow(/chartType/);
  });

  it('exige datafile e id', () => {
    expect(() => validateCatalog({ ...catalogoMinimo, indicators: [{ name: 'x', group: 'monetary' }] })).toThrow(
      /\.id ausente/,
    );
  });

  it('aceita indicador SEM unit — o metadado vive no arquivo de série (§6)', () => {
    const semUnit = { ...catalogoMinimo, indicators: [{ ...catalogoMinimo.indicators[0] }] };
    delete semUnit.indicators[0].unit;
    expect(validateCatalog(semUnit).indicators[0].unit).toBeNull();
  });
});

describe('loadCatalog', () => {
  it('busca e valida', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => catalogoMinimo }));
    const c = await loadCatalog({ fetchImpl, url: '/x.json' });
    expect(c.indicators).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledWith('/x.json');
  });

  it('o catálogo REAL do site valida (sitio/indicators.json)', () => {
    const caminho = fileURLToPath(new URL('../../../indicators.json', import.meta.url));
    const real = JSON.parse(readFileSync(caminho, 'utf8'));
    const c = validateCatalog(real);
    expect(c.indicators).toHaveLength(13);
    expect(Object.keys(c.groups)).toHaveLength(7);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./catalog.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/data/catalog.js`:

```js
import { SchemaError, validateUnit } from './validate.js';

const CHART_TYPES = new Set(['line', 'bar']);

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string} datafile
 * @property {'line'|'bar'} chartType
 * @property {import('./validate.js').Unit} unit
 * @property {string|null} yAxisTitle
 */

export function validateCatalog(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError('catálogo não é um objeto JSON');
  }
  const groups = raw.groups;
  if (groups === null || typeof groups !== 'object' || Array.isArray(groups)) {
    throw new SchemaError('catálogo sem o mapa "groups"');
  }
  if (!Array.isArray(raw.indicators)) {
    throw new SchemaError('catálogo sem a lista "indicators"');
  }
  const indicators = raw.indicators.map((ind, i) => {
    const where = `indicators[${i}]`;
    if (ind === null || typeof ind !== 'object' || Array.isArray(ind)) {
      throw new SchemaError(`${where} não é objeto`);
    }
    if (typeof ind.id !== 'string' || ind.id === '') throw new SchemaError(`${where}.id ausente`);
    if (typeof ind.name !== 'string' || ind.name === '') throw new SchemaError(`${where}.name ausente`);
    if (!Object.hasOwn(groups, ind.group)) {
      throw new SchemaError(`${where} (${ind.id}): grupo "${ind.group}" não existe em "groups"`);
    }
    if (typeof ind.datafile !== 'string' || ind.datafile === '') {
      throw new SchemaError(`${where}.datafile ausente`);
    }
    if (!CHART_TYPES.has(ind.chartType)) {
      throw new SchemaError(`${where}.chartType deve ser "line" ou "bar", veio ${JSON.stringify(ind.chartType)}`);
    }
    return {
      id: ind.id,
      name: ind.name,
      group: ind.group,
      datafile: ind.datafile,
      chartType: ind.chartType,
      // A unidade vive no ARQUIVO DE SÉRIE, não aqui (§6) — repetir metadado nos dois
      // lados é a duplicação que a ADR condena. Aceito se presente só durante a transição
      // (a fatia 11 remove); a UI lê a unidade da série carregada.
      unit: ind.unit ? validateUnit(ind.unit, `${where}.unit`) : null,
      yAxisTitle: typeof ind.yAxisTitle === 'string' ? ind.yAxisTitle : null,
    };
  });
  return { groups, indicators };
}

export async function loadCatalog({ url = '/indicators.json', fetchImpl = fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(url);
  } catch (cause) {
    throw new Error(`falha de rede ao buscar o catálogo ${url}`, { cause });
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao buscar o catálogo ${url}`);
  }
  return validateCatalog(await response.json());
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde; o teste do catálogo real confirma 13 indicadores e 7 grupos.

- [ ] **Passo 5: commitar**

```bash
cd sitio
git add app/src/data/catalog.js app/src/data/catalog.test.js
git commit -m "feat(app): validacao do catalogo de indicadores contra o arquivo real"
```

---

## Critérios de aceite da fatia 01

- [ ] `cd sitio/app && npm test` → a suíte fica verde.
- [ ] `validateSeries` **recusa** `schema !== 1` com mensagem que cita a versão recebida
      e a esperada (§6).
- [ ] `validateSeries` **exige** `value` numérico e ignora `rate` (convivência §6).
- [ ] `validateSeries` confere `id` contra o pedido quando `expectedId` é dado (§6).
- [ ] `loadSeries` faz **uma** chamada de rede por URL em caso de sucesso, e **não**
      memoriza a falha — a segunda tentativa volta a buscar (§9.3).
- [ ] `validateCatalog` aceita o **`sitio/indicators.json` real** (13 indicadores, 7
      grupos) — verificado por teste, não por inspeção.
- [ ] `validateCatalog` **não exige** `unit` no indicador: a unidade vive no arquivo de
      série (§6) e a UI a lê de lá. Presença só é validada durante a transição.
- [ ] Nenhuma dependência de navegador: `npm test` roda com `environment: 'node'`.
- [ ] Nada em `window`; nenhum `console.log` de debug.

## Auto-revisão

- **Cobertura da spec:** §6 (schema canônico, `value`, `schema: 1` recusado em voz alta,
  `id` conferido, `indicatorName` fora) → tarefa 1; §10.7 (validação de schema, cache,
  dado malformado como alvo de teste) → tarefas 1–2; §8 regra 5 (`data/` valida e falha
  em voz alta) → tarefas 1–3; §9.3 (`schema` desconhecido cai no estado de erro) → o
  `SchemaError` é o insumo, a superfície vem na fatia 07.
- **Fora desta fatia, de propósito:** a validação das séries **reais** de `dados/` (elas
  ainda publicam `rate`; passam a `value` na fatia 11). O teste de integração contra os
  13 arquivos reais é critério de aceite da fatia 11.
- **Sem placeholders:** cada passo traz o arquivo inteiro e a saída esperada do comando.
- **Consistência de nomes:** `SCHEMA_VERSION` (fatia 00) · `validateSeries`,
  `validateUnit`, `SchemaError`, `loadSeries`, `clearSeriesCache`, `validateCatalog`,
  `loadCatalog`, `Series`, `Unit` — reusados como estão pelas fatias 02–09.

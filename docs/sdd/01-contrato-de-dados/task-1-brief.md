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


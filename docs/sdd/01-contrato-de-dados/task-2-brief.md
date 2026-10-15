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


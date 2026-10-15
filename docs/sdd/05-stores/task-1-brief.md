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


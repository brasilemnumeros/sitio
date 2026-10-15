### Tarefa 3: Catálogo de indicadores (`validateCatalog` / `loadCatalog`)

**Arquivos:**
- Criar: `sitio/app/src/data/catalog.js`
- Teste: `sitio/app/src/data/catalog.test.js`

**Interfaces:**
- Consome: `SchemaError` de `./validate.js`.
- Produz:
  - `validateCatalog(raw) -> { groups, indicators }` — cada indicador com os campos
    **validados** (`id`, `name`, `group`, `datafile`, `chartType`, `yAxisTitle`) e **o resto
    preservado** do arquivo (`description`, `yAxisMax`, …). `unit` **não é validado** (R16).
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

  it('NÃO valida unit — a unidade não é assunto do catálogo (§6, R16)', () => {
    // O registro real traz unidades de transição malformadas (`{type:'number', symbol:''}`
    // sem `decimals`) que não podem derrubar a leitura do catálogo.
    const comUnitEstranho = {
      ...catalogoMinimo,
      indicators: [{ ...catalogoMinimo.indicators[0], unit: { type: 'banana', symbol: 42 } }],
    };
    expect(() => validateCatalog(comUnitEstranho)).not.toThrow();
  });

  it('PRESERVA os campos de apresentação — nada é descartado em silêncio (§6)', () => {
    // `yAxisMax` existe de verdade: `proporcao-homicidios-armas-fogo-anual` traz 100.
    const comApresentacao = {
      ...catalogoMinimo,
      indicators: [
        { ...catalogoMinimo.indicators[0], description: 'texto editorial', yAxisMax: 100 },
      ],
    };
    const [ind] = validateCatalog(comApresentacao).indicators;
    expect(ind.description).toBe('texto editorial');
    expect(ind.yAxisMax).toBe(100);
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
import { SchemaError } from './validate.js';

const CHART_TYPES = new Set(['line', 'bar']);

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {string} group
 * @property {string} datafile
 * @property {'line'|'bar'} chartType
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
    // PRESERVA o resto do registro (R16 emendado): `description`, `yAxisMax` e afins são
    // curadoria de APRESENTAÇÃO e pertencem ao catálogo (§6) — descartá-los em silêncio
    // seria perda invisível de dado, e o revisor pegou exatamente isso (`yAxisMax: 100` em
    // `proporcao-homicidios-armas-fogo-anual`).
    // `unit` vem junto se estiver no arquivo, mas o app NÃO o lê daqui: a unidade vem da
    // SÉRIE carregada (fatias 05 e 08), e o campo sai do registro na fatia 11.
    return {
      ...ind,
      id: ind.id,
      name: ind.name,
      group: ind.group,
      datafile: ind.datafile,
      chartType: ind.chartType,
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
- [ ] `validateCatalog` **não valida `unit`** — um `unit` malformado no registro não faz o
      catálogo falhar (R16). A unidade é lida da **série carregada**, não do registro.
- [ ] `validateCatalog` **preserva os campos de apresentação** — `description` e `yAxisMax`
      sobrevivem à validação; nada é descartado em silêncio (§6, achado do revisor).
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

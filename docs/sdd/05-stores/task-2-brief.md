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

  it('a retentativa também pega a unidade da SÉRIE, não a do catálogo (§6, R28)', async () => {
    // O catálogo carrega uma unidade TRANSITÓRIA; quem manda é a série (§6).
    // As duas unidades são de propósito DIFERENTES — com `entrada()`/`okSerie()` iguais o
    // teste passaria sem provar nada.
    const doCatalogo = { type: 'number', symbol: '', decimals: 0 };
    const daSerie = { type: 'percentage', symbol: '%', decimals: 2 };
    await adicionarSerie({ ...entrada('b'), unit: doCatalogo }, { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    expect(get(seriesStore).itens[0].unit).toEqual(doCatalogo);   // ainda a do catálogo

    await tentarNovamente('b', { fetchImpl: okSerie('b') });
    expect(get(seriesStore).itens[0].unit).toEqual(daSerie);      // agora a da SÉRIE
  });

  it('o override de cor sobrevive à remoção de outra série — a chave é o id (§1)', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: okSerie('b') });
    definirCor('b', '#123456');
    removerSerie('a');                       // 'b' muda de posição (1 → 0)
    expect(corDe('b')).toBe('#123456');      // sobreviveu: a cor NÃO é por posição
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
    // R28 — a unidade vem da SÉRIE, como no caminho de adicionar (§6). Sem isto, a MESMA série
    // chegaria com unidade diferente conforme tivesse vindo pelo add ou pela retentativa.
    escrever((itens) => itens.map((i) => (i.id === id ? { ...i, status: 'ok', series, unit: series.unit, error: null } : i)));
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

> **R28 — a unidade vem da série, nos dois caminhos.** A versão anterior deste plano fazia
> `tentarNovamente` gravar só `status`/`series`/`error`, sem `unit` — enquanto `adicionarSerie`
> grava `unit: series.unit`. Efeito: a **mesma** série ficava com unidade diferente conforme
> tivesse chegado pelo add ou por uma retentativa, contra o §6. Achado do revisor; a classe do
> defeito é "dois caminhos para o mesmo estado, e só um faz a coisa toda".
>
> **R26 — a URL é guardada, não adivinhada.** A versão anterior deste plano fazia
> `tentarNovamente` reconstruir a URL a partir do id. Medido: o caminho publicado inclui a
> **família** (`dados/selic/selic-meta-acum-12m.json`), então a URL adivinhada daria 404 —
> numa ação cujo propósito é **recuperar de uma falha**. O item passa a guardar
> `url: entry.datafile`, e o teste abaixo **espia a URL que o `fetchImpl` recebeu** (o teste
> antigo não pegava isso: o falso `fetchImpl` ignorava o argumento).

---


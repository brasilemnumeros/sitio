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

it('R27 — não importa series.js, verificado NO FONTE e não por proxy', async () => {
  // O teste anterior conferia que `celulaDe` não existe e que `seriesStore` não é exportado —
  // mas um módulo poderia importar series.js SEM exportar nada disso e ainda passar.
  // O R27 proíbe o IMPORT, então é o import que tem de ser travado.
  //
  // ⚠ Casa por ESPECIFICADOR, não por regex sobre o texto inteiro. A versão anterior procurava
  // `from '…stores/'` e `series.js` no texto — e escapava de três formas que o Vite resolve:
  //   import { x } from './series'        (sem extensão)
  //   import '../stores/series'           (efeito colateral, sem `from`)
  //   const x = require('./series')       (CommonJS)
  const { readFileSync } = await import('node:fs');
  const fonte = readFileSync(new URL('./mandate.js', import.meta.url), 'utf8');
  const especificadores = [
    ...fonte.matchAll(/(?:from|require\s*\(|^[ \t]*import)\s*\(?\s*['"]([^'"]+)['"]/gm),
  ].map((m) => m[1]);
  // Um extrator que não acha nada faz o teste passar vazio — é o defeito que este teste existe
  // para evitar. Se isto falhar, o extrator quebrou, não o módulo.
  expect(especificadores.length).toBeGreaterThan(0);
  expect(especificadores.filter((e) => /series/i.test(e))).toEqual([]);
});
```

```js
// Crie: sitio/app/src/stores/axes.test.js
import { get } from 'svelte/store';
import { axesStore, recalcularEixos, moverParaEixo } from './axes.js';

const serie = (id, valores, unit = { type: 'percentage', symbol: '%', decimals: 2 }) => ({
  id, unit, granularity: 'monthly', source: 'teste',
  // `data` é a forma canônica (validate.js), e a amplitude é max−min (scales.js:13) —
  // com UM ponto a amplitude é 0 e nenhum veredito dispara. Daí dois pontos por série.
  data: valores.map((v, i) => ({ date: `2020-0${i + 1}-01`, value: v })),
});
const s = (id) => serie(id, [0, 1]);                                  // amplitude 1
const grande = serie('g', [0, 1e11], { type: 'currency', symbol: 'R$' });   // amplitude 1e11
const pequeno = serie('p', [0, 1], { type: 'currency', symbol: 'R$' });     // amplitude 1

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
import { writable } from 'svelte/store';
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

/** A única escrita que o ADAPTER chama (§8.1) — nenhum componente lê a janela de volta do
 * gráfico para escrevê-la aqui. (`resetarJanela` é a outra escrita: as duas são ações nomeadas,
 * nenhuma é alcançável de fora de `stores/`.) */
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
- [ ] **A unidade da série vence a do catálogo nos DOIS caminhos** — no `adicionarSerie` e na
      `tentarNovamente` (§6, R28). O teste usa unidades **diferentes** de propósito: com
      `entrada()` e `okSerie()` idênticos, ele passaria sem provar nada.
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

# Home como terminal de análise — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a home num terminal de análise de altura fixa (`100dvh`): gráfico preenchendo o viewport, gavetas de séries/legenda/eixos (direita) e mandatos/comparação (inferior) fechadas por padrão, abrindo com um preset do dia determinístico.

**Architecture:** O site Astro passa a usar um layout próprio da home, sem nav/footer/feedback/toast. O app Svelte deixa de ser uma pilha `max-w-6xl` e vira uma moldura `h-dvh` em três faixas (topo 34px, miolo `flex-1`, barra inferior 26px), com um trilho direito de 34px que abre para 320px. O gráfico passa a herdar a altura do container (`autoSize` da lib) e o preset entra por `permalink-init.js`, antes de qualquer escrita de URL, respeitando `?indicators=`.

**Tech Stack:** Astro 7, Svelte 5 (runes), Tailwind 4, Lightweight Charts 5, Vitest, Playwright. Sem dependências novas.

**Spec:** `docs/specs/2026-10-26-home-estilo-tradingview-design.md` (aprovada em 2026-10-27).

## Global Constraints

- Escopo: **apenas a home (`/`)**. Blog, posts, categorias, links, políticas e 404 não mudam.
- A classe-canário `bg-[#0e1117]/100` continua existindo **uma única vez** em `app/src/App.svelte`, no `<main>` — `scripts/checar-canario.sh` depende disso.
- `100dvh` com fallback `100vh`; a página da home não rola (quem rola são as gavetas).
- Comentários e textos de interface em **português**; identificadores seguem a convenção do repo (domínio em português, infra em inglês).
- Nenhum evento de analytics novo, nenhum GTM, nada antes do consentimento LGPD. `npm run test:analytics` tem de continuar passando.
- Nenhuma dependência nova. Node >= 26; comandos do app com `NODE_ENV=development`.
- E2E falha com qualquer `console.error` ou exceção não capturada.
- Atributos `data-bloco` preservados: `chips`, `filtros`, `trilho`, `comparacao`, `inicial`, `esqueleto`, `ficha` (e `lista-mobile`, do modal).
- Precedência de entrada (spec, "Precedência de estado na entrada"): chave `indicators` com id válido vence tudo; chave presente sem id válido → `EstadoInicial`; sem a chave → preset do dia.
- Presets **substituem** as séries em cena; fora de preset o chip mostra "Personalizado".
- Gavetas não persistem estado: toda visita abre com as duas fechadas.

## Review Focus

1. **Fuso do preset.** Um acesso às 23h59 em São Paulo e outro às 00h01 do dia seguinte têm de trocar de preset exatamente na virada local, não na virada UTC — o preset é calculado com `America/Sao_Paulo`, nunca com a data do navegador em UTC.
2. **Preset com id ausente do catálogo.** Se um indicador do preset sair do catálogo, o restante carrega normalmente; se todos saírem, a home cai no `EstadoInicial` sem erro de console.
3. **Redimensionamento com o gráfico montado.** Abrir/fechar a gaveta direita ou a inferior muda a largura/altura do pane; o canvas tem de acompanhar (`autoSize`) sem estourar a moldura nem borrar o traço.
4. **Query com outras chaves.** `/?utm_source=x` (sem `indicators`) recebe o preset **e** preserva `utm_source` na URL reescrita; `/?indicators=nao-existe&utm_source=x` não recebe preset e também preserva `utm_source`.
5. **Troca rápida de preset.** Escolher dois presets em sequência não duplica séries: ao final, o conjunto e a URL correspondem ao último preset escolhido.
6. **Remover a última série com gaveta inferior aberta.** A moldura permanece, as alças ficam desabilitadas e nada lança (`setVisibleRange` em gráfico vazio é o defeito histórico).

---

### Task 1: Módulo puro de presets

**Files:**
- Create: `app/src/data/presets.js`
- Test: `app/src/data/presets.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `PRESETS: Array<{ id: string, nome: string, indicadores: string[] }>` — seis entradas, nesta ordem: `juros`, `inflacao`, `habitacao`, `violencia`, `atividade`, `trabalho`, com os ids exatos da spec.
  - `dataEmSaoPaulo(agora?: Date) => string` — `AAAA-MM-DD` no fuso `America/Sao_Paulo`.
  - `presetDoDia(dataISO: string, lista?: typeof PRESETS) => Preset | null` — rotação determinística por dia; lista vazia ou data inválida → `null`.
  - `presetDosIds(ids: string[], lista?: typeof PRESETS) => Preset | null` — igualdade de **conjunto** com `indicadores`; vazio ou sem correspondência → `null`.

- [ ] **Step 1: Write the failing tests**

```js
// app/src/data/presets.test.js
import { describe, it, expect } from 'vitest';
import { PRESETS, dataEmSaoPaulo, presetDoDia, presetDosIds } from './presets.js';

describe('dataEmSaoPaulo', () => {
  it('usa o dia LOCAL de São Paulo, não o dia UTC', () => {
    expect(dataEmSaoPaulo(new Date('2026-10-27T02:00:00Z'))).toBe('2026-10-26');
    expect(dataEmSaoPaulo(new Date('2026-10-27T03:00:00Z'))).toBe('2026-10-27');
  });
});

describe('presetDoDia', () => {
  it('é determinístico: a mesma data devolve o mesmo preset', () => {
    expect(presetDoDia('2026-10-27')).toBe(presetDoDia('2026-10-27'));
  });

  it('rotaciona: seis dias consecutivos cobrem os seis presets, e o sétimo repete o primeiro', () => {
    const dias = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    const vistos = dias.map((d) => presetDoDia(d).id);
    expect(new Set(vistos).size).toBe(PRESETS.length);
    expect(presetDoDia('2026-11-01').id).toBe(presetDoDia('2026-10-26').id);
  });

  it('lista vazia ou data inválida → null', () => {
    expect(presetDoDia('2026-10-27', [])).toBeNull();
    expect(presetDoDia('ontem')).toBeNull();
  });
});

describe('presetDosIds', () => {
  it('compara por CONJUNTO, sem depender da ordem', () => {
    const [{ indicadores }] = PRESETS;
    expect(presetDosIds([...indicadores].reverse())).toBe(PRESETS[0]);
  });

  it('conjunto diferente, vazio ou com id a mais → null', () => {
    expect(presetDosIds([])).toBeNull();
    expect(presetDosIds(['selic-meta-acum-12m'])).toBeNull();
    expect(presetDosIds([...PRESETS[0].indicadores, 'ipca-acum-12m'])).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && NODE_ENV=development npx vitest run src/data/presets.test.js`
Expected: FAIL — `Failed to load url ./presets.js`.

- [ ] **Step 3: Implement `app/src/data/presets.js`**

`dataEmSaoPaulo` usa `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })` formatado uma vez no módulo. `presetDoDia` converte `dataISO` em `Date.parse(`${dataISO}T00:00:00Z`)`, calcula o dia inteiro desde a época (`Math.floor(ms / 86400000)`), aplica módulo positivo pelo tamanho da lista e devolve `lista[i]`. Nada de `Math.random` nem de `new Date()` sem argumento dentro do módulo. `presetDosIds` usa `new Set(ids)` e compara tamanho + pertencimento.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && NODE_ENV=development npx vitest run src/data/presets.test.js`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/data/presets.js app/src/data/presets.test.js
git commit -m "feat(presets): lista nomeada e preset do dia determinístico"
```

---

### Task 2: Troca atômica do conjunto de séries

**Files:**
- Modify: `app/src/stores/series.js`
- Test: `app/src/stores/series.test.js`

**Interfaces:**
- Consumes: `loadSeries`, `reindexarCores`, `LIMITE_SERIES` (todos já em `stores/series.js`).
- Produces: `substituirSeries(entries: CatalogEntry[], { fetchImpl }?: { fetchImpl?: typeof fetch }) => Promise<void>` — troca o conjunto numa **única** emissão da store (todas as séries entram como `carregando`, já com cor por posição), depois carrega em paralelo. Ids repetidos são descartados (primeiro vence); a lista é cortada em `LIMITE_SERIES`; falha de uma série vira `status: 'erro'` naquela série, sem derrubar as demais.

- [ ] **Step 1: Write the failing tests**

```js
// app/src/stores/series.test.js — acrescente `substituirSeries` ao import já existente
// import { …, substituirSeries } from './series.js';

describe('substituirSeries — preset troca o conjunto numa escrita atômica', () => {
  it('emite UMA vez com todas as séries carregando, na ordem recebida', async () => {
    const emissoes = [];
    const parar = seriesStore.subscribe((s) => emissoes.push(s.itens.map((i) => i.status)));
    await substituirSeries([entrada('a'), entrada('b')], { fetchImpl: okSerie('a') });
    parar();
    expect(emissoes[1]).toEqual(['carregando', 'carregando']);
    expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['a', 'b']);
    expect(get(seriesStore).itens.every((i) => i.status === 'ok')).toBe(true);
  });

  it('descarta id repetido e corta no teto da paleta', async () => {
    const dez = Array.from({ length: 12 }, (_, i) => entrada(`s${i}`));
    await substituirSeries([entrada('a'), entrada('a'), ...dez], { fetchImpl: okSerie('s0') });
    const itens = get(seriesStore).itens;
    expect(itens[0].id).toBe('a');
    expect(itens).toHaveLength(LIMITE_SERIES);
  });

  it('falha de uma série é parcial: as outras seguem `ok`', async () => {
    await substituirSeries([entrada('a'), entrada('b')], {
      fetchImpl: async (url) => (String(url).endsWith('b.json')
        ? { ok: false, status: 500, json: async () => ({}) }
        : okSerie('a')()),
    });
    expect(get(seriesStore).itens.map((i) => i.status)).toEqual(['ok', 'erro']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && NODE_ENV=development npx vitest run src/stores/series.test.js -t substituirSeries`
Expected: FAIL — `substituirSeries is not a function`.

- [ ] **Step 3: Implement `substituirSeries` em `app/src/stores/series.js`**

Extraia a criação do item (`{ id, name, url, unit, cor: null, corPessoal: false, status: 'carregando', series: null, error: null }`) para um helper local reutilizado por `adicionarSerie` e `substituirSeries`. `substituirSeries` filtra ids repetidos, corta em `LIMITE_SERIES` e faz `seriesStore.set({ itens: reindexarCores(unicos.map(paraItem)) })` — um `set`, não um `update` por série. Depois `await Promise.all(...)`; cada carga atualiza só o próprio item pelo mesmo caminho de erro de `adicionarSerie` (mensagem da exceção em `error`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && NODE_ENV=development npx vitest run src/stores/series.test.js`
Expected: PASS (todos os testes do arquivo, incluindo os antigos).

- [ ] **Step 5: Commit**

```bash
git add app/src/stores/series.js app/src/stores/series.test.js
git commit -m "feat(series): substituir o conjunto numa escrita atômica"
```

---

### Task 3: Preset na entrada, com `?indicators=` mandando

**Files:**
- Modify: `app/src/permalink-init.js`
- Test: `app/src/permalink-init.test.js`

**Interfaces:**
- Consumes: `lerIds`, `escreverSearch`, `carregarCatalogo`, `indicadorPorId`, `adicionarSerie`, `presetDoDia`, `dataEmSaoPaulo`.
- Produces: `iniciarPermalink({ window, fetchImpl, agora = new Date() })` — mesma assinatura atual mais o relógio injetável. Sem a chave `indicators`, aplica `presetDoDia(dataEmSaoPaulo(agora))`; com a chave, nunca aplica preset (mesmo que não sobre nenhum id válido).

- [ ] **Step 1: Write the failing tests**

Substitua o teste "sem query: store vazia e NENHUM replaceState espúrio" por testes de precedência:

```js
// app/src/permalink-init.test.js
import { PRESETS, presetDoDia, dataEmSaoPaulo } from './data/presets.js';

it('sem a chave indicators: aplica o preset do dia e o escreve na URL', async () => {
  const win = janelaFalsa('');
  const agora = new Date('2026-10-27T12:00:00Z');
  const esperado = presetDoDia(dataEmSaoPaulo(agora));
  parar = await iniciarPermalink({
    window: win,
    fetchImpl: fixture(PRESETS.flatMap((p) => p.indicadores)),
    agora,
  });
  expect(get(seriesStore).itens.map((i) => i.id)).toEqual(esperado.indicadores);
  expect(win.history.replaceState.mock.calls.at(-1)[2]).toBe(
    `/?indicators=${esperado.indicadores.join(',')}`,
  );
});

it('chave indicators presente mas sem id válido: NÃO aplica preset', async () => {
  const win = janelaFalsa('?indicators=nao-existe');
  parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic']) });
  expect(get(seriesStore).itens).toEqual([]);
});

it('chave indicators válida vence o preset', async () => {
  const win = janelaFalsa('?indicators=selic');
  parar = await iniciarPermalink({ window: win, fetchImpl: fixture(['selic', 'ipca']) });
  expect(get(seriesStore).itens.map((i) => i.id)).toEqual(['selic']);
});

it('preset cujos ids não existem no catálogo não quebra: store vazia', async () => {
  const win = janelaFalsa('');
  parar = await iniciarPermalink({
    window: win,
    fetchImpl: fixture(['outro']),
    agora: new Date('2026-10-27T12:00:00Z'),
  });
  expect(get(seriesStore).itens).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd app && NODE_ENV=development npx vitest run src/permalink-init.test.js`
Expected: FAIL — o teste "sem a chave indicators" recebe store vazia.

- [ ] **Step 3: Implement the precedence in `app/src/permalink-init.js`**

Depois de `esperarCatalogo` e da guarda de catálogo, decida uma vez:

```js
const params = new URLSearchParams(searchAtual());
const ids = params.has('indicators') ? lerIds(searchAtual()) : presetIds(agora);
```

`presetIds(agora)` devolve `presetDoDia(dataEmSaoPaulo(agora))?.indicadores ?? []`. O laço de `adicionarSerie` continua igual; a assinatura `seriesStore.subscribe(escreverUrl)` continua sendo registrada **depois** de aplicar o preset. Não reescreva a URL durante a aplicação.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd app && NODE_ENV=development npx vitest run src/permalink-init.test.js`
Expected: PASS (todos os testes, incluindo os de permalink existentes).

- [ ] **Step 5: Commit**

```bash
git add app/src/permalink-init.js app/src/permalink-init.test.js
git commit -m "feat(permalink): preset do dia quando não há indicators"
```

---

### Task 4: Layout da home sem a casca do site

**Files:**
- Create: `src/layouts/Home.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `Meta.astro`, `CookieConsent.astro`, `Analytics.astro`, `GA4_ID`, `VERSAO`, `../styles/main.css`.
- Produces: layout `Home` com props `{ title, description }`, `<html lang="pt-BR" class="dark">`, `<body class="h-dvh overflow-hidden">`, slot dentro de `<div id="app">`, **sem** `Nav`, `Footer`, `#feedback-btn`, `#toast-artigos`, `theme-switcher.js` e `toast-artigos.js`. O gate de consentimento/analytics continua idêntico ao do `Base.astro`.

- [ ] **Step 1: Write the failing test (E2E de casca)**

Acrescente em `app/e2e/casca.spec.js`:

```js
test('a home não carrega a casca do site: sem nav, footer, feedback nem toast', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav')).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('#feedback-btn')).toHaveCount(0);
  await expect(page.locator('#toast-artigos')).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js -g "casca do site"`
Expected: FAIL — `nav` count é 1.

- [ ] **Step 3: Create `src/layouts/Home.astro` and switch `src/pages/index.astro`**

Copie do `Base.astro` apenas o necessário: imports de `Meta`, `CookieConsent`, `Analytics`, `VERSAO`, `GA4_ID`, `main.css`; cálculo de `title`/`description` com os mesmos `throw` (falha em voz alta); `<head>` com `Meta`; `<body class="h-dvh overflow-hidden bg-[#0e1117]">`; slot; e o bloco `{import.meta.env.PROD && GA4_ID && (<><CookieConsent /><Analytics /></>)}`. Nada de nav/footer/feedback/toast/theme-switcher. `index.astro` troca `import Base from '../layouts/Base.astro'` por `import Home from '../layouts/Home.astro'` e `<Base …>` por `<Home …>` mantendo o `<link>` do `app.css`, o `<div id="app">` e o `<script>`.

- [ ] **Step 4: Verify build, the new test, and the analytics gate**

Run:
```bash
npm run build
npm run test:analytics
cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js -g "casca do site"
```
Expected: build PASS (inclui `verificar`); `test:analytics` PASS; E2E PASS.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Home.astro src/pages/index.astro app/e2e/casca.spec.js
git commit -m "feat(home): layout próprio, sem nav, footer, feedback e toast"
```

---

### Task 5: Moldura de altura fixa e gráfico flexível

**Files:**
- Modify: `app/src/App.svelte`, `app/src/components/Chart.svelte`, `app/src/components/Esqueleto.svelte`, `app/src/chart/adapter.js`
- Test: `app/e2e/casca.spec.js`

**Interfaces:**
- Consumes: os stores e componentes atuais.
- Produces: `App.svelte` com `<main class="flex h-dvh flex-col overflow-hidden …">` e a estrutura `header[data-testid="barra-superior"]` / `div` do miolo (`gráfico` + `aside[data-testid="trilho-direito"]`) / `footer[data-testid="barra-inferior"]`. `Chart.svelte` raiz `flex min-h-0 flex-1 flex-col gap-2`, gráfico `min-h-0 flex-1`, minimapa `h-12 shrink-0`. `criarAdapter` passa `autoSize: true` ao `createChart`.

- [ ] **Step 1: Write the failing tests**

```js
// app/e2e/casca.spec.js
test('a home ocupa o viewport e não rola', async ({ page }) => {
  await page.goto('/?indicators=nao-existe');
  const medida = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    altura: window.innerHeight,
  }));
  expect(medida.scroll).toBeLessThanOrEqual(medida.altura + 1);
  await expect(page.getByTestId('barra-superior')).toBeVisible();
  await expect(page.getByTestId('barra-inferior')).toBeVisible();
  await expect(page.getByTestId('trilho-direito')).toBeVisible();
});

test('com série, o gráfico ocupa a maior parte da altura', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('grafico').locator('canvas').first()).toBeVisible();
  const { grafico, janela } = await page.evaluate(() => ({
    grafico: document.querySelector('[data-testid="grafico"]').getBoundingClientRect().height,
    janela: window.innerHeight,
  }));
  expect(grafico / janela).toBeGreaterThan(0.6);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js -g "não rola|maior parte"`
Expected: FAIL — `[data-testid="barra-superior"]` não existe e o gráfico ainda tem 480px.

- [ ] **Step 3: Implement the frame**

Em `App.svelte`, mantenha o comentário e a classe-canário no `<main>` — o `h-dvh` entra na mesma classe. O miolo é `<div class="flex min-h-0 flex-1">`, com a coluna do gráfico `flex min-w-0 flex-1 flex-col` e a área do gráfico `relative min-h-0 flex-1`; a `aside`/`footer` ficam como marcadores de posição com as medidas fechadas (34px e 26px) até as Tasks 7 e 8. Preserve os ramos `EstadoInicial`, `ErroTotal`, `Esqueleto`, `Chart` e a busca. O `EstadoInicial` continua com **só** o atalho "Selic × IPCA" (a busca é única, na barra superior — o comentário do próprio componente explica por que não se duplica um campo). Em `Chart.svelte`, envolva os dois containers no flex acima e remova as alturas fixas. Em `Esqueleto.svelte`, troque `h-[480px]` do primeiro bloco por `min-h-0 flex-1` (o componente passa a preencher a área), mantenha o minimapa em `h-12` e **remova o bloco 3** (as linhas da matriz): a matriz agora vive na gaveta inferior e um esqueleto dela dentro do gráfico estouraria a moldura. Em `chart/adapter.js`, acrescente `autoSize: true` às opções de `createChart`, com um comentário de uma linha explicando que a altura vem do container.

- [ ] **Step 4: Verify**

Run:
```bash
cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js
```
Expected: os novos testes passam. Os antigos de ordem de blocos ainda podem falhar — serão ajustados na Task 10; registre quais falharam.

- [ ] **Step 5: Commit**

```bash
git add app/src/App.svelte app/src/components/Chart.svelte app/src/components/Esqueleto.svelte app/src/chart/adapter.js app/e2e/casca.spec.js
git commit -m "feat(home): moldura de altura fixa e gráfico flexível"
```

---

### Task 6: Barra superior (marca, busca, janela, preset, permalink)

**Files:**
- Create: `app/src/components/HomeToolbar.svelte`
- Modify: `app/src/components/TimeFilters.svelte`, `app/src/App.svelte`
- Test: `app/e2e/presets.spec.js` (novo, parcial)

**Interfaces:**
- Consumes: `seriesStore`, `catalogStore`, `indicadorPorId`, `substituirSeries`, `PRESETS`, `presetDoDia`, `presetDosIds`, `dataEmSaoPaulo`, `TimeFilters`.
- Produces:
  - `HomeToolbar` com props `{ aoAbrirBusca: () => void }`.
  - `TimeFilters` com prop opcional `{ compacto = false }`; `data-bloco="filtros"` e os cinco botões (`1a`, `5a`, `10a`, `30a`, "Tudo") continuam iguais.
  - Marcadores: `data-testid="preset-chip"`, `data-testid="menu-presets"`, `data-testid="botao-permalink"`.
  - Chip do preset: `presetDosIds(itens.map(i => i.id))?.nome ?? (itens.length ? 'Personalizado' : 'Presets')`.

- [ ] **Step 1: Write the failing test**

```js
// app/e2e/presets.spec.js
import { test, expect } from './apoio.js';

test('a barra superior traz marca, busca, cinco janelas e o chip do preset', async ({ page }) => {
  await page.goto('/');
  const topo = page.getByTestId('barra-superior');
  await expect(topo).toContainText('Brasil em Números');
  await expect(topo.getByRole('button', { name: 'Buscar indicador…' })).toBeVisible();
  for (const nome of ['Janela de 1 ano', 'Janela de 5 anos', 'Janela de 10 anos', 'Janela de 30 anos', 'Janela completa']) {
    await expect(topo.getByRole('button', { name: nome })).toBeVisible();
  }
  await expect(page.getByTestId('preset-chip')).not.toHaveText('Personalizado');
  // a marca é identidade, não link para si mesma
  await expect(topo.getByRole('link', { name: /Brasil em Números/ })).toHaveCount(0);
  // e há uma saída para o conteúdo
  await expect(topo.getByRole('link', { name: 'Artigos' })).toHaveAttribute('href', '/blog');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd app && NODE_ENV=development npx playwright test e2e/presets.spec.js -g "barra superior"`
Expected: FAIL — `[data-testid="barra-superior"]` não tem o chip.

- [ ] **Step 3: Implement**

`HomeToolbar` é `header[data-testid="barra-superior"]` com `flex h-[34px] items-center gap-2 px-2 text-xs` (mobile: `h-[30px]`). Composição da esquerda para a direita: marca compacta (quadrado azul + "Brasil em Números", sem `<a>`), botão de busca com o rótulo acessível **"Buscar indicador…"** (o mesmo de hoje, que os E2E usam), `<TimeFilters compacto />`, chip + menu de presets, link "Artigos" (`/blog`), botão de permalink e botão de tela cheia (renderizado só se `document.fullscreenEnabled`). `⌘K`/`Ctrl+K` chama `aoAbrirBusca`.

O menu do preset é um `div[role="menu"]` com um botão por preset (`role="menuitem"`) e um item "Do dia · <nome>". Ao escolher, resolva os ids com `indicadorPorId`, descarte os ausentes e chame `await substituirSeries(entries)` (uma escrita); feche o menu. O chip usa `aria-expanded` e `aria-controls="menu-presets"`. "Permalink" faz `navigator.clipboard.writeText(location.href)` e troca o rótulo para "Copiado" por 1,5 s. Tela cheia chama `document.documentElement.requestFullscreen()` e engole a rejeição (sem `console.error`).

Em `TimeFilters`, `compacto` esconde o rótulo "Janela de tempo" e a mensagem de motivo, e usa `px-1.5 py-0.5 text-xs`; toda a lógica de `viewport` fica intacta.

Em `App.svelte`, troque o botão de busca do topo por `<HomeToolbar aoAbrirBusca={() => (buscaAberta = true)} />`.

- [ ] **Step 4: Verify**

Run:
```bash
cd app && NODE_ENV=development npx playwright test e2e/presets.spec.js -g "barra superior"
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/HomeToolbar.svelte app/src/components/TimeFilters.svelte app/src/App.svelte app/e2e/presets.spec.js
git commit -m "feat(home): barra superior com busca, janelas e preset"
```

---

### Task 7: Gaveta direita — séries, cores e eixos

**Files:**
- Create: `app/src/components/SeriesDrawer.svelte`, `app/src/components/AxesPanel.svelte`
- Modify: `app/src/components/SeriesLegend.svelte`, `app/src/App.svelte`
- Test: `app/e2e/casca.spec.js`

**Interfaces:**
- Consumes: `SeriesChips`, `SeriesLegend`, `axesStore`, `moverParaEixo`, `seriesStore`.
- Produces: `SeriesDrawer` com props `{ aberta: boolean, aoFechar: () => void, aoAbrirBusca: () => void }`; `aside[data-testid="gaveta-direita"]` com `id="gaveta-direita"`, três seções (`data-secao="series"`, `"cores"`, `"eixos"`) e gatilhos no trilho com `aria-expanded`/`aria-controls`. `AxesPanel` renderiza uma linha por série com o botão `esq.`/`dir.` (mesmo nome acessível de hoje) e o aviso de escala (`axesStore.avisos`).

- [ ] **Step 1: Write the failing tests**

```js
// app/e2e/casca.spec.js
test('a gaveta direita abre, mostra as três seções e fecha com Esc', async ({ page }) => {
  await page.goto('/');
  const gatilho = page.getByRole('button', { name: 'Séries e eixos' });
  await expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  await gatilho.click();
  const gaveta = page.getByTestId('gaveta-direita');
  await expect(gaveta).toBeVisible();
  const secoes = await gaveta.locator('[data-secao]').evaluateAll((els) => els.map((e) => e.dataset.secao));
  expect(secoes).toEqual(['series', 'cores', 'eixos']);
  await expect(gaveta.locator('[data-bloco="chips"]')).toHaveCount(1);
  await expect(gaveta.getByTestId('legenda-series')).toHaveCount(1);
  await expect(gaveta.getByRole('button', { name: /esq\.|dir\./ }).first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
  await expect(gatilho).toHaveAttribute('aria-expanded', 'false');
  await expect(gatilho).toBeFocused();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js -g "gaveta direita"`
Expected: FAIL — o botão e a gaveta não existem.

Acrescente também o teste de redimensionamento (Review Focus 3):

```js
test('abrir a gaveta direita encolhe o gráfico sem estourar a moldura', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('preset-chip').waitFor();
  const largura = () => page.getByTestId('grafico').evaluate((el) => el.getBoundingClientRect().width);
  const semGaveta = await largura();
  await page.getByRole('button', { name: 'Séries e eixos' }).click();
  await expect(page.getByTestId('gaveta-direita')).toBeVisible();
  await expect.poll(largura).toBeLessThan(semGaveta);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 3: Implement**

`SeriesDrawer` mantém no trilho (34px) três botões verticais — "Séries", "Cores" e "Eixos" —, e é o primeiro deles que abre a gaveta, com `aria-label="Séries e eixos"` (é o nome que os testes usam). Com a gaveta aberta, os três atalhos rolam até a seção correspondente via `scrollIntoView({ block: 'start' })`; fechada, só o primeiro fica visível. Quando `aberta` é `false`, a `aside` leva `hidden`; quando `true`, `flex w-[320px] shrink-0 flex-col overflow-y-auto`. Alternar não pode zerar `viewport` nem `mandate`.

`AxesPanel` lê `$seriesStore.itens` e `$axesStore`; para cada item mostra nome, botão `esq.`/`dir.` (`moverParaEixo`) e, quando houver, o aviso de escala com a mesma frase de hoje. **Remova** de `SeriesLegend` o botão de eixo e o bloco `avisoEscala` (ficam no `AxesPanel`), para não haver dois controles iguais; mantenha cor, "restaurar", aviso de colisão e remover.

Quando a gaveta está fechada e alguma série tem `status === 'erro'`, o gatilho principal mostra um ponto de atenção (`aria-label` que inclui "há séries com erro" e um `<span>` vermelho `aria-hidden`), conforme a tabela de estados da spec.

`App.svelte` guarda `let direitaAberta = $state(false)` e renderiza `<SeriesDrawer aberta={direitaAberta} aoFechar={() => (direitaAberta = false)} aoAbrirBusca={() => (buscaAberta = true)} />`; o `Esc` fecha a camada do topo (busca → gaveta → nada).

- [ ] **Step 4: Verify**

Run: `cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js -g "gaveta direita"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/SeriesDrawer.svelte app/src/components/AxesPanel.svelte app/src/components/SeriesLegend.svelte app/src/App.svelte app/e2e/casca.spec.js
git commit -m "feat(home): gaveta direita com séries, cores e eixos"
```

---

### Task 8: Gaveta inferior — mandatos e comparação

**Files:**
- Create: `app/src/components/BottomDrawer.svelte`
- Modify: `app/src/App.svelte`
- Test: `app/e2e/trilho.spec.js`

**Interfaces:**
- Consumes: `MandateRail`, `ComparisonPanel`, `seriesStore`, `axesStore`.
- Produces: `BottomDrawer` com props `{ aberta, aoAlternar, mostrarCasca }`; `footer[data-testid="barra-inferior"]` fechado em 26px com o resumo `"<N> séries · <M> eixos"` (M = 2 se houver série à direita, senão 1) e, aberto, `h-[45dvh] max-h-[360px]` com `MandateRail` e `ComparisonPanel`. A alça é `<button aria-expanded aria-controls="gaveta-inferior">` e fica **desabilitada** (não escondida) quando `mostrarCasca` é falso.

- [ ] **Step 1: Write the failing test**

```js
// app/e2e/trilho.spec.js
test('a gaveta inferior abre com mandatos e matriz, e o resumo conta', async ({ page }) => {
  await page.goto('/');
  const alca = page.getByRole('button', { name: /Comparação por mandato/ });
  await expect(alca).toHaveAttribute('aria-expanded', 'false');
  await expect(alca).toContainText(/\d+ séries · \d+ eixos/);

  await alca.click();
  const gaveta = page.getByTestId('gaveta-inferior');
  await expect(gaveta).toBeVisible();
  await expect(gaveta.locator('[data-bloco="trilho"]')).toBeVisible();
  await expect(gaveta.locator('[data-bloco="comparacao"]')).toBeVisible();
  await expect(alca).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd app && NODE_ENV=development npx playwright test e2e/trilho.spec.js -g "gaveta inferior"`
Expected: FAIL — a alça não existe.

- [ ] **Step 3: Implement**

`App.svelte` ganha `let fundoAberto = $state(false)`. A gaveta fica **abaixo** do miolo (chart + trilho), de modo que crescer reduz o gráfico. O conteúdo (`MandateRail` + `ComparisonPanel`) só é montado quando `mostrarCasca` — fora disso a alça existe, desabilitada, e a moldura não pula. Abrir/fechar não chama nenhuma ação de `viewport`/`mandate`. No mobile, a gaveta é um bottom sheet com alça: arrastar para baixo além de 80px fecha (pointer events no handle) e um overlay `md:hidden` fecha ao toque.

- [ ] **Step 4: Verify**

Run: `cd app && NODE_ENV=development npx playwright test e2e/trilho.spec.js -g "gaveta inferior"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/BottomDrawer.svelte app/src/App.svelte app/e2e/trilho.spec.js
git commit -m "feat(home): gaveta inferior com mandatos e comparação"
```

---

### Task 9: Teclado, foco, mobile e movimento reduzido

**Files:**
- Modify: `app/src/App.svelte`, `app/src/components/SeriesDrawer.svelte`, `app/src/components/BottomDrawer.svelte`
- Test: `app/e2e/mobile.spec.js`

**Interfaces:**
- Consumes: as gavetas das Tasks 7 e 8.
- Produces: `Esc` fecha a camada do topo (busca → gaveta direita → gaveta inferior); `inert` na região do gráfico e na outra gaveta enquanto uma gaveta está aberta; foco inicial no primeiro controle da gaveta e retorno ao gatilho; no mobile, gaveta direita em folha de 88% da largura com overlay, e o gráfico com pelo menos 50% da altura do viewport.

- [ ] **Step 1: Write the failing tests**

```js
// app/e2e/mobile.spec.js
test('no celular o gráfico domina a tela e as gavetas abrem por toque', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'geometria de celular');
  await page.goto('/');
  const altura = await page.evaluate(() => ({
    grafico: document.querySelector('[data-testid="grafico"]').getBoundingClientRect().height,
    janela: window.innerHeight,
  }));
  expect(altura.grafico / altura.janela).toBeGreaterThanOrEqual(0.5);

  await page.getByRole('button', { name: 'Séries e eixos' }).click();
  const gaveta = page.getByTestId('gaveta-direita');
  await expect(gaveta).toBeVisible();
  const largura = await gaveta.evaluate((el) => el.getBoundingClientRect().width);
  expect(largura / (await page.evaluate(() => window.innerWidth))).toBeGreaterThanOrEqual(0.85);

  await page.getByRole('button', { name: 'Fechar séries' }).click();
  await expect(gaveta).toBeHidden();

  await page.getByRole('button', { name: /Comparação por mandato/ }).click();
  await expect(page.getByTestId('gaveta-inferior')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar comparação' }).click();
  await expect(page.getByTestId('gaveta-inferior')).toBeHidden();
  expect(await transbordo(page), 'com as gavetas fechadas').toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd app && NODE_ENV=development npx playwright test e2e/mobile.spec.js -g "gavetas abrem por toque" --project=mobile`
Expected: FAIL — `Fechar séries` / `Fechar comparação` não existem.

- [ ] **Step 3: Implement**

Adicione aos cabeçalhos das gavetas um botão de fechar com `aria-label="Fechar séries"` e `"Fechar comparação"`. Centralize o `keydown` de `Esc` na `App`: a busca tem prioridade, depois a gaveta direita, depois a inferior; só a camada fechada dispara a ação. Use `inert` (atributo booleano do Svelte) na região do gráfico e na outra gaveta enquanto houver gaveta aberta, e devolva o foco ao gatilho ao fechar (guarde o elemento antes de abrir). Classes: gaveta direita `max-md:fixed max-md:inset-y-0 max-md:right-0 max-md:z-40 max-md:w-[88%]` com overlay `md:hidden`; alvos de toque com `min-h-11 min-w-11 md:min-h-0 md:min-w-0`; transições com `motion-reduce:transition-none`.

Na mesma passada, ajuste o contraste do texto de apoio das gavetas para o mínimo AA sem tocar na paleta das séries: rótulos e valores passam de `slate-500` para `slate-400` no escuro e `slate-600` no claro, e o texto principal das gavetas usa `slate-200`/`slate-700`.

- [ ] **Step 4: Verify**

Run:
```bash
cd app && NODE_ENV=development npx playwright test e2e/mobile.spec.js --project=mobile
```
Expected: PASS (as asserções antigas de busca continuam verdes).

- [ ] **Step 5: Commit**

```bash
git add app/src/App.svelte app/src/components/SeriesDrawer.svelte app/src/components/BottomDrawer.svelte app/e2e/mobile.spec.js
git commit -m "feat(home): teclado, foco e gavetas no celular"
```

---

### Task 10: Adaptar a suíte E2E e fechar o preset

**Files:**
- Modify: `app/e2e/apoio.js`, `app/e2e/casca.spec.js`, `app/e2e/exemplo.spec.js`, `app/e2e/permalink.spec.js`, `app/e2e/busca.spec.js`, `app/e2e/trilho.spec.js`
- Test: `app/e2e/presets.spec.js` (completar)

**Interfaces:**
- Consumes: todas as tasks anteriores.
- Produces: helpers `abrirVazio(page)` (`goto('/?indicators=nao-existe')`), `abrirGavetaDireita(page)`, `abrirGavetaInferior(page)`; testes de preset (dia, precedência, troca, não duplicação, UTM).

- [ ] **Step 1: Write the failing preset tests**

```js
// app/e2e/presets.spec.js
import { test, expect, abrirVazio, abrirGavetaDireita } from './apoio.js';

test('/ abre com o preset do dia (não vazia)', async ({ page }) => {
  await page.goto('/');
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li').first()).toBeVisible();
  await expect(page.getByTestId('preset-chip')).not.toHaveText('Personalizado');
});

test('?indicators= vence o preset e não duplica', async ({ page }) => {
  await page.goto('/?indicators=selic-meta-acum-12m');
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(1);
  await expect(page.getByTestId('preset-chip')).toHaveText('Personalizado');
  await page.reload();
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(1);
});

test('escolher outro preset SUBSTITUI o conjunto e reescreve a URL', async ({ page }) => {
  await page.goto('/');
  await abrirGavetaDireita(page);
  const chip = page.getByTestId('preset-chip');
  const atual = (await chip.textContent()).trim();
  await chip.click();
  const menu = page.getByTestId('menu-presets');
  const opcoes = menu.getByRole('menuitem');
  const nomes = await opcoes.allTextContents();
  const indice = nomes.findIndex((n) => !n.includes(atual) && !n.startsWith('Do dia'));
  expect(indice, 'precisa haver outro preset nomeado no menu').toBeGreaterThanOrEqual(0);
  await opcoes.nth(indice).click();
  await expect(page.locator('[data-bloco="chips"] li').first()).toBeVisible();
  await expect(chip).not.toHaveText('Personalizado');
  await expect.poll(() => new URL(page.url()).searchParams.get('indicators')).not.toBeNull();
});

test('trocar de preset duas vezes em sequência não duplica séries', async ({ page }) => {
  await page.goto('/');
  await abrirGavetaDireita(page);
  const chip = page.getByTestId('preset-chip');
  await chip.click();
  await page.getByTestId('menu-presets').getByRole('menuitem').nth(0).click();
  const ids = () => page.locator('[data-bloco="chips"] li').count();
  await expect.poll(ids).toBeGreaterThan(0);
  const primeira = await ids();
  await chip.click();
  await page.getByTestId('menu-presets').getByRole('menuitem').nth(2).click();
  await expect.poll(ids).toBeGreaterThan(0);
  const segunda = await ids();
  expect(segunda).toBeLessThanOrEqual(10);
  const naUrl = new URL(page.url()).searchParams.get('indicators').split(',').filter(Boolean);
  expect(naUrl).toHaveLength(segunda);
  expect(primeira).toBeGreaterThan(0);
});

test('?utm_source sem indicators recebe preset e preserva a chave', async ({ page }) => {
  await page.goto('/?utm_source=teste');
  await expect.poll(() => new URL(page.url()).searchParams.get('utm_source')).toBe('teste');
  await abrirGavetaDireita(page);
  await expect(page.locator('[data-bloco="chips"] li').first()).toBeVisible();
});

test('remover a última série com a gaveta inferior aberta não lança', async ({ page }) => {
  await page.goto('/?indicators=selic-meta-acum-12m');
  await page.getByRole('button', { name: /Comparação por mandato/ }).click();
  await abrirGavetaDireita(page);
  await page.locator('[data-bloco="chips"]').getByRole('button', { name: /^Remover / }).click();
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /Comparação por mandato/ })).toBeDisabled();
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `cd app && NODE_ENV=development npx playwright test e2e/presets.spec.js`
Expected: FAIL nos helpers/expectativas ainda não adaptados.

- [ ] **Step 3: Adapt `apoio.js` and the existing specs**

- `abrirApp` continua esperando o botão "Buscar indicador…" (agora na barra superior).
- `abrirVazio`: `goto('/?indicators=nao-existe')` e espera `[data-bloco="inicial"]`.
- `abrirGavetaDireita`/`abrirGavetaInferior`: clicam no gatilho, esperam a gaveta visível e, se já estiver aberta, não repetem o clique.
- `casca.spec.js`: o cenário vazio usa `abrirVazio`; a ordem de `data-bloco` deixa de ser a da página — troque por asserções de presença dentro das gavetas. A antiga expectativa `[data-bloco="filtros"]` com contagem 0 vira **presente e desabilitado** (o topo é permanente; sem série, só as alças ficam inertes); `trilho` e `comparacao` continuam com contagem 0 sem série, porque o conteúdo da gaveta inferior não é montado. Mantenha canário, `dark` e luminância.
- `exemplo.spec.js`: `carregarExemplo` só no estado vazio; filtros agora estão no topo (sem abrir gaveta); os `chips` exigem a gaveta direita aberta; o botão `esq.`/`dir.` agora está em `[data-secao="eixos"]` (AxesPanel), não na legenda; a remoção da última série continua terminando em `[data-bloco="inicial"]` e `getByTestId('grafico')` com contagem 0.
- `permalink.spec.js` e `busca.spec.js`: abra a gaveta direita antes de contar/ver `[data-bloco="chips"]`.
- `trilho.spec.js`: abra a gaveta inferior antes de usar `[data-bloco="trilho"]`/`[data-bloco="comparacao"]`; a asserção "sem série → comparação com contagem 0" continua válida (conteúdo não é montado).

- [ ] **Step 4: Run the whole verification**

Run:
```bash
npm run build
npm run test:analytics
cd app && NODE_ENV=development npm test
NODE_ENV=development npm run test:e2e
```
Expected: build PASS (inclui `verificar` e a classe-canário); unitários PASS; `test:analytics` PASS; E2E PASS nos dois projetos (desktop e mobile), sem `console.error`.

- [ ] **Step 5: Commit**

```bash
git add app/e2e
git commit -m "test(home): suíte adaptada ao terminal e ao preset do dia"
```

---

## Critérios de aceite (o que fecha a fatia)

- Em 1440×900 e 1280×800: a página não rola, o gráfico ocupa a altura livre, as gavetas abrem e fecham sem alterar `viewport` nem `mandate`.
- Em 390×844: gráfico ≥ 50% da altura, gaveta direita em folha de 88%, gaveta inferior como bottom sheet, nenhum transbordo horizontal.
- `/` abre com o preset do dia; `?indicators=` válido vence; `?indicators=` só inválido cai no `EstadoInicial`; UTM preservado.
- Escolher preset substitui o conjunto (sem duplicar) e o chip diz "Personalizado" fora de preset.
- Nenhum erro de console nos percursos E2E; `npm run build` e `npm run test:analytics` verdes.

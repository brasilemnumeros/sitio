# Reportar problema nos dados — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um visitante que suspeita de um número abre, do trilho do app, um diálogo com o contexto
já preenchido e chega a uma issue real no repositório `dados` em dois cliques.

**Architecture:** Uma função pura monta `{título, corpo, url}` de `issues/new`; um componente
`<dialog>` nativo lê os stores (séries, catálogo, janela, mandato), mostra os campos que só a
pessoa sabe e expõe um `<a>` para o GitHub. Zero backend. O trilho ganha a ação; a `App` é dona do
estado aberto/fechado e da prioridade do `Esc`.

**Tech Stack:** Svelte 5 (runes), Vite, Tailwind v4, Vitest, Playwright. Sem dependência nova.

**Spec:** `docs/specs/2026-11-06-reportar-problema-nos-dados-design.md` (ler antes de codar)

## Global Constraints

- Sem backend, sem token, sem dependência nova — o site continua estático.
- Todo texto de interface em **português**, copiado do spec ao pé da letra.
- Nada de dado do navegador no corpo da issue (sem user-agent, idioma, tela, referrer).
- Comandos do app rodam com `NODE_ENV=development` nesta máquina (`cd app`).
- **Nunca dois E2E ao mesmo tempo**: um segundo suite reaproveita o servidor do primeiro.
- A classe-canário aparece **uma vez só**, em `App.svelte`; não repetir em comentário, doc ou teste.
- O contrato de dados (`versao: 1`) não muda. Nenhum arquivo de `dados/` é tocado além do
  `.github/ISSUE_TEMPLATE` do repo irmão.
- Analytics é parte da fatia: os eventos e o gate entram na **mesma** tarefa, não depois (Task 3).
- Commit ao fim de cada tarefa.

## Review Focus

1. **Várias séries no gráfico**: o seletor já vem na primeira; o título e o corpo precisam nomear a
   série **reportada** e o permalink levar **todas** — o relato não pode confundir as duas coisas.
2. **Texto do relato com `%`, `&`, `#`, acentos ou 2000+ caracteres**: a URL precisa continuar
   abrindo a issue, sem truncar o dado pela metade no meio de um acento.
3. **Campos vazios** (período, valores, fonte, janela, mandato): a issue nunca pode afirmar um mês
   ou um número que ninguém informou — vira "não informado".
4. **URL de chegada com `utm_*`/campanha**: o "Como reproduzir" sai canônico, só com `series`.
5. **Série escondida pelo olho**: continua no seletor e no permalink — ela está no gráfico.

---

### Task 1: Função pura que monta o relato

**Files:**
- Create: `app/src/domain/relato.js`
- Test: `app/src/domain/relato.test.js`

**Interfaces:**
- Consumes: `escreverSearch(ids, searchAtual)` de `app/src/permalink.js` (já existe; devolve a
  query só com `series`, ou `''` para lista vazia).
- Produces: `export const REPO_ISSUES = 'https://github.com/brasilemnumeros/dados/issues/new'` e
  `export function montarRelato({ id, nome, periodo, texto, valorVisto, valorEsperado, fonte, ids, urlBase, janela, mandato, data })`
  → `{ titulo: string, corpo: string, url: string }`.

- [ ] **Step 1: Escrever o teste que falha**

```js
import { describe, it, expect } from 'vitest';
import { montarRelato, REPO_ISSUES } from './relato.js';

const base = {
  id: 'ipca-acum-12m',
  nome: 'IPCA — acumulado em 12 meses',
  periodo: 'mai/2026',
  texto: 'O valor aparece 4,72%, mas no SIDRA é 4,84%.',
  valorVisto: '4,72%',
  valorEsperado: '4,84%',
  fonte: 'https://sidra.ibge.gov.br/tabela/1737',
  ids: ['ipca-acum-12m', 'selic-meta'],
  urlBase: 'https://www.brasilemnumeros.ong.br/',
  janela: { de: '2019-01-01', ate: '2026-05-01' },
  mandato: 'Lula III',
  data: '2026-11-06',
};

const corpo = (r) => new URL(r.url).searchParams.get('body');
const params = (r) => new URL(r.url).searchParams;

describe('montarRelato', () => {
  it('aponta para o repositório de dados, com a label', () => {
    const r = montarRelato(base);
    expect(r.url.startsWith(`${REPO_ISSUES}?`)).toBe(true);
    expect(params(r).get('labels')).toBe('erro-de-dado');
  });

  it('só manda título, corpo e label — nada do navegador', () => {
    const r = montarRelato(base);
    expect([...params(r).keys()].sort()).toEqual(['body', 'labels', 'title']);
  });

  it('monta todos os blocos do corpo', () => {
    const c = corpo(montarRelato(base));
    expect(c).toContain('### Indicador\n`ipca-acum-12m` — IPCA — acumulado em 12 meses');
    expect(c).toContain('### Período\nmai/2026');
    expect(c).toContain('### O que está errado\nO valor aparece 4,72%, mas no SIDRA é 4,84%.');
    expect(c).toContain('- Aparece no site: 4,72%\n- Esperado: 4,84%');
    expect(c).toContain('### Fonte oficial\nhttps://sidra.ibge.gov.br/tabela/1737');
    expect(c).toContain('janela visível: 2019-01 a 2026-05 · mandato: Lula III');
    expect(c).toContain('Enviado pelo formulário do site · 2026-11-06');
  });

  it('leva TODAS as séries no permalink, na ordem recebida', () => {
    const c = corpo(montarRelato(base));
    expect(c).toContain(
      '### Como reproduzir\nhttps://www.brasilemnumeros.ong.br/?series=ipca-acum-12m,selic-meta'
    );
  });

  it('codifica acentos, %, & e # sem perder o texto', () => {
    const texto = '100% & #1 — atenção ção';
    const r = montarRelato({ ...base, texto });
    expect(corpo(r)).toContain(texto);
    expect(r.url).not.toContain(' ');
    expect(r.url).toContain('%26');
  });

  it('ausências viram "não informado", nunca vazio', () => {
    const c = corpo(
      montarRelato({ ...base, periodo: '', valorVisto: '', valorEsperado: '', fonte: '', janela: null, mandato: null })
    );
    expect(c).toContain('### Período\nnão informado');
    expect(c).toContain('- Aparece no site: não informado\n- Esperado: não informado');
    expect(c).toContain('### Fonte oficial\nnão informada');
    expect(c).toContain('janela visível: não informada · mandato: nenhum');
  });

  it('trunca o relato em 2000 caracteres', () => {
    const c = corpo(montarRelato({ ...base, texto: 'a'.repeat(2500) }));
    expect(c).toContain('a'.repeat(2000));
    expect(c).not.toContain('a'.repeat(2001));
  });

  it('sem período o título fala em possível erro', () => {
    const r = montarRelato({ ...base, periodo: '' });
    expect(params(r).get('title')).toBe('IPCA — acumulado em 12 meses: possível erro no dado');
  });

  it('com período o título nomeia o mês', () => {
    const r = montarRelato(base);
    expect(params(r).get('title')).toBe(
      'IPCA — acumulado em 12 meses: valor de mai/2026 parece errado'
    );
  });

  it('mantém a URL abaixo do limite prático do GitHub', () => {
    const r = montarRelato({ ...base, texto: 'a'.repeat(2000) });
    expect(r.url.length).toBeLessThan(8000);
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/domain/relato.test.js`
Expected: FAIL — `Failed to resolve import "./relato.js"` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar `app/src/domain/relato.js`**

`montarRelato` monta o corpo por concatenação de linhas (template string) e usa
`new URLSearchParams({ title, body, labels })` para a query; `encodeURIComponent` não é chamado à
mão. `serie`/período/valores vazios (depois de `trim()`) viram os textos "não informado"/"não
informada". `janela` vira `de.slice(0, 7) + ' a ' + ate.slice(0, 7)`; `null` vira "não informada".
`mandato` nulo vira "nenhum". `texto.slice(0, 2000)` e `titulo.slice(0, 120)`. O permalink é
`urlBase + (query ? '?' + query : '')`, com `query = escreverSearch(ids, '')`.

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/domain/relato.test.js`
Expected: PASS (10 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/relato.js app/src/domain/relato.test.js
git commit -m "feat(app): função pura que monta a issue de erro de dado"
```

---

### Task 2: A ação no trilho e o diálogo

**Files:**
- Create: `app/src/components/DialogoRelatar.svelte`
- Modify: `app/src/components/SeriesDrawer.svelte` (prop nova + botão depois de "Tela cheia")
- Modify: `app/src/App.svelte` (estado, guarda do `Esc`, render)
- Test: `app/e2e/relatorio.spec.js`

**Interfaces:**
- Consumes: `montarRelato`/`REPO_ISSUES` (Task 1); `seriesStore`, `catalogStore`, `viewportStore`,
  `mandateStore`; `itens` do `SeriesDrawer` (`{id, nome, status, oculta}`).
- Produces: componente `DialogoRelatar` com props `{ aberto: boolean, aoFechar: () => void }` e os
  `data-testid`: `dialogo-relatar`, `relato-serie`, `relato-periodo`, `relato-texto`,
  `relato-valor-visto`, `relato-valor-esperado`, `relato-fonte`, `relato-abrir`, `relato-resumo`;
  botão `botao-reportar` no trilho.

- [ ] **Step 1: Escrever o E2E que falha**

```js
import { test, expect } from './apoio.js';

const SELIC = 'selic-meta';
const IPCA = 'ipca-acum-12m';

const abrirRelato = async (page) => {
  await page.getByTestId('botao-reportar').click();
  await expect(page.getByTestId('dialogo-relatar')).toBeVisible();
};

test('sem série carregada o botão fica desabilitado', async ({ page }) => {
  await page.goto('/?series=nao-existe');
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  await expect(page.getByTestId('botao-reportar')).toBeDisabled();
});

test('com série abre o diálogo já com a série do gráfico', async ({ page }) => {
  await page.goto(`/?series=${SELIC}`);
  await abrirRelato(page);
  await expect(page.getByTestId('relato-serie')).toHaveValue(SELIC);
  await expect(page.getByTestId('relato-abrir')).toHaveAttribute('aria-disabled', 'true');
});

test('o link só habilita com o relato e leva o contexto todo', async ({ page }) => {
  await page.goto(`/?series=${SELIC},${IPCA}&utm_source=teste`);
  await abrirRelato(page);
  const abrir = page.getByTestId('relato-abrir');
  await expect(abrir).not.toHaveAttribute('href', /.+/);

  await page.getByTestId('relato-serie').selectOption(IPCA);
  await page.getByTestId('relato-texto').fill('O valor de mai/2026 está errado.');
  await page.getByTestId('relato-valor-visto').fill('4,72%');
  await expect(abrir).toHaveAttribute('aria-disabled', 'false');

  const url = new URL(await abrir.getAttribute('href'));
  expect(url.origin + url.pathname).toBe('https://github.com/brasilemnumeros/dados/issues/new');
  expect(url.searchParams.get('labels')).toBe('erro-de-dado');
  expect(url.searchParams.get('title')).toContain('IPCA');
  const body = url.searchParams.get('body');
  expect(body).toContain(`\`${IPCA}\``);
  expect(body).toContain(`?series=${SELIC},${IPCA}`);
  expect(body).toContain('Aparece no site: 4,72%');
  expect(body).not.toContain('utm_source');
});

test('série escondida continua no link', async ({ page }) => {
  await page.goto(`/?series=${SELIC},${IPCA}`);
  await page.getByRole('button', { name: /^Esconder IPCA/ }).click();
  await abrirRelato(page);
  await page.getByTestId('relato-texto').fill('Conferir.');
  const body = new URL(await page.getByTestId('relato-abrir').getAttribute('href')).searchParams.get('body');
  expect(body).toContain(`?series=${SELIC},${IPCA}`);
});

test('Esc fecha e devolve o foco ao trilho', async ({ page }) => {
  await page.goto(`/?series=${SELIC}`);
  const botao = page.getByTestId('botao-reportar');
  await botao.click();
  await expect(page.getByTestId('dialogo-relatar')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('dialogo-relatar')).toBeHidden();
  await expect(botao).toBeFocused();
  // a gaveta ATRÁS não pode fechar no mesmo Esc
  await expect(page.getByTestId('gaveta-config')).toBeHidden();
});

test('no celular o diálogo cabe na tela', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'medida do celular');
  await page.goto(`/?series=${SELIC}`);
  await abrirRelato(page);
  const caixa = await page.getByTestId('dialogo-relatar').boundingBox();
  const vp = page.viewportSize();
  expect(caixa.y).toBeGreaterThanOrEqual(0);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(vp.height);
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `cd app && NODE_ENV=development npm run test:e2e -- relatorio.spec.js`
Expected: FAIL — `botao-reportar` não encontrado.

- [ ] **Step 3: Criar `DialogoRelatar.svelte`**

- `<dialog bind:this={el} data-testid="dialogo-relatar" aria-labelledby="titulo-relato" onclose={aoFechar}>`,
  com `$effect` chamando `el.showModal()`/`el.close()` conforme `aberto` (nativo: camada superior,
  foco preso, `Esc`, devolução do foco).
- `$effect` de reset ao abrir (só `aberto` como dependência; o resto dentro de `untrack`):
  `serieId = null`, campos vazios, `resumoAberto = false`.
- Lê os stores: `okItens = $seriesStore.itens.filter(i => i.status === 'ok')`;
  `serieAtual = okItens.find(i => i.id === serieId) ?? okItens[0] ?? null`;
  `registro = $derived(($catalogStore.indicadores ?? []).find(i => i.id === serieAtual?.id) ?? null)`
  — ler `$catalogStore` antes do `find`, porque `indicadorPorId` usa `get` e não reage;
  `janela = $viewportStore`; `mandato` = o `rotulo` do `$mandateStore` selecionado ou `null`.
- Campos, nesta ordem, com os `data-testid` do Interfaces. Série é `<select>` (uma opção por item
  `ok`, valor = `id`). Período é texto, placeholder `ex.: mai/2026 ou 2019–2025`.
- Caixa de metodologia no topo, texto exato:
  `Alguns indicadores combinam fontes ou usam cálculo próprio — o número aqui pode não ser o valor bruto publicado por um órgão. Antes de reportar, confira o método: o resumo está na ficha do indicador e a memória de cálculo, no notebook que gera a série.`
  Abaixo, `relato-resumo` ("Ver o resumo", `aria-expanded`, revela `registro.descricao`) e, se
  houver `registro.urlNotebook`, um link "Ver o notebook que gera estes dados ↗" (`target="_blank"
  rel="noopener noreferrer"`).
- Rótulo do campo de fonte: `Link da fonte oficial (opcional, mas ajuda)`.
- Ação: `<a data-testid="relato-abrir" target="_blank" rel="noopener noreferrer" href={pode ? relato.url : undefined} aria-disabled={!pode} tabindex={pode ? 0 : -1} onclick={(e) => { if (!pode) e.preventDefault(); }}>`.
  `pode = texto.trim() !== ''` **e** `serieAtual !== null`. `relato = $derived(montarRelato({...}))`
  com `urlBase = location.origin + location.pathname`, `ids = okItens.map(i => i.id)`.
- Sem série (edge): o miolo mostra "Não há série no gráfico para reportar." e a ação fica desabilitada.
- Estilo: desktop 470px centrado, `max-h-[85dvh]`, miolo `overflow-y-auto` e rodapé fixo; celular
  folha encostada embaixo (`max-md:`), largura total. Rodapé esquerdo: `Destino: brasilemnumeros/dados`.
- Fechar: botão "Cancelar" e o `×` do cabeçalho chamam `aoFechar`.

- [ ] **Step 4: Ligar no trilho e na `App`**

- `SeriesDrawer.svelte`: prop `aoReportar = () => {}`; `const podeReportar = $derived(itens.some((i) => i.status === 'ok'))`;
  botão `data-testid="botao-reportar"` **depois do bloco "Tela cheia" e antes do tour**, ícone de
  bandeira de traço (16px, `stroke-width: 2`, `stroke="currentColor"`), cor `text-amber-400
  hover:text-amber-300 disabled:text-slate-600`, `disabled={!podeReportar}`, `onclick={aoReportar}`,
  `aria-label` e balão: `Reportar problema nos dados` / `Nenhuma série no gráfico`.
- `App.svelte`: `let relatoAberto = $state(false)`; passar `aoReportar={() => (relatoAberto = true)}`
  ao `SeriesDrawer`; renderizar `<DialogoRelatar aberto={relatoAberto} aoFechar={() => (relatoAberto = false)} />`
  junto das gavetas; em `aoTeclar`, depois das guardas de busca e tour: `if (relatoAberto) return;`.

- [ ] **Step 5: Rodar o E2E e ver passar**

Run: `cd app && NODE_ENV=development npm run test:e2e -- relatorio.spec.js`
Expected: PASS nos dois projetos (desktop e mobile).

- [ ] **Step 6: Commit**

```bash
git add app/src/components/DialogoRelatar.svelte app/src/components/SeriesDrawer.svelte app/src/App.svelte app/e2e/relatorio.spec.js
git commit -m "feat(app): reportar problema nos dados a partir do trilho"
```

---

### Task 3: Analytics dos dois gatilhos

**Files:**
- Create: `app/src/analytics.js`
- Test: `app/src/analytics.test.js`
- Modify: `app/src/components/DialogoRelatar.svelte` (duas chamadas)
- Modify: `app/e2e/relatorio.spec.js` (stub de `gtag` + asserção dos eventos)
- Modify: `scripts/testar-analytics.mjs` (gate sem consentimento)

**Interfaces:**
- Consumes: os `data-testid` e a ação da Task 2.
- Produces: `export function registrarEvento(nome, parametros = {})` → `boolean` (`true` quando
  emitiu, `false` quando descartou).

- [ ] **Step 1: Escrever o teste que falha**

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { registrarEvento } from './analytics.js';

afterEach(() => {
  delete globalThis.window;
});

describe('registrarEvento', () => {
  it('descarta sem gtag e não cria fila', () => {
    globalThis.window = {};
    expect(registrarEvento('report_opened', { series_count: 1 })).toBe(false);
    expect(globalThis.window.dataLayer).toBeUndefined();
  });

  it('emite pelo gtag quando ele existe', () => {
    const gtag = vi.fn();
    globalThis.window = { gtag };
    expect(registrarEvento('report_opened', { series_count: 2 })).toBe(true);
    expect(gtag).toHaveBeenCalledWith('event', 'report_opened', { series_count: 2 });
  });
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/analytics.test.js`
Expected: FAIL — `Failed to resolve import "./analytics.js"`.

- [ ] **Step 3: Implementar `app/src/analytics.js`**

```js
export function registrarEvento(nome, parametros = {}) {
  const gtag = globalThis.window?.gtag;
  if (typeof gtag !== 'function') return false; // sem consentimento: descarta, não enfileira
  gtag('event', nome, parametros);
  return true;
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/analytics.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Emitir nos dois gatilhos do diálogo**

- No `$effect` de abertura — **dentro do `untrack` do reset**, para não reemitir quando a store
  de séries mudar com o diálogo aberto: `registrarEvento('report_opened', { series_count: okItens.length })`.
- No `onclick` da ação, **antes** de sair: quando `pode`,
  `registrarEvento('report_issue_opened', { series_id: serieAtual.id, series_count: ids.length, has_period: periodo.trim() !== '', has_source: fonte.trim() !== '' })`.
  Nunca passar texto, período, fonte ou valor digitado.

- [ ] **Step 6: Provar os eventos no E2E**

Acrescentar ao `relatorio.spec.js`:

```js
const semearGtag = (page) =>
  page.addInitScript(() => {
    window.__eventos = [];
    window.gtag = (...args) => window.__eventos.push(args);
  });

test('os eventos saem pelo gtag quando há consentimento', async ({ page }) => {
  await semearGtag(page);
  await page.goto(`/?series=${SELIC}`);
  await page.getByTestId('botao-reportar').click();
  await expect
    .poll(() => page.evaluate(() => window.__eventos))
    .toEqual([['event', 'report_opened', { series_count: 1 }]]);

  await page.getByTestId('relato-texto').fill('Conferir.');
  await page.getByTestId('relato-periodo').fill('mai/2026');
  await page.route('https://github.com/**', (r) => r.fulfill({ status: 200, body: 'ok' }));
  await page.getByTestId('relato-abrir').dispatchEvent('click');

  const eventos = await page.evaluate(() => window.__eventos);
  expect(eventos).toHaveLength(2);
  expect(eventos[1]).toEqual([
    'event',
    'report_issue_opened',
    { series_id: SELIC, series_count: 1, has_period: true, has_source: false },
  ]);
});
```

Run: `cd app && NODE_ENV=development npm run test:e2e -- relatorio.spec.js`
Expected: PASS.

- [ ] **Step 7: Ampliar o gate de consentimento**

Em `scripts/testar-analytics.mjs`, dentro de `cenario`, quando `esperaTerceiro` for `false`:

```js
conferir(
  await pagina.evaluate(() => typeof window.gtag === 'undefined'),
  `${rotulo}: window.gtag existe sem consentimento`,
);
conferir(
  await pagina.evaluate(() => typeof window.dataLayer === 'undefined'),
  `${rotulo}: window.dataLayer enfileirado sem consentimento`,
);
```

- [ ] **Step 8: Rodar build + gate**

Run: `npm run build && npm run test:analytics`
Expected: `analytics ok`.

- [ ] **Step 9: Commit**

```bash
git add app/src/analytics.js app/src/analytics.test.js app/src/components/DialogoRelatar.svelte app/e2e/relatorio.spec.js scripts/testar-analytics.mjs
git commit -m "feat(app): eventos de analytics do relato de dado"
```

---

### Task 4: `/correcoes` aponta para o canal que existe

**Files:**
- Modify: `src/pages/correcoes.md:14-24`

**Interfaces:**
- Consumes: `REPO_ISSUES` + `labels=erro-de-dado` (Task 1 define o formato).
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Trocar o link e o texto**

No lugar de `github.com/brasilemnumeros`, usar
`https://github.com/brasilemnumeros/dados/issues/new?labels=erro-de-dado` com o texto
`Abrir uma issue no repositório de dados ↗`. Acrescentar, depois da lista de campos: "No gráfico,
o ícone de bandeira no trilho já abre a issue com a série, a janela e o link preenchidos — basta
descrever o que está errado."

- [ ] **Step 2: Verificar o HTML publicado**

Run: `npm run build`
Expected: `verificar` passa (inclui `testar-urls` e `testar-publico`); nenhum link órfão.
⚠ Se houver dev server do app no ar, o build troca a base de dado do artefato — restaurar depois
com `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico` (AGENTS.md).

- [ ] **Step 3: Commit**

```bash
git add src/pages/correcoes.md
git commit -m "docs(correcoes): apontar para a issue de erro de dado no repo dados"
```

---

### Task 5: Template e label no repositório `dados`

**Files:**
- Create: `../dados/.github/ISSUE_TEMPLATE/erro-de-dado.md` (repo irmão, commit direto na `main`)

**Interfaces:**
- Consumes: o formato do corpo da Task 1 (mesmos campos).
- Produces: a label `erro-de-dado` que o link já usa.

- [ ] **Step 1: Criar o template**

Front matter `name: Erro em um dado`, `about: Um valor publicado no site parece errado`,
`labels: erro-de-dado`; corpo com os blocos `### Indicador`, `### Período`, `### O que está errado`,
`### Valores`, `### Fonte oficial`.

- [ ] **Step 2: Criar a label**

Run: `gh label create erro-de-dado --repo brasilemnumeros/dados --description "Erro em um valor publicado no site" --color B45309`
Expected: `label erro-de-dado created`. Se `gh` não estiver autenticado, criar pela UI e conferir
com `gh label list --repo brasilemnumeros/dados | grep erro-de-dado`.

- [ ] **Step 3: Commitar direto na `main`**

```bash
cd ../dados && git add .github/ISSUE_TEMPLATE/erro-de-dado.md
git commit -m "chore: template de issue para erro em um dado"
git push origin main
```

- [ ] **Step 4: Verificar o link de ponta a ponta**

Abrir no navegador a URL que o app gera (copiar o `href` do E2E) e conferir: título e corpo
preenchidos, label `erro-de-dado` e o botão "Criar issue" habilitado.

---

### Task 6: Verificação completa

**Files:** nenhum (só comandos).

- [ ] **Step 1: Suíte de unidade**

Run: `cd app && NODE_ENV=development npm test`
Expected: PASS, incluindo `relato.test.js`.

- [ ] **Step 2: E2E completo (um por vez)**

Run: `cd app && NODE_ENV=development npm run test:e2e`
Expected: PASS nos dois projetos; `relatorio.spec.js` incluído; zero `console.error`.

- [ ] **Step 3: Build e guardas do site**

Run: `npm run build && npm run test:analytics`
Expected: `verificar` e o gate de analytics passam.

- [ ] **Step 4: Registrar o que foi observado**

No commit final (ou na descrição do PR), colar a saída dos três comandos. Sem isso, não é "pronto"
(AGENTS.md).

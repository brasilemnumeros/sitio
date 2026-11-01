# Tour de primeira visita — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um tour de seis passos que aparece uma vez por navegador, só no desktop, ensinando as funções do terminal; reabrível por um botão `?` no trilho.

**Architecture:** `driver.js` desenha o overlay e os balões; o app só decide **quando** abrir (função pura em `domain/tour.js`), **quais** passos existem (filtro puro por seletor presente) e onde fica o botão de reabrir (trilho). O estado mora no `App.svelte`, como o das outras camadas.

**Tech Stack:** Svelte 5 (runes), Vite, driver.js 1.10.2, Vitest, Playwright.

**Spec:** `docs/specs/2026-11-01-tour-de-primeira-visita.md`

## Global Constraints

- `NODE_ENV=development` é obrigatório nos comandos do app nesta máquina (o ambiente tem `NODE_ENV=production` e `npm omit=dev`).
- Comentários e textos de interface em **português**; nomes de código em inglês quando seguem API.
- Comentários explicam **por que**, não o que. Decisão com histórico (data, medição, alternativa descartada) fica no código, perto do trecho.
- **Nunca** rodar dois E2E ao mesmo tempo. Nunca encerrar servidor de dev do usuário.
- O E2E falha com **qualquer** `console.error` ou exceção não capturada (`app/e2e/apoio.js`).
- Depois de qualquer `npm run build`, restaurar o artefato de dev: `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico` (o `grep -c 'brasilemnumeros.github.io/dados' public/assets/js/app/app.js` tem de dar `0`).
- Uma dependência nova e só: `driver.js` (MIT). Nada de GTM, nada de script de terceiro em runtime.
- `data-testid` é contrato dos testes: nome novo só entra junto com o spec que o usa.

## Review Focus

1. **`localStorage` que lança** (modo privado, política do navegador): a home tem de continuar funcionando e o tour nasce como "já visto".
2. **Passo cujo elemento não existe** (série sem legenda, gráfico em erro antes de montar): o passo é **pulado**; nada de balão centralizado no vazio nem exceção.
3. **Link compartilhado `?series=`**: o tour nunca dispara — a pessoa veio ver um gráfico.
4. **Recarregar depois de fechar no passo 2**: não aparece de novo (chave gravada ao abrir, não ao fechar).
5. **`Esc` com uma gaveta aberta durante o tour**: fecha o **tour**, não a gaveta.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `app/src/domain/tour.js` (novo) | Decisões puras: mostrar ou não; filtrar passos por elemento presente. Sem DOM, sem store. |
| `app/src/domain/tour.test.js` (novo) | Vitest das duas funções. |
| `app/src/components/Tour.svelte` (novo) | Monta o `driver.js` a partir dos passos, tema escuro, fecha e avisa quem o abriu. |
| `app/src/components/SeriesDrawer.svelte` (modificar) | Botão `?` no pé do trilho (reabrir), com prop nova `aoAbrirTour`. |
| `app/src/components/HomeToolbar.svelte` (modificar) | Um `data-testid` no botão de busca — o passo 1 precisa de âncora estável. |
| `app/src/App.svelte` (modificar) | Estado `tourAberto`, gatilho automático, prioridade do `Esc`. |
| `app/e2e/apoio.js` (modificar) | Fixture: `tour-visto` pré-semeado, exceto no spec do tour. |
| `app/e2e/tour.spec.js` (novo) | Comportamento no navegador. |

---

### Task 1: Isolamento do tour no E2E

Sem isto, o tour abriria em cima de **todo** spec que navega para `/` sem `?series=` (`abrirApp`, por exemplo), e a suíte inteira quebraria. Por isso vem primeiro, sozinha: ao fim, a suíte tem de continuar verde **sem** existir tour nenhum.

**Files:**
- Modify: `app/e2e/apoio.js:12-24` (fixture `test`)

**Interfaces:**
- Produces: opção de fixture `tourNaPrimeiraVisita` (boolean, padrão `false`). Specs usam `test.use({ tourNaPrimeiraVisita: true })` para ver o tour.

- [ ] **Step 1: Escrever o teste que prova a opção**

Em `app/e2e/apoio.js`, a fixture passa a semear a chave. Antes de implementar, acrescente ao fim de `app/e2e/tour.spec.js` (arquivo novo, mínimo):

```js
import { test, expect } from './apoio.js';

test.use({ tourNaPrimeiraVisita: true });

test('a opção desliga a semente da chave', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m');
  expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBeNull();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx playwright test e2e/tour.spec.js --reporter=line`
Expected: FAIL — `tourNaPrimeiraVisita` não é uma opção conhecida (ou devolve `null` por acidente, ver próximo passo).

- [ ] **Step 3: Implementar a opção na fixture**

Em `app/e2e/apoio.js`, trocar `export const test = base.extend({ page: async ({ page }, use) => { … } })` por:

```js
export const test = base.extend({
  // O tour de primeira visita (2026-11-01) abriria em cima de TODO spec que navega para `/`.
  // A semente da chave é o que mantém a suíte alheia alheia ao tour; `tour.spec.js` desliga a
  // opção para ser o único lugar onde ele aparece.
  tourNaPrimeiraVisita: [false, { option: true }],
  page: async ({ page, tourNaPrimeiraVisita }, use) => {
    if (!tourNaPrimeiraVisita) {
      await page.addInitScript(() => {
        try { localStorage.setItem('tour-visto', '1'); } catch { /* modo privado */ }
      });
    }
    const erros = [];
    // …o resto da fixture como estava…
  },
});
```

- [ ] **Step 4: Rodar o spec novo e a suíte**

Run: `cd app && NODE_ENV=development npx playwright test e2e/tour.spec.js --reporter=line`
Expected: PASS (1 teste).

Run: `cd app && NODE_ENV=development npx playwright test e2e/casca.spec.js e2e/visual.spec.js e2e/exemplo.spec.js --reporter=line`
Expected: PASS, mesmo número de antes.

- [ ] **Step 5: Commit**

```bash
git add app/e2e/apoio.js app/e2e/tour.spec.js
git commit -m "e2e: fixture semeia a chave do tour, para a suíte não ver o tour"
```

---

### Task 2: As duas decisões puras

**Files:**
- Create: `app/src/domain/tour.js`
- Test: `app/src/domain/tour.test.js`

**Interfaces:**
- Produces:
  - `LARGURA_MINIMA: number` (= `1024`)
  - `deveMostrarTour({ largura: number, urlTemSeries: boolean, jaVisto: boolean }): boolean`
  - `filtrarPassos(passos: Array<{ element: string }>, existe: (seletor: string) => boolean): Array<{ element: string }>`
  - `CHAVE_TOUR: string` (= `'tour-visto'`)

- [ ] **Step 1: Escrever os testes**

`app/src/domain/tour.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { deveMostrarTour, filtrarPassos, LARGURA_MINIMA } from './tour.js';

describe('deveMostrarTour', () => {
  const base = { largura: 1280, urlTemSeries: false, jaVisto: false };

  it('mostra na primeira visita, no desktop', () => {
    expect(deveMostrarTour(base)).toBe(true);
  });

  it('não mostra se já foi visto', () => {
    expect(deveMostrarTour({ ...base, jaVisto: true })).toBe(false);
  });

  it('não mostra abaixo da largura mínima', () => {
    expect(deveMostrarTour({ ...base, largura: LARGURA_MINIMA - 1 })).toBe(false);
  });

  it('mostra exatamente na largura mínima', () => {
    expect(deveMostrarTour({ ...base, largura: LARGURA_MINIMA })).toBe(true);
  });

  it('não mostra quando a URL trouxe séries', () => {
    expect(deveMostrarTour({ ...base, urlTemSeries: true })).toBe(false);
  });
});

describe('filtrarPassos', () => {
  const passos = [{ element: '#a' }, { element: '#b' }, { element: '#c' }];

  it('mantém só os passos cujo elemento existe', () => {
    expect(filtrarPassos(passos, (s) => s !== '#b')).toEqual([{ element: '#a' }, { element: '#c' }]);
  });

  it('devolve lista vazia quando não há elemento nenhum', () => {
    expect(filtrarPassos(passos, () => false)).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/domain/tour.test.js`
Expected: FAIL — `Failed to resolve import "./tour.js"`.

- [ ] **Step 3: Implementar `app/src/domain/tour.js`**

```js
/** Largura a partir da qual o tour roda. Abaixo dela o trilho e a legenda só existem com
 *  gaveta/folha aberta, que cobre o gráfico: o tour ensinaria por cima do que ensina. */
export const LARGURA_MINIMA = 1024;

/** Chave de "já viu" — gravada ao ABRIR, não ao fechar (mesma regra de `dica-limpar-filtros`):
 *  quem fechou no passo 2 não vê o roteiro inteiro de novo na visita seguinte. */
export const CHAVE_TOUR = 'tour-visto';

export function deveMostrarTour({ largura, urlTemSeries, jaVisto }) {
  if (jaVisto) return false;
  if (largura < LARGURA_MINIMA) return false;
  if (urlTemSeries) return false;
  return true;
}

/** Um passo cujo elemento não está no DOM não vira balão centralizado no vazio. */
export function filtrarPassos(passos, existe) {
  return passos.filter((passo) => existe(passo.element));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && NODE_ENV=development npx vitest run src/domain/tour.test.js`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add app/src/domain/tour.js app/src/domain/tour.test.js
git commit -m "domínio: quando o tour aparece e quais passos existem"
```

---

### Task 3: O tour, aberto à mão pelo `?` do trilho

Entrega um tour que funciona, mas **só** quando alguém clica no `?`. O disparo automático é a Task 4 — separadas porque uma pode ser aprovada sem a outra.

**Files:**
- Modify: `app/package.json` (dependência)
- Create: `app/src/components/Tour.svelte`
- Modify: `app/src/components/HomeToolbar.svelte:128-133` (`data-testid`)
- Modify: `app/src/components/SeriesDrawer.svelte` (botão `?` no trilho, prop nova)
- Modify: `app/src/App.svelte` (estado, `Esc`, render)
- Test: `app/e2e/tour.spec.js`

**Interfaces:**
- Consumes: `filtrarPassos` (Task 2).
- Produces:
  - `<Tour {aberto} aoFechar={fn} />` — monta o driver quando `aberto` vira `true`; chama `aoFechar` ao ser destruído/`Esc`.
  - `data-testid="botao-tour"` no trilho.
  - `data-testid="botao-busca"` na barra superior.

- [ ] **Step 1: Instalar a dependência**

Run: `cd app && NODE_ENV=development npm install driver.js@1.10.2`
Expected: `app/package.json` ganha `"driver.js": "^1.10.2"` em `dependencies`, sem mexer nas outras.

- [ ] **Step 2: Escrever o teste que falha**

Substituir `app/e2e/tour.spec.js` (conteúdo da Task 1) por:

```js
import { test, expect } from './apoio.js';

test.use({ tourNaPrimeiraVisita: true });

const POPOVER = '.driver-popover';

test('o "?" do trilho abre o tour e o Esc fecha', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m');
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);

  await page.getByTestId('botao-tour').click();
  await expect(page.locator(POPOVER)).toHaveCount(1);
  await expect(page.locator('.driver-popover-title')).toHaveText('Buscar');

  await page.keyboard.press('Escape');
  await expect(page.locator(POPOVER)).toHaveCount(0);
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx playwright test e2e/tour.spec.js --reporter=line`
Expected: FAIL — `botao-tour` não existe.

- [ ] **Step 4: Marcar o botão de busca (âncora do passo 1)**

Em `app/src/components/HomeToolbar.svelte`, no `<button>` da busca (o que tem `title="Buscar indicador (⌘K)"`), acrescentar `data-testid="botao-busca"` logo acima de `class=`.

- [ ] **Step 5: Criar `app/src/components/Tour.svelte`**

Passos (texto final; `side` só onde o balão precisa fugir da borda):

```js
const PASSOS = [
  { element: '[data-testid="botao-busca"]',
    popover: { title: 'Buscar', description: 'Ache qualquer um dos indicadores pelo nome. ⌘K abre de qualquer lugar.' } },
  { element: '[data-bloco="filtros"]',
    popover: { title: 'Recortar o tempo', description: 'Um, cinco ou dez anos. "Tudo" volta ao horizonte completo.' } },
  { element: '[data-testid="barra-inferior"]',
    popover: { title: 'Comparar governos', description: 'A barra de baixo compara o mesmo indicador entre mandatos.' } },
  { element: '[data-testid="trilho"]',
    popover: { title: 'Controles', description: 'A engrenagem abre séries, cores e eixos. O ícone de elo copia o estado atual do gráfico.', side: 'right' } },
  { element: '[data-testid="legenda-grafico"]',
    popover: { title: 'Legenda', description: 'O olho esconde a série sem tirá-la do gráfico. O × remove.' } },
  { element: '[data-testid="grafico"]',
    popover: { title: 'Escala do eixo', description: 'Arraste para cima ou para baixo na escala da direita para reduzir ou aumentar o eixo Y. Duplo clique na escala devolve o automático.', side: 'left' } },
];
```

O componente:

- importa `driver` de `driver.js` e `'driver.js/dist/driver.css'`;
- em `$effect`, quando `aberto` vira `true`, chama
  `driver({ showProgress: true, progressText: '{{current}} de {{total}}', nextBtnText: 'Próximo', prevBtnText: 'Voltar', doneBtnText: 'Entendi', overlayColor: '#0e1117', overlayOpacity: 0.75, stagePadding: 4, stageRadius: 4, popoverClass: 'tour-terminal', steps: filtrarPassos(PASSOS, (s) => !!document.querySelector(s)), onDestroyed: () => aoFechar() }).drive()`;
- guarda a instância e a destrói no `onDestroyed`/desmontagem;
- `<style>` com `:global(.tour-terminal …)` cobrindo: fundo `#0e1117`, borda `#334155`, título e descrição em `#e2e8f0`, botões com fundo `#1e293b` e texto `#e2e8f0`, seta do balão na cor do fundo, `.driver-popover-progress-text` em `#94a3b8`.

- [ ] **Step 6: Botão `?` no trilho**

Em `app/src/components/SeriesDrawer.svelte`: nova prop `aoAbrirTour`; no pé do `<aside data-testid="trilho">`, depois do bloco de tela cheia, um `<div class="group relative w-full justify-center">` com `<button type="button" data-testid="botao-tour" aria-label="Ver o tour de novo" class="hidden lg:flex min-h-11 w-full items-center justify-center rounded px-1 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-slate-100" onclick={aoAbrirTour}>` contendo um `?` em SVG (`viewBox="0 0 24 24"`, `stroke-width="2"`, `h-4 w-4`), e `{@render balao('Ver o tour de novo')}`.

`hidden lg:flex` porque o tour não roda abaixo de 1024px: um `?` que não faz nada é pior que um `?` ausente.

- [ ] **Step 7: Ligar no `App.svelte`**

- `let tourAberto = $state(false);`
- passar `aoAbrirTour={() => (tourAberto = true)}` ao `<SeriesDrawer>`;
- antes do `{#if buscaAberta}`: `{#if tourAberto}<Tour aberto={true} aoFechar={() => (tourAberto = false)} />{/if}`;
- em `aoTeclar`, primeira linha do caso `Escape`: `if (tourAberto) return;` — o `driver.js` já fecha a si mesmo; a `App` só não pode fechar a gaveta por baixo.

- [ ] **Step 8: Rodar o spec e a suíte**

Run: `cd app && NODE_ENV=development npx playwright test e2e/tour.spec.js --reporter=line`
Expected: PASS (1 teste).

Run: `cd app && NODE_ENV=development npx playwright test --reporter=line`
Expected: PASS, mesmo número de antes + 1.

- [ ] **Step 9: Conferir o tema ao vivo**

Subir o dev server (só se a porta 5173 estiver livre: `lsof -nP -iTCP:5173 -sTCP:LISTEN`), abrir `http://localhost:5173/?series=selic-meta-acum-12m`, clicar no `?` e percorrer os seis passos. O balão **não** pode aparecer branco no meio do terminal escuro, e a seta tem de estar na cor do fundo.

- [ ] **Step 10: Commit**

```bash
git add app/package.json app/package-lock.json app/src/components/Tour.svelte \
        app/src/components/HomeToolbar.svelte app/src/components/SeriesDrawer.svelte \
        app/src/App.svelte app/e2e/tour.spec.js
git commit -m "home: tour de seis passos, aberto pelo ? do trilho"
```

---

### Task 4: Disparo automático na primeira visita

**Files:**
- Modify: `app/src/App.svelte`
- Test: `app/e2e/tour.spec.js`

**Interfaces:**
- Consumes: `deveMostrarTour`, `CHAVE_TOUR` (Task 2); `<Tour>` (Task 3).

- [ ] **Step 1: Acrescentar os testes que falham**

Acrescentar a `app/e2e/tour.spec.js`:

```js
test('primeira visita mostra o passo 1 sozinho', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m');
  await expect(page.locator(POPOVER)).toHaveCount(1, { timeout: 5000 });
  await expect(page.locator('.driver-popover-title')).toHaveText('Buscar');
  expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBe('1');
});

test('fechar e recarregar não mostra de novo', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m');
  await expect(page.locator(POPOVER)).toHaveCount(1, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.locator(POPOVER)).toHaveCount(0);
});

test('link compartilhado não abre o tour', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m,ipca-acum-12m');
  await page.waitForTimeout(1500);
  await expect(page.locator(POPOVER)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBeNull();
});

test('no celular o tour não aparece', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator(POPOVER)).toHaveCount(0);
});

test('localStorage que lança não quebra a home', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('bloqueado'); },
    });
  });
  await page.goto('/?series=selic-meta-acum-12m');
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);
  await expect(page.locator(POPOVER)).toHaveCount(0);
});
```

Atenção: o teste do link compartilhado e o do celular usam `/` ou `?series=`, então os dois precisam continuar valendo com a opção `tourNaPrimeiraVisita: true` (o arquivo já a declara no topo).

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx playwright test e2e/tour.spec.js --reporter=line`
Expected: FAIL nos quatro primeiros novos (o tour não aparece sozinho em nenhum; o do `localStorage` passa só porque nada dispara).

- [ ] **Step 3: Implementar o gatilho em `App.svelte`**

- No topo do `<script>`, **antes de qualquer escrita de URL**: `const URL_INICIAL = new URLSearchParams(window.location.search);`. Guardar `const TEM_SERIES_NA_URL = URL_INICIAL.has('series');` — a leitura tem de acontecer na carga, porque o app reescreve a URL depois.
- `import { deveMostrarTour, CHAVE_TOUR } from './domain/tour.js';`
- `let jaTentouTour = false;`
- `$effect` que observa `itens.length`: se `itens.length > 0 && !jaTentouTour`, marcar `jaTentouTour = true` e agendar `setTimeout(600)` — o mesmo cuidado da dica do "limpar filtros" (o `fitContent` do horizonte assenta antes; sem a espera o tour pode apontar para um gráfico que ainda vai se ajustar). O `setTimeout` guarda o id e é limpo no retorno do efeito.
- No callback do timeout:

```js
let jaVisto = true; // no erro nasce "visto": ensinar de novo é melhor que quebrar a tela
try { jaVisto = localStorage.getItem(CHAVE_TOUR) === '1'; } catch { /* acima */ }
if (deveMostrarTour({ largura: window.innerWidth, urlTemSeries: TEM_SERIES_NA_URL, jaVisto })) {
  try { localStorage.setItem(CHAVE_TOUR, '1'); } catch { /* acima */ }
  tourAberto = true;
}
```

- [ ] **Step 4: Rodar o spec do tour**

Run: `cd app && NODE_ENV=development npx playwright test e2e/tour.spec.js --reporter=line`
Expected: PASS (6 testes).

- [ ] **Step 5: Rodar a suíte inteira, Vitest e o build**

Run: `cd app && NODE_ENV=development npx vitest run`
Expected: PASS (199 + 7).

Run: `cd app && NODE_ENV=development npx playwright test --reporter=line`
Expected: PASS, sem nenhum spec antigo vendo o tour.

Run: `cd .. && npm run build`
Expected: cadeia inteira verde (`publico ok`, `sitemap ok (20 urls)`, `mobile ok`).

Run: `cd .. && DADOS_LOCAL=1 npm run build:app && npm run preparar-publico`
Expected: artefato de dev restaurado; `grep -c 'brasilemnumeros.github.io/dados' public/assets/js/app/app.js` → `0`.

- [ ] **Step 6: Commit**

```bash
git add app/src/App.svelte app/e2e/tour.spec.js
git commit -m "home: tour de primeira visita dispara uma vez, só no desktop e sem link compartilhado"
```

---

## Auto-revisão do plano

- **Cobertura da spec:** os seis passos → Task 3 Step 5. Não-objetivos (celular, sem tela de boas-vindas) → `deveMostrarTour` (Task 2) e teste do celular (Task 4). Reabrir pelo `?` → Task 3 Steps 6-7. Chave gravada ao abrir → Task 4 Step 3. 600ms / fitContent → Task 4 Step 3. Tema escuro → Task 3 Step 5. `?series=` não dispara → Task 2 (função) + Task 4 (teste). Guardas → Task 4 Step 5.
- **Nomes:** `CHAVE_TOUR`, `deveMostrarTour`, `filtrarPassos`, `tourNaPrimeiraVisita`, `tourAberto`, `botao-tour` — todos aparecem com o mesmo nome nas quatro tasks.
- **Review Focus:** (1) `localStorage` → teste em Task 4; (2) elemento ausente → `filtrarPassos` testado em Task 2; (3) link compartilhado → Task 4; (4) recarregar → Task 4; (5) `Esc` com gaveta → Task 3 Step 7 e o spec da Task 3 fecha por `Esc`.

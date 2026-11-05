# Comparação por mandato no celular — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a matriz horizontal por uma lista por indicador no celular, com grabber + título no topo da gaveta, e dar swipe down às duas folhas que hoje não o têm.

**Architecture:** A matriz do desktop fica intacta. O `ComparisonPanel` passa a renderizar duas formas da mesma leitura (tabela e lista), com CSS decidindo qual aparece — o mesmo padrão do `SearchModal`. O conteúdo dos quatro estados de célula sai para um componente único, e o limiar de 80px do gesto vira regra de domínio compartilhada pelas duas folhas.

**Tech Stack:** Svelte 5 (runes), Tailwind 4, Vitest, Playwright, Vite.

**Spec:** `docs/specs/2026-11-05-comparacao-mobile-design.md`

## Global Constraints

- Node 26; os comandos do app precisam de `NODE_ENV=development` nesta máquina.
- Tailwind v4: depois de qualquer classe nova, rodar `npm run css` **antes** do E2E do app (o dev server do app serve `assets/css/main.dist.css`).
- Nunca editar `public/assets/js/app/app.js` nem `app.css` à mão — são artefatos gerados.
- Não rodar dois E2E ao mesmo tempo (o segundo reaproveita o servidor do primeiro via `reuseExistingServer`).
- Antes de subir servidor/E2E, conferir a porta: app 5173, site 4321, Playwright 5199 (`lsof -nP -iTCP:<porta> -sTCP:LISTEN`). Não encerrar servidor do usuário.
- `npm run build` grava o artefato de **produção** em `public/assets/js/app/app.js` e estraga um dev server aberto; ao terminar, restaurar com `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico`.
- Comentários e textos de interface em português; nomes de código em inglês.
- O E2E falha com qualquer `console.error` ou exceção não capturada. Não silenciar erro para passar.
- Não quebrar o contrato de URL nem o contrato de dados (`versao: 1`).

## Review Focus

- **Rotação/redimensionamento com a gaveta aberta:** as duas formas existem no DOM; ao passar de 767px para 768px (ou vice-versa) só uma pode estar visível, sem título duplicado nem gaveta presa.
- **Nome longo de indicador (ex.: "MVG-R — valor mediano de garantia (R$ correntes)") em 320px:** o cabeçalho do cartão precisa quebrar linha, nunca empurrar a página para a horizontal.
- **Mandato em curso (`fim: null`):** a linha da lista tem de mostrar o período parcial e a hachura, sem virar "—" nem perder o último mandato.
- **Swipe começando no conteúdo rolável:** a lista rola na vertical; só o grabber fecha a folha. Um arrasto dentro da lista não pode fechar.
- **Séries de unidades diferentes (%, R$):** cada cartão mostra o símbolo da própria série; o valor não herda o símbolo do vizinho.

---

### Task 1: Regra e ação do gesto de fechar

**Files:**
- Create: `app/src/domain/gesto.js`
- Test: `app/src/domain/gesto.test.js`
- Create: `app/src/arrastar-para-fechar.js`
- Modify: `app/src/components/BottomDrawer.svelte` (troca o `> 80` pela regra)

**Interfaces:**
- Produces: `LIMIAR_FECHAMENTO: number` (80); `deveFecharAoArrastar(deslocamento: number, limiar?: number): boolean`; ação Svelte `arrastarParaFechar(node: HTMLElement, { aoFechar }: { aoFechar: () => void }): { destroy(): void }`.

- [ ] **Step 1: Escrever o teste que falha**

```js
// app/src/domain/gesto.test.js
import { describe, expect, it } from 'vitest';
import { LIMIAR_FECHAMENTO, deveFecharAoArrastar } from './gesto.js';

describe('deveFecharAoArrastar', () => {
  it('só fecha quando passa do limiar de 80px', () => {
    expect(LIMIAR_FECHAMENTO).toBe(80);
    expect(deveFecharAoArrastar(80)).toBe(false);
    expect(deveFecharAoArrastar(81)).toBe(true);
    expect(deveFecharAoArrastar(-200)).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/domain/gesto.test.js`
Expected: FAIL — não resolve `./gesto.js`.

- [ ] **Step 3: Implementar a regra em `app/src/domain/gesto.js`**

```js
/** O limiar do gesto de fechar (spec mobile): menos de 80px é toque/hesitação, não intenção. */
export const LIMIAR_FECHAMENTO = 80;

export function deveFecharAoArrastar(deslocamento, limiar = LIMIAR_FECHAMENTO) {
  return deslocamento > limiar;
}
```

- [ ] **Step 4: Implementar a ação `arrastarParaFechar` em `app/src/arrastar-para-fechar.js`**

A ação escuta `pointerdown`/`pointerup`/`pointercancel` no nó, guarda `clientY` no início, usa
`setPointerCapture` (try/catch) e chama `aoFechar()` só quando `deveFecharAoArrastar` aprova.
Ela é para elementos **não-botão** (grabber), então não precisa engolir o `click`; se o nó for um
botão, o `click` pós-arrasto togglaria — documente isso no cabeçalho do arquivo. `destroy()`
remove os três listeners.

- [ ] **Step 5: Usar a regra na alça existente**

Em `BottomDrawer.svelte`, importar `deveFecharAoArrastar` e trocar
`if (deslocamento > 80)` por `if (deveFecharAoArrastar(deslocamento))`; o comentário do limiar
passa a apontar para `domain/gesto.js`.

- [ ] **Step 6: Rodar o teste e a suíte**

Run: `cd app && NODE_ENV=development npx vitest run src/domain/gesto.test.js`
Expected: PASS.
Run: `cd app && npm test`
Expected: PASS (nenhum teste de domínio quebrado).

- [ ] **Step 7: Commit**

```bash
git add app/src/domain/gesto.js app/src/domain/gesto.test.js app/src/arrastar-para-fechar.js app/src/components/BottomDrawer.svelte
git commit -m "feat: regra unica de swipe para fechar folhas"
```

---

### Task 2: Conteúdo de célula único + lista mobile

**Files:**
- Create: `app/src/components/ConteudoCelula.svelte`
- Create: `app/src/components/ComparisonList.svelte`
- Modify: `app/src/components/Celula.svelte`
- Modify: `app/src/components/ComparisonPanel.svelte`
- Test: `app/e2e/mandato-janela.spec.js`

**Interfaces:**
- Consumes: `deltaNoMandato(series, mandato)` e `COBERTURA` de `app/src/domain/mandates.js`; `valorNaUnidade` e `rotuloDaUnidade` de `app/src/domain/format.js`.
- Produces: `ConteudoCelula` com props `{ celula, unidade }`; `ComparisonList` com props `{ itens, mandatos }` e raiz `[data-bloco="comparacao-lista"]` (`md:hidden`).

- [ ] **Step 1: Criar o E2E da lista (falha)**

Em `app/e2e/mandato-janela.spec.js`, o teste `a matriz aparece com série e traz os estados de célula por texto` passa a ramificar por projeto. No ramo `mobile`:

```js
const lista = painel.locator('[data-bloco="comparacao-lista"]');
await expect(lista).toBeVisible();
const cartoes = lista.locator('[data-cartao-indicador]');
await expect(cartoes).toHaveCount(2);
const linhas = cartoes.first().locator('[data-linha-mandato]');
await expect(linhas).toHaveCount(9);
await expect(linhas.nth(0)).toContainText('FHC I · PSDB');
await expect(linhas.nth(8)).toContainText('Lula III · PT');
// o mandato em curso é o último, está parcial e leva o marcador de hachura
await expect(linhas.nth(8)).toHaveAttribute('data-em-curso', 'true');
await expect(linhas.nth(8)).toHaveAttribute('data-estado', 'parcial');
await expect(linhas.nth(8)).toContainText(/parcial \d{2}\/\d{4}–\d{2}\/\d{4}/);
await expect(lista.locator('[data-estado="sem-cobertura"]').first()).toContainText(/série começa em/);
await expect(lista.locator('[data-estado="parcial"]').first()).toContainText(/parcial \d{2}\/\d{4}–\d{2}\/\d{4}/);
```

O ramo `desktop` mantém as asserções atuais de `<table>`/`columnheader`. Envolver com `if (testInfo.project.name === 'mobile') { ... } else { ... }` (o teste recebe `testInfo`).

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/mandato-janela.spec.js --project=mobile`
Expected: FAIL — `[data-bloco="comparacao-lista"]` tem count 0.

- [ ] **Step 2: Extrair `ConteudoCelula.svelte` sem mudar o visual**

Mover o corpo do `<td>` de `Celula.svelte` para o novo componente, com props `{ celula, unidade = null }`, mantendo as classes e os textos atuais:

```svelte
{#if celula.estado === COBERTURA.CALCULAVEL}
  <span class="tabular-nums text-slate-800 dark:text-slate-100">{valorNaUnidade(celula.delta, unidade)}</span>
{:else if celula.estado === COBERTURA.PARCIAL}
  <span class="tabular-nums text-slate-800 dark:text-slate-100">{valorNaUnidade(celula.delta, unidade)}</span>
  <em class="block text-[10px] text-slate-500 dark:text-slate-400">parcial {formatarPeriodo(celula.periodo)}</em>
{:else if celula.estado === COBERTURA.SEM}
  <span class="text-xs text-slate-400 dark:text-slate-500">{celula.motivo}</span>
{:else if celula.estado === COBERTURA.PONTO_UNICO}
  <span class="text-xs text-amber-600 dark:text-amber-400">ponto único — sem Δ</span>
{/if}
```

`Celula.svelte` fica só com o `<td>` (classes + `data-estado`) e `<ConteudoCelula {celula} {unidade} />`.

- [ ] **Step 3: Criar `ComparisonList.svelte`**

Raiz `<div class="flex flex-col gap-3 md:hidden" data-bloco="comparacao-lista">`. Para cada item:

```svelte
<section data-cartao-indicador aria-label={item.nome}
  class="overflow-hidden rounded border border-slate-200 dark:border-slate-700">
  <header class="flex items-start gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
    <span class="mt-1 inline-block h-3 w-3 shrink-0 rounded-full" style="background:{item.cor}" aria-hidden="true"></span>
    <div class="min-w-0">
      <h3 class="text-xs font-semibold text-slate-800 dark:text-slate-100">{item.nome}</h3>
      {#if item.status === 'ok' && item.series}
        <p class="text-[10px] text-slate-500 dark:text-slate-400">
          {item.unidade?.simbolo ?? ''} · {rotuloDaUnidade(item.series.eixo, item.unidade?.tipo)}
        </p>
      {/if}
    </div>
  </header>
  {#if item.status === 'ok' && item.series}
    <ul class="divide-y divide-slate-100 dark:divide-slate-800">
      {#each mandatos as m (m.id)}
        {@const celula = deltaNoMandato(item.series, m)}
        <li data-linha-mandato data-estado={celula.estado} data-em-curso={m.emCurso}
          class="relative flex items-start gap-2 px-3 py-1.5">
          {#if m.emCurso}
            <span aria-hidden="true" class="absolute inset-y-0 left-0 w-1"
              style="background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(100,116,139,.55) 2px, rgba(100,116,139,.55) 4px)"></span>
          {/if}
          <span class="pt-0.5 text-xs text-slate-600 dark:text-slate-300">{m.rotulo} · {m.partido}</span>
          <span class="ml-auto text-right">
            <ConteudoCelula {celula} unidade={item.unidade ?? item.series.unidade} />
          </span>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="px-3 py-1.5 text-xs text-slate-400 dark:text-slate-500">
      {item.status === 'erro' ? `não carregou: ${item.error ?? 'erro desconhecido'}` : 'carregando…'}
    </p>
  {/if}
</section>
```

- [ ] **Step 4: Renderizar as duas formas no `ComparisonPanel.svelte`**

No ramo `{:else}` (há série e há mandatos), adicionar `hidden md:block` ao `<div>` que já envolve
a `<table>` e incluir `<ComparisonList {itens} {mandatos} />` logo depois. Os estados vazios
(sem série / sem governos) continuam compartilhados e sem duplicação.

- [ ] **Step 5: Cobrir os dois riscos de layout no E2E**

No mesmo arquivo, dois testes mobile-only (use `testInfo.project.name !== 'mobile'` para pular no
desktop):

```js
test('a lista cabe em 320px com o nome longo, sem rolagem horizontal', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'geometria de celular');
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/?series=mvgr-nominal,mvgr-real');
  await abrirGavetaInferior(page);
  const transbordo = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(transbordo).toBeLessThanOrEqual(1);
});

test('cada cartão mostra a unidade da própria série', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'lista de celular');
  await page.goto('/?series=selic-meta,mvgr-nominal');
  await abrirGavetaInferior(page);
  const cartoes = page.locator('[data-bloco="comparacao-lista"] [data-cartao-indicador]');
  await expect(cartoes.nth(0).locator('header')).toContainText('%');
  await expect(cartoes.nth(1).locator('header')).toContainText('R$');
});
```

- [ ] **Step 6: Rodar `npm run css` e os dois projetos do spec**

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/mandato-janela.spec.js`
Expected: PASS nos dois projetos (desktop continua na matriz; mobile na lista).

- [ ] **Step 7: Commit**

```bash
git add app/src/components/ConteudoCelula.svelte app/src/components/ComparisonList.svelte app/src/components/Celula.svelte app/src/components/ComparisonPanel.svelte app/e2e/mandato-janela.spec.js
git commit -m "feat: lista de comparacao por mandato no celular"
```

---

### Task 3: Gaveta com grabber, título no topo e barra escondida

**Files:**
- Modify: `app/src/components/BottomDrawer.svelte`
- Test: `app/e2e/mandato-janela.spec.js`

**Interfaces:**
- Consumes: ação `arrastarParaFechar` (Task 1); `resumo` e `fechar` já existentes no componente.
- Produces: `data-testid="grabber-comparacao"`; cabeçalho mobile com o título e um "×" com `aria-label="Fechar comparação"`; barra inferior com `max-md:hidden` quando `expandida`.

- [ ] **Step 1: Ajustar o E2E do arrasto para o grabber**

No teste `arrastar a alça para baixo fecha a gaveta…`, receber `testInfo` e escolher o alvo:
no projeto `mobile`, `page.getByTestId('grabber-comparacao')`; no desktop, a `alca` atual. A
asserção final de foco continua na `alca` (ela volta a aparecer quando a gaveta fecha).

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/mandato-janela.spec.js --project=mobile`
Expected: FAIL — `grabber-comparacao` não existe.

- [ ] **Step 2: Implementar o grabber e o cabeçalho mobile**

Dentro do painel, **antes** da área que rola:

```svelte
<div class="md:hidden">
  <div data-testid="grabber-comparacao" class="flex h-5 touch-none items-center justify-center"
    use:arrastarParaFechar={{ aoFechar: fechar }}>
    <span class="h-1 w-10 rounded-full bg-slate-600" aria-hidden="true"></span>
  </div>
  <div class="flex items-start gap-2 border-b border-slate-800 px-3 pb-2">
    <div class="min-w-0">
      <h2 class="text-[13px] font-semibold tracking-wide text-slate-100">Comparação por mandato</h2>
      <p class="text-[10.5px] text-slate-500">{resumo}</p>
    </div>
    <button bind:this={botaoFecharMobile} type="button" aria-label="Fechar comparação"
      class="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-base leading-none text-slate-300"
      onclick={fechar}>×</button>
  </div>
</div>
```

O `h2` existe só no mobile; no desktop o título continua na barra (o painel segue sem `h2`).

- [ ] **Step 3: Ancorar a folha no fim da tela**

Em `CLASSE_PAINEL`, trocar `max-md:bottom-8` por `max-md:bottom-0`.

- [ ] **Step 4: Esconder a barra inferior no mobile quando aberta**

- A barra (`<div class="flex h-8 …">`) recebe `{expandida ? 'max-md:hidden' : ''}` na classe.
- `CLASSE_CASCA` aberta: `max-md:h-0` no lugar de `max-md:h-8` (a barra não ocupa altura quando escondida).

- [ ] **Step 5: Rodapé de dados dentro da gaveta**

Dentro do painel, depois da área rolável e antes do fechamento: rodapé `md:hidden` de 28px com
`Dados públicos` e o link `/termos-de-uso.html` (o link da barra continua para o desktop).

- [ ] **Step 6: Foco no "×" visível**

Adicionar `let botaoFecharMobile = $state(null);`. No `$effect` que foca ao abrir, escolher o
primeiro com `getClientRects().length > 0`:

```js
const visivel = (el) => !!el && el.getClientRects().length > 0;
if (expandida) (visivel(botaoFecharMobile) ? botaoFecharMobile : botaoFechar)?.focus();
else alca?.focus();
```

- [ ] **Step 7: Provar que arrasto no conteúdo não fecha e que a troca de largura troca a forma**

No mesmo spec, um teste mobile-only:

```js
test('arrasto na lista não fecha, e ao alargar a tela a matriz aparece', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'geometria de celular');
  await page.goto('/');
  const gaveta = page.getByTestId('gaveta-inferior');
  await abrirGavetaInferior(page);

  const linha = page.locator('[data-bloco="comparacao-lista"] [data-linha-mandato]').first();
  await linha.dispatchEvent('pointerdown', { clientY: 100, pointerId: 1 });
  await linha.dispatchEvent('pointerup', { clientY: 260, pointerId: 1 });
  await expect(gaveta).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('[data-bloco="comparacao"] table')).toBeVisible();
  await expect(page.getByTestId('grabber-comparacao')).toBeHidden();
});
```

- [ ] **Step 8: Rodar `npm run css` e o spec nos dois projetos**

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/mandato-janela.spec.js`
Expected: PASS. No mobile, a gaveta aberta não mostra mais a barra de 32px; o título está sob o grabber; swipe >80px fecha.

- [ ] **Step 9: Commit**

```bash
git add app/src/components/BottomDrawer.svelte app/e2e/mandato-janela.spec.js
git commit -m "feat: grabber e titulo no topo da gaveta de comparacao"
```

---

### Task 4: Swipe down na ficha do indicador

**Files:**
- Modify: `app/src/components/SearchModal.svelte:687-697`
- Test: `app/e2e/busca.spec.js`

**Interfaces:**
- Consumes: ação `arrastarParaFechar` (Task 1); `fecharFicha()` já existente.
- Produces: `data-testid="grabber-ficha"` no contêiner da barrinha da folha mobile.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar em `app/e2e/busca.spec.js`, com `testInfo`:

```js
test('swipe down no grabber da ficha fecha a ficha', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'gesto de celular');
  await abrirApp(page);
  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  await campo.fill('IPCA');
  await campo.press('Enter');
  const ficha = page.locator('[data-bloco="ficha"]');
  await expect(ficha).toContainText(/IPCA/);

  const grabber = page.getByTestId('grabber-ficha');
  // 40px não fecha: é toque/hesitação
  await grabber.dispatchEvent('pointerdown', { clientY: 100, pointerId: 1 });
  await grabber.dispatchEvent('pointerup', { clientY: 140, pointerId: 1 });
  await expect(ficha).toContainText(/IPCA/);

  // 100px fecha pelo mesmo caminho do "×"
  await grabber.dispatchEvent('pointerdown', { clientY: 100, pointerId: 1 });
  await grabber.dispatchEvent('pointerup', { clientY: 200, pointerId: 1 });
  await expect(ficha).toContainText(/Escolha um indicador/);
});
```

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/busca.spec.js --project=mobile -g "swipe down no grabber"`
Expected: FAIL — `grabber-ficha` não existe.

- [ ] **Step 2: Aplicar a ação no grabber da ficha**

No `<div class="relative flex justify-center pt-2 md:hidden">`, adicionar
`data-testid="grabber-ficha"`, `touch-none` e `use:arrastarParaFechar={{ aoFechar: fecharFicha }}`.
Importar a ação no `<script>`.

- [ ] **Step 3: Rodar o teste e a suíte de busca**

Run: `npm run css && cd app && NODE_ENV=development npx playwright test e2e/busca.spec.js`
Expected: PASS nos dois projetos (o teste novo se pula no desktop; os demais não mudam).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/SearchModal.svelte app/e2e/busca.spec.js
git commit -m "fix: swipe down fecha a ficha do indicador"
```

---

### Task 5: Emendas de spec e verificação completa

**Files:**
- Modify: `docs/specs/2026-10-26-home-estilo-tradingview-design.md` (seção Mobile)
- Modify: `docs/specs/2026-10-14-camada-de-graficos-design.md` (§4 e §9.5)
- Modify: `docs/specs/2026-11-05-comparacao-mobile-design.md` (registrar o que mudou na execução, se algo mudou)

**Interfaces:**
- Nenhuma nova. Esta tarefa alinha a documentação publicada com o comportamento implementado.

- [ ] **Step 1: Corrigir a promessa antiga**

Em `2026-10-26…`, a linha "A matriz mostra 3 governos por vez e rola na horizontal" passa a
dizer que **no celular a comparação é uma lista por indicador** (cartão com uma linha por
mandato, sem rolagem horizontal), com link para o desenho novo. Em `2026-10-14…` §4 e §9.5,
registrar que a rolagem horizontal com cabeçalho fixo vale **só no desktop**.

- [ ] **Step 2: Rodar unidade e E2E completos**

Run: `npm run css && cd app && npm test`
Expected: PASS.
Run: `cd app && NODE_ENV=development npx playwright test`
Expected: PASS nos dois projetos (desktop + mobile). Não rodar em paralelo com outro E2E.

- [ ] **Step 3: Build e gates do site**

Run: `npm run build`
Expected: PASS — inclui `verificar` (canário, URLs, feed, sitemap, público, home, meta, atribuição, mobile).
Run: `npm run test:analytics`
Expected: PASS.

- [ ] **Step 4: Restaurar o artefato de dev (se o dev server do usuário estiver no ar)**

Se `lsof -nP -iTCP:4321 -sTCP:LISTEN` ou `lsof -nP -iTCP:5173 -sTCP:LISTEN` mostrar processo do
usuário:

Run: `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico`
Run: `grep -c 'brasilemnumeros.github.io/dados' public/assets/js/app/app.js`
Expected: `0` (base local). Não reiniciar o servidor dele; basta recarregar a página.

- [ ] **Step 5: Commit final**

```bash
git add docs/specs/2026-10-26-home-estilo-tradingview-design.md docs/specs/2026-10-14-camada-de-graficos-design.md docs/specs/2026-11-05-comparacao-mobile-design.md
git commit -m "docs: comparacao mobile vira lista por indicador"
```

# "Trocar o gráfico por esta série" — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar à ficha do indicador uma ação secundária explícita que troca o conjunto do gráfico por aquela série, sem diálogo e sem preferência salva.

**Architecture:** uma função nova na store (`substituirPorSerie`) faz a troca numa única emissão, reusando os helpers privados de `series.js`; a `Ficha` ganha um botão de texto e a `SearchModal` passa a prop `aoSubstituir`. O gráfico continua sendo espelho da store — nenhum estado novo em componente.

**Tech Stack:** Svelte 5 (runes, `$props`/`$derived`), stores `writable`, Vitest, Playwright, Tailwind v4.

**Spec:** `docs/specs/2026-11-04-trocar-o-grafico-design.md`

## Global Constraints

- Node 26 (`.nvmrc`). Comandos do app exigem `NODE_ENV=development` nesta máquina.
- Comentários e textos de interface em **português**; comentários explicam **por quê**.
- A troca é **uma emissão só** de `seriesStore` — nunca `limparSeries()` + `adicionarSerie()`.
- O rótulo do botão **não pode começar com "Adicionar"** (colide com o locator do E2E).
- `⏎` na ficha continua sendo a ação principal (adicionar/remover); a troca é mouse/toque/`Tab`.
- Nenhum evento de analytics: o app não instrumenta nada hoje.
- Não renomear `data-bloco`/`data-testid` existentes.
- Antes de rodar `npm run build`, conferir se há dev server na 5173 e 4321 (`lsof -nP -iTCP:<porta> -sTCP:LISTEN`); **não** encerrar servidor alheio. Se houver dev server do app, o `build` de produção troca a base do artefato em disco — restaurar depois com `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico`.
- Nunca rodar dois E2E ao mesmo tempo.

## Review Focus

1. **Gráfico vazio** → o botão de troca não existe (não há o que trocar).
2. **Série já no gráfico** → a ficha mostra só "Remover do gráfico", sem a troca.
3. **Falha de rede/HTTP na troca** → vira chip de erro com "tentar de novo"; nunca gráfico vazio silencioso.
4. **Arquivo com `id` diferente do catálogo** → erro com a mensagem do validador, nunca a série errada desenhada.
5. **Teto de 10 séries** → "Adicionar" desabilitado com motivo, troca **habilitada** e funcionando.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `app/src/stores/series.js` | + `substituirPorSerie`: troca atômica do conjunto por uma série |
| `app/src/stores/series.test.js` | testes da troca (emissão única, `expectedId`, falha) |
| `app/src/components/Ficha.svelte` | + botão secundário, derivado `podeTrocar` |
| `app/src/components/SearchModal.svelte` | + prop `aoSubstituir` e handler |
| `app/e2e/busca.spec.js` | E2E do caminho real; locator do Adicionar vira `exact` |

---

### Task 1: `substituirPorSerie` na store

**Files:**
- Modify: `app/src/stores/series.js` (depois de `substituirSeries`, ~linha 99)
- Test: `app/src/stores/series.test.js` (novo `describe` no fim do arquivo)

**Interfaces:**
- Consumes: `paraItem`, `carregarItem`, `registrarFalha`, `reindexarCores` (privados do módulo), assinatura `carregarItem(entry, { fetchImpl, expectedId })`.
- Produces: `export async function substituirPorSerie(entry, { fetchImpl } = {}) => Promise<void>` — deixa `seriesStore` com **exatamente um** item, na cor `PALETA_PADRAO[0]`, carregando ou `erro`.

- [ ] **Step 1: escrever os testes que falham**

No fim de `app/src/stores/series.test.js` (ajustar o import do topo para incluir `substituirPorSerie`):

```js
describe('substituirPorSerie — "trocar o gráfico por esta série" (2026-11-04)', () => {
  it('deixa UMA série, na cor 0, sem passar por estado vazio', async () => {
    await adicionarSerie(entrada('a'), { fetchImpl: okSerie('a') });
    await adicionarSerie(entrada('b'), { fetchImpl: okSerie('b') });

    const vistos = [];
    const desinscrever = seriesStore.subscribe((s) => vistos.push(s.itens.map((i) => i.id)));
    vistos.length = 0;
    await substituirPorSerie(entrada('c'), { fetchImpl: okSerie('c') });
    desinscrever();

    expect(vistos.every((ids) => ids.length <= 1)).toBe(true); // nunca vazio, nunca a mistura
    expect(vistos.at(-1)).toEqual(['c']);
    const itens = get(seriesStore).itens;
    expect(itens).toHaveLength(1);
    expect(itens[0].id).toBe('c');
    expect(itens[0].cor).toBe(PALETA_PADRAO[0]);
    expect(itens[0].status).toBe('ok');
  });

  it('respeita o expectedId: arquivo com outro id vira erro, não a série errada', async () => {
    await substituirPorSerie(entrada('c'), {
      fetchImpl: async () => ({ ok: true, status: 200, json: okSerie('outro').json }),
    });
    const item = get(seriesStore).itens[0];
    expect(item.status).toBe('erro');
    expect(item.error).toContain('veio o id "outro" mas o arquivo se chama "c"');
  });

  it('falha de rede na troca vira chip de erro (não existe gráfico vazio silencioso)', async () => {
    await substituirPorSerie(entrada('c'), {
      fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    });
    const itens = get(seriesStore).itens;
    expect(itens).toHaveLength(1);
    expect(itens[0].status).toBe('erro');
    expect(itens[0].error).toContain('HTTP 500');
  });
});
```

- [ ] **Step 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx vitest run src/stores/series.test.js -t substituirPorSerie`
Expected: FAIL — `substituirPorSerie is not a function` (ou erro de import).

- [ ] **Step 3: implementar na store**

Em `app/src/stores/series.js`, depois de `substituirSeries`:

```js
/** "TROCAR O GRÁFICO POR ESTA SÉRIE" (2026-11-04) — o par de `substituirSeries` para UMA série,
 *  chamado pela ficha da busca. Uma emissão só: o gráfico nunca passa pelo vazio nem mostra a
 *  mistura dos dois conjuntos. `expectedId` aqui existe porque o id é conhecido (o caminho do add
 *  o passa); o `substituirSeries` do preset não pode, porque o `datafile` dele vem curado e o id
 *  interno do JSON pode divergir do id do preset sem que seja troca de arquivo. */
export async function substituirPorSerie(entry, { fetchImpl } = {}) {
  seriesStore.set({ itens: reindexarCores([paraItem(entry)]) });
  try {
    await carregarItem(entry, { fetchImpl, expectedId: entry.id });
  } catch (error) {
    registrarFalha(entry.id, error);
  }
}
```

- [ ] **Step 4: rodar os testes da store**

Run: `cd app && NODE_ENV=development npx vitest run src/stores/series.test.js`
Expected: PASS em todos.

- [ ] **Step 5: commit**

```bash
git add app/src/stores/series.js app/src/stores/series.test.js
git commit -m "feat(app): trocar o gráfico por uma série numa emissão só"
```

---

### Task 2: botão na ficha e ligação na busca

**Files:**
- Modify: `app/src/components/Ficha.svelte` (props no topo; bloco de ação, linhas ~176-207)
- Modify: `app/src/components/SearchModal.svelte:697-703` (prop nova) e o handler perto de `confirmarAcao` (~linha 258)
- Test: `app/e2e/busca.spec.js` (novo teste no fim + `exact: true` no locator da linha 50)

**Interfaces:**
- Consumes: `substituirPorSerie` da Task 1; `seriesStore`, `jaNoGrafico` de `SearchModal`.
- Produces: prop `aoSubstituir` em `Ficha` (opcional, chamada com o indicador); botão acessível **"Trocar o gráfico por esta série"**.

- [ ] **Step 1: escrever o E2E que falha**

No fim de `app/e2e/busca.spec.js` (imports já têm `abrirApp`, `abrirVazio`, `abrirBusca`):

```js
/**
 * TROCAR O GRÁFICO POR ESTA SÉRIE (2026-11-04). A home nunca abre vazia (preset do dia), então o
 * primeiro "Adicionar" sempre cai num gráfico com conteúdo. A ação secundária da ficha resolve
 * isso sem diálogo e sem preferência: o rótulo diz que o resto sai.
 */
test('trocar o gráfico por esta série: sobra um chip, uma linha e a URL só com ela', async ({ page }) => {
  // duas séries conhecidas por permalink (o preset do dia varia com a data)
  await page.goto('/?series=selic-meta,ipca-acum-12m');
  const chips = page.locator('[data-bloco="chips"]');
  await expect(chips.locator('li')).toHaveCount(2);

  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  await campo.fill('IGP-M');
  await campo.press('Enter'); // abre a ficha do primeiro resultado

  const ficha = page.locator('[data-bloco="ficha"]');
  await expect(ficha).toContainText(/IGP-M/);
  const trocar = ficha.getByRole('button', { name: 'Trocar o gráfico por esta série', exact: true });
  await expect(trocar).toBeVisible();
  await trocar.click();

  // uma série só: o chip, a legenda e a URL concordam
  await expect(chips.locator('li')).toHaveCount(1);
  await expect(chips.locator('li')).toContainText(/igp-m/i);
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);
  await expect(page).toHaveURL(/series=igpm-acum-12m/);

  // e a ficha agora só oferece "Remover" (o indicador já está no gráfico)
  await expect(ficha.getByRole('button', { name: 'Trocar o gráfico por esta série' })).toHaveCount(0);
  await expect(ficha.getByRole('button', { name: 'Remover do gráfico' })).toBeVisible();
});

test('Esc fecha a ficha com o foco na ação secundária', async ({ page }) => {
  // A troca NÃO pode herdar `aoTeclado`: o handler trata ⏎ como a ação principal, então ⏎ no
  // botão de troca adicionaria em vez de trocar. O botão recebe só o Esc.
  await page.goto('/?series=selic-meta,ipca-acum-12m');
  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  await campo.fill('IGP-M');
  await campo.press('Enter');
  const ficha = page.locator('[data-bloco="ficha"]');
  const trocar = ficha.getByRole('button', { name: 'Trocar o gráfico por esta série', exact: true });
  await trocar.focus();
  await page.keyboard.press('Escape');
  await expect(ficha).toContainText(/Escolha um indicador/);
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(2); // nada foi trocado
});

test('sem o que trocar, a ação não aparece', async ({ page }) => {
  await abrirVazio(page); // gráfico sem série
  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  await campo.fill('IPCA');
  await campo.press('Enter');
  const ficha = page.locator('[data-bloco="ficha"]');
  await expect(ficha.getByRole('button', { name: 'Adicionar ao gráfico' })).toBeVisible();
  await expect(ficha.getByRole('button', { name: 'Trocar o gráfico por esta série' })).toHaveCount(0);
});
```

Na linha 50, trocar o locator para não casar com o rótulo novo:

```js
  const adicionar = ficha.getByRole('button', { name: 'Adicionar ao gráfico', exact: true });
```

Adicionar também, no mesmo arquivo, o cenário do teto (10 séries):

```js
test('no teto de 10 séries a troca continua habilitada e funciona', async ({ page }) => {
  // os 10 ids vêm dos presets (conferidos contra o catálogo pelo teste de integração)
  const dez = [
    'selic-meta', 'selic-over-acum-12m', 'ipca-acum-12m', 'igpm-acum-12m',
    'mvgr-nominal', 'mvgr-real', 'homicidios-anual', 'homicidios-armas-fogo-anual',
    'pib-real-anual', 'populacao-variacao-anual',
  ].join(',');
  await page.goto(`/?series=${dez}`);
  const chips = page.locator('[data-bloco="chips"]');
  await expect(chips.locator('li')).toHaveCount(10);

  await abrirBusca(page);
  const campo = page.getByRole('searchbox');
  await campo.fill('PNAD');
  await campo.press('Enter');
  const ficha = page.locator('[data-bloco="ficha"]');
  await expect(ficha.getByRole('button', { name: 'Adicionar ao gráfico', exact: true })).toBeDisabled();
  const trocar = ficha.getByRole('button', { name: 'Trocar o gráfico por esta série', exact: true });
  await expect(trocar).toBeEnabled();
  await trocar.click();
  await expect(chips.locator('li')).toHaveCount(1);
});
```

- [ ] **Step 2: rodar e ver falhar**

Run: `cd app && NODE_ENV=development npx playwright test e2e/busca.spec.js --project=desktop -g "trocar o gráfico"`
Expected: FAIL — nenhum botão "Trocar o gráfico por esta série".

- [ ] **Step 3: implementar a Ficha**

Em `app/src/components/Ficha.svelte`, acrescentar `aoSubstituir` às props (depois de `aoAdicionar`):

```js
    aoSubstituir,
```

e, logo depois de `jaNoGrafico`, o derivado:

```js
  /** A troca só faz sentido quando há o QUE trocar e o indicador ainda não está no gráfico
   *  (com ele já lá, o botão da ficha é "Remover"). */
  let podeTrocar = $derived(!jaNoGrafico && $seriesStore.itens.length > 0);
```

No bloco de ação, dentro do `{:else}` (o ramo do "Adicionar"), depois do `{#if noLimite && motivo}`:

```svelte
        {#if podeTrocar}
          <!-- AÇÃO SECUNDÁRIA (2026-11-04): "o gráfico está cheio do preset do dia e eu queria só
               esta". Explícita e destrutiva — o rótulo diz que o resto sai. Sem diálogo, sem
               "não perguntar mais" (ver docs/specs/2026-11-04-trocar-o-grafico-design.md).
               Habilitada mesmo no teto: é a saída do limite sem remover uma a uma. O rótulo NÃO
               começa com "Adicionar" para não colidir com o locator do E2E. -->
          <button
            type="button"
            onclick={() => aoSubstituir?.(indicador)}
            onkeydown={(e) => {
              // Só o Esc passa: reusar `aoTeclado` faria ⏎ aqui chamar `confirmarAcao()` —
              // adicionar em vez de trocar. ⏎ neste botão é a ativação nativa.
              if (e.key === 'Escape') {
                e.preventDefault();
                aoTeclado?.(e);
              }
            }}
            class="mt-2 w-full rounded px-3 py-1 text-xs font-medium text-slate-500 underline decoration-slate-400 underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:decoration-slate-500 dark:hover:text-slate-100"
          >
            Trocar o gráfico por esta série
          </button>
        {/if}
```

- [ ] **Step 4: ligar na SearchModal**

Importar `substituirPorSerie` junto de `adicionarSerie` e passar a prop:

```js
          aoSubstituir={(ind) => substituirPorSerie(ind)}
```

(`SearchModal` não precisa de handler intermediário: a ação não fecha nem a ficha nem a modal — depois da troca a ficha já mostra "Remover do gráfico", como no add por `⏎`.)

- [ ] **Step 5: regenerar o CSS do dev/E2E**

Run: `npm run css`
Expected: `assets/css/main.dist.css` regenerado sem erro. O E2E roda contra o dev server, que serve esse arquivo — sem isto ele mediria CSS velho (as classes do botão novo são as comuns, mas a regra do repo é rodar antes).

- [ ] **Step 6: rodar o E2E da busca**

Run: `cd app && NODE_ENV=development npx playwright test e2e/busca.spec.js`
Expected: PASS nos quatro cenários novos e nos existentes, sem nenhum `console.error`.

- [ ] **Step 7: commit**

```bash
git add app/src/components/Ficha.svelte app/src/components/SearchModal.svelte app/e2e/busca.spec.js
git commit -m "feat(app): trocar o gráfico por esta série na ficha"
```

---

### Task 3: gate do repositório

**Files:** nenhum (só verificação).

**Interfaces:**
- Consumes: tudo das Tasks 1 e 2.
- Produces: evidência de que o build publicado continua verde.

- [ ] **Step 1: conferir servidores**

Run: `lsof -nP -iTCP:5173 -sTCP:LISTEN; lsof -nP -iTCP:4321 -sTCP:LISTEN`
Expected: anotar o que está no ar. Se houver dev server do app, avisar o usuário **antes** do build de produção e restaurar o artefato no fim (Global Constraints).

- [ ] **Step 2: CSS do dev/E2E**

Run: `npm run css`
Expected: `assets/css/main.dist.css` regenerado sem erro (as classes novas do botão não são exclusivas do app — o canário não muda).

- [ ] **Step 3: build completo**

Run: `npm run build`
Expected: `build:app` → `preparar-publico` → `astro build` → `verificar`; todos os guardas verdes.

- [ ] **Step 4: unidade**

Run: `cd app && NODE_ENV=development npm test`
Expected: PASS.

- [ ] **Step 5: E2E completo**

Run: `cd app && npm run test:e2e`
Expected: PASS em desktop 1280×900 e Pixel 7, sem `console.error`/exceção.

- [ ] **Step 6: analytics**

Run: `npm run test:analytics`
Expected: PASS (nada muda: o app não instrumenta eventos).

- [ ] **Step 7: restaurar o artefato de dev, se havia servidor**

Se o Step 1 achou um dev server do app na 5173:

Run: `DADOS_LOCAL=1 npm run build:app && npm run preparar-publico`
Expected: `grep -c 'brasilemnumeros.github.io/dados' public/assets/js/app/app.js` → `0`.

- [ ] **Step 8: commit final (se sobrou algo)**

```bash
git add -A
git commit -m "chore: fecha a fatia da troca de gráfico"
```

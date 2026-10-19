import { test, expect, abrirApp, abrirBusca } from './apoio.js';

/**
 * O CELULAR (§12.1) — a guarda que não existia.
 *
 * A suíte inteira já roda no projeto `mobile` (playwright.config.js), mas ela prova
 * COMPORTAMENTO, não geometria: um controle fora da tela, um botão que não encolhe, uma
 * fileira que esconde metade dos itens — nada disso derruba um teste de papel/estado. Aqui
 * é o lugar do que só a largura da tela revela.
 *
 * 🔴 Medido em 2026-10-19 (Pixel 7, 412×839), antes da correção — os dois defeitos que
 *    estes testes pegam: a linha da lista (`classeLinha`) era `flex w-full` SEM `min-w-0`,
 *    então o botão não encolhia e empurrava o "i" para fora (a lista rolava na horizontal:
 *    `scrollW 417` num `clientW 372`); e a fileira de chips tinha `1300px` de conteúdo em
 *    `372px` de caixa, sem nenhuma pista de que havia mais grupos à direita.
 *
 * As duas primeiras asserções valem nos DOIS projetos (nada transborda na horizontal, nem
 * no desktop) — as demais são do celular e se pulam no desktop, onde os mesmos controles
 * existem com outra forma (coluna 1 da cascata, §1.1).
 */

/** Transbordo horizontal do documento, em px. Zero = nada escondido fora da janela. */
const transbordo = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('a página não rola na horizontal — nem vazia, nem com a busca aberta', async ({ page }) => {
  await abrirApp(page);
  expect(await transbordo(page), 'app recém-aberto').toBeLessThanOrEqual(1);

  await abrirBusca(page);
  expect(await transbordo(page), 'com a modal de busca aberta').toBeLessThanOrEqual(1);
});

test.describe('a modal no celular (§12.1)', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'é uma asserção de celular (a outra realização é a cascata)');
  });

  test('a lista de indicadores não esconde a coluna do "i"', async ({ page }) => {
    await abrirApp(page);
    await abrirBusca(page);

    const lista = page.locator('[data-lista-mobile]');
    await expect(lista).toBeVisible();
    // a lista abre em "Todos": os nomes longos (o maior deles é o do homicídio por arma de
    // fogo) estão nela — é essa linha que estourava a caixa
    await expect(lista.getByRole('listitem').first()).toBeVisible();
    await expect(lista).toContainText(/armas de fogo/i);

    const [clientW, scrollW] = await lista.evaluate((el) => [el.clientWidth, el.scrollWidth]);
    expect(
      scrollW,
      'a lista rola na horizontal: a linha não encolhe e empurra o "i" para fora do alcance',
    ).toBeLessThanOrEqual(clientW + 1);
  });

  test('a fileira de chips avisa que há mais grupos à direita — e não mente', async ({ page }) => {
    await abrirApp(page);
    await abrirBusca(page);

    const chips = page.locator('[data-bloco="lista-mobile"] [role="group"]');
    const pista = page.getByTestId('chips-tem-mais');
    await expect(chips).toBeVisible();

    // há mais grupos à direita (é o caso medido: 1300px de chips em 372) → a pista aparece
    await expect(pista).toBeVisible();

    // rolado até o fim, não há mais nada à direita → a pista SAI (uma pista que mentisse
    // ensinaria a não confiar nela)
    await chips.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(pista).toBeHidden();

    // e de volta ao começo, ela volta — a pista segue a posição, não o primeiro render
    await chips.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await expect(pista).toBeVisible();
  });
});

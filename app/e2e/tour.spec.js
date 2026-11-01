import { test, expect } from './apoio.js';

// Task 1 do plano: o seed padrão é o que impede a suíte inteira de ver o tour. Um teste que
// só olhasse o caso "opção ligada" passaria antes da implementação, porque a chave ainda não
// existia para ninguém — os dois lados juntos é que provam a opção.
test('por padrão a fixture semeia a chave do tour', async ({ page }) => {
  await page.goto('/?series=selic-meta-acum-12m');
  expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBe('1');
});

test.describe('opção tourNaPrimeiraVisita', () => {
  test.use({ tourNaPrimeiraVisita: true });

  test('ligada, a semente não é gravada', async ({ page }) => {
    await page.goto('/?series=selic-meta-acum-12m');
    expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBeNull();
  });
});

// O tour de verdade. O `driver.js` monta o popover fora da árvore do componente, com classe
// própria — é o contrato estável dele, então é o que os testes observam.
const POPOVER = '.driver-popover';

test.describe('tour', () => {
  test.use({ tourNaPrimeiraVisita: true });

  test('o "?" do trilho abre o tour e o Esc fecha', async ({ page }) => {
    // O `?` é `hidden lg:flex`: abaixo de 1024px ele não existe, por desenho. O caso do
    // celular (não aparecer) é o teste próprio da Task 4.
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o "?" não existe abaixo de 1024px');

    await page.goto('/?series=selic-meta-acum-12m');
    await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);

    await page.getByTestId('botao-tour').click();
    await expect(page.locator(POPOVER)).toHaveCount(1);
    await expect(page.locator('.driver-popover-title')).toHaveText('Buscar');

    await page.keyboard.press('Escape');
    await expect(page.locator(POPOVER)).toHaveCount(0);
  });
});

// O disparo automático. O caso que mais importa é o primeiro: a home SEM `?series=` carrega o
// preset do dia e GRAVA os ids na URL — se a decisão lesse a URL depois disso, o tour nunca
// abriria para ninguém.
test.describe('primeira visita', () => {
  test.use({ tourNaPrimeiraVisita: true });

  test('com o preset do dia na URL, o tour abre', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');
    await page.goto('/');
    await expect(page.locator(POPOVER)).toHaveCount(1, { timeout: 8000 });
    await expect(page.locator('.driver-popover-title')).toHaveText('Buscar');
    // A URL passou a ter `series` (o preset), e isso NÃO pode ter contado como link.
    expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBe('1');
  });

  test('fechar e recarregar não mostra de novo', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');
    await page.goto('/');
    await expect(page.locator(POPOVER)).toHaveCount(1, { timeout: 8000 });
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForTimeout(2500);
    await expect(page.locator(POPOVER)).toHaveCount(0);
  });

  test('link compartilhado não abre o tour', async ({ page }) => {
    await page.goto('/?series=selic-meta-acum-12m,ipca-acum-12m');
    await page.waitForTimeout(2500);
    await expect(page.locator(POPOVER)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBeNull();
  });

  test('no celular o tour não aparece', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(2500);
    await expect(page.locator(POPOVER)).toHaveCount(0);
  });

  test('localStorage que lança não quebra a home', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('bloqueado');
        },
      });
    });
    await page.goto('/');
    await page.waitForTimeout(2500);
    // Sem a chave legível, o tour nasce "visto" (ensinar de novo é melhor que quebrar a home)
    // e o gráfico carrega normalmente.
    await expect(page.locator(POPOVER)).toHaveCount(0);
    await expect(page.getByTestId('grafico')).toBeVisible();
    await expect(page.getByTestId('legenda-series').locator('li').first()).toHaveCount(1);
  });
});

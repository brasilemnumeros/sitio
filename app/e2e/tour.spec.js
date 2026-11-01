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

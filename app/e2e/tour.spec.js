import { test, expect } from './apoio.js';

// Task 1 do plano: o seed padrão é o que impede a suíte inteira de ver o tour. Um teste que
// só olhasse o caso "opção ligada" passaria antes da implementação, porque a chave ainda não
// existia para ninguém — os dois lados juntos é que provam a opção.
test('por padrão a fixture semeia a chave do tour', async ({ page }) => {
  await page.goto('/?series=selic-meta');
  expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBe('1');
});

test.describe('opção tourNaPrimeiraVisita', () => {
  test.use({ tourNaPrimeiraVisita: true });

  test('ligada, a semente não é gravada', async ({ page }) => {
    await page.goto('/?series=selic-meta');
    expect(await page.evaluate(() => localStorage.getItem('tour-visto'))).toBeNull();
  });
});

// O tour de verdade. O `driver.js` monta o popover fora da árvore do componente, com classe
// própria — é o contrato estável dele, então é o que os testes observam.
const POPOVER = '.driver-popover';

/** Sem `waitForTimeout` fixo: a decisão do tour só acontece depois de uma série ficar `ok`
 *  mais 600ms, então a espera ancora no estado assentado e não num relógio. */
async function esperarDecisao(page) {
  await expect(page.getByTestId('grafico')).toBeVisible();
  await expect(page.getByTestId('legenda-series').locator('li').first()).toHaveCount(1);
  await page.waitForTimeout(900);
}

test.describe('tour', () => {
  test.use({ tourNaPrimeiraVisita: true });

  test('o "?" do trilho abre o tour e o Esc fecha', async ({ page }) => {
    // O `?` é `hidden lg:flex`: abaixo de 1024px ele não existe, por desenho. O caso do
    // celular (não aparecer) é o teste próprio da Task 4.
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o "?" não existe abaixo de 1024px');

    await page.goto('/?series=selic-meta');
    await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);

    await page.getByTestId('botao-tour').click();
    await expect(page.locator(POPOVER)).toHaveCount(1);
    await expect(page.locator('.driver-popover-title')).toHaveText('Buscar');

    await page.keyboard.press('Escape');
    await expect(page.locator(POPOVER)).toHaveCount(0);
  });

  // O contrato dos sete passos: cada `data-testid` do roteiro tem de existir no app carregado.
  // Sem isto, renomear um alvo apaga o passo em silêncio e a suíte continua verde.
  test('o roteiro tem os sete passos e chega ao fim', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');

    await page.goto('/?series=selic-meta,ipca-acum-12m');
    await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(2);
    await page.getByTestId('botao-tour').click();

    await expect(page.locator('.driver-popover-progress-text')).toHaveText('1 de 7');
    const titulos = [];
    for (let i = 0; i < 7; i++) {
      titulos.push(await page.locator('.driver-popover-title').innerText());
      const proximo = page.getByRole('button', { name: 'Próximo' });
      if ((await proximo.count()) > 0) await proximo.click();
    }
    expect(titulos).toEqual([
      'Buscar',
      'Recortar o tempo',
      'Comparar governos',
      'Controles do gráfico',
      'Legenda',
      'Escala do eixo',
      'Artigos e análises',
    ]);
    await expect(page.locator('.driver-popover-progress-text')).toHaveText('7 de 7');
  });

  // O foco tem de voltar ao `?` — o driver guarda o `activeElement` de CADA passo, e a partir
  // do passo 2 esse alvo é um botão do popover anterior, que já foi removido do DOM. Sem o
  // retorno explícito, quem usa teclado recomeça o Tab do topo da página.
  test('fechar devolve o foco ao "?"', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');

    await page.goto('/?series=selic-meta');
    await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);
    await page.getByTestId('botao-tour').click();
    await page.getByRole('button', { name: 'Próximo' }).click();
    await page.getByRole('button', { name: 'Próximo' }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator(POPOVER)).toHaveCount(0);
    await expect(page.getByTestId('botao-tour')).toBeFocused();
  });

  // Bug encontrado na revisão final: o `driver.js` fecha pelo `Esc` sem chamar `onDestroyed`,
  // então `tourAberto` ficava `true` e o `?` virava botão morto depois do primeiro fechamento.
  test('fechar e reabrir pelo "?" funciona', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');

    await page.goto('/?series=selic-meta');
    await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);

    await page.getByTestId('botao-tour').click();
    await expect(page.locator(POPOVER)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator(POPOVER)).toHaveCount(0);

    await page.getByTestId('botao-tour').click();
    await expect(page.locator(POPOVER)).toHaveCount(1);
    await expect(page.locator('.driver-popover-progress-text')).toHaveText('1 de 7');
  });

  // Review Focus 5: o `driver.js` escuta `Escape` no `keyup` e a App no `keydown`; é essa ordem
  // que faz o tour fechar sem a gaveta fechar junto. Se alguém "simplificar" um dos dois, aqui
  // reprova.
  test('Esc com a gaveta aberta fecha o tour, não a gaveta', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');

    await page.goto('/?series=selic-meta');
    await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(1);
    await page.getByRole('button', { name: 'Configurações do gráfico' }).click();
    await expect(page.getByTestId('gaveta-config')).toBeVisible();

    await page.getByTestId('botao-tour').click();
    await expect(page.locator(POPOVER)).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(page.locator(POPOVER)).toHaveCount(0);
    await expect(page.getByTestId('gaveta-config')).toBeVisible();
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

  // Dado lento: `itens.length > 0` fica verdadeiro ANTES do `fetch` terminar, e o tour abria
  // sobre o esqueleto com 4 dos 6 passos — mais grave, gravando a chave "já viu", o que fazia a
  // pessoa perder Legenda e Escala para sempre. Aqui a resposta é atrasada de propósito.
  test('com o dado lento, o tour espera e abre com os seis passos', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');

    await page.route('**/dados/indicadores/*/*.json', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await page.goto('/');
    await expect(page.locator(POPOVER)).toHaveCount(1, { timeout: 12000 });
    await expect(page.locator('.driver-popover-progress-text')).toHaveText('1 de 7');
  });

  test('fechar e recarregar não mostra de novo', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'o tour não roda abaixo de 1024px');
    await page.goto('/');
    await expect(page.locator(POPOVER)).toHaveCount(1, { timeout: 8000 });
    await page.keyboard.press('Escape');
    await expect(page.locator(POPOVER)).toHaveCount(0);
    await page.reload();
    await esperarDecisao(page);
    await expect(page.locator(POPOVER)).toHaveCount(0);
  });

  test('link compartilhado não abre o tour', async ({ page }) => {
    await page.goto('/?series=selic-meta,ipca-acum-12m');
    await esperarDecisao(page);
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
    // Sem a chave legível, o tour nasce "visto" (ensinar de novo é melhor que quebrar a home)
    // e o gráfico carrega normalmente.
    await esperarDecisao(page);
    await expect(page.locator(POPOVER)).toHaveCount(0);
    await expect(page.getByTestId('grafico')).toBeVisible();
  });
});

import { test, expect, abrirVazio, carregarExemplo, mandatoEmCena } from './apoio.js';

/**
 * O CHIP DE MANDATO na barra superior (decisão de 2026-10-28, a pedido do usuário).
 *
 * O seletor de mandatos existia só dentro da gaveta inferior (`MandateRail`), e a gaveta nasce
 * RECOLHIDA — na prática, "os filtros por mandato sumiram". O chip devolve o controle à vista,
 * sem gastar altura de gráfico: mostra o mandato em cena (ou "Mandato"), abre a lista e filtra a
 * janela. É o MESMO dono da janela do minimapa (`mandateStore` + `viewportStore`), então não há
 * regra nova — só um segundo caminho até ela.
 *
 * ⚠ Em 2026-10-30 o trilho da gaveta saiu de vez (a pedido do usuário): restaram DOIS caminhos, o
 * chip (só desktop — `max-md:hidden`) e a faixa do minimapa. As provas de "mesmo estado" que
 * antes liam o `aria-pressed` do trilho leem agora a `mandateStore`.
 *
 * A janela é lida da STORE (mesmo caminho de `mandato-janela.spec.js`/`minimapa.spec.js`): o que se afirma
 * é o ESTADO, não o pixel.
 */
const janela = (page) =>
  page.evaluate(async () => {
    const { viewportStore } = await import('/src/stores/viewport.js');
    let v = null;
    viewportStore.subscribe((x) => {
      v = x;
    })();
    return v;
  });

/**
 * O conjunto do teste. Os ids vêm de `presets.js` (curados), e o conjunto é FIXO de propósito:
 * com o preset do dia a série mais longa mudaria com a data, e "a janela da Lula I" poderia
 * cair ANTES do primeiro dado — a lib assenta a borda esquerda no primeiro ponto, e o teste
 * falharia por motivo que não é o dele. Os quatro cobrem 1995→2025.
 */
const SERIES = 'selic-meta,ipca-acum-12m,mvgr-nominal,caged-total-mensal';

/** Tira a SELEÇÃO sem mexer na JANELA. `aplicarMandato(null)`/`escolherMandato(page, id)` fazem as
 *  duas coisas — e o "Tudo" deixa o minimapa sem região fora da janela, que é justamente a
 *  condição do arrasto abaixo (com a janela inteira, o gesto só encolhe a borda no limite). */
const limparSelecaoMantendoJanela = (page) =>
  page.evaluate(async () => {
    const { limparSelecao } = await import('/src/stores/mandate.js');
    limparSelecao();
  });

/** O chip traz o rótulo do mandato em cena; sem mandato, ele diz o que abre. */
test('o chip de mandato fica na barra superior e nasce sem mandato', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'o topo de 36px do celular é marca+busca+janela');
  await page.goto(`/?series=${SERIES}`);
  const topo = page.getByTestId('barra-superior');
  const chip = topo.getByTestId('mandate-chip');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-expanded', 'false');
  await expect(chip).toContainText(/mandato/i);
  await expect(chip).not.toContainText('·'); // nenhum governo escolhido
});

/**
 * Escolher um mandato no CHIP filtra a janela — e é o MESMO estado que o minimapa escreve
 * (`mandateStore`). Escolher de novo ("Todos") devolve o intervalo completo.
 */
test('o chip filtra a janela pelo mandato e "Todos" devolve o intervalo completo', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'o chip é escondido no topo de 36px');
  await page.goto(`/?series=${SERIES}`);
  const chip = page.getByTestId('mandate-chip');
  await expect(page.getByTestId('grafico')).toBeVisible();

  await chip.click();
  const menu = page.getByTestId('menu-mandatos');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem')).toHaveCount(10); // "Todos" + 9 governos
  await menu.getByRole('menuitem', { name: 'Lula I · PT' }).click();
  await expect(menu).toBeHidden();

  // A janela vai para o MANDATO — 2003-01-01 → 2006-12-31.
  //
  // ⚠ O contrato é COBRIR o mandato, não `from === '2003-01-01'`. A lib reporta também a barra
  //    PARCIALMENTE visível na borda, e qual barra é essa depende da largura da plotagem: medido
  //    em 2026-11-01, quando os rótulos compactos do eixo Y alargaram o gráfico em 22px e a borda
  //    esquerda passou a incluir dez/2002 (um mês ANTES do mandato — a direita já incluía jan/2007,
  //    um mês depois, desde sempre). Igualdade exata aqui mede o arredondamento da lib, não o
  //    produto. O que se afirma: a janela desceu para o mandato (não é o "Tudo") e a folga nas
  //    pontas é de no máximo uma barra.
  const ano = (iso) => Number(String(iso).slice(0, 4));
  await expect
    .poll(async () => (await janela(page)).from, {
      message: 'a ponta esquerda tem de cair no mandato da Lula I',
      timeout: 20000,
    })
    .toMatch(/^200[23]-/);
  const j = await janela(page);
  expect(j.from <= '2003-01-01').toBe(true);
  expect(j.from >= '2002-11-01', `folga de mais de uma barra à esquerda: ${j.from}`).toBe(true);
  expect(j.to >= '2006-12-31').toBe(true);
  expect(j.to <= '2007-02-01', `folga de mais de uma barra à direita: ${j.to}`).toBe(true);

  // o chip passa a dizer o mandato — a barra superior responde "onde estou"
  await expect(chip).toContainText('Lula I · PT');
  // §Estado: é o MESMO mandato que o minimapa e o gráfico leem, não um segundo estado
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBe('federal-2003-lula');

  // "Todos" limpa a seleção e devolve o intervalo completo. ⚠ O eco do adapter NÃO devolve a
  // store vazia (`{null, null}`): ele preenche `from`/`to` com o que o `fitContent` enquadrou e o
  // subscriber do `viewportStore` reescreve a store. Por isso a prova é o CONTRATO — o mandato
  // sai (`aria-pressed` nenhum) e a janela volta a cobrir o dado inteiro.
  await chip.click();
  await page.getByTestId('menu-mandatos').getByRole('menuitem', { name: 'Todos' }).click();
  await expect(chip).not.toContainText('·');
  await expect.poll(() => mandatoEmCena(page), { timeout: 20000 }).toBeNull();
  await expect
    .poll(async () => {
      const j = await janela(page);
      return j.from ? (Date.parse(j.to) - Date.parse(j.from)) / 86400000 / 365.25 : 0;
    }, { message: 'o "Todos" volta ao intervalo completo', timeout: 20000 })
    .toBeGreaterThan(25); // 1995→2025; um mandato tem ~4 anos
});

/**
 * O "Tudo"/preset da barra TOMA a janela do chip (um dono por vez): com um mandato escolhido, o
 * chip não pode continuar dizendo "Lula I" enquanto a tela mostra o último ano — o mesmo contrato
 * que o `TimeFilters` já respeita com a seleção do mandato.
 */
test('escolher uma janela de tempo desmarca o mandato do chip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'o chip é escondido no topo de 36px');
  await page.goto(`/?series=${SERIES}`);
  const chip = page.getByTestId('mandate-chip');
  await chip.click();
  await page.getByTestId('menu-mandatos').getByRole('menuitem', { name: 'Lula I · PT' }).click();
  await expect(chip).toContainText('Lula I · PT');

  await page.getByTestId('barra-superior').getByRole('button', { name: 'Janela de 10 anos' }).click();
  await expect(chip).not.toContainText('·');
  await expect(page.locator('[data-bloco="filtros"]').getByRole('button', { name: 'Janela de 10 anos' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

/**
 * A gaveta pode começar ABERTA (`?gaveta=fundo`) — o caso do link compartilhado de quem estava
 * comparando mandatos. É a única exceção à regra "gaveta não abre por clique de UI": nada aqui
 * escreve em `viewport` nem em `mandate`; só a geometria nasce aberta.
 */
test('o link com ?gaveta=fundo abre a gaveta de comparação, e Esc fecha', async ({ page }) => {
  await page.goto('/?gaveta=fundo');
  await expect(page.getByTestId('grafico')).toBeVisible();
  const gaveta = page.getByTestId('gaveta-inferior');
  // No celular a barra sai de cena aberta; o estado continua no mesmo botão, então a leitura é
  // por CSS — papel só acha o que está visível.
  const alca = page.locator(
    '[data-testid="barra-inferior"] button[aria-controls="gaveta-inferior"]',
  );
  await expect(gaveta).toBeVisible();
  await expect(alca).toHaveAttribute('aria-expanded', 'true');
  // só a geometria mudou: sem mandato escolhido
  expect(await mandatoEmCena(page)).toBeNull();

  await page.keyboard.press('Escape');
  await expect(gaveta).toBeHidden();
  await expect(alca).toHaveAttribute('aria-expanded', 'false');
});

/**
 * O MINIMAPA filtra por mandato: clicar numa FAIXA (onde o cursor é `pointer`) escolhe aquele
 * governo — o mesmo efeito do chip. Não pode atropelar o gesto: ARRASTAR continua
 * sendo "mover a janela" (um arrasto nunca vira escolha, mesmo com o botão do mouse preso).
 */
test('clicar numa faixa do minimapa filtra pelo mandato, e arrastar continua movendo a janela', async ({
  page,
}) => {
  await abrirVazio(page);
  await carregarExemplo(page);
  await expect(page.getByTestId('grafico')).toBeVisible();

  // As FAIXAS do minimapa terminam no mandato atual — 2025. A janela inicial é o HORIZONTE
  // inteiro (1995 → hoje, desde 2026-10-29), então a faixa mais à ESQUERDA é a do FHC I: o
  // `from` dela também é 1995-01-01. Por isso a prova é o PAR `{from,to}` — o `from` sozinho
  // não distingue "não mudou nada" de "foi para o primeiro mandato".
  const mini = page.locator('div[data-testid="minimapa"]');
  await mini.scrollIntoViewIfNeeded();
  const caixa = await mini.boundingBox();

  const y = caixa.y + caixa.height / 2;
  const cursorEm = async (x) => {
    await page.mouse.move(x, y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return page.evaluate(([px, py]) => {
      const el = document.elementFromPoint(px, py);
      return el ? getComputedStyle(el).cursor : '';
    }, [x, y]);
  };

  // A varredura para onde a tela é VISÍVEL: no celular a gaveta é uma folha `fixed` e os últimos
  // ~12% do minimapa ficam sob ela — o `page.mouse` ali entrega o evento à folha, não ao mapa.
  // O alvo tem de estar de pé no DOM: `display: none` (gaveta fechada) mede 0 e não esconde nada.
  const larguraVisivel = await page.evaluate(() => {
    const folhas = [...document.querySelectorAll('[data-testid="gaveta-inferior"]')].filter(
      (e) => e.getClientRects().length > 0,
    );
    const m = document.querySelector('[data-testid="minimapa"]').getBoundingClientRect();
    const limite = folhas.length ? Math.min(...folhas.map((e) => e.getBoundingClientRect().left)) : window.innerWidth;
    return Math.max(0, Math.min(m.right, limite) - m.left);
  });
  // `grab` (e não `pointer`): desde 2026-10-28 o cursor sobre faixa continua `grab`, porque
  // arrastar dali também move a janela — o clique só é escolha se o ponteiro não andar. A varredura
  // só MOVE o mouse; quem clica é o teste, logo abaixo.
  let alvo = null;
  for (let x = caixa.x + 6; x < caixa.x + larguraVisivel - 6; x += 4) {
    if ((await cursorEm(x)) === 'grab') {
      alvo = x;
      break;
    }
  }
  await expect(alvo, 'o minimapa tem de ter faixa clicável (cursor grab)').not.toBeNull();

  const antes = await janela(page);
  await page.mouse.click(alvo, y);

  // o clique ESCOLHE um mandato — e a janela vai para ele
  await expect
    .poll(
      async () => {
        const j = await janela(page);
        return { from: j.from, to: j.to };
      },
      { message: 'o clique na faixa tem de mudar a janela', timeout: 20000 },
    )
    .not.toEqual({ from: antes.from, to: antes.to });

  // Arrastar NÃO escolhe (o gesto manda): a janela muda pelo gesto e a seleção fica VAZIA.
  // Sem o limiar de movimento, o arrasto viraria "escolher o mandato" e a cada passo a janela
  // saltaria para o governo clicado — o defeito que o limiar existe para impedir.
  const escolhido = await mandatoEmCena(page);
  expect(escolhido, 'o clique na faixa tem de deixar UM mandato em cena').not.toBeNull();
  await limparSelecaoMantendoJanela(page);
  expect(await mandatoEmCena(page)).toBeNull();

  // Arrastar NÃO escolhe. O arrasto começa FORA da janela (o mandato recém-escolhido está numa das
  // pontas) e ANDA PARA DENTRO do minimapa: 80% da largura deixa 120px de folga à esquerda. Fora
  // do elemento o navegador CANCELA o ponteiro (`pointercancel`) e o gesto morre sem mover nada —
  // era o que tornava este teste intermitente no CI, arrastando a partir de 10px da borda. Fora
  // da janela o `pointerdown` faz o que sempre fez: CENTRA a janela no ponto. É o gesto de sempre
  // (`minimapa.spec.js`); a prova DESTE teste é que a soltura, depois de 120px de movimento, não
  // escolheu o mandato.
  const inicio = caixa.x + Math.round(larguraVisivel * 0.8);
  const b = await janela(page);
  await page.mouse.move(inicio, y);
  await page.mouse.down();
  await page.mouse.move(inicio - 120, y, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(
      async () => {
        const j = await janela(page);
        return { from: j.from, to: j.to };
      },
      { message: 'o arrasto tem de mover a janela', timeout: 20000 },
    )
    .not.toEqual({ from: b.from, to: b.to });
  expect(await mandatoEmCena(page), 'o arrasto não pode escolher mandato').toBeNull();
});

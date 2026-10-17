import { test, expect, abrirApp, carregarExemplo } from './apoio.js';

/** Espera a rajada de carga assentar: `definirSeries` faz debounce de 150ms + um rAF até o `fitContent`. */
const assentar = (page) => page.waitForTimeout(700);

/**
 * O EXEMPLO PRONTO ("Selic × IPCA", §9.1) — o caminho mais curto para um gráfico com dado. É o
 * cenário dos três defeitos silenciosos: cobre o CSS (casca.spec), mas aqui cobrimos o MONTE do
 * gráfico e da legenda a partir da store (§8), e as duas `LineSeries` no adapter.
 */
test('exemplo pronto: dois chips, duas linhas na legenda e o gráfico monta', async ({ page }) => {
  await abrirApp(page);
  await carregarExemplo(page);

  // duas séries → dois chips (§1, posição 2) e dois itens na legenda (§12.2)
  await expect(page.locator('[data-bloco="chips"] li')).toHaveCount(2);
  await expect(page.getByTestId('legenda-series').locator('li')).toHaveCount(2);

  // cada linha da legenda identifica a série por TEXTO (Selic / IPCA) — o canal redundante de §12.2
  const legenda = page.getByTestId('legenda-series');
  await expect(legenda).toContainText(/selic/i);
  await expect(legenda).toContainText(/ipca/i);

  // o gráfico montou: o contêiner da lib ganhou <canvas> (a lib desenha em várias camadas; não
  // fixamos a contagem — o que importa é haver desenho). NÃO afirmamos o DESENHO — isso é a captura.
  const grafico = page.getByTestId('grafico');
  await expect(grafico).toBeVisible();
  expect(await grafico.locator('canvas').count()).toBeGreaterThan(0);
  expect(await page.getByTestId('minimapa').locator('canvas').count()).toBeGreaterThan(0);
  // e o gráfico tem altura real (não um contêiner colapsado)
  const altura = await grafico.evaluate((el) => el.getBoundingClientRect().height);
  expect(altura).toBeGreaterThan(100);

  // a legenda traz o seletor de eixo por texto (esq./dir.) — §5
  await expect(legenda.getByRole('button', { name: /esq\.|dir\./ }).first()).toBeVisible();

  await page.screenshot({ path: 'e2e/.artefatos/exemplo-selic-ipca.png', fullPage: true });
});

/**
 * REMOVER SÉRIE (§1) — e o caso perigoso: remover a ÚLTIMA com uma janela de tempo ativa. O
 * `setVisibleRange`/`fitContent` da lib LANÇA num gráfico sem NENHUMA barra (medido 2026-10-15); o
 * adapter ganhou guarda (`if (!temDado) return`). Aqui provamos que o app NÃO lança nesse caminho —
 * e a fixture de `apoio.js` falha o teste se um `console.error` ou exceção escapar.
 */
test('remover o ✕ do chip tira a série; remover a última com janela ativa não lança', async ({
  page,
}) => {
  await abrirApp(page);
  await carregarExemplo(page);

  // 1 · ativa uma janela (preset "5a") — o adapter passa a reagir à store `viewport`
  const filtros = page.locator('[data-bloco="filtros"]');
  await assentar(page);
  await filtros.getByRole('button', { name: 'Janela de 5 anos' }).click();
  await expect(filtros.getByRole('button', { name: 'Janela de 5 anos' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // 2 · remove a PRIMEIRA pelo ✕ do chip
  const chips = page.locator('[data-bloco="chips"]');
  await chips.getByRole('button', { name: /^Remover / }).first().click();
  await expect(chips.locator('li')).toHaveCount(1);

  // 3 · remove a ÚLTIMA — a janela segue ativa e o gráfico esvazia. Não pode lançar.
  await chips.getByRole('button', { name: /^Remover / }).first().click();
  await expect(chips.locator('li')).toHaveCount(0);

  // o app volta ao estado inicial (§9.1) — vazio COM motivo, não uma tela morta
  await expect(page.locator('[data-bloco="inicial"]')).toBeVisible();
  // e o gráfico sumiu junto com a última série
  await expect(page.getByTestId('grafico')).toHaveCount(0);

  // (sem asserção explícita de erro: a fixture de `page` já falha o teste se um erro escapou)
});

/**
 * FILTROS DE TEMPO (§1, posição 4) — §9.1: o bloco NÃO existe sem série (divulgação progressiva);
 * com série ele aparece habilitado, e o clique muda o estado ativo (`aria-pressed`) por DURAÇÃO,
 * derivado da store (§8.1), nunca de estado local.
 */
test('filtros de tempo: não existem sem série, aparecem com série, e clicar muda o ativo', async ({
  page,
}) => {
  await abrirApp(page);

  // sem série: o bloco nem existe — não há barra morta para explicar (§9.1)
  await expect(page.locator('[data-bloco="filtros"]')).toHaveCount(0);

  // com série: aparece habilitado
  await carregarExemplo(page);
  await assentar(page);
  const filtros = page.locator('[data-bloco="filtros"]');
  const umAno = filtros.getByRole('button', { name: 'Janela de 1 ano' });
  const cincoAnos = filtros.getByRole('button', { name: 'Janela de 5 anos' });
  const tudo = filtros.getByRole('button', { name: 'Janela completa' });
  await expect(umAno).toBeEnabled();
  await expect(cincoAnos).toBeEnabled();
  await expect(tudo).toBeEnabled();
  // com dado carregado não há motivo de vazio
  await expect(filtros.getByRole('status')).toHaveCount(0);

  // clicar acende o preset (por duração, derivado da store)
  await cincoAnos.click();
  await expect(cincoAnos).toHaveAttribute('aria-pressed', 'true');
  await expect(umAno).toHaveAttribute('aria-pressed', 'false');

  await umAno.click();
  await expect(umAno).toHaveAttribute('aria-pressed', 'true');
  await expect(cincoAnos).toHaveAttribute('aria-pressed', 'false');

  // "Tudo" reseta a janela
  await tudo.click();
  await expect(tudo).toHaveAttribute('aria-pressed', 'true');

  await page.screenshot({ path: 'e2e/.artefatos/filtros-tempo.png', fullPage: true });
});

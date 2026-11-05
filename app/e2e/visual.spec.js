import {
  test,
  expect,
  abrirGavetaConfig,
  abrirGavetaInferior,
  semTransbordo,
  medirCaixas,
} from './apoio.js';

/**
 * A MOLDURA VISTA DE FORA (T11) — números, não pixels.
 *
 * O miolo é canvas: antialiasing, fontes e GPU variam entre máquinas, então uma baseline de
 * `toHaveScreenshot` seria instável e mentiria no CI. A comparação automática fica na GEOMETRIA
 * (caixas com tolerância de 1px); as capturas em `e2e/.artefatos/` são artefatos para o revisor
 * olhar — o que a medida não prova (rótulo sobreposto, minimapa ilegível) só o olho pega.
 *
 * Roda só no projeto `desktop`: o `mobile` tem o percurso próprio (`mobile.spec.js`, Pixel 7).
 * Aqui os viewports são EXPLÍCITOS, inclusive um de 390×844 — o terminal tem de se sustentar na
 * largura de um celular mesmo quando a suíte está no desktop.
 */
test.skip(({ isMobile }) => isMobile, 'geometria explícita no projeto desktop');

const TOL = 1; // px

for (const [nome, width, height] of [
  ['1440x900', 1440, 900],
  ['1280x800', 1280, 800],
  ['390x844', 390, 844],
]) {
  test(`moldura fechada em ${nome}: sem rolagem e gráfico preenche o miolo`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByTestId('grafico').locator('canvas').first()).toBeVisible();
    await semTransbordo(page);

    const c = await medirCaixas(page);
    const topoEsperado = width < 640 ? 36 : 44;
    expect(Math.abs(c.topo.h - topoEsperado)).toBeLessThanOrEqual(TOL);
    expect(Math.abs(c.inferior.h - (width < 640 ? 32 : 36))).toBeLessThanOrEqual(TOL);
    expect(Math.abs(c.trilho.w - (width < 640 ? 40 : 44))).toBeLessThanOrEqual(TOL);
    expect(Math.abs(c.minimapa.h - (width < 768 ? 40 : 48))).toBeLessThanOrEqual(TOL);

    // o gráfico ocupa o que sobra, descontando topo, barra inferior e minimapa
    const livre = height - c.topo.h - c.inferior.h - c.minimapa.h;
    expect(c.grafico.h).toBeGreaterThanOrEqual(livre * 0.6);
    expect(c.grafico.bottom).toBeLessThanOrEqual(c.inferior.y + TOL);

    await page.screenshot({ path: `e2e/.artefatos/visual-${nome}-fechado.png` });
  });

  test(`gavetas em ${nome}: abrir não transborda e não cobre a barra`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await abrirGavetaConfig(page);
    await expect(page.getByTestId('gaveta-config')).toBeVisible();
    await semTransbordo(page);

    const c = await medirCaixas(page);
    if (width >= 1024) {
      expect(Math.abs(c.config.w - 320)).toBeLessThanOrEqual(2);
      expect(c.grafico.w + c.config.w).toBeLessThanOrEqual(c.vw + TOL);
    } else {
      // folha de 88% no celular
      expect(c.config.w / c.vw).toBeGreaterThan(0.85);
      // A folha COBRE o gráfico: sem fundo opaco o canvas aparece através dela (medido na revisão
      // visual de 390px). `rgba(0, 0, 0, 0)` é o único valor transparente aceito como "sem fundo".
      const fundo = await page
        .getByTestId('gaveta-config')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(fundo, 'a folha precisa de fundo opaco').not.toMatch(/rgba\([^)]*, 0\)$/);
      expect(fundo).not.toBe('transparent');
    }

    await page.screenshot({ path: `e2e/.artefatos/visual-${nome}-gaveta-config.png` });
    await page.getByRole('button', { name: 'Fechar séries' }).click();
    await expect(page.getByTestId('gaveta-config')).toBeHidden();
    await abrirGavetaInferior(page);
    if (width < 768) {
      // 2026-11-05: no celular a gaveta aberta é a própria folha (grabber + título no topo) e a
      // barra de 32px sai de cena. O que importa é a folha ocupar o rodapé sem transbordar.
      await expect(page.getByTestId('gaveta-inferior')).toBeVisible();
      await expect(page.getByTestId('grabber-comparacao')).toBeVisible();
      await expect(page.getByTestId('barra-inferior')).toBeHidden();
    } else {
      await expect(page.getByTestId('barra-inferior')).toBeVisible();
    }
    await semTransbordo(page);
    await page.screenshot({ path: `e2e/.artefatos/visual-${nome}-gaveta-inferior.png` });
  });
}

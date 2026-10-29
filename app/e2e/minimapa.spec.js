import { test, expect, abrirApp, abrirVazio, adicionarPorBusca } from './apoio.js';

/**
 * O MINIMAPA (§2) — o gesto que devolve "voltar de qualquer zoom".
 *
 * O defeito que motivou esta spec era REAL e foi corrigido em 2026-10-15: o arrasto era ABSOLUTO —
 * cada `pointermove` re-centrava a janela no cursor, então mover o mouse **10px** saltava ~5 anos e,
 * com a ponta batendo no limite do dado, a janela colapsava na borda (o "zoom numa fatia mínima"
 * relatado pelo usuário). E as PONTAS não tinham alça: redimensionar não existia.
 *
 * **O que manteve estes três testes em `fixme` não era o gesto** — ele sempre esteve certo (sonda
 * no navegador: mover 120px desloca ~2,9 anos MANTENDO a largura; agarrar a borda esquerda move só
 * `from`, `1995-12 → 2002-08`, com `to` parado). Eram DOIS defeitos do app, medidos em 2026-10-19,
 * ambos jogando fora a janela do usuário logo depois de ele a escolher:
 *
 *  1. **O fit automático não ouvia o filtro.** O `fitContent` adiado de `adapter.js` (150ms) só era
 *     desarmado por gesto NO GRÁFICO GRANDE (`pointerdown`/`wheel`) — clicar num preset não contava.
 *     A corrida: o fit dispara ~20-40ms depois de o filtro habilitar, e o preset só escreve
 *     ~60-86ms depois do clique; quando a ordem invertia, o preset ia para o lixo e o poll abaixo
 *     estourava. (E o mesmo fit, com uma série a mais, enquadrava o alcance TOTAL.)
 *  2. **`setData` movia a janela.** Uma série cuja data ESTENDE o domínio de tempo desloca o range
 *     visível ao entrar (medido: `selic-meta-acum-12m`, 320 barras, levou `2015-06→2025-06` a
 *     `2020-08→2025-10`; re-setar a MESMA data não move). O eco do adapter aceitava isso como se
 *     fosse o usuário.
 *
 * Os dois são reproduzíveis por medição, não por leitura: `app/scripts/medir-janela.mjs` (precisa do
 * dev server no ar) mede a janela antes e depois de adicionar a série, nas DUAS cenas, e acusa
 * FALHOU se a escolha do usuário for jogada fora. Foi com ele que se mediu, aqui, o
 * `2020-08-31 → 2025-10-31` (1887d) do mecanismo 2.
 *
 * A correção (2026-10-19) é um conceito só — **AUTORIA da janela**: quem ESCOLHE (preset do filtro,
 * arrasto do minimapa, gesto no gráfico grande) declara, e daí em diante (a) o fit não roda e (b)
 * uma atualização de DADO não move a janela — o adapter guarda e devolve no frame seguinte, porque
 * `setVisibleRange` na MESMA volta do `setData` não pega (o mesmo motivo pelo qual o fit espera um
 * frame). A hipótese que estava escrita aqui — o "laço de eco do `adapter.js`" — estava ERRADA: o
 * eco devolve o mesmo valor e converge; o que voltava era o fit e o `setData`.
 *
 * Tentado e descartado, para não se repetir: (a) esperar o filtro pelo estado (`toBeEnabled`) em
 * vez de por tempo — FICOU, é o certo; (b) 1,2s de assentamento — SAIU junto com a corrida;
 * (c) achar as alças pelo cursor em vez de calcular a posição — FICOU, e é o que prova que a alça
 * existe; (d) `scrollIntoViewIfNeeded` — FICOU (o minimapa fica abaixo da dobra num viewport de
 * 900px); (e) repetir o gesto até 4x — SAIU (ver abaixo).
 */

const MINI = 'div[data-testid="minimapa"]';

/** A janela visível, lida da store — é ela que o adapter desenha. */
async function janela(page) {
  return page.evaluate(async () => {
    const { viewportStore } = await import('/src/stores/viewport.js');
    let v = null;
    viewportStore.subscribe((x) => { v = x; })();
    return v;
  });
}

async function preparar(page) {
  // ⚠ Abre VAZIO, não com o preset do dia: os testes do minimapa medem GEOMETRIA do gesto
  // (deslocar sem redimensionar), e o preset do dia muda com a data — em 2026-10-28 ele trouxe
  // séries de granularidade mensal FIM de mês, e o arrasto passou a assentar as bordas em
  // início de mês: a largura variava 61 dias e este teste (limite de 60) ficava vermelho só
  // porque o dia mudou. O contrato do gesto não depende do conjunto de séries do dia.
  await abrirVazio(page);
  // uma série basta: o minimapa precisa de dado para ter alcance de tempo
  await adicionarPorBusca(page, 'IPCA');
  // ⚠ O filtro fica DESABILITADO enquanto não há série carregada (§9.5) — clicar antes disso não
  // faz nada e a janela fica no alcance total, o que trava "mover" nas duas pontas e faz os testes
  // falharem por um motivo que não é o deles. Esperar o ESTADO, não o tempo.
  const filtro = page.getByRole('button', { name: 'Janela de 10 anos' });
  await expect(filtro).toBeEnabled({ timeout: 20000 });
  // estreita: com o alcance total a janela está travada nas duas pontas e nada poderia mover.
  // O nome acessível é o `aria-label` do preset, não o texto do botão.
  await filtro.click();
  // ⚠ Esperar o preset ASSENTAR — e não há mais `waitForTimeout` aqui: o preset agora DECLARA a
  // autoria da janela (§8.1, `escolhaDoUsuario`), então nem o fit automático nem o `setData` de uma
  // série posterior podem desfazê-lo. Era o `waitForTimeout` que mascarava a corrida acima.
  //
  // 📌 E o preset ANCORA a janela na última data ("voltar de qualquer zoom"): `from` fica em
  // `dataMaxima - 10 anos` e `to` no fim do dado. Consequência para quem escrever teste aqui: a
  // janela está COLADA na borda direita, então arrastar para a DIREITA é clampado e não tem efeito.
  // ⚠ A janela do PRESET DO DIA já pode ser menor que 12 anos (a de hoje é de 5), então
  // "menos de 12 anos" passa ANTES do clique surtir efeito — e o scan do minimapa pega a
  // janela errada. A espera é pela janela do preset "10 anos" de fato (9–11 anos), não por
  // "algo menor que 12".
  const anosDaJanela = (j) =>
    j.from ? (Date.parse(j.to) - Date.parse(j.from)) / 86400000 / 365.25 : Infinity;
  await expect.poll(async () => anosDaJanela(await janela(page)), {
    message: 'o filtro de 10 anos tem de assentar a janela em ~10 anos',
    timeout: 20000,
  }).toBeGreaterThan(8.5);
  expect(anosDaJanela(await janela(page))).toBeLessThan(11.5);
}

/** Centro do minimapa em coordenadas de VIEWPORT (o que o mouse usa).
 *  ⚠ Rola primeiro: o minimapa fica ABAIXO DA DOBRA num viewport de 900px, e com ele fora da
 *  tela o `page.mouse` entrega eventos a um ponto vazio — o gesto simplesmente não acontece.
 *  (Se ele entra ou não na tela depende da altura da legenda, que varia com o número de séries
 *  carregadas: foi o que fez este teste ser intermitente em vez de falhar sempre.) */
async function caixa(page) {
  await page.locator(MINI).scrollIntoViewIfNeeded();
  const r = await page.locator(MINI).boundingBox();
  return { x: r.x, y: r.y + r.height / 2, w: r.width };
}

/**
 * Acha as duas bordas da janela varrendo o minimapa e lendo o CURSOR — é assim que o usuário
 * as acha, e é o que prova que a alça existe. (Não calcular a posição por conta própria: o
 * espaço do ponteiro não é o do gráfico — a lib reserva faixa para as escalas de preço, e
 * confundir os dois erra por ~54px, que foi o defeito. Aqui o app é quem responde.)
 *
 * ⚠ O cursor é escrito pela lib no próximo quadro, não no mesmo: ler imediatamente devolve o
 * valor ANTERIOR e o scan perde amostras. Com uma borda só, a "média" cai em cima dela e o
 * gesto vira redimensionar — o teste falha por um motivo que não é o dele. Daí o rAF.
 */
async function bordas(page) {
  const c = await caixa(page);
  const cursorEm = async (x) => {
    await page.mouse.move(x, c.y);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    return page.evaluate(([px, py]) => {
      const el = document.elementFromPoint(px, py);
      return el ? getComputedStyle(el).cursor : '';
    }, [x, c.y]);
  };
  const alcas = [];
  // passo 3 (não 6): a alça tem ~4px e um passo 6 pode PASSAR POR CIMA das duas — o scan
  // então acha só uma e o teste falha por amostragem, não por comportamento.
  for (let x = c.x + 2; x < c.x + c.w - 2; x += 3) {
    if ((await cursorEm(x)) === 'ew-resize') alcas.push(x);
  }
  return {
    esquerda: alcas.length ? Math.min(...alcas) : null,
    direita: alcas.length ? Math.max(...alcas) : null,
  };
}

/** Largura da janela em dias — a grandeza que "mover" tem de preservar. */
const dias = (j) => (Date.parse(j.to) - Date.parse(j.from)) / 86400000;

// ⚠ O gesto NÃO é repetido. Havia um `gestoAte` que tentava até 4 vezes, e ele saiu junto com a
// corrida que o justificava: afirmar o CONTRATO ("arrastar desloca a janela") com retry transforma
// falha determinística em sorte, e o teste passa a não provar nada sobre a primeira tentativa —
// que é a que o usuário faz. Se um gesto só não bastar, isto tem de ficar vermelho.

test('mover: arrastar desloca a janela e PRESERVA a largura', async ({ page }) => {
  await preparar(page);
  const b = await bordas(page);
  expect(b.esquerda, 'a alça esquerda tem de existir').not.toBeNull();
  expect(b.direita, 'a alça direita tem de existir').not.toBeNull();
  // As duas alças têm de estar LONGE uma da outra: se o scan pegar só uma, a média cai em cima
  // dela e o gesto vira redimensionar — a falha apareceria como "não moveu", enganando quem ler.
  expect(b.direita - b.esquerda, 'o scan tem de achar as DUAS bordas').toBeGreaterThan(50);
  const antes = await janela(page);

  // agarra DENTRO da janela (a média das bordas), não no meio do minimapa — o meio do minimapa
  // pode estar fora dela, e aí o gesto é "centrar", que é outro comportamento.
  const meio = (b.esquerda + b.direita) / 2;
  const c = await caixa(page);
  await page.mouse.move(meio, c.y);
  await page.mouse.down();
  await page.mouse.move(meio - 60, c.y, { steps: 10 });
  await page.mouse.up();

  const depois = await janela(page);
  // para a ESQUERDA: a janela do preset está colada na borda direita do dado, então para a direita
  // o arrasto é clampado e não move (ver `preparar`)
  expect(Date.parse(depois.from), 'o arrasto tem de deslocar a janela').toBeLessThan(Date.parse(antes.from));
  // a largura ficou (o defeito antigo colapsava a janela)
  expect(Math.abs(dias(depois) - dias(antes))).toBeLessThan(60); // menos de ~2 meses de folga
});

test('redimensionar: a alça da ponta esquerda move UMA borda só', async ({ page }) => {
  await preparar(page);
  const b = await bordas(page);
  expect(b.esquerda, 'a alça esquerda tem de existir').not.toBeNull();
  const c = await caixa(page);
  const antes = await janela(page);

  await page.mouse.move(b.esquerda, c.y);
  await page.mouse.down();
  await page.mouse.move(b.esquerda + 80, c.y, { steps: 10 });
  await page.mouse.up();

  const depois = await janela(page);
  // a ponta agarrada andou…
  expect(Date.parse(depois.from), 'a alça tem de redimensionar').toBeGreaterThan(Date.parse(antes.from));
  // …e a OUTRA não. É isto que separa redimensionar de mover.
  expect(depois.to).toBe(antes.to);
});

test('um arrasto pequeno NÃO causa um salto grande (o relato: "fatia minúscula")', async ({ page }) => {
  await preparar(page);
  const b = await bordas(page);
  // ⚠ Sem esta guarda o teste mente: sem alça achada, `meio` vira `NaN`, o mouse vai a lugar nenhum
  // e a falha aparece como "não teve efeito" — o falso negativo que ajudou a manter este teste em
  // `fixme` (a alça existia; era a LEITURA que não era conferida).
  expect(b.esquerda, 'a alça esquerda tem de existir').not.toBeNull();
  expect(b.direita, 'a alça direita tem de existir').not.toBeNull();
  const c = await caixa(page);
  const antes = await janela(page);

  // 1% da largura do minimapa, agarrando DENTRO da janela. O defeito antigo convertia isto em
  // ANOS de salto, porque cada movimento re-centrava a janela em vez de deslocá-la.
  // ⚠ Para a ESQUERDA — o preset ancora a janela na última data, então para a direita é clampado
  // (0/4 medições de efeito). Arrastar para a direita aqui acusa "o gesto não funciona" quando o
  // gesto funciona, só não naquela direção: a outra metade do que mantinha este teste vermelho.
  const passo = c.w * 0.01;
  const meio = (b.esquerda + b.direita) / 2;
  await page.mouse.move(meio, c.y);
  await page.mouse.down();
  await page.mouse.move(meio - passo, c.y, { steps: 5 });
  await page.mouse.up();

  const depois = await janela(page);
  const deslocamento = Math.abs(Date.parse(depois.from) - Date.parse(antes.from)) / 86400000;
  expect(deslocamento, 'o arrasto pequeno tem de ter efeito').toBeGreaterThan(0);
  // proporcional: 1% da largura da janela de 10 anos ≈ 36 dias. Antes eram ~5 ANOS para 10px.
  expect(deslocamento).toBeLessThan(400); // ~13 meses — folga generosa, mas longe de "5 anos"
});

/**
 * O minimapa é um MAPA do gráfico acima: ele só informa "onde eu estou" se o x dele for o
 * MESMO x do gráfico. Não era — medido em 2026-10-19 num app de 1280px: a plotagem do gráfico
 * grande é `[54, 1064)` (as duas escalas de preço reservam as pontas) e o minimapa ocupava
 * `[0, 1120)`. Não era deslocamento, era ESCALA: a mesma data caía a −28px em 2003, +1,6px em
 * 2011 e +31px em 2019, e a cortina não ficava sob a faixa correspondente.
 *
 * A guarda compara a CAIXA do minimapa com a ÁREA DE PLOTAGEM — o canvas do pane, que é o mais
 * largo que não ocupa o container. Comparar com o container passaria com o defeito.
 */
test('o minimapa cobre a MESMA área de plotagem do gráfico acima', async ({ page }) => {
  await abrirApp(page);
  await adicionarPorBusca(page, 'IPCA');

  const medir = () => page.evaluate(() => {
    const g = document.querySelector('[data-testid="grafico"]');
    const r = g.getBoundingClientRect();
    const pane = [...g.querySelectorAll('canvas')]
      .map((cv) => cv.getBoundingClientRect())
      .filter((b) => b.width < r.width - 1)
      .sort((a, b) => b.width - a.width)[0];
    const m = document.querySelector('[data-testid="minimapa"]').getBoundingClientRect();
    return { plotagem: { left: pane.left, width: pane.width }, minimapa: { left: m.left, width: m.width } };
  });

  // o alinhamento é aplicado depois de a lib assentar as escalas (medido: 1–2 quadros).
  await expect.poll(async () => {
    const { plotagem, minimapa } = await medir();
    return Math.max(Math.abs(minimapa.left - plotagem.left), Math.abs(minimapa.width - plotagem.width));
  }, { message: 'o minimapa tem de cobrir exatamente a plotagem do gráfico', timeout: 10000 })
    .toBeLessThan(1.5);
});

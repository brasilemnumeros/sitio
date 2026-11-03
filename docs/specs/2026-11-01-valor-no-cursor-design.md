# Valor sob o cursor na legenda do gráfico

**Data:** 2026-11-01 · **Tamanho:** mudança pequena · **Specs tocadas:**
`2026-10-26-home-estilo-tradingview-design.md` (§1, legenda dentro do gráfico)

## O problema

Hoje não há como ler o valor de um ponto do gráfico. Passar o cursor mostra só a cruz da
biblioteca: a data no eixo do tempo e um número do eixo de preço, que **não** é o valor de
nenhuma série (com dois eixos, pior ainda). O último valor de cada série aparece no eixo Y, mas o
ponto onde o cursor está, em nenhum lugar.

## O que queremos

Com o cursor sobre o gráfico, uma **caixa flutuante** acompanha o ponteiro mostrando a data e os
valores de todas as séries naquele ponto. Cursor fora do gráfico, a caixa some.

**Histórico da decisão (2026-11-01).** Duas variantes foram construídas e comparadas ao vivo:

- **A** — o número em cada linha da legenda dentro do gráfico. Não cobre o desenho, mas no celular
  espremia o nome da série ("P…", "Taxa Selic Me…").
- **B** — a caixa flutuante. Foi a **escolhida**: lê data e valores como um bloco único.

A A foi construtída primeiro e depois removida (o número à direita do `×` chegou a existir para os
ícones não se mexerem — esse ajuste morreu junto, não está no código).

**Ajustes pedidos na mesma rodada** (o desenho não era definitivo):

- A data aparece como **mês/ano** (`jun/2009`) — a caixa acompanha o cursor, não é instrumento de
  leitura de dia; o dia continua no eixo do tempo.
- A caixa **não sobrepõe** o eixo Y, o eixo do tempo nem a legenda: ela é presa à área útil da
  plotagem (medida pelas larguras REAIS das duas escalas) e desce para baixo do bloco da legenda
  quando cruzaria com ele.

## Geometria

`ChartTooltip` recebe do `Chart` a largura/altura do pane (`bind:clientWidth/clientHeight` — a
variável do `bind:this` não é reativa, e sem isto a área útil era calculada com largura 0),
`margemEsquerda`, `margemDireita` e a caixa medida da legenda. Preferência: à direita e abaixo do
cursor; sem espaço, vira para a esquerda/acima; por fim, presa na área útil.

## A regra do valor

- Só aparece valor quando a série tem **ponto naquela data** — a data que o próprio gráfico
  reporta no cursor (o `time` que a lib entrega, em segundos UTC, convertido por `paraISO`).
- Sem ponto na data → um traço (`—`), não um número inventado. Um valor "vigente" ou "mais
  próximo" mentiria sobre a data que o eixo está mostrando.
- Série **oculta** não mostra valor: ela não está desenhada, e o número ao lado de uma linha
  invisível confunde.
- Série carregando ou com erro → traço.
- Formatação pela unidade da série (`valorNaUnidade`, `domain/format.js`): `44,22%`, `R$ 1.234`,
  `213.421.037 hab.`.

## Como o dado chega

ADR 0001: o gráfico é espelho dos stores, e componente de UI não chama a lib.

1. `chart/adapter.js` ganha um callback `aoMoverCursor(iso)` no mesmo molde de `aoMudarJanela`,
   assinando `subscribeCrosshairMove`; sem cursor sobre o pane, chama com `null`.
2. `components/Chart.svelte` liga esse callback a um store novo — `stores/cursor.js`
   (`{ data: string|null }`), somente leitura para a UI.
3. `ChartLegend.svelte` assina o store e, para cada série visível, resolve o valor.
4. `domain/seriesValue.js` (novo, puro): `valorNaData(data, iso)` com busca binária (os dados já
   vêm ordenados por data) devolvendo o número ou `null`. Busca binária, e não `find`, porque é
   chamada a cada movimento do mouse para até 10 séries de milhares de pontos.

## Guardas

- **Unidade**: `valorNaData` acha o valor na data exata, devolve `null` para data ausente, e não
  se perde com série de um ponto só.
- **E2E**: ainda NÃO existe — o desenho não é definitivo (dito pelo usuário em 2026-11-01). Quando
  fechar, a guarda é: mover o mouse sobre o meio do gráfico → ao menos uma linha passa a mostrar
  número; tirar o cursor → os números somem.
- O E2E de `casca.spec.js` que proíbe `data-testid` fora da casca não é afetado: a leitura usa a
  `data-testid` que já existe (`legenda-grafico`).

## Não-objetivos

- Mostrar o último valor parado na legenda (já está no eixo Y — dito pelo usuário).
- Mover o eixo, mexer em escala, tooltip flutuante ou linha horizontal seguindo o cursor.
- Tocar o minimapa.

## Números compactos (2026-11-01, mesma rodada)

Motivo: no celular de 390px, dois eixos com números longos comiam **194px de 350** — o gráfico
ficava com 156px. Medido depois da mudança: **142px de eixos e 208px de gráfico** (+33%).

- **Eixo Y** (`chart/adapter.js` → `rotuloDoEixo`): `locale: 'pt-BR'` e notação compacta a partir de
  **1 milhão** (`216.000.000` → `216 mi`). Abaixo disso o valor é exato — "320 mil" tem a mesma
  largura de "320.000", então compactar milhar não ganha pixel e quebra a coerência do eixo.
  Efeito colateral bem-vindo: o ponto decimal virou vírgula (antes a lib escrevia `320000.00`).
- **Caixa do cursor** (`domain/format.js` → `valorCompacto`): mesma régua, e o valor EXATO vai no
  `title` de cada linha (`193 mi hab.` na tela, `192.989.569 hab. · 2011-01-01` no hover).

## Emenda 2026-11-03 — o cursor gruda no ponto, e o ponto tem bolinha

**Problema medido.** Numa série ANUAL (preset Atividade) a caixa ficava em `—` em quase todo o
gráfico. O eixo x é esticado até hoje por âncoras **mensais** invisíveis (`domain/horizonte.js`),
e a lib prendia a cruz à grade da união das séries — inclusive a invisível. Medido no dev server
em 2026-11-03, varrendo a largura:

```
0,3 → jan/2005 → PIB 3,20% | População 1,12%
0,4 → mai/2008 → — | —
0,5 → set/2011 → — | —
```

**Decisões.**

1. **Snap no ponto real** (`chart/adapter.js`): `crosshair.doNotSnapToHiddenSeriesIndices: true`.
   A cruz passa a grudar no ponto mais próximo de uma série VISÍVEL, e a data que a caixa mostra
   é a data de um ponto. Depois da mudança, a mesma varredura dá `jan/2005`, `jan/2008`,
   `jan/2012`…
2. **Ponto fora da janela → sem leitura** (`chart.clearCrosshairPosition()` + cursor `null`):
   quando o ponto mais próximo está fora da janela visível (vão entre dois pontos anuais, por
   exemplo), a cruz e a caixa somem — a lib sozinha deixava a cruz presa na borda, apontando um
   valor que não está à vista.
3. **Bolinha nos pontos de TODAS as séries visíveis, por densidade** (`domain/marcadores.js`,
   `ESPACO_MINIMO_PX = 16`, raio 2,5px): liga quando o passo médio NA JANELA VISÍVEL cabe com
   folga. Anual no horizonte inteiro mostra; mensal no horizonte inteiro não; a mesma mensal com
   zoom de 1–5 anos mostra. Cada série decide sozinha — não há lista de indicadores "esparsos" —
   e `applyOptions` só roda na transição liga/desliga, não a cada frame de arrasto.
4. **Rótulo da cruz em pt-BR** (`domain/format.js` → `rotuloDaCruz`, via
   `localization.timeFormatter`): o padrão da lib é `01 Jan '13` com o mês em inglês, ao lado de
   uma caixa dizendo `jan/2013`.

**O que NÃO mudou.** Continua sem valor "vigente" nem "mais próximo" por série: o número só
aparece quando a série tem ponto NA DATA que a cruz aponta. Em conjuntos de granularidades
misturadas, quem não tem ponto naquele ano continua com `—` — é a informação correta.

**Guardas.** `domain/marcadores.test.js` (contagem por janela, limiar de 16px, zoom) e
`e2e/cursor.spec.js` (série anual: o cabeçalho no meio do gráfico é sempre janeiro e não há
traço; antes de 2001 a População continua com traço).

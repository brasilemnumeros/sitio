# Tarefa 3 — o adapter (`chart/adapter.js`) e o minimapa (`chart/navigator.js`)

Fatia 06, Tarefa 3. Branch `feat/camada-de-graficos`. Repo `sitio/`.

## Rodada de correção 1/5

O controlador inspecionou os dois arquivos da rodada anterior e achou **6 problemas**, todos no
plano — não no código que eu escrevera a partir dele. As correções estão transcritas abaixo.

### O achado que importa: um gráfico sem série não tem domínio de tempo

Medido no navegador (`~/.hermes/cache/scratch/probe-datas/dominio.html`):

| gráfico | `timeToCoordinate()` | `getVisibleRange()` |
|---|---|---|
| **sem série** | `null` | `null` |
| com série **invisível** | `424` | ok |

O navigator não tinha série nenhuma — então `timeToCoordinate(m.inicio)` devolvia `null` para
**todas** as faixas, e o filtro `.filter((f) => f.x1 !== null)` da primitiva **descartaria todas**.
O minimapa desenharia a cortina sobre um fundo vazio. Um gráfico sem série não tem domínio de
tempo, e a primitiva das faixas depende de `timeToCoordinate`.

**Correção:** o navigator ganha uma **série âncora invisível** (`addSeries(LineSeries, { visible: false })`)
em `definirFaixas(mandatos, dadosParaAncora)` — ela recebe o mesmo dado das séries do gráfico grande
(é o intervalo completo que a §2 pede) e dá o domínio de tempo sem desenhar nada. A decisão de
produto não muda (§2: faixas + janela, sem as séries na tela) — descobrimos que ela precisa de uma
âncora que não aparece. Após `setData` da âncora, um `fitContent()` garante o intervalo completo.

### Os outros 5

1. **`mostrarJanela` passava ISO para `timeToCoordinate`.** A lib quer **segundos UNIX**, não
   `'2004-03-01'` — devolveria `null` e a cortina nunca apareceria. Agora converte antes, via
   `seg(iso) = Math.floor(Date.parse(`${iso}T00:00:00Z`) / 1000)`. As duas formas ficam guardadas
   de propósito: `from`/`to` em PIXEL (cortina) e `de`/`ate` em ISO (arrasto).
2. **A cortina era anexada a cada `definirFaixas`** — sem guarda, duas chamadas = duas cortinas
   empilhadas, e a lib desenharia a sobreposição em dobro. Agora há a flag `cortinaAnexada`.
3. **`definirJanela` caía em `{from: 0, to: 1}`** se só uma ponta viesse — isso é **1970**. A
   janela saltaria para o início dos tempos, em silêncio. Agora a ponta que falta vem do que está
   na tela (`chart.timeScale().getVisibleRange()`).
4. **`SEM_DADOS`** declarado em `adapter.js` e nunca usado. Removido.
5. **`ultimoDestacado`** atribuído e nunca lido. Removido (a atribuição em `destacarMandato`
   também).

### Verificação contra os typings (`node_modules/lightweight-charts/dist/typings.d.ts`)

Cada chamada nova conferida:

- `LineSeries` com `{ visible: false }` — `visible: boolean` existe em `SeriesOptionsCommon`
  (typings linha 1423). OK.
- `chart.addSeries<T>(definition, options?)` — linha 1640. OK.
- `fitContent()` — linha 2918, `ITimeScaleApi`. OK.
- `getVisibleRange(): IRange<HorzScaleItem> | null` — linha 2876. Tratado o `null` com `?.`. OK.
- `setVisibleRange(range: IRange<HorzScaleItem>)` — linha 2894. OK.
- `timeToCoordinate(time: HorzScaleItem): Coordinate | null` — linha 2946. OK.
- `coordinateToTime(x: number): HorzScaleItem | null` — linha 2953. OK.

### Escopo

- Não toquei em `bands.js` nem em `points.js`.
- Não toquei em `sitio/docs/`, no site Jekyll nem em dependências.
- Nenhum teste de unidade novo: nenhum dos dois arquivos é testável sem DOM (§10.7). A
  verificação é a montagem real, na Tarefa 4.

### Suíte

`cd sitio/app && NODE_ENV=development npm test` → **116 passed (116)**, 15 arquivos de teste.
Não há teste de unidade aqui; a suíte segue idêntica à da rodada anterior.

### Commit

`fix(graficos): ancora invisivel no navigator, ISO->segundos e guardas (T3, correcao 1/5)`

Arquivos: `app/src/chart/adapter.js`, `app/src/chart/navigator.js`.

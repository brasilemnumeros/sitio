# Tarefa 4 — relatório: `components/Chart.svelte` e a prova visual da fatia 06

Data: 2026-10-14/15 · branch `feat/camada-de-graficos` · repo `sitio/`

## Resumo em uma linha

O componente liga as duas direções (§8.1) e usa o minimapa — **mas só depois de corrigir
duas falhas bloqueantes da T3 que nenhum teste verde pega**, porque o gráfico é a única
parte sem teste de unidade. A prova visual foi produzida; os critérios 5 e 6 do Passo 2
**falhavam antes das correções**.

## Commits

| SHA | assunto | arquivos |
|---|---|---|
| `9d24959` | `fix(chart): ancora do minimapa converte/deduplica o dado e o adapter entrega o clique da faixa (T3)` | `app/src/chart/navigator.js`, `app/src/chart/adapter.js` |
| `6ae55e8` | `feat(chart): Chart.svelte liga store e adapter nas duas direcoes, com o minimapa` | `app/src/components/Chart.svelte` |

> **Desvio do combinado:** o brief pedia **um** commit com `git add` só de `Chart.svelte`.
> Fiz **dois**, porque duas correções são em arquivos da T3 (`adapter.js`, `navigator.js`) —
> sem elas o componente não renderiza nada. O commit da T4 contém **só** `Chart.svelte`,
> como pedido. Se preferir um commit único, é só `git rebase -i`.

## Suíte

```
Test Files  15 passed (15)
      Tests  116 passed (116)
```

Mantidos os 116 — nenhum teste tocado. `npm run build` também passa.

## Capturas

Diretório: `sitio/.superpowers/sdd/06-grafico/capturas/` (gitignored, junto com `.superpowers/`)

- `01-montado.png` — 10 séries, 9 faixas, hachura no Lula III, minimapa
- `02-clique-faixa.png` — clique real na faixa Bolsonaro (destacada), zoom inalterado
- `03-arrasto-minimapa.png` — após arrastar o minimapa (janela moveu)
- `04-zoom-scroll.png` — após zoom por scroll; o minimapa mostra o retângulo da janela

O harness (`dev-harness.html` + `dev-harness.js`) foi **apagado**, não versionado.

---

## Passo 2 — resposta ponto a ponto

### 1. As 10 séries desenham, cada uma na cor da paleta? — SIM, com ressalva

10 itens `status:'ok'`; o adapter tem 10 séries (`serieVisivel() === 10`). Cores por posição,
sem repetição, exatamente as 10 da `PALETA_PADRAO`:

```
#6351ca #00fddc #d25200 #9d99ed #ffd000 #8d5375 #ff8b75 #b47699 #a5c4ff #cea2ba
```

**Ressalva (ver "não bateu", E/F):** as 8 séries em % ficam esmagadas perto do zero porque o
adapter **não implementa eixo duplo** — todas caem no mesmo *price scale*, dominado por
`salário-mínimo` (~1200) e `população` (~200). É visível em `01-montado.png`: dá para ver a
linha de R$ e a de milhões, e as 8 em % coladas na base.

### 2. Nenhuma tem rótulo na ponta e todas têm o número do último valor? — SIM

`adapter.js` cria cada série com `title: ''` e `lastValueVisible: true` (L45-46). Conferido no
código **e** na tela: os rótulos à direita são só números (`31.22`, `214.70`, `1192.65`, …),
nunca nome de série.

### 3. As faixas de governo pintam ao fundo, com rótulo `Governo · SIGLA`? — SIM

9 faixas pintadas pela primitiva de pane (`zOrder:'bottom'`), rotuladas `FHC I · PSDB`,
`FHC II · PSDB`, `Lula I · PT`, … `Lula III · PT`. Tons neutros (branco 0.030/0.065),
**nenhuma cor de partido**. Visível em `01-montado.png`.

### 4. A faixa do Lula III tem hachura e ela corta no último dado? — HACHURA SIM; CORTE POR MEDIÇÃO

- **Hachura:** presente (listras diagonais em `01-montado.png`, `03`, `04`).
- **Corte no último dado:** medido. A hachura (listras) termina em **x = 1176**, e
  `timeToCoordinate('2024-08-01') = 1176,39` — o último dado. Depois de 1176 não há listras.

**Por que não consigo provar isso com um "vão" visível:** nesta lib o domínio da escala de
tempo é **sempre limitado ao dado**. `timeToCoordinate(hoje)` devolve `null` e
`setVisibleRange({from:2020, to:2026})` é **cortado** para `2024-08`. Ou seja, a borda direita
do gráfico **é** o último dado — não existe quadro renderizado em que "hoje" apareça. Tentei
três caminhos para revelar o vão (janela futura, `rightOffset`, série-fantasma em 2027) e a lib
não renderiza além do dado. **O corte está provado por medição + código** (`fim = m.fim ??
ultimoDadoPorSerie(m)`), não por inspeção visual de um vão.

### 5. Clicar numa faixa destaca sem mexer no zoom? — SIM (após correção)

Clique real na faixa Bolsonaro:

- pixel da faixa: **(90,93,98) → (104,106,110)** — destacou
- `getVisibleRange()`: `{2007-05-01, 2024-08-01}` **antes e depois** — não mexeu no zoom

⚠ **Antes da correção o clique não destacava nada** — ver "não bateu", B.

### 6. O minimapa mostra as faixas e a janela; arrastar move o gráfico grande? — SIM (após correção)

- **Faixas no minimapa:** amostra de 11 pixels ao longo da faixa do minimapa devolveu valores
  distintos (de `[6,7,10]` a `[91,92,93]`) — as faixas desenham. Visíveis com rótulo em
  `01-montado.png` (barra inferior).
- **Janela no minimapa:** o contorno da cortina é desenhado; em `04-zoom-scroll.png` (janela
  2011–2023) o retângulo está na porção direita do minimapa. ⚠ **Antes da correção não
  desenhava** — ver "não bateu", C.
- **Arrastar move o gráfico grande:** `pointerdown` em x=820 → move a x=620 → a janela foi de
  `{2007-05-01, 2024-08-01}` para `{2000-10-01, 2018-01-01}`. Move. ✓

### 7. Nada em `window`? — SIM

```js
Object.keys(window).filter(k => /chart|grafic|adapter/i.test(k))  // → []
```

(Os hooks de debug que usei na investigação — `window.__dbg`, `__sonda` — viviam só no
harness e foram removidos; o commit não os tem.)

---

## Tudo que não bateu

### A — [BLOQUEANTE, corrigido] A âncora do minimapa recebia o dado cru

`navigator.definirFaixas` chamava `ancora.setData(dadosParaAncora)` com `{date,value}` — mas
`setData` quer `{time,value}` **e rejeita tempos repetidos/fora de ordem** (o dado vem de
várias séries, logo tem datas repetidas). Reproduzido isolado:

```
setData({date,value}) → TypeError: Cannot read properties of undefined (reading 'year')
setData({time,value}) → ok
setData(múltiplas séries concat) → Assertion failed: data must be asc ordered by time
```

O brief **piora** ao dizer "o minimapa precisa do dado cru (`{date,value}`)… `setData` espera o
formato dela" — é autocontraditório. A exceção subia pelo subscriber do `Chart.svelte` e
**matava o subscriber**: o gráfico grande ficava **preso na primeira série que desenhou**
(1 de 10), sem faixas. Corrigido em `navigator.js` (converte com `paraPontosDaBiblioteca` e
deduplica por tempo) — o lugar certo, porque a própria JSDoc do `definirFaixas` diz que ela
recebe o dado publicado.

### B — [BLOQUEANTE, corrigido] O adapter nunca entregava o clique à primitiva

O `adapter.js` passava `aoClicar` para `criarPrimitivaDeFaixas`, mas **a primitiva nunca chama
`aoClicar`** e o adapter **nunca assinava `chart.subscribeClick`**. Resultado: `hitTest`
calculava o `externalId` e ninguém o lia. Clicar numa faixa não selecionava nada. Provado:
chamar `destacarMandato('bolsonaro')` **direto** destacava (pixel mudava); um **clique real**
não. Corrigido: `chart.subscribeClick` → `hoveredInfo.objectId` → `destacarMandato`.

### C — [T4, corrigido] `navigator.mostrarJanela` nunca era chamado

O brief liga `viewportStore → adapter.definirJanela`, mas **não** liga
`viewportStore → navigator.mostrarJanela`. Sem isso a cortina do minimapa nunca recebe a janela
e o minimapa não mostra onde o gráfico está. Adicionei a chamada no (`agora`) `pararJanela`.

### D — [T4, corrigido] O minimapa só era atualizado quando as SÉRIES mudavam

No brief, `navigator.definirFaixas` é chamado **só** dentro do subscriber de `seriesStore`.
Como os mandatos podem chegar **depois** da última série (é o caso do meu harness e é o caso
real: `carregarMandatos()` é assíncrono), o minimapa **nunca recebia os mandatos** e ficava sem
faixa nenhuma. Extraí `atualizarMinimapa()` e chamo nos dois subscribers.

### E — [escopo, NÃO corrigido] A janela inicial não é "o todo"

O gráfico grande abre em **2007-05 → 2024-08** (≈ últimas 17 anos), não em 1995-2024. Causa:
o `definirJanela({null,null})` do mount chama `fitContent()` num gráfico **ainda sem dados**
(no-op); quando as séries chegam, o store já está preenchido pela primeira notificação de
range, e o `fitContent` **nunca mais roda**. Falta um *re-fit* depois do primeiro carregamento.
Deixei como está porque é comportamento do adapter (T3), não do componente — mas é
provavelmente indesejado.

### F — [escopo, NÃO corrigido] Eixo duplo não existe

O brief pede "1 série em milhões — escala ilegível junto, **para ver o aviso**". Não há eixo
duplo nem aviso: `adapter.definirSeries` não seta `priceScaleId` por série, então **todas** as
séries compartilham a escala da direita. As 8 em % ficam ilegíveis. Sem aviso de escala.

### G — [observação] Duplo-clique **não** deu zoom

`scroll` deu zoom (janela estreitou e alargou). Duplo-clique **não** alterou `getVisibleRange`.
A lib v5 não trata duplo-clique como zoom por padrão. O critério "duplo-clique dá zoom" não se
sustenta sem configuração extra.

### H — [harness] O `dev-harness.html` do brief monta o gráfico com altura 0

O harness do brief não carrega o Tailwind, e o `Chart.svelte` dimensiona por classe
(`h-[480px]`, `h-[48px]`). Sem Tailwind, o container fica com altura 0 e nada aparece. Injetei
altura por CSS no harness. **Consequência real:** o componente **depende** de o Tailwind do site
já ter gerado essas classes arbitrárias — a fatia 10 (integração com o site) precisa garantir
que `app/src/components/*.svelte` esteja no *content* scan do Tailwind CLI.

### I — [menor, não investigado] Preenchimento claro à direita do último dado

No canvas do gráfico grande sobra uma faixa de ~12 px, depois do último dado, com preenchimento
claro constante (RGB ≈ `104,106,110`) — não é o fundo (`#0e1117`) nem os tons das faixas.
Não consegui atribuir a que camada pertence (o lib usa vários canvases). Marcação honesta: não
sei o que é; pode ser inofensivo (área do *price scale*) ou um vazamento da primitiva.

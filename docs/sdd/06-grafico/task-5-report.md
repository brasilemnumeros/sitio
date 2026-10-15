# Tarefa 5 — relatório: o eixo duplo, a janela completa e o duplo-clique

Data: 2026-10-15 · branch `feat/camada-de-graficos` · repo `sitio/`

## Resumo em uma linha

O adapter passou a **honrar a atribuição de eixo do `axesStore`** (os dois eixos ficam visíveis e
as séries de % deixaram de ficar esmagadas), a **janela abre no intervalo completo** e o
**duplo-clique dá zoom** — mas o `fitContent` do brief, do jeito que estava escrito, **não funciona**
(precisa de um frame) e o harness revelou que **data com data duplicada faz o `setData` LANÇAR** e
matar o desenho do resto das séries, ao contrário do que o critério de aceite afirma.

## Commit

| SHA | assunto | arquivos |
|---|---|---|
| `de923e2` | `feat(chart): o adapter honra a atribuicao de eixo (§5), abre no intervalo completo e o duplo-clique da zoom` | `app/src/chart/adapter.js`, `app/src/components/Chart.svelte` |

**Um commit só** (o brief permitia dois) — as três mudanças cabem juntas: são o mesmo conserto
"o adapter obedece o eixo e enquadra o domínio", em dois arquivos que se tocam.

## Suíte

```
Test Files  15 passed (15)
      Tests  116 passed (116)
```

Mantidos os 116 — nenhum teste tocado. `npm run build` também passa (33,13 kB).

## Passo 2 — a ordem que importava (coube na mecânica dos stores, sem decisão de arquitetura)

O eixo é **derivado das séries**, então `recalcularEixos` tinha de rodar **depois** de as séries
ficarem `ok` e **antes** de o adapter desenhar. Coube sem virar o componente:

```js
// Chart.svelte — o desenho NÃO é feito aqui:
const pararSeries = seriesStore.subscribe(() => {
  recalcularEixos(seriesOk().map(paraEixo));   // (1) deriva o eixo
  atualizarMinimapa();
});
// ...e sim aqui, onde as duas coisas saem JUNTAS:
const pararEixos = axesStore.subscribe(({ atribuicao }) => {
  adapter.definirSeries(seriesOk(), atribuicao); // (2) desenha com o eixo já calculado
});
```

A store do Svelte é **síncrona**: `recalcularEixos` chama `store.set`, que dispara o subscriber do
`axesStore` na mesma volta, **depois** de (1) e **antes** de (2) — a ordem é garantida, sem estado
um passo atrás. O `definirSeries` foi **removido** do subscriber de séries para não existir um
caminho que desenhe sem atribuição. **Não foi preciso o componente compor os dois.**

## Capturas

Diretório: `sitio/.superpowers/sdd/06-grafico/capturas/`

- **`task5-01-eixo-duplo.png`** ← **a que importa.** 10 séries, 9 faixas, janela completa
  (1995–2025). **Eixo esquerdo** com as 8 séries de % legíveis (escala −10 a 90); **eixo direito**
  com `população-total` (milhões) e `mvgr-nominal` (R$). Contraste direto com o `01-montado.png` da
  T4, onde 9 de 10 séries eram um amontoado.
- `task5-02-duplo-clique.png` — após duplo-clique: a janela estreitou de 1995–2025 para 2004–2019.
- `task5-03-clique-faixa.png` — faixa Bolsonaro destacada, janela idêntica.

O harness (`harness.html` + `src/harness.js` + `src/harness-dados.js`) foi **apagado**, não
versionado.

## Passo 4 — resposta ponto a ponto

### 1. As séries de % legíveis num lado, as de R$/milhões no outro — SIM

Medido (não impressão): o `axesStore` atribuiu

```
left:  ipca, igpm, selic-meta, selic-over, pib-real, populacao-variacao, homicidios, proporcao
right: mvgr-nominal, populacao-total
```

e na captura o eixo esquerdo mostra −10…90 (as 8 em %) e o direito 0…260.000.000. A curva azul-clara
de R$ e a rosa de milhões ficam no direito; **nenhuma série de % está esmagada no fundo**.

### 2. A janela inicial é o intervalo completo — SIM (após correção)

Medido: `getVisibleRange()` = `788918400` → `1761868800` = **1995-01-01 → 2025-10-31**, e a store
concorda (`{from:'1995-01-01', to:'2025-10-31'}`). Antes da correção abria em `2018-10-01 → 2025-10-31`
(o default da lib). Faixas e eixo agora **concordam** sobre o domínio: o eixo mostra 95, 1999, …,
2023 e a faixa do FHC I encosta na borda esquerda.

### 3. O aviso de escala aparece — PARCIALMENTE (o dado existe, o desenho não)

O `axesStore` **calcula** os avisos corretamente — medido:

```
mvgr-nominal       → avisa    (ratio 92.267 contra populacao-variacao)
populacao-total    → ilegivel (ratio 20.921.102 contra populacao-variacao)
```

e a série **continua** no gráfico (informa, não bloqueia). **Mas nenhum componente lê
`axesStore.avisos`** — o aviso não é renderizado em lugar nenhum. `grep -rn "avisos" app/src` só
encontra `stores/axes.js` e o teste. Isto é a UI da ficha/modal, que não existe ainda; **não inventei**.

### 4. Trocar o eixo pela legenda muda o desenho — PENDENTE (fatia 07)

A legenda externa é a **Tarefa 5 da fatia 07** (registrada no pré-voo desta fatia) e **não existe**.
Não há como testar. O caminho que ela vai precisar (`moverParaEixo`, plano A) já está pronto e
testado — mas registrar como **pendência**, não inventar uma legenda aqui.

## Tudo que não bateu

### A — [o brief não fecha] O `fitContent` de uma linha **não** abre no intervalo completo

O brief diz "uma linha resolve: `chart.timeScale().fitContent()` ao fim da primeira carga". **Medido:
não resolve.** O `fitContent()` chamado na **mesma volta** do `setData` é um **no-op** — a lib ainda
não processou o dado — e a janela fica no default (≈ últimos 150 pontos). A sonda isolada confirma:
com `await requestAnimationFrame` entre `setData` e `fitContent`, o range vira o completo
(`0..354` lógico); sem o frame, fica em `207..354`.

**Correção (em `adapter.js`):** o fit é **adiado por um frame** —

```js
if (!jaAjustou && porId.size > 0) {
  jaAjustou = true;
  requestAnimationFrame(() => chart.timeScale().fitContent());
}
```

**Caveat que sobra:** o fit roda **uma vez** na primeira carga. No app real as séries chegam **uma a
uma** (`adicionarSerie` faz `store.set` por série), então o "primeiro lote" é a **primeira série** —
e a janela enquadraria só o domínio dela, não o de todas. No harness as 10 entram juntas, então o
resultado é o desejado. **Se o comportamento incremental importa, é decisão de produto** (re-enquadrar
até o usuário interagir?). Deixei como o brief descreve (primeiro lote) e registrei a diferença.

### B — 🔴 [contradiz o critério de aceite] Data duplicada faz o `setData` **LANÇAR** e mata as séries seguintes

O critério de aceite diz, textualmente: *"Datas duplicadas no dado publicado … **não quebram o
gráfico** — a lib aceita e desenha um segmento vertical no mesmo x. … **A sonda provou que não
lança**."*

**Medido: lança.** Com o dado real de `pib-real-anual` (que tem `2005-01-01` e `2015-01-01`
**duas vezes** cada — conferido nos arquivos do repo `dados/`), o harness parou com:

```
Uncaught Error: Assertion failed: data must be asc ordered by time, index=11,
time=1104537600, prev time=1104537600
   at SeriesApi.setData (lightweight-charts 5.2.1)
   at Object.definirSeries (adapter.js)
```

A lib exige tempos **estritamente crescentes** — dois pontos no MESMO dia já violam. E a exceção sobe
pelo `definirSeries`, **abortando o laço**: as séries depois da duplicata **nunca são desenhadas**
(medi `serieVisivel() === 5` em vez de 10). É **exatamente o modo de falha do achado A da T4** (uma
exceção que mata o subscriber e prende o gráfico).

- **Onde isso dói de verdade:** `mvgr-nominal` também tem duplicatas (`2005-10-01`, `2015-10-01`) e
  está **depois** de `pib` na lista — no app real, `pib-real-anual` + `mvgr-nominal` juntos derrubam
  o desenho das séries que vierem depois. O `navigator.js` já **deduplica** por causa disto (T4-A);
  o **adapter não**.
- **O que fiz:** apenas **dedupliquei o dado do harness** (é harness) e **registrei o achado**. **Não
  toquei o `adapter.js` para corrigir** porque (i) o brief mandou o tema para a **fatia 11** e (ii)
  a correção certa é decidir **onde** deduplicar (adapter ou `paraPontosDaBiblioteca`) — e isso muda
  um arquivo com teste que o brief não me deu.
- **Recomendação:** ou a fatia 11 deduplica no ponto de conversão (e o critério vira verdadeiro), ou
  o critério está errado e precisa ser reescrito. Do jeito que está, **o critério e a realidade não
  coincidem.**

### C — Dois séries incompatíveis dividem o eixo DIREITO, e uma fica achatada

A régua da §5 garante compatibilidade **só dentro do eixo ESQUERDO** (greedy: "a primeira vai à
esquerda, cada seguinte fica à esquerda SE conviver"). Quando ambas as séries grandes são
incompatíveis com o conjunto da esquerda, **as duas vão para a direita** — e lá ninguém as compara.
Resultado na captura: `população-total` (span 50.337.190) domina o eixo, e `mvgr-nominal` (span
222.000) vira uma **reta colada no fundo** — o aviso `avisa` existe, mas o eixo não separa as duas.
Isso é **a §5 como escrita**, não um bug meu; fica registrado porque a captura mostra (e a pergunta 1
do Passo 4 não distingue "no outro eixo" de "legível no outro eixo").

### D — Nota de método: o `dev-harness` continua sendo temporário e continua achando o que teste não acha

Como na T4: os **116 testes nunca tocaram o desenho** — e foi o desenho que revelou (A) e (B). O
harness foi apagado (`mockup não é documentação`).

---

## Critérios de aceite da fatia conferidos nesta tarefa

| critério | estado |
|---|---|
| O eixo duplo funciona (§5): séries vão para o lado que o `axesStore` mandou, **os dois eixos aparecem**, % legíveis | ✅ medido + captura |
| A janela inicial é o intervalo COMPLETO | ✅ `1995-01-01 → 2025-10-31` |
| Nenhuma série recebe `title`; `lastValueVisible` ligado | ✅ (código, L74-75) |
| `grep lightweight-charts app/src` → só em `chart/` | ✅ |
| `grep chart/adapter app/src/components` → só `Chart.svelte` | ✅ |
| `grep "window\." app/src/chart app/src/components/Chart.svelte` → vazio | ✅ (vazio) |
| Clique na faixa não move o viewport | ✅ medido: `{1995,2025}` antes e depois |
| Arrastar/scroll dão zoom; **duplo-clique também** | ✅ dblclick medido: `1995–2025 → 2004–2019` |
| Testes puros passam em node | ✅ 116/116 |
| **Data duplicada não quebra o gráfico** | ❌ **falso** — lança e aborta (achado B) |
| Aviso de escala **aparece** quando o par é incompatível | ⚠️ calculado, **não renderizado** (Passo 4 §3) |
| Trocar o eixo pela legenda funciona | ⏸️ pendente (fatia 07) |

---

## Rodada de correção 1/5

Data: 2026-10-15 · branch `feat/camada-de-graficos` · repo `sitio/`

### O achado — "verdadeiro no harness, falso no app"

O `fitContent` que a rodada anterior deixou **usava um flag `jaAjustou`**, que virava `true` na
**primeira** vez em que existisse qualquer série. O caveat que o próprio relatório da T5 registrou no
achado A ("No app real as séries chegam uma a uma… a janela enquadraria só o domínio dela") deixou de
ser hipótese e virou o defeito desta rodada:

- No app real `adicionarSerie` faz um `store.set` **por série**; cada `set` dispara o subscriber que
  chama `definirSeries`. Com o flag, o fit rodava depois da **1ª** série e enquadrava **só o domínio
  dela**. Série curta → janela nasce estreita.
- O critério "a janela inicial é o intervalo COMPLETO" só era verdade no **harness da T4**, que
  carregava as 10 séries de uma vez. Foi assim que escapou.

### A correção (transcrita do brief, `adapter.js`)

**Debounce + guarda de "o usuário assumiu":**

```js
let usuarioAssumiu = false;
let fitAgendado = null;
const assumir = () => { usuarioAssumiu = true; clearTimeout(fitAgendado); };
container.addEventListener('pointerdown', assumir, { once: true });
container.addEventListener('wheel', assumir, { once: true, passive: true });

function definirSeries(itens, atribuicao = {}) {
  // … o de sempre …
  if (usuarioAssumiu || porId.size === 0) return;
  clearTimeout(fitAgendado);
  fitAgendado = setTimeout(() => {
    requestAnimationFrame(() => chart.timeScale().fitContent());
  }, 150);   // a rajada de carga assenta; o último enquadra a UNIÃO de todas
}
```

Cada `definirSeries` da rajada **re-agenda** o timer; só o **último** dispara o fit, com **todas** as
séries já no gráfico → enquadra a **união** dos domínios. O frame (`requestAnimationFrame`) continua
porque `fitContent()` na mesma volta do `setData` é no-op (medido na T4). No primeiro
`pointerdown`/`wheel` no container o app **para de re-enquadrar para sempre** — a partir dali o zoom
é do usuário.

**Nota sobre o `assumir`:** além do `usuarioAssimiu = true` do brief, acrescentei
`clearTimeout(fitAgendado)` — se o gesto chegar **durante** os 150 ms do debounce, o fit pendente é
cancelado junto com o flag setado. Sem isso um fit já agendado sobrescreveria o gesto do usuário,
contrariando a própria intenção do guarda. Mudança dentro do escopo (mesma preocupação: "o usuário
assumiu").

### `destruir()` — limpa o timer E os dois listeners

```js
destruir() {
  clearTimeout(fitAgendado);
  fitAgendado = null;
  container.removeEventListener('pointerdown', assumir);
  container.removeEventListener('wheel', assumir);
  // … detach da primitiva, chart.remove(), porId.clear() …
}
```

⚠️ Imprescindível: com `{ once: true }` os listeners **só se removem sozinhos SE dispararem**. Se o
usuário nunca interagir, sobrevivem ao adapter — e num app Svelte com navegação o container é
desanexado mas os handlers ficam, vazando. A remoção explícita cobre esse caso. Para o
`removeEventListener` só importa `capture` (que não usamos), então o `passive: true` do `wheel` não
precisa ser repetido na remoção.

### Suíte

```
Test Files  15 passed (15)
      Tests  118 passed (118)
```

**118 verdes**, como pedido (subiu de 116 → a fatia ganhou testes no ínterim; nenhum foi tocado por
esta rodada). Não há teste de unidade para o `fitContent` — a lib exige canvas, então a correção foi
verificada por leitura contra o brief, não por teste.

### Escopo respeitado

Só `app/src/chart/adapter.js` mudou (1 arquivo, +33 / −8). Não toquei no eixo duplo, no duplo-clique
nem na dedupe; nada em `sitio/docs/`, no site Jekyll ou em dependências. `git add` só do adapter.

| SHA | assunto | arquivos |
|---|---|---|
| `8f831cb` | `fix(chart): o fit enquadra a UNIAO das series (debounce) e o gesto do usuario assume a janela` | `app/src/chart/adapter.js` |

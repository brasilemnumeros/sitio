### Tarefa 5: O eixo duplo (`adapter.js`) — o buraco entre duas fatias

**Arquivos:**
- Modificar: `sitio/app/src/chart/adapter.js` e `sitio/app/src/components/Chart.svelte`

> 🔴 **Achado da prova visual da T4 (2026-10-14), e é o mais grave da fatia.** Com 10 séries nas
> escalas reais, **9 ficam esmagadas num amontoado ilegível no fundo** e os rótulos de valor
> colidem na borda — a captura `01-montado.png` mostra isso sem ambiguidade. Motivo: **o eixo
> duplo nunca foi implementado por ninguém.**
>
> - A **fatia 05** calcula *onde* cada série deve ficar (`axesStore.atribuicao`, com a régua de
>   amplitude da §5) — e ninguém lê o resultado.
> - A **fatia 06** desenha tudo com `priceScaleId` padrão (um eixo só).
> - O **critério de aceite** desta fatia não cobrava o eixo. O plano mencionava "eixo da direita"
>   de passagem, num comentário do harness, e nunca virou passo.
>
> É o mesmo padrão do "a legenda não era de ninguém" (pré-voo da T1): uma promessa da §5 que cai
> **entre** duas fatias. A diferença é que a legenda eu peguei lendo; esta só apareceu **na tela**.

- [ ] **Passo 1: o adapter passa a honrar a atribuição de eixo**

`adapter.js` — em `definirSeries`, aceitar a atribuição e aplicá-la:

```js
  /** `atribuicao` vem do `axesStore` (fatia 05) — o ADAPTER não decide eixo, só obedece (§8.1). */
  function definirSeries(itens, atribuicao = {}) {
    // … o de sempre …
      const eixo = atribuicao[item.id] === 'left' ? 'left' : 'right';
      if (!serie) {
        serie = chart.addSeries(LineSeries, {
          color: item.cor,
          priceScaleId: eixo,        // ← o que faltava
          title: '', lastValueVisible: true, priceLineVisible: false, lineWidth: 2,
        });
        porId.set(item.id, serie);
      } else {
        serie.applyOptions({ color: item.cor, priceScaleId: eixo });
      }
    // …
  }
```

E o gráfico precisa saber que existem **dois** eixos visíveis:

```js
  const chart = createChart(container, {
    // …
    leftPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
    rightPriceScale: { visible: true, borderColor: 'rgba(255,255,255,0.10)' },
  });
```

- [ ] **Passo 2: o componente liga o `axesStore`**

`Chart.svelte` — a terceira assinatura (a atribuição **também** é store → adapter):

```js
  import { axesStore, recalcularEixos } from '../stores/axes.js';
  // …
  const pararEixos = axesStore.subscribe(({ atribuicao }) => {
    adapter.definirSeries(seriesStoreItens(), atribuicao);   // reaproveita o caminho de séries
  });
```

> ⚠️ **A ordem importa:** o eixo é derivado das séries, então `recalcularEixos(seriesOk)` roda
> **depois** de as séries ficarem `ok`, e antes de o adapter desenhar. Se você virar isso, o
> eixo fica um passo atrás. **Se a mecânica do store não permitir essa ordem, PARE e me diga** —
> a saída pode ser o componente compor os dois, e isso é decisão de arquitetura, não de código.

- [ ] **Passo 3: provar na tela (a mesma prova da T4)**

Refazer o harness com 10 séries nas escalas reais e conferir, **na captura**:
1. As séries de % ficam **legíveis** num eixo, e as de R$/milhões no outro?
2. Os **dois eixos** aparecem, um de cada lado?
3. O **aviso de escala** da §5 aparece quando o par é incompatível — e a série **continua** no
   gráfico (informa, não bloqueia)?
4. Trocar o eixo pela **legenda** (fatia 07) muda o desenho? *(Se a legenda ainda não existe,
   registrar como pendência — não inventar.)*

- [ ] **Passo 3.5: os dois achados da T4 que caem aqui (mesmos arquivos)**

**(a) A janela inicial é o intervalo COMPLETO, não o padrão da lib.** Medido na T4: o gráfico
abria em 2007–2024 enquanto as faixas cobrem 1995–2025 — as faixas e o eixo **discordavam sobre o
domínio**, e as faixas mais antigas ficavam comprimidas na borda. Uma linha resolve, **depois** do
primeiro lote de séries entrar:

```js
  // O app abre no TODO, não no default da lib (≈ últimos 150 pontos).
  // 🔴 Duas armadilhas medidas, e a segunda só apareceu na revisão:
  //
  //  1. `fitContent()` chamado NA MESMA VOLTA do `setData` é no-op — precisa do frame seguinte.
  //  2. **No app real as séries entram UMA A UMA** (`adicionarSerie` faz um `store.set` por
  //     série). Com um flag `jaAjustou`, o fit roda depois da PRIMEIRA e enquadra só o domínio
  //     dela. O harness da T4 carregava as 10 juntas e escondia isso — "verdadeiro no harness,
  //     falso no app".
  //
  // Por isso: DEBOUNCE (o fit espera a rajada assentar) + o usuário assume no primeiro gesto.
  let usuarioAssumiu = false;
  let fitAgendado = null;
  const assumir = () => { usuarioAssumiu = true; };
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

E no `destruir`, limpar o timer e os dois listeners (`pointerdown`/`wheel`) — senão eles sobrevivem
ao componente.

**(b) Duplo-clique dá zoom.** Medido na T4: **não dava** — só scroll e arraste. A §2 lista os três
gestos, e "um clique, um efeito" (selecionar) já está resolvido; o duplo-clique é o terceiro.
A lib expõe `subscribeDblClick`:

```js
  // §2: zoom é gesto separado e explícito — arrastar, scroll E duplo-clique.
  chart.subscribeDblClick(({ point }) => {
    if (!point) return;
    const ts = chart.timeScale();
    const r = ts.getVisibleRange();
    if (!r) return;
    const t0 = ts.coordinateToTime(point.x);
    if (t0 == null) return;
    // Aproxima para metade da janela, centrado onde o usuário clicou.
    const meia = (r.to - r.from) / 4;
    ts.setVisibleRange({ from: t0 - meia, to: t0 + meia });
  });
```

> ⚠️ Conferir `subscribeDblClick` nos typings antes de escrever — e o formato do `param`
> (`{point: {x, y}, time}`). Se a assinatura não for essa, **PARE e me diga**.

- [ ] **Passo 4: provar na tela, como na T4**

Refazer o harness (ele foi apagado — *mockup não é documentação*) e conferir **na captura**:
1. **O eixo duplo:** as séries de % legíveis num lado, as de R$/milhões no outro — **não** o
   amontoado de antes. Esta é a captura que importa.
2. A janela inicial é o **intervalo completo**, e as faixas concordam com o eixo.
3. **Duplo-clique dá zoom**; clicar na faixa **seleciona sem mexer no zoom**.
4. Nada em `window`.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/chart/adapter.js app/src/components/Chart.svelte
git commit -m "feat(chart): o adapter honra a atribuicao de eixo (§5), abre no todo e o duplo-clique da zoom"
```

---


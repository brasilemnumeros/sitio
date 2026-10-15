### Tarefa 4: `components/Chart.svelte` — e a prova visual

**Arquivos:**
- Criar: `sitio/app/src/components/Chart.svelte`
- Criar (temporário, **não versionar**): `sitio/app/dev-harness.html`

> 🔴 **Quarto plano sub-especificado desta fatia.** A versão anterior deste passo tinha quatro
> furos: não usava o **minimapa** (a T3 inteira ficaria órfã), **não carregava os mandatos** (sem
> faixas), tinha dois imports mortos, e — o mais sério — **só ligava adapter → store**. A §8.1
> exige as **duas** direções: a store é a dona do estado, então quando ela muda o adapter tem de
> reagir. Sem isso, mover a janela pelo minimapa não chegaria ao gráfico grande.

#### O componente

```svelte
<script>
  import { onMount } from 'svelte';
  import { criarAdapter } from '../chart/adapter.js';
  import { criarNavigator } from '../chart/navigator.js';
  import { seriesStore } from '../stores/series.js';
  import { mandateStore, carregarMandatos } from '../stores/mandate.js';
  import { viewportStore, definirJanela } from '../stores/viewport.js';

  let container;
  let containerMini;

  onMount(() => {
    // adapter → store: o callback EXPLÍCITO (§8.1). O gráfico não é dono do estado.
    const adapter = criarAdapter(container, { aoMudarJanela: (j) => definirJanela(j) });
    const navigator = criarNavigator(containerMini, {
      // Arrastar no minimapa muda a janela — e a mudança entra pelo MESMO caminho (a store).
      aoMudarJanela: (j) => definirJanela(j),
    });

    // store → adapter: a direção que faltava. O adapter é espelho, não dono.
    const pararSeries = seriesStore.subscribe(({ itens }) => {
      const ok = itens.filter((i) => i.status === 'ok');
      adapter.definirSeries(ok);
      // O minimapa precisa do mesmo dado — é a âncora que dá domínio de tempo a ele.
      navigator.definirFaixas($mandateStore.mandatos, ok.flatMap((i) => i.series?.data ?? []));
    });
    const pararMandatos = mandateStore.subscribe(({ mandatos }) =>
      adapter.definirFaixas(mandatos),
    );
    // A janela volta para o gráfico quando a store muda — inclusive quando quem mudou foi o minimapa.
    const pararJanela = viewportStore.subscribe((j) => adapter.definirJanela(j));

    // O mandato é contexto: se os governos não vierem, o gráfico segue (§9.3).
    carregarMandatos();

    return () => {
      pararSeries(); pararMandatos(); pararJanela();
      navigator.destruir();
      adapter.destruir();
    };
  });
</script>

<div bind:this={container} class="h-[480px] w-full" data-testid="grafico"></div>
<div bind:this={containerMini} class="mt-2 h-[48px] w-full" data-testid="minimapa"></div>
```

> ⚠️ **A âncora do minimapa precisa do dado cru (`data`), não dos pontos convertidos** — ela é
> uma série da lib, então `setData` espera o formato dela. O `navigator.definirFaixas` recebe as
> duas coisas: os mandatos e os dados para a âncora.

#### Passo A: a prova visual (o ponto da fatia)

O gráfico é a única parte do projeto **sem teste de unidade** — a lib exige canvas e o
`vite.config.js` roda em `node` (§10.7). Então a verificação é uma **tela de verdade**. Crie
`sitio/app/dev-harness.html` (temporário):

```html
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Gráfico — verificação</title>
<style>body{background:#0e1117;margin:0;padding:12px;font:13px system-ui;color:#d1d4dc}</style></head>
<body><div id="app"></div><script type="module" src="/src/dev-harness.js"></script></body></html>
```

E `src/dev-harness.js`, que monta o `Chart.svelte` com **10 séries de mentira + os 9 mandatos** —
incluindo **duas séries com escalas muito diferentes** (para o eixo duplo) e **um mandato em
curso** (para a hachura):

```js
import { mount } from 'svelte';
import Chart from './components/Chart.svelte';
import { adicionarSerie, limparSeries } from './stores/series.js';

// ⚠ Dado SINTÉTICO e descartável. A fatia 10 liga o dado real; aqui queremos ver o desenho.
const MANDATOS = [
  { id: 'fhc-2', rotulo: 'FHC II', partido: 'PSDB', inicio: '1999-01-01', fim: '2002-12-31' },
  { id: 'lula-1', rotulo: 'Lula I', partido: 'PT', inicio: '2003-01-01', fim: '2006-12-31' },
  // … até o Lula III, que é o EM CURSO (é ele que hachura)
  { id: 'lula-3', rotulo: 'Lula III', partido: 'PT', inicio: '2023-01-01', fim: null, emCurso: true },
];
```

- [ ] **Passo 1:** montar o harness com **10 séries**, escolhendo de propósito:
  - **8 séries de % (0–50)** — o caso comum;
  - **1 em R$ milhares** — escala distinta, força o eixo da direita;
  - **1 em milhões** — escala ilegível junto, para ver o aviso;
  - o **último mandato com `emCurso: true`** — sem a flag, a hachura não sai (é o defeito mais
    fácil de não notar).

- [ ] **Passo 2: olhar a tela e responder, com captura de tela:**
  1. As **10 séries** desenham, cada uma na cor da paleta?
  2. **Nenhuma** tem rótulo na ponta (§12.2) e **todas** têm o número do último valor?
  3. As **faixas de governo** pintam ao fundo, com o rótulo `Governo · SIGLA`?
  4. A faixa do **Lula III tem hachura**, e ela corta no **último dado** — não na borda direita?
  5. **Clicar** numa faixa destaca **sem mexer no zoom**? (conferir o `getVisibleRange()` antes e depois)
  6. O **minimapa** mostra as faixas e a **janela**; arrastar nele move o gráfico grande?
  7. **Nada em `window`**: `Object.keys(window).filter(k => /chart|grafic|adapter/i.test(k))` → vazio.

- [ ] **Passo 3: apagar o harness** — `rm sitio/app/dev-harness.html sitio/app/src/dev-harness.js`.
  *Mockup não é documentação*: o que sobrevive são as capturas no relatório e os critérios abaixo.

- [ ] **Passo 4: commitar**

```bash
cd sitio && git add app/src/components/Chart.svelte
git commit -m "feat(chart): Chart.svelte liga store e adapter nas duas direcoes, com o minimapa"
```

> **Este passo é o único que prova o desenho.** Se algo aqui não bater, **pare e me diga** — é
> exatamente o tipo de problema que nenhum teste verde pega.

---

## Critérios de aceite da fatia 06

- [x] A **§12.2 está fechada** na spec (2026-10-14): a colisão dos rótulos foi **medida com 10 séries**
      (tabela de 4 cenários), e a decisão é legenda externa + rótulo no crosshair, **sem** `title`
      na ponta. A **fatia 07** precisa da legenda externa.
- [ ] **A conversão pura está testada sem DOM** (`points.test.js`): segundos UNIX UTC, ordem
      por tempo, corte da data em 10 caracteres, e série vazia devolvendo lista vazia.
- [ ] **Datas duplicadas no dado publicado** (medido em 2026-10-14: `caged` 3×, `mvgr-nominal`
      e `mvgr-real` 2×, `pib-real-anual` 2×) **não quebram o gráfico** — a lib aceita e desenha
      um segmento vertical no mesmo x. É problema de **dado**, não de conversão: vai para a
      **fatia 11**. A sonda provou que não lança.
- [ ] **Nenhuma série recebe `title`** (§12.2) e `lastValueVisible` segue ligado — conferido no
      código do adapter, não por impressão.
- [ ] `grep -rn "lightweight-charts" app/src` → só em `app/src/chart/` (§8, regra 1).
- [ ] `grep -rn "chart/adapter" app/src/components` → só `Chart.svelte` (§8, regra 2).
- [ ] **Clique na faixa não move o viewport** — conferido ao vivo, não por inspeção.
- [ ] Faixas **sem nenhuma cor de partido**; rótulo com `governo · SIGLA` (§2).
- [ ] Hachura no mandato em curso, **cortando no último dado** e não na data de hoje.
- [ ] Arrastar/scroll/duplo-clique dão zoom; o minimapa mantém a referência do todo.
- [ ] `grep -rn "window\." app/src/chart app/src/components/Chart.svelte` → sem resultado.
- [ ] Testes puros (`paraPontosDaBiblioteca`, `paraISO`, `faixasVisiveis`, `tomDaFaixa`) passam
      em node, sem DOM.

## Auto-revisão

- **Cobertura da spec:** §2 (clique seleciona, zoom separado, minimapa, faixas sem cor,
  hachura) → tarefas 1–4; §8/§8.1 (só `chart/` importa a lib, só `Chart.svelte` fala com
  o adapter, store → adapter) → tarefas 1 e 4; §7.3.5 (hachura cortando no último dado)
  → tarefa 2; §3 (o trilho é seletor **desacoplado** do eixo — não é régua) fica para a
  fatia 09.
- **Portão respeitado:** a tarefa 0 fecha a §12.2 **antes** de qualquer código de produção.
  Os **logos dos partidos** (§12.3) entram na fatia 09 (trilho e ficha), não aqui — o
  gráfico não os comporta (§2: ~27 px em 515).
- **Placeholder declarado:** o interior dos métodos do adapter é **esqueleto comentado**
  por natureza — a API da lib **deve** ser lida nos typings da versão instalada antes de
  codar. Os timestamps do teste (`1078099200`, `1080777600`) foram conferidos por cálculo.
- **Consistência de nomes:** `criarAdapter`, `paraPontosDaBiblioteca`, `criarPrimitivaDeFaixas`,
  `faixasVisiveis`, `tomDaFaixa`, `criarNavigator` — consumidos por `Chart.svelte` (aqui) e
  pela fatia 07.

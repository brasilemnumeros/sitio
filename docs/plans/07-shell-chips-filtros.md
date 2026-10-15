# Fatia 07 — Casca da página, chips e filtros de tempo (§1, §9)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a composição da página na ordem da §1 e as três superfícies de estado que
não são gráfico: **esqueleto de carregamento**, **erro por série / erro total** e **estado
inicial**. É a fatia que transforma "o gráfico monta" em "a página funciona".

**Arquitetura:** `src/components/` é a camada 1 — UI e reatividade; não conhece a
biblioteca de gráficos (§8). Consome stores (fatia 05) e, no caso do gráfico, o
`Chart.svelte` (fatia 06).

**Stack:** Svelte 5 + Tailwind v4 (classes utilitárias; o CSS vem do `main.dist.css`).

**Spec:** `...design.md` §1 (composição, ordem), §9.1, §9.2, §9.3, §9.5

## Restrições globais

- **Ordem da página é a da §1**, literal:
  1. barra de busca · 2. chips das séries · 3. gráfico grande · 4. barra de filtros de
  tempo · 5. trilho de mandatos · 6. painel de comparação.
- **O painel de comparação não vem em abas e fica sempre visível** (§1). Aqui só
  reservamos o lugar; o conteúdo é a fatia 09.
- **Regra que governa os estados: nenhum vazio silencioso** (§9). Todo lugar onde falta
  dado diz *por quê* falta.
- **Carregamento é por série**, não um indicador global único (§9.2).
- **Erro de uma série é degradação parcial** — o resto da tela segue usável (§9.3).
- **Estado inicial sem tela de boas-vindas**: um campo que abre a busca + um **atalho de
  exemplo** ("Selic × IPCA") (§9.1).
- **Nada em `window`** (§8).
- **A legenda das séries é o canal redundante de identificação — e é obrigatória.** A §12.2
  (fechada por medição em 2026-10-14) decidiu que a ponta da linha **não** é o canal: com 10
  séries os rótulos da biblioteca ocupam **80% da altura do gráfico** no pior caso. Então a
  identificação por texto vive **fora do gráfico**, na legenda. Ela é a **Tarefa 5**.

---

### Tarefa 1: `components/App.svelte` — a ordem da §1

> ⚠️ **Ordem de execução: T1 primeiro, e depois T2 → T3 → T4 → T5.** A casca precisa vir
> antes porque **T2–T5 só conseguem se verificar na tela se houver uma página montada**. Para
> isso, a T1 renderiza **marcadores de posição** no lugar dos componentes que ainda não
> existem, e **cada tarefa seguinte troca o seu próprio marcador pelo componente real** —
> uma linha cada, no mesmo arquivo. Assim o build fica verde desde a T1 e a ordem da §1 é
> verificável desde o começo.

**Arquivos:**
- Modificar: `sitio/app/src/App.svelte` (o shell da fatia 00)
- Teste: `sitio/app/src/components/App.test.js` ✓ **não** — componente não é testado por
  ora (§10.7). Verificação é por dev server + build do CI.

**Interfaces:**
- Consome: `catalogStore`, `seriesStore`, `mandateStore`; `Chart.svelte`; os componentes
  das tarefas 2–3 e das fatias 08–09.
- Produz: a página.

- [ ] **Passo 1: escrever o componente**

```svelte
<script>
  import { onMount } from 'svelte';
  import { catalogStore, carregarCatalogo } from './stores/catalog.js';
  import { seriesStore } from './stores/series.js';
  import { carregarMandatos } from './stores/mandate.js';
  import Chart from './components/Chart.svelte';
  // 🔴 Só se importa o que JÁ EXISTE. Um import de arquivo inexistente QUEBRA O BUILD —
  // e é o defeito que o pré-voo desta fatia achou. Os demais componentes entram pelos
  // marcadores de posição abaixo, e cada tarefa troca o seu.

  let buscaAberta = $state(false);
  let { status } = $derived($catalogStore);
  let itens = $derived($seriesStore.itens);

  onMount(() => {
    carregarCatalogo();
    carregarMandatos();
  });
</script>

<!-- A ORDEM DESTES SEIS BLOCOS É A DA §1, LITERAL. Não reordenar. -->
<main class="mx-auto flex max-w-6xl flex-col gap-4 p-4">
  <!-- 1 · busca -->
  <button class="rounded border px-3 py-2 text-left" onclick={() => (buscaAberta = true)}>
    Buscar indicador…
  </button>

  <!-- 2 · chips — TODO(T2): trocar por <SeriesChips /> -->
  <div class="text-sm opacity-50" data-bloco="chips">[2 · chips das séries]</div>

  <!-- 3 · gráfico (ou o estado que o substitui) + a LEGENDA, que é o canal redundante
       de identificação (§12.2) e fica FORA do gráfico de propósito: com 10 séries os
       rótulos da lib ocupam 80% da altura da área de plot. -->
  {#if itens.length === 0}
    <!-- TODO(T4): <EstadoInicial aoPedirExemplo={...} /> -->
    <div class="text-sm opacity-50" data-bloco="inicial">[3 · estado inicial]</div>
  {:else if itens.every((i) => i.status === 'carregando')}
    <!-- TODO(T4): <Esqueleto /> -->
    <div class="text-sm opacity-50" data-bloco="esqueleto">[3 · carregando]</div>
  {:else}
    <Chart />
    <!-- TODO(T5): <SeriesLegend /> -->
    <div class="text-sm opacity-50" data-bloco="legenda">[3 · legenda das séries]</div>
  {/if}

  <!-- 4 · filtros de tempo — TODO(T3): trocar por <TimeFilters /> -->
  <div class="text-sm opacity-50" data-bloco="filtros">[4 · filtros de tempo]</div>

  <!-- 5 · trilho — TODO(fatia 09): <MandateRail /> -->
  <div class="text-sm opacity-50" data-bloco="trilho">[5 · trilho de mandatos]</div>

  <!-- 6 · painel de comparação, SEMPRE visível, largura total (§1) — não é aba.
       TODO(fatia 09): <ComparisonPanel /> -->
  <div class="text-sm opacity-50" data-bloco="comparacao">[6 · painel de comparação]</div>

  {#if buscaAberta}
    <!-- TODO(fatia 08): <SearchModal aoFechar={...} /> — e o overlay abaixo vira parte dela.
         É um <button>, não um <div>: um <div> com onclick dispara dois avisos de
         acessibilidade do Svelte (sem handler de teclado, sem role) — medido no dev server
         em 2026-10-15. O overlay É clicável para fechar, então <button> é o elemento certo
         e resolve os dois de uma vez, ainda ganhando o foco por teclado. -->
    <button
      type="button"
      class="fixed inset-0 cursor-default border-0 bg-black/40 p-0"
      aria-label="Fechar a busca"
      onclick={() => (buscaAberta = false)}
    ></button>
  {/if}
</main>
```

> **Svelte 5.57.2, medido** (`node_modules/svelte/package.json`) — as runes valem, e a
> auto-subscrição de store (`$seriesStore`) segue funcionando junto com elas. Não há cenário
> de Svelte 4 a considerar; a fatia 00 já fixou a versão.

- [ ] **Passo 2: verificar na tela** — `npm run dev`; os **seis marcadores** aparecem na ordem
      da §1 (busca, chips, gráfico, filtros, trilho, comparação), e o `data-bloco` de cada um
      torna a ordem conferível por inspeção. Os três `TODO` de fatia 08/09 ficam visíveis como
      marcadores até essas fatias existirem — **não** removê-los antes.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/App.svelte
git commit -m "feat(ui): casca da pagina na ordem da secao 1"
```

---

### Tarefa 2: `components/SeriesChips.svelte` — chips com erro e remoção

**Arquivos:**
- Criar: `sitio/app/src/components/SeriesChips.svelte`

**Interfaces:**
- Consome: `seriesStore`, `removerSerie`, `tentarNovamente`, `corDe`, `definirCor`,
  `restaurarCor`; `avisoDeColisao` (fatia 04).
- Produz: uma faixa de chips; cada chip = **cor + nome + "×" de remoção** (§1).
  - Chip em **erro**: vira erro com as duas ações — **tentar de novo** / **remover** (§9.3).
  - Chip **carregando**: mostra o progresso **daquela** série (§9.2).
  - Clicar na cor abre o seletor; escolher uma cor colidindo **avisa com a distância
    medida** e **não bloqueia** (§1); "restaurar padrão" por série.

**Formas de dado — verificadas em `stores/series.js` e `domain/color.js` (2026-10-15):**

```js
// item de seriesStore.itens:
// { id, name, unit, cor, corPessoal, status:'carregando'|'ok'|'erro',
//   series:object|null, error:string|null }

// funções que o chip usa:
import { seriesStore, LIMITE_SERIES, atingiuLimite, removerSerie,
         tentarNovamente, definirCor, restaurarCor } from '../stores/series.js';
import { avisoDeColisao } from '../domain/color.js';
//   avisoDeColisao(cor, outrasCores)  ->  { colide:boolean, distancia:number, contra:number }

// O texto do limite já existe pronto — NÃO reescrever a frase na UI:
motivoDoLimite()   // -> string com o porquê (§9.5, "nada removido automaticamente")
```

- [ ] **Passo 1: implementar** (padrão da §1/§9.3 acima) — seguir a **T5 como referência de
      estilo**: classes Tailwind com `dark:`, `<script>` com runes do Svelte 5, `$derived`
      para o que vem do store. **Não** existe token `--cor-*` no projeto.
- [ ] **Passo 2: verificar** — com 3 séries, derrubar uma (apontar `datafile` para uma URL
      inexistente em dev) e conferir: o chip vira erro, o gráfico **segue com as outras**
      (§9.3), e "tentar de novo" recupera.
- [ ] **Passo 3: commitar**

⚠️ **Não esquecer:** trocar o marcador `data-bloco="chips"` no `App.svelte` por `<SeriesChips />`
(R29 — cada tarefa substitui o seu próprio marcador). O commit leva **os dois arquivos**.

```bash
cd sitio && git add app/src/components/SeriesChips.svelte app/src/App.svelte
git commit -m "feat(ui): chips com erro por serie, cor com aviso e remocao"
```

---

### Tarefa 3: `components/TimeFilters.svelte` — a barra que saiu da modal

**Arquivos:**
- Criar: `sitio/app/src/components/TimeFilters.svelte`

**Interfaces:**
- Consome: `viewportStore`, `definirJanela`, `resetarJanela`.
- Produz: presets de janela (**1a · 5a · 10a · 30a · Tudo**) que escrevem no store
  `viewport` — e **não** no gráfico (§8.1). "Tudo" = `resetarJanela()`.

**Formas de dado — verificadas em `stores/viewport.js` (2026-10-15):**

```js
import { viewportStore, definirJanela, resetarJanela } from '../stores/viewport.js';
//   definirJanela({ from = null, to = null })   // data em ISO 'AAAA-MM-DD'
//   resetarJanela()                             // o preset "Tudo"
// O store guarda { from, to } — o adapter é quem reage (§8.1).
```

- [ ] **Passo 1: implementar** com os cinco presets.

      ⚠️ **De onde vem a data máxima:** de `$seriesStore.itens`, que é estado de store — a
      última data de `item.series.data`, entre as séries com `status === 'ok'`. **Nunca**
      perguntar ao gráfico (§8.1: o gráfico é espelho, não dono). Sem série `ok`, os presets
      ficam **desabilitados** com o motivo visível (§9: nada vazio em silêncio).
      O `from` é `dataMaxima − N anos`, e o preset escreve via `definirJanela({ from })`.
- [ ] **Passo 2: verificar** — clicar em "5a" move o gráfico; o minimapa acompanha; "Tudo"
      volta ao intervalo completo.
- [ ] **Passo 3: commitar**

⚠️ **Não esquecer:** trocar o marcador `data-bloco="filtros"` no `App.svelte` por `<TimeFilters />` (R29).

```bash
cd sitio && git add app/src/components/TimeFilters.svelte app/src/App.svelte
git commit -m "feat(ui): barra de filtros de tempo como controle do grafico"
```

---

### Tarefa 4: Os três estados — inicial, esqueleto e erro total (§9.1–§9.3)

**Arquivos:**
- Criar: `sitio/app/src/components/EstadoInicial.svelte`
- Criar: `sitio/app/src/components/Esqueleto.svelte`
- Criar: `sitio/app/src/components/ErroTotal.svelte`

**Interfaces:**
- `EstadoInicial` — um campo que abre a busca + o **atalho de exemplo** `Selic × IPCA`.
  **Sem** tela de boas-vindas explicativa (§9.1: quem já conhece paga pedágio).
- `Esqueleto` — **na forma do conteúdo**: a área do gráfico e as linhas da matriz, para a
  página não pular de layout quando o dado chega (§9.2).
- `ErroTotal` — mesma linguagem da degradação parcial, com **título, motivo e botão de
  tentar de novo** (§9.3). `schema` desconhecido cai aqui (§6, §9.3).

**Formas de dado — o que cada estado lê:**

```js
// EstadoInicial: não lê store. Recebe `aoPedirExemplo` e pede o par "Selic × IPCA" (§9.1).
//   O par existe em indicators.json — resolver por id na hora de adicionar, não hardcodar
//   nome nem URL.
// Esqueleto: não lê store. É forma, não dado.
// ErroTotal: recebe { titulo, motivo, aoTentarNovamente }. O `motivo` é texto que o
//   chamador monta — nunca "erro desconhecido" (§9: o vazio sempre diz por quê).
```

- [ ] **Passo 1–2:** implementar e verificar cada um forçando o estado em dev.
- [ ] **Passo 3: commitar**

⚠️ **Não esquecer:** trocar os marcadores `data-bloco="inicial"` e `data-bloco="esqueleto"` no
`App.svelte` pelos componentes reais (R29). O `ErroTotal` é o caso de **todos** os itens em erro —
ele não tem marcador; entra como um ramo a mais no `{#if}` do bloco 3.

```bash
cd sitio && git add app/src/components/EstadoInicial.svelte app/src/components/Esqueleto.svelte app/src/components/ErroTotal.svelte app/src/App.svelte
git commit -m "feat(ui): estados inicial, carregando e erro total, sem vazio silencioso"
```

---

---

### Tarefa 5: `components/SeriesLegend.svelte` — o canal redundante (§1, §12.2, §5)

**Arquivos:**
- Criar: `sitio/app/src/components/SeriesLegend.svelte`
- Teste: **não por ora** (componente Svelte, §10.7). Verificação é por dev server.

**Interfaces:**
- Consome: `seriesStore` (fatia 05, dá `cor`, `name`, `unit`), `axesStore` (fatia 05, dá a
  atribuição de eixo), `definirCor`, `restaurarCor`, `removerSerie`, `moverParaEixo`.
- Produz: a legenda — e **nada mais**. Não conhece a biblioteca de gráficos (§8).

⚠️ **Esta tarefa também unifica o aviso de colisão com os chips (T2).** A T2 mediu que um par
em colisão emite **duas** mensagens (uma por série, simétricas). Aqui a regra passa a ser **uma
por par** — e os chips devem consumir a mesma derivação, para as duas superfícies não divergirem.
Se preferir, extraia a derivação para um helper puro em `domain/color.js` e use nos dois.

**Por que esta tarefa existe:** é o que a §1 chama de canal redundante e a §12.2 mediu como
necessário. Sem ela, a identificação de uma série depende só da cor — que é justamente o canal
que falha no daltonismo (§1: os pares `#309aff`/`#9581ff` ficam em ΔE 0,006).

- [ ] **Passo 1: escrever o componente**

```svelte
<script>
  import { seriesStore, definirCor, restaurarCor, removerSerie } from '../stores/series.js';
  import { axesStore, moverParaEixo } from '../stores/axes.js';
  import { avisoDeColisao, LIMIAR_COLISAO } from '../domain/color.js';

  // Svelte 5 com runes (o app é novo; não misturar com `$:` legado). Os stores continuam
  // funcionando por auto-subscrição.
  const itens = $derived($seriesStore.itens);
  // R25: o aviso mede o PIOR CASO entre as quatro visões, não a visão normal.
  //
  // 🔴 UMA linha por PAR, não por série. `avisoDeColisao` é SIMÉTRICO: se cada série avisar
  // sobre todas as outras, um par em colisão gera DUAS mensagens idênticas trocadas — medido
  // na T2 (2026-10-15), que tem a mesma forma. Aqui só a série de MAIOR índice fala pelo par,
  // comparando-se apenas com as ANTERIORES. Resultado: uma mensagem por par, como o desenho
  // da §1 pede (o aviso é sobre a combinação, não sobre uma das séries).
  const SEM_COLISAO = { colide: false, distancia: Infinity, contra: -1 };
  const avisos = $derived(
    itens.map((item, idx) => {
      const anteriores = itens.slice(0, idx).map((o) => o.cor);
      return anteriores.length ? avisoDeColisao(item.cor, anteriores) : SEM_COLISAO;
    }),
  );
</script>

<!-- A legenda QUEBRA EM LINHAS (§1) — com 10 séries ela não pode virar uma tira horizontal.
     Estilo por classes Tailwind + `dark:` (convenção do projeto; NÃO existem tokens --cor-*). -->
<ul class="flex flex-wrap gap-x-4 gap-y-2" data-testid="legenda-series">
  {#each itens as item, i (item.id)}
    <li class="flex items-center gap-2 text-sm">
      <label class="flex cursor-pointer items-center gap-2">
        <input
          type="color"
          value={item.cor}
          oninput={(e) => definirCor(item.id, e.currentTarget.value)}
          class="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
        <span class="text-slate-700 dark:text-slate-200">{item.name}</span>
      </label>

      {#if item.corPessoal}
        <button
          type="button"
          onclick={() => restaurarCor(item.id)}
          class="text-xs text-slate-500 underline dark:text-slate-400"
          title="Voltar à cor da paleta">restaurar</button>
      {/if}

      {#if avisos[i].colide}
        <!-- Informa, NÃO bloqueia (§1) — a série continua no gráfico. -->
        <span
          class="text-xs text-amber-600 dark:text-amber-400"
          title="Distância {avisos[i].distancia.toFixed(3)} — abaixo do envelope {LIMIAR_COLISAO}"
        >
          ⚠ parecida
        </span>
      {/if}

      <!-- A atribuição de eixo fica VISÍVEL na legenda e é trocável por clique (§5). -->
      <button
        type="button"
        onclick={() =>
          moverParaEixo(item.id, $axesStore.atribuicao[item.id] === 'left' ? 'right' : 'left')}
        class="rounded border border-slate-300 px-1.5 text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400"
        title="Trocar de eixo"
      >
        {$axesStore.atribuicao[item.id] === 'left' ? 'esq.' : 'dir.'}
      </button>

      <button
        type="button"
        onclick={() => removerSerie(item.id)}
        class="text-xs text-slate-500 dark:text-slate-400"
        title="Remover do gráfico">✕</button>
    </li>
  {/each}
</ul>
```
- [ ] **Passo 2: verificar com 10 séries, ao vivo**

Run: `cd sitio/app && npm run dev`, adicionar **10** séries.

**Esperado:** a legenda quebra em **mais de uma linha** e as 10 continuam identificáveis; trocar
uma cor mostra o botão "restaurar"; um par abaixo do envelope mostra "⚠ parecida" — e a série
**continua no gráfico** (informa, não bloqueia).

- [ ] **Passo 3: commitar**

⚠️ **Não esquecer:** trocar o marcador `data-bloco="legenda"` no `App.svelte` por `<SeriesLegend />`
(R29). É o último marcador desta fatia — depois dela, os únicos `TODO` que sobram no `App.svelte`
são os de fatia 08/09.

```bash
cd sitio && git add app/src/components/SeriesLegend.svelte app/src/App.svelte
git commit -m "feat(shell): legenda das series como canal redundante de identificacao"
```

---

## Critérios de aceite da fatia 07

- [ ] A página tem os **seis blocos na ordem da §1**; o painel de comparação está
      **abaixo do gráfico, em largura total e sempre visível** (não é aba).
- [ ] **A legenda existe e é o canal redundante** (§12.2): uma entrada por série com **cor e
      nome**, **quebrando em linhas**, com a **atribuição de eixo visível e trocável por
      clique** (§5), o aviso "⚠ parecida" quando o par cai abaixo do envelope — **sem tirar a
      série do gráfico** — e "restaurar" quando a cor é pessoal. Verificada **ao vivo com 10
      séries**, não por inspeção.
- [ ] `npm run dev` mostra: sem seleção → **EstadoInicial** com o atalho "Selic × IPCA";
      carregando → **Esqueleto na forma do conteúdo**; falha de uma série → **chip em
      erro com tentar de novo/remover e o resto da tela usável**; nada carregou →
      **ErroTotal com motivo**.
- [ ] Nenhum estado aparece **vazio sem explicação** — conferir cada caso com o motivo na
      tela (§9).
- [ ] `definirJanela` é a única rota de mudança de janela; nenhum componente toca no
      adapter do gráfico (§8.1).
- [ ] `grep -rn "window\.\|console\.log" app/src/components` → sem resultado.
- [ ] **A captura de tela mostra o CSS aplicado** — não basta a ordem do DOM estar certa.
      O dev server precisa servir `main.dist.css` (sem o middleware em `vite.config.js` o
      Vite devolve o `index.html` no lugar do CSS e a página fica sem estilo **em silêncio**;
      medido em 2026-10-15). Conferir na captura: fonte, espaçamento e a barra de busca com
      borda — não Times New Roman cru.
- [ ] **Sem aviso de acessibilidade do Svelte** no console do dev server. O overlay da busca
      é `<button>`, não `<div onclick>`.

## Auto-revisão

- **Cobertura da spec:** §1 (composição e ordem) → tarefa 1; §1 (chips, cor customizada
  avisa sem bloquear) → tarefa 2; §1/§10 (filtros de tempo saem da modal e viram barra)
  → tarefa 3; §9.1/§9.2/§9.3 → tarefa 4.
- **Onde as outras superfícies moram:** a **modal** é a fatia 08; o **trilho** e o
  **painel de comparação** são a fatia 09 — aqui só são montados nos lugares certos.
- **Sem teste de componente** por decisão da §10.7 — a verificação desta fatia é o dev
  server e o canário do CI (fatia 10). Não inventar teste de componente.
- **Consistência de nomes:** `EstadoInicial`, `Esqueleto`, `ErroTotal`, `SeriesChips`,
  `TimeFilters`, `SearchModal`, `MandateRail`, `ComparisonPanel` — as fatias 08–09
  entregam os três últimos com exatamente estes nomes.

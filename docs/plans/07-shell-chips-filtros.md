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
  import SeriesChips from './components/SeriesChips.svelte';
  import TimeFilters from './components/TimeFilters.svelte';
  import SearchModal from './components/SearchModal.svelte';
  import MandateRail from './components/MandateRail.svelte';
  import ComparisonPanel from './components/ComparisonPanel.svelte';
  import EstadoInicial from './components/EstadoInicial.svelte';
  import Esqueleto from './components/Esqueleto.svelte';

  let buscaAberta = $state(false);
  let { status } = $derived($catalogStore);
  let itens = $derived($seriesStore.itens);

  onMount(() => {
    carregarCatalogo();
    carregarMandatos();
  });
</script>

<main class="mx-auto flex max-w-6xl flex-col gap-4 p-4">
  <!-- 1 · busca -->
  <button class="rounded border px-3 py-2 text-left" onclick={() => (buscaAberta = true)}>
    Buscar indicador…
  </button>

  <!-- 2 · chips -->
  <SeriesChips />

  <!-- 3 · gráfico (ou o estado que o substitui) -->
  {#if itens.length === 0}
    <EstadoInicial aoPedirExemplo={() => { /* adiciona "Selic × IPCA" (§9.1) */ }} />
  {:else if itens.every((i) => i.status === 'carregando')}
    <Esqueleto />
  {:else}
    <Chart />
  {/if}

  <!-- 4 · filtros de tempo -->
  <TimeFilters />

  <!-- 5 · trilho (fatia 09) -->
  <MandateRail />

  <!-- 6 · painel de comparação, SEMPRE visível, largura total (§1) -->
  <ComparisonPanel />

  {#if buscaAberta}
    <SearchModal aoFechar={() => (buscaAberta = false)} />
  {/if}
</main>
```

> Svelte 5: `$state`/`$derived` só funcionam em `.svelte`/`.svelte.js`. Confirmar a versão
> instalada na fatia 00 — se for Svelte 4, usar `let` + `$store` normalmente.

- [ ] **Passo 2: verificar na tela** — `npm run dev`; a ordem dos seis blocos confere.
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

- [ ] **Passo 1: implementar** (padrão da §1/§9.3 acima)
- [ ] **Passo 2: verificar** — com 3 séries, derrubar uma (apontar `datafile` para uma URL
      inexistente em dev) e conferir: o chip vira erro, o gráfico **segue com as outras**
      (§9.3), e "tentar de novo" recupera.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/SeriesChips.svelte
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

- [ ] **Passo 1: implementar** com os cinco presets, calculando `from` a partir da data
      máxima da série mais longa e chamando `definirJanela`.
- [ ] **Passo 2: verificar** — clicar em "5a" move o gráfico; o minimapa acompanha; "Tudo"
      volta ao intervalo completo.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/TimeFilters.svelte
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

- [ ] **Passo 1–2:** implementar e verificar cada um forçando o estado em dev.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/EstadoInicial.svelte app/src/components/Esqueleto.svelte app/src/components/ErroTotal.svelte
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
  const avisos = $derived(
    itens.map((i) => avisoDeColisao(i.cor, itens.filter((o) => o.id !== i.id).map((o) => o.cor))),
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

```bash
cd sitio && git add app/src/components/SeriesLegend.svelte
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

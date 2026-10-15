# Fatia 08 — Modal de busca de indicadores (§1.1)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a **cascata de três colunas** — grupo → indicador → ficha — com busca por
digitação disponível nas três, navegação por teclado, e o **aviso de compatibilidade de
escala dentro da ficha**, visível **antes** da escolha.

**Arquitetura:** `src/components/SearchModal.svelte` (camada 1). Consome `catalogStore`
e `seriesStore` (fatia 05) e `comparabilidade` (fatia 02, via store `axes`).

**Stack:** Svelte 5 + Tailwind v4.

**Spec:** `...design.md` §1.1 (completa), §5 (o aviso), §9.5 (o limite)

## ✅ Portão de prontidão — RESOLVIDO em 2026-10-14

A **§12.1** está **fechada**. O desenho mobile foi decidido a partir de mockup com três posturas
comparadas (ver §12.1 para as três e o motivo da rejeição de duas). **A tarefa 4 pode começar.**

**O que a tarefa 4 precisa implementar (fonte: §12.1):**

- Corte em `< 768px` (o `md` do Tailwind). Daí para cima, a §1.1 sem mudança.
- **Busca** fixa no topo, com foco automático ao abrir.
- **Grupos** em **fileira de chips rolável na horizontal** (7 + "Todos") — **não** coluna.
- **Lista** de uma coluna, com **cabeçalho de grupo grudado** enquanto rola (quando "Todos").
- **Linha**: caixa de seleção · nome · **distintivo de escala** · botão "i". O **distintivo é
  obrigatório** — é ele que mantém o aviso visível antes da escolha, que é o critério que decidiu
  o desenho. Sem ele a implementação não atende à §12.1.
- **Ficha em folha deslizante** (bottom sheet) ao tocar na linha — unidade, granularidade,
  período, pontos, fonte, aviso completo e Adicionar. **Tocar na linha não adiciona.**
- **Teclado** (regra única, vale para os dois layouts): `↑↓` item dentro do grupo · `←→` grupo
  (no desktop, coluna) · `⏎` abre a ficha / confirma o Adicionar · `Esc` fecha a ficha e depois a
  modal · digitação colapsa a cascata e `←→` fica inerte.
- **No limite de 10**: Adicionar visível e desabilitado, com o motivo sendo a **paleta**.

**Aberto, para decidir na implementação com a tela na frente** (não bloqueia): o tamanho do
distintivo em 320px, e se os chips mostram a contagem de indicadores por grupo.

## Restrições globais

- **Três colunas, no espírito do *symbol search* do TradingView** (§1.1):
  1. grupos/categorias — **os 7** de `indicators.json`;
  2. indicadores do grupo, **com caixa de seleção**;
  3. **ficha**: unidade, granularidade, período coberto, número de pontos, fonte e o
     **aviso de compatibilidade de escala** com o que já está no gráfico.
- **A busca por digitação está disponível nas três** e **colapsa a cascata numa lista**
  (§1.1). É o que torna os três cliques do pior caso aceitáveis.
- **O aviso de escala transforma um erro futuro em informação presente** — ele vive na
  ficha, **antes** da escolha, não como erro depois (§1.1, §5).
- **No limite de 10**, o botão de adicionar fica **visível e desabilitado, dizendo o
  motivo** — e o motivo é a **paleta**, não o layout (§1, §9.5).
- **Nada é removido automaticamente** para abrir espaço (§9.5).
- **Navegação por teclado**: ↑↓ entre itens, ←→ entre colunas, ⏎ adicionar (§12.1).

---

### Tarefa 1: `components/SearchModal.svelte` — a cascata e a busca

**Arquivos:**
- Criar: `sitio/app/src/components/SearchModal.svelte`

**Interfaces:**
- Consome: `catalogStore`, `indicadoresDoGrupo`, `buscarIndicadores`, `adicionarSerie`,
  `atingiuLimite`, `motivoDoLimite`, `seriesStore`.
- Produz: `SearchModal` com a prop `aoFechar` (chamada ao fechar por ESC ou clique fora).

- [ ] **Passo 1: implementar as três colunas**

Estrutura (o conteúdo exato de layout fica com quem implementa; a **semântica** é fixa):

```svelte
<script>
  import { catalogStore, indicadoresDoGrupo, buscarIndicadores } from '../stores/catalog.js';
  import { seriesStore, adicionarSerie, atingiuLimite, motivoDoLimite } from '../stores/series.js';
  import Ficha from './Ficha.svelte';

  let { aoFechar } = $props();
  let termo = $state('');
  let grupoAtivo = $state(null);
  let indicadorAtivo = $state(null);

  // A digitação COLAPSA a cascata numa lista — em qualquer das três colunas (§1.1).
  let buscando = $derived(termo.trim() !== '');
  let resultados = $derived(buscarIndicadores(termo));
  let grupos = $derived(Object.entries($catalogStore.groups));
  let noLimite = $derived(atingiuLimite());
</script>

<div class="fixed inset-0 z-40 bg-black/60" onclick={aoFechar} role="presentation">
  <div class="mx-auto mt-16 flex max-h-[80vh] w-[min(1000px,92vw)] gap-0 overflow-hidden rounded-lg bg-[#0e1117]"
       onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Buscar indicadores">

    <!-- coluna 1: grupos -->
    <ul data-coluna="1" class="w-56 shrink-0 overflow-y-auto border-r border-white/10">
      {#each grupos as [id, g]}
        <li><button class:bg-white/10={id === grupoAtivo} onclick={() => (grupoAtivo = id)}>{g.name}</button></li>
      {/each}
    </ul>

    <!-- coluna 2: indicadores do grupo, com caixa de seleção -->
    <ul data-coluna="2" class="w-72 shrink-0 overflow-y-auto border-r border-white/10">
      {#each buscando ? resultados : indicadoresDoGrupo(grupoAtivo) as ind}
        <li>
          <button onclick={() => (indicadorAtivo = ind)} onkeydown={...}>
            <input type="checkbox" checked={selecionado(ind.id)} onchange={() => alternar(ind)} />
            {ind.name}
          </button>
        </li>
      {/each}
    </ul>

    <!-- coluna 3: a ficha -->
    <Ficha indicador={indicadorAtivo} {noLimite} motivo={motivoDoLimite()} aoAdicionar={...} />
  </div>
</div>
```

- [ ] **Passo 2: implementar a navegação por teclado (§12.1)** — ↑↓ movem o item ativo
      dentro da coluna, ←→ mudam de coluna, ⏎ adiciona o indicador em foco, ESC fecha.
- [ ] **Passo 3: verificar na tela**

Run: `npm run dev` — conferir: (a) os **7 grupos** aparecem; (b) digitar "selic" colapsa
a cascata numa lista com os 2 indicadores da SELIC; (c) ←→↑↓⏎ funcionam; (d) ESC fecha.

- [ ] **Passo 4: commitar**

```bash
cd sitio && git add app/src/components/SearchModal.svelte
git commit -m "feat(ui): modal de busca em cascata de tres colunas, com digitacao e teclado"
```

---

### Tarefa 2: `components/Ficha.svelte` — o aviso de escala antes da escolha

**Arquivos:**
- Criar: `sitio/app/src/components/Ficha.svelte`

**Interfaces:**
- Consome: `comparabilidade` (via `axesStore`), `seriesStore`, `catalogStore`.
- Produz: `Ficha` com `indicador`, `noLimite`, `motivo`, `aoAdicionar`. Mostra:
  - **unidade**, **granularidade**, **período coberto**, **número de pontos**, **fonte** —
    tudo do próprio dado, não inventado (§1.1);
  - o **aviso de compatibilidade de escala** com o que já está no gráfico, com as duas
    ações da §5: **normalizar para base 100** ou **remover** (quando `veredito === 'avisa'`);
  - o **caso patológico** com aviso mais duro, sem oferecer normalizar se o veredito for
    `ilegivel` (fatia 02, tarefa 3);
  - o botão de adicionar, **desabilitado com o motivo** quando `noLimite` (§9.5).

- [ ] **Passo 1: implementar**

```svelte
<script>
  import { comparabilidade } from '../domain/scales.js';
  import { seriesStore } from '../stores/series.js';

  let { indicador, noLimite, motivo, aoAdicionar } = $props();

  let carregadas = $derived($seriesStore.itens.filter((i) => i.series).map((i) => i.series));

  /** O aviso é calculado sobre a série inteira, nunca sobre a janela visível (§5). */
  let aviso = $derived(
    indicador && carregadas.length
      ? comparabilidade({ ...indicador, data: [] }, carregadas) // ver nota abaixo
      : { veredito: 'convive', ratio: 1, contra: null },
  );
</script>
```

> **Nota de implementação.** O `comparabilidade` precisa da série **carregada** para medir
> a amplitude — a ficha ainda não a tem antes de baixar. Duas saídas: (a) o `datafile` da
> ficha é carregado sob demanda (é o mesmo `loadSeries`, já em cache, então custa zero na
> segunda vez); ou (b) o `indicators.json` ganha um `amplitude` publicado pelo notebook.
> **(a) é a escolha** — não duplica metadado entre os dois lados (§6). Implementar (a):
> disparar `loadSeries(indicador.datafile)` quando a ficha abre, e usar a série cacheada.

- [ ] **Passo 2: verificar o aviso com o par real medido**

Run: com `Selic` já no gráfico, abrir a ficha de **`populacao-total-anual`**.
**Esperado:** o aviso aparece, citando a razão medida (**≈ 1.192.259×**) e a série culpada
(`selic-meta-acum-12m`); e abrir a ficha de **`igpm-acum-12m`** com Selic no gráfico
**não** avisa (razão **1,056**). Se o número na tela não bater com a medição da §5, parar.

- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/Ficha.svelte
git commit -m "feat(ui): ficha com unidade, fonte e o aviso de escala antes da escolha"
```

---

### Tarefa 3: O limite de 10 dentro da modal (§9.5)

**Arquivos:**
- Modificar: `sitio/app/src/components/Ficha.svelte`, `SearchModal.svelte`

**Interfaces:**
- Consome: `atingiuLimite`, `motivoDoLimite`, `seriesStore`.
- Produz: o botão de adicionar **visível e desabilitado** ao atingir o teto, com o motivo
  — que cita a **paleta**, não o layout.

- [ ] **Passo 1: implementar** o `disabled` + o texto do motivo, e garantir que
      `adicionarSerie` **não remove nada** (o store já garante — fatia 05).
- [ ] **Passo 2: verificar** — adicionar 10 séries; o botão fica desabilitado dizendo que
      a paleta tem 10 cores; tentar forçar não muda a seleção; **nada foi removido**.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/
git commit -m "feat(ui): limite de 10 visivel na modal, com o motivo pela paleta"
```

---

### Tarefa 4: Mobile (`< 768px`) — ✅ desbloqueada em 2026-10-14

- [x] **Passo 0: decidir o desenho mobile** — **feito**: §12.1 da spec, a partir de mockup com
      três posturas comparadas. Escolhida a "lista com contexto".
- [ ] **Passo 1:** busca fixa no topo com foco automático; **chips** roláveis dos 7 grupos +
      "Todos" (não coluna).
- [ ] **Passo 2:** lista de uma coluna com cabeçalho de grupo **grudado**; cada linha com caixa,
      nome, **distintivo de escala** e botão "i". O distintivo é **obrigatório** — é o que
      mantém o aviso visível antes da escolha (§12.1).
- [ ] **Passo 3:** **folha deslizante** com a ficha (unidade, granularidade, período, pontos,
      fonte, aviso completo, Adicionar). **Tocar na linha não adiciona.**
- [ ] **Passo 4:** a mesma regra de teclado dos dois layouts (§12.1) — não inventar uma segunda.
- [ ] **Passo 5:** verificar em **320px** e **375px** que nada estoura; decidir o tamanho do
      distintivo e se os chips mostram contagem (os dois pontos que a §12.1 deixou em aberto).
- [ ] Em **todos** os passos: `EstadoInicial` e barra de busca continuam funcionando em tela
      pequena — a modal não pode esconder o problema do celular por estar "não utilizável".

---

## Critérios de aceite da fatia 08

- [ ] A cascata tem **três colunas** com o conteúdo da §1.1; a coluna 1 mostra os **7
      grupos**; a 3 mostra unidade, granularidade, período, **número de pontos** e fonte.
- [ ] A **digitação está disponível em todas as três** e colapsa a cascata numa lista.
- [ ] O **aviso de escala aparece na ficha, antes da escolha**, com a razão medida — e o
      par real da §5 (Selic × população, ≈1.192.259×) avisa, enquanto o par compatível
      (Selic × IGP-M, 1,056) **não** avisa.
- [ ] **Não existe caminho que adicione série incompatível em silêncio** (§5).
- [ ] Teclado: ↑↓, ←→, ⏎ e ESC funcionam (verificado ao vivo, não por inspeção).
- [ ] No limite, o botão está **visível, desabilitado e diz o motivo (a paleta)**, e
      **nada é removido automaticamente** (§9.5).
- [x] A decisão de mobile está **escrita** na §12.1 (2026-10-14) — **feito**. A tarefa 4 está
      desbloqueada; o portão no topo deste plano traz a lista do que ela implementa.
- [ ] A modal funciona em **320px e 375px** com o desenho da §12.1: chips roláveis, lista de uma
      coluna com cabeçalho grudado, **distintivo de escala em cada linha**, ficha em folha
      deslizante, e a **mesma** regra de teclado dos dois layouts.

## Auto-revisão

- **Cobertura da spec:** §1.1 inteira (três colunas, busca nas três, a ficha como lugar do
  aviso) → tarefas 1–2; §5 (o aviso com as ações normalizar/remover, e o caso patológico)
  → tarefa 2; §9.5 (limite visível com o motivo) → tarefa 3; §12.1 (teclado e mobile) →
  tarefa 1 (teclado) e tarefa 4 (mobile — **decidida em 2026-10-14**, desbloqueada).
- **Por que a cascata e não lista plana** (§1.1) fica preservada na arquitetura: cada nível
  de hierarquia é **uma coluna**, o que é o que permite a expansão estadual sem virar
  rolagem — não trocar por lista plana "porque é mais simples".
- **Ponto honesto:** a tarefa 4 ficou **bloqueada por decisão de desenho**, não por
  dependência técnica — declarada no portão, não escondida no código. Resolvida em
  2026-10-14 com a §12.1 escrita a partir de mockup comparado.
- **Consistência de nomes:** `SearchModal`, `Ficha`, `indicadoresDoGrupo`,
  `buscarIndicadores`, `atingiuLimite`, `motivoDoLimite`, `comparabilidade` — todos vêm das
  fatias 02 e 05 como estão.

# Fatia 09 — Trilho de mandatos e painel de comparação (§3, §4, §9.4)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** as duas superfícies que respondem "quem fez o quê" — o **seletor** de
mandato e a **matriz indicador × mandato** com os quatro estados de célula.

**Arquitetura:** `src/components/` (camada 1), consumindo `mandateStore`, `seriesStore` e
`domain/mandates.js` (fatia 03). Nada aqui conhece a Lightweight Charts.

**Stack:** Svelte 5 + Tailwind v4.

**Spec:** `...design.md` §3, §4, §7.3.5, §7.3.6, §9.4

## 🚧 Portão de prontidão

- **§12.3 — logos dos partidos**: assets (`sitio/assets/img/partidos/`), tamanho no trilho
  e na ficha, **e a questão de uso de marca num repositório público**, que **não é decisão
  técnica**. **Decisão do usuário.** O trilho funciona **sem** logo (sigla em texto) — a
  tarefa 1 entrega assim e a tarefa 4 acrescenta o logo **só depois** da decisão.
- **§12.4 — barrinha de duração no trilho**: não decidido. A tarefa 5 é opcional.

## Restrições globais

- **O trilho é um SELETOR, não uma régua temporal** (§3): uma caixa por governo,
  **largura igual**, **desacoplado do eixo do tempo** do gráfico.
- **Papéis separados por elemento, sem sobreposição** (§3): gráfico mostra a série;
  minimapa cuida de tempo e zoom; trilho diz **qual mandato está selecionado**.
- **Δ absoluto, na unidade do indicador** (§4): `Δ = último − primeiro valor dentro do
  mandato`. **Sem** barra, **sem** cor de julgamento, **sem** campo de direção.
- **Comparável na horizontal, não na vertical** (§4) — limitação assumida, não escondida.
- **Nenhum indicador declara direção/sentido** no registro (§4) — não introduzir esse campo.
- **Nenhum vazio silencioso** (§9.4): "sem cobertura" e "ponto único" são estados
  **distintos**, e nenhum deles é `0` nem `—`.
- **Nada em `window`** (§8).

---

### Tarefa 1: `components/MandateRail.svelte` — o seletor

**Arquivos:**
- Criar: `sitio/app/src/components/MandateRail.svelte`

**Interfaces:**
- Consome: `mandateStore` (`mandatos`, `selecionado`), `selecionarMandato`, `limparSelecao`,
  `ordenarMandatos` (fatia 03).
- Produz: uma faixa de caixas de **largura igual**, em ordem cronológica com o mandato em
  curso na ponta direita, cada uma com **sigla do partido + rótulo do governo**, **hachura**
  quando em curso e **contorno** quando selecionada (§3).

- [ ] **Passo 1: implementar**

```svelte
<script>
  import { mandateStore, selecionarMandato, limparSelecao } from '../stores/mandate.js';
  import { ordenarMandatos } from '../domain/mandates.js';

  let ordenados = $derived(ordenarMandatos($mandateStore.mandatos));
  let selecionado = $derived($mandateStore.selecionado);
</script>

<!-- Largura IGUAL e desacoplada do eixo do tempo: grid de colunas iguais (§3). -->
<ol class="grid gap-1" style="grid-template-columns: repeat({ordenados.length}, minmax(0, 1fr))">
  {#each ordenados as m}
    <li>
      <button
        class="w-full rounded border px-2 py-1 text-xs"
        class:border-white={m.id === selecionado}
        class:bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,.12)_4px,rgba(255,255,255,.12)_8px)]={m.emCurso}
        aria-pressed={m.id === selecionado}
        onclick={() => (m.id === selecionado ? limparSelecao() : selecionarMandato(m.id))}
      >
        <span class="block font-medium">{m.rotulo} · {m.partido}</span>
      </button>
    </li>
  {/each}
</ol>
```

> **Por que não régua alinhada ao tempo** (§3): Dilma II durou 1,7 ano contra 4 dos
> mandatos cheios — daria ~27 px num gráfico de 515, sem caber o nome nem o alvo de clique;
> e o trilho alinhado não acompanha o zoom, então clicar num mandato fora da janela faria o
> gráfico saltar enquanto o trilho fica parado (teleporte). **Não "melhorar" para régua.**

- [ ] **Passo 2: verificar** — os **8 mandatos** aparecem em caixas do mesmo tamanho, Lula
      III com hachura na ponta direita; clicar seleciona (contorno), clicar de novo limpa.
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/MandateRail.svelte
git commit -m "feat(ui): trilho de mandatos como seletor de largura igual"
```

---

### Tarefa 2: `components/ComparisonPanel.svelte` — a matriz

**Arquivos:**
- Criar: `sitio/app/src/components/ComparisonPanel.svelte`
- Criar: `sitio/app/src/components/Celula.svelte`

**Interfaces:**
- Consome: `seriesStore`, `mandateStore`, `deltaNoMandato`/`COBERTURA`/`formatarPeriodo`
  (fatia 03), e a formatação da unidade (a criar: `domain/format.js`).
- Produz: uma matriz com **uma linha por série selecionada** e **uma coluna por governo**,
  largura total, sempre visível, com o **cabeçalho dos mandatos fixo** (§1, §9.5).

- [ ] **Passo 1: criar `domain/format.js` com teste**

`valorNaUnidade(valor, unit)` — usa `unit.decimals` e `unit.symbol`; a formatação é uma das
"contas que erram calado" (§8) e entra no alvo de teste.

```js
import { describe, it, expect } from 'vitest';
import { valorNaUnidade } from './format.js';

describe('valorNaUnidade', () => {
  it('usa as casas decimais e o símbolo da unidade', () => {
    expect(valorNaUnidade(44.2222, { type: 'percentage', symbol: '%', decimals: 2 })).toBe('44,22%');
    expect(valorNaUnidade(50337190, { type: 'number', symbol: 'hab.', decimals: 0 })).toBe('50.337.190 hab.');
  });
  it('formata em pt-BR', () => {
    expect(valorNaUnidade(-3.55, { type: 'percentage', symbol: '%', decimals: 2 })).toBe('-3,55%');
  });
});
```

- [ ] **Passo 2: implementar a matriz e a célula**

`Celula.svelte` implementa os **quatro estados** (§9.4), sem inventar nenhum:

| estado | aparência | origem |
|---|---|---|
| Δ calculável | o número, na unidade do indicador | `COBERTURA.CALCULAVEL` |
| cobertura parcial | o número **com o período real usado** (`parcial 03/2004–12/2006`) | `COBERTURA.PARCIAL` |
| sem cobertura | cinza apagado, **dizendo por quê** ("série começa em 2004-03") | `COBERTURA.SEM` + `motivo` |
| ponto único | âmbar, explicitamente **sem Δ** | `COBERTURA.PONTO_UNICO` |

```svelte
<!-- Celula.svelte — nenhum estado é 0 nem "—" (§9.4) -->
{#if estado === 'calculavel'}
  <span>{valorNaUnidade(delta, unit)}</span>
{:else if estado === 'parcial'}
  <span>{valorNaUnidade(delta, unit)}<em class="block text-[10px]">parcial {formatarPeriodo(periodo)}</em></span>
{:else if estado === 'sem-cobertura'}
  <span class="text-gray-500">{motivo}</span>
{:else if estado === 'ponto-unico'}
  <span class="text-amber-400">ponto único — sem Δ</span>
{/if}
```

- [ ] **Passo 3: implementar o cabeçalho fixo e a legenda**

- A matriz **rola com o cabeçalho dos mandatos fixo** (§9.5) — `position: sticky` na linha
  de cabeçalho.
- A **legenda quebra em linhas** e continua identificando cada série (§1).

- [ ] **Passo 4: verificar contra os números reais**

Run: com `mvgr-nominal` e `selic-meta-acum-12m` selecionadas, conferir na matriz:
**MVG-R no Lula I** → `parcial 03/2004–12/2006`; **MVG-R no FHC II** → "série começa em
2004-03"; **homicídios no Lula III** → ponto único. Se algum divergir, é bug de conta —
parar e depurar (`superpowers:systematic-debugging`).

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/domain/format.js app/src/domain/format.test.js app/src/components/ComparisonPanel.svelte app/src/components/Celula.svelte
git commit -m "feat(ui): matriz de comparacao com os quatro estados de celula"
```

---

### Tarefa 3: Ligar o trilho ao destaque do gráfico

**Arquivos:**
- Modificar: `sitio/app/src/components/Chart.svelte` (fatia 06)

**Interfaces:**
- Consome: `mandateStore.selecionado`.
- Produz: quando um mandato é selecionado (no trilho **ou** por clique na faixa), a faixa
  acende, o trecho da série dentro do mandato é realçado, o resto esmaece, e o painel
  destaca aquela coluna (§2).

- [ ] **Passo 1: implementar** — `Chart.svelte` assina `mandateStore` e chama
      `adapter.destacarMandato(id)`.
- [ ] **Passo 2: verificar** — clicar no trilho e clicar na faixa produzem **o mesmo**
      estado (a fonte é o store, não o gráfico — §8.1).
- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/components/Chart.svelte
git commit -m "feat(ui): selecao de mandato unica, do trilho e da faixa, pelo store"
```

---

### Tarefa 4 (após a decisão da §12.3): logos dos partidos

- [ ] **Passo 0: decidir o uso de marca** (decisão do usuário, não técnica) e registrar.
- [ ] **Passos 1+:** assets SVG em `sitio/assets/img/partidos/`, logo pequeno + sigla no
      trilho, logo com o nome completo do partido na ficha do mandato (§7.3.4).
      **Nenhuma cor de partido**, em nenhuma forma.

---

### Tarefa 5 (opcional, §12.4): barrinha de duração no trilho

- [ ] Só se a perda da leitura visual de duração incomodar. Uma barrinha proporcional
      dentro da caixa de largura igual. **Não decidido** — se entrar, registrar na §12.4.

---

## Critérios de aceite da fatia 09

- [ ] O trilho tem **uma caixa por mandato, de largura igual**, em ordem cronológica com o
      mandato em curso na ponta direita — **não é régua alinhada ao tempo**.
- [ ] Selecionar um mandato **não move o viewport** (§2) e produz o mesmo estado venha do
      trilho ou do clique na faixa.
- [ ] A matriz é **largura total, sempre visível, sem abas**, com o **cabeçalho fixo** ao
      rolar.
- [ ] Os **quatro estados de célula** aparecem e **nenhum deles é `0` ou `—`** (§9.4).
- [ ] Nenhuma barra, nenhuma cor de julgamento, nenhum campo de direção na matriz (§4).
- [ ] A célula parcial mostra o **período real usado**; a sem cobertura diz **por quê**.
- [ ] `valorNaUnidade` formata em **pt-BR** com as casas da unidade (teste em node).
- [ ] `grep -rn "window\." app/src/components` → sem resultado.
- [ ] A decisão da §12.3 (marca dos logos) está tomada **ou** o trilho segue só com sigla,
      declaradamente.

## Auto-revisão

- **Cobertura da spec:** §3 (trilho seletor, largura igual, hachura, contorno, ordem) →
  tarefa 1; §4 (matriz, Δ absoluto, horizontal × vertical) → tarefa 2; §9.4 (os quatro
  estados) → tarefa 2; §2 (clique destaca, trilho e faixa com a mesma fonte) → tarefa 3;
  §7.3.4 (sem cor de partido, logo + sigla) → tarefas 1 e 4; §12.3 e §12.4 → tarefas 4–5.
- **Por que a matriz não é heatmap** (§4): nenhum indicador declara direção — o custo da
  alternativa sai da conta e o plano **não** reintroduz o campo.
- **Ponto honesto:** duas tarefas são **bloqueadas por decisão** (§12.3 marca, §12.4
  barrinha) e uma delas é **decisão do usuário, não técnica** — declarado no portão.
- **Consistência de nomes:** `MandateRail`, `ComparisonPanel`, `Celula`, `valorNaUnidade` —
  `format.js` nasce aqui e é consumido pelo resto da UI.

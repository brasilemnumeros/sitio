# Fatia 02 — `src/domain/scales.js`: RELATÓRIO (NEEDS_CONTEXT)

**Estado: PARADO em NEEDS_CONTEXT na tarefa 3.** Tarefas 1 e 2 implementadas, testadas
e commitadas. A tarefa 3 foi transcrita à risca, mas **o brief 2 e o brief 3 se
contradizem**: transcrever a tarefa 3 (o limiar de 1.000.000×, que a instrução manda
*transcrever, não rediscutir*) faz um teste da tarefa 2 falhar. Não apliquei remédio
silencioso.

Branch: `feat/camada-de-graficos`. Repo: `sitio/`.

---

## O que foi feito (tarefas 1 e 2 — commitadas, verdes)

### Tarefa 1 — `seriesSpan`, `amplitudeRatio`

Arquivos criados: `sitio/app/src/domain/scales.js`, `sitio/app/src/domain/scales.test.js`.

- **Passo 2 (RED)** — `cd sitio/app && NODE_ENV=development npm test`:

  ```
   ❯ src/domain/scales.test.js (0 test)

  ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

   FAIL  src/domain/scales.test.js [ src/domain/scales.test.js ]
  Error: Cannot find module './scales.js' imported from /Users/lucas/Workspace/brasilemnumeros/sitio/app/src/domain/scales.test.js
   ❯ src/domain/scales.test.js:2:1
        1| import { describe, it, expect } from 'vitest';
        2| import { seriesSpan, amplitudeRatio } from './scales.js';
         | ^
  ```

  (O brief previa `Failed to resolve import`; o Vitest 5.0.4 diz `Cannot find module`.
  Mesma falha — o arquivo alvo não existe.)

- **Passo 4 (GREEN)** — `Test Files 5 passed (5) / Tests 30 passed (30)`.
- **Passo 5 (commit)** — `feat(domain): amplitude e razao de amplitude por magnitude`
  (2 files changed, 79 insertions).

### Tarefa 2 — `comparabilidade`, `AMPLITUDE_LIMIT = 50`

- **Passo 2 (RED)** — 6 testes novos falhando, ex.:
  `AssertionError: expected undefined to be 50` (`AMPLITUDE_LIMIT`) e
  `TypeError: comparabilidade is not a function`.
- **Passo 4 (GREEN)** — `Test Files 5 passed (5) / Tests 36 passed (36)`.
- **Passo 5 (commit)** — `feat(domain): veredito de comparabilidade com corte de 50x`
  (2 files changed, 76 insertions).

---

## A contradição (NEEDS_CONTEXT)

### Tarefa 3 — implementada, suite VERMELHA por causa do brief 2

Acrescentei o teste e a implementação da tarefa 3 exatamente como os briefs traem
(`AMPLITUDE_LIMIT_ILEGIVEL = 1_000_000`; veredito checando o caso patológico primeiro;
typedef atualizado para `'convive'|'avisa'|'ilegivel'`).

- **Passo 2 (RED)** — os 3 testes novos da tarefa 3:

  ```
   ❯ o caso patológico (§5, decidido por medição em 2026-10-14) (3)
     × o limiar é seis ordens de grandeza
     × populacao-total × populacao-variacao (20.921.102×) é ILEGÍVEL

  FAIL  ... > o limiar é seis ordens de grandeza
  AssertionError: expected undefined to be 1000000

  FAIL  ... > populacao-total × populacao-variacao (20.921.102×) é ILEGÍVEL
  AssertionError: expected 'avisa' to be 'ilegivel'
  ```

- **Passo 4 (GREEN da tarefa 3 — mas quebra a tarefa 2)**:

  ```
   ❯ src/domain/scales.test.js (15 tests | 1 failed)
     ❯ comparabilidade (§5) (6)
       × avisa: razão > 50 aponta a série culpada

  FAIL  ... > avisa: razão > 50 aponta a série culpada
  AssertionError: expected 'ilegivel' to be 'avisa' // Object.is equality

  Expected: "avisa"
  Received: "ilegivel"

   ❯ src/domain/scales.test.js:67:24
       66|     const v = comparabilidade(selic, [pop]);
       67|     expect(v.veredito).toBe('avisa');

   Test Files  1 failed | 4 passed (5)
        Tests  1 failed | 38 passed (39)
  ```

### O específico

| | brief 2 (teste "avisa: razão > 50") | brief 3 (limiar patológico) |
|---|---|---|
| par de fixture | `populacao-total-anual` × `selic-meta-acum-12m` | — |
| razão medida | **1.192.259** | — |
| espera | `veredito === 'avisa'` | `> 1.000.000` ⇒ `'ilegivel'` |

O par escolhido pelo brief 2 para os 50× (`pop × selic`) tem razão **1.192.259**, que é
**maior** que o `AMPLITUDE_LIMIT_ILEGIVEL = 1.000.000` introduzido pelo brief 3. Logo, com
os dois cortes transcritos, `comparabilidade` devolve `'ilegivel'` para esse par — não
`'avisa'`. O teste do brief 2 passa a ser **falso por construção**.

Isso não é ambíguo quanto ao fato: a própria **restrição global** desta fatia diz
*"Os dois cortes: 50 (`convive`/`avisa`) e 1.000.000 (`avisa`/`ilegivel`)"* — confirmando
que 1.192.259 ⇒ `ilegivel`. E o brief 3 escolhe deliberadamente um par *diferente*
(`caged × selic` = 657.681) como o exemplo de `'avisa'` não-patológico, o que mostra que o
autor do brief 2 fixou a fixture antes de o limiar de 1.000.000 existir.

Os outros testes dos dois briefs **não** conflitam:
- brief 2 "reporta o PIOR caso" — só checa `contra.id`, passa.
- brief 3 `caged × selic` (657.681) ⇒ `'avisa'`, passa.
- brief 3 `pop × variação` (≈20,9M) ⇒ `'ilegivel'`, passa.

Só a asserção `'avisa'` do brief 2 sobre `pop × selic` quebra.

### Por que não resolvi sozinho

A tarefa manda, explicitamente: *"NÃO invente um remédio silencioso. Pare e reporte
NEEDS_CONTEXT com o específico."* Há (pelo menos) duas resoluções plausíveis e nenhuma é
declaradamente preferida pelos briefs:

1. **Ajustar o teste do brief 2** — trocar a expectativa para `'ilegivel'`, ou trocar a
   fixture por um par com razão entre 50 e 1.000.000 (p.ex. `caged × selic`, 657.681).
   Preserva os dois cortes; altera o texto transcrito do brief 2.
2. **Ajustar o limiar patológico** — subir `AMPLITUDE_LIMIT_ILEGIVEL` acima de 1.192.259.
   Contradiz o brief 3 e a spec §5 (§5 já está commitada com 1.000.000 — commit `2b99af8`).

A resolução (1) é a que preserva a decisão medida da tarefa 3, mas exige edição do texto
do brief 2 — exatamente o tipo de remédio que a instrução proíbe aplicar em silêncio.

---

## Estado do repositório

- Commitado em `feat/camada-de-graficos`:
  - `feat(domain): amplitude e razao de amplitude por magnitude`
  - `feat(domain): veredito de comparabilidade com corte de 50x`
- **NÃO commitado** (working tree sujo): a implementação da tarefa 3 em
  `sitio/app/src/domain/scales.js` + os 3 testes da tarefa 3 em `scales.test.js`.
  Deixei-os sem commit de propósito — a suite está vermelha e a fatia não está fechada.
  `git checkout -- app/src/domain/scales.js app/src/domain/scales.test.js` volta ao estado
  verde da tarefa 2.

## Verificações de aceite já conferidas

- [x] `grep -r "svelte\|fetch\|window" app/src/domain/scales.js` → **sem resultado**
      (domínio puro).
- [x] Corte de 50 numa constante nomeada (`AMPLITUDE_LIMIT`), não hardcoded no meio.
- [x] Limiar patológico em constante nomeada (`AMPLITUDE_LIMIT_ILEGIVEL = 1_000_000`).
- [x] `amplitudeRatio` simétrica (teste passa) e sem insumo de `unit.type`.
- [x] `comparabilidade` com zero existentes devolve `convive`, `contra: null` (passa).
- [x] §5 da spec **já contém** a medição dos 78 pares e o limiar de 1.000.000×
      (commit `2b99af8`, anterior a esta fatia — nada a acrescentar).

## Funções exportadas por `scales.js` (estado atual do working tree)

`seriesSpan(series)`, `amplitudeRatio(a, b)`, `AMPLITUDE_LIMIT = 50`,
`AMPLITUDE_LIMIT_ILEGIVEL = 1_000_000`, `comparabilidade(novaSerie, seriesExistentes)`.

---

## Conclusão da Tarefa 3 (R19) — fatia 02 FECHADA

**Ruling R19 aplicado: opção (1) — troca da fixture do teste de `'avisa'`.** A
contradição era do controlador, não do código: o par `populacao-total-anual ×
selic-meta-acum-12m` mede **1.192.259×**, que cai do outro lado do limiar patológico
(`1.000.000×`, R17), então `'avisa'` era falso por construção. O limiar **não** foi
tocado.

### O que mudou

Só o teste de `'avisa'` em `scales.test.js` — transcrito do **brief 2 atualizado**:

| antes | depois |
|---|---|
| `populacao-total-anual` (50.337.190) × `selic-meta-acum-12m` (42,22) → **1.192.259×** ⇒ `'ilegivel'` (teste falso) | `mvgr-nominal` (222.000) × `selic-meta-acum-12m` (42,22) → **5.258×** ⇒ `'avisa'` (50 < 5.258 < 1.000.000) |

`scales.js` (Tarefa 3, transcrita corretamente na execução anterior) **não mudou** nesta
rodada. Verificação da razão: 264.000 − 42.000 = 222.000; 222.000 ÷ 42,22 = 5.258,17.

### Comando e saída verde

```
$ cd sitio/app && NODE_ENV=development npm test

 Test Files  5 passed (5)
      Tests  39 passed (39)
   Duration  498ms
```

Suíte inteira verde, incluindo os 3 testes da Tarefa 3 (`'ilegivel'` em 20.921.102×;
`'avisa'` em caged × selic ≈ 657.647×; limiar = 1.000.000).

### Commit

```
0ab5409  feat(domain): limiar do caso patologico de escala, decidido por medicao
         2 files changed, 40 insertions(+), 11 deletions(-)
```

Apenas `app/src/domain/scales.js` e `app/src/domain/scales.test.js` foram adicionados
(sem `git add -A`). `sitio/docs/` não foi tocado — a §5 já trazia a medição dos 78 pares
e o limiar de 1.000.000× (commit `2b99af8`, anterior a esta fatia).

**Estado: fatia 02 CONCLUÍDA.** Tarefas 1, 2 e 3 commitadas, verdes, em
`feat/camada-de-graficos`.

---

## Rodada de correção 1/5

Correção dos achados do revisor sobre a fatia 02. Só `scales.js` e `scales.test.js`
tocados. Commit `a17c1c8`.

### O que mudou

1. **Achado 1 (IMPORTANTE) — contrato de `contra`.** `comparabilidade` semeava
   `{ ratio: 1, contra: null }` e comparava com `ratio > pior.ratio`. Com a pior razão
   real **exatamente 1** (duas amplitudes idênticas) o `1 > 1` é falso e `contra` ficava
   `null` — violando o typedef, que só promete `null` quando não há existentes. Trocado
   por semente `let contra = null` e a primeira existente sempre entrando via
   `if (contra === null || ratio > piorRatio)`. Teste novo: "razão EXATAMENTE 1 ainda
   aponta a série comparada" (`dez` 10 × `outra-dez` 10 → `ratio 1`, `contra.id ===
   'outra-dez'`).
2. **Achado 2 (IMPORTANTE `plan-mandated`)** — sem mudança de código: o critério de
   aceite atualizado (brief 3) já diz `1.192.259 ⇒ ilegivel`; confere com o comportamento
   do código. O texto obsoleto (`1.192.259 avisa`) era o controlador que corrigiu no
   plano/briefs.
3. **Achado 3 (MINOR — rótulos medidos).** Títulos alinhados ao que as fixtures
   produzem, cada um reconferido por medição (`node`):
   - `20.921.102×` → **`20.886.801×`** (`50.337.190 ÷ 2,41 = 20.886.800,83`);
   - `≈657.647×` → **`657.681×`** (`27.767.311 ÷ 42,22 = 657.681,45`);
   - comentário `1.192.196 > 1,056` → **`1.192.259 > 1,056`** (`50.337.190 ÷ 42,22 =
     1.192.259,36`).
   Os valores publicados na §5 continuam corretos: medidos sobre os dados **crus**.
4. **Achado 4 (MINOR — cobertura).** Dois testes novos no bloco patológico:
   - **fronteiras** (`>` estrito): `50×` convive · `1.000.000×` avisa;
   - **amplitude zero**: série plana contra série real → `ilegivel` (razão `Infinity`);
     duas planas → `convive`. Documenta um caminho antes sem decisão escrita.

### Comando e saída verde

```
$ cd sitio/app && NODE_ENV=development npm test

 Test Files  5 passed (5)
      Tests  42 passed (42)
   Duration  596ms
```

(39 → 42: +3 testes — razão exatamente 1, fronteiras, amplitude zero.)

### Restrições respeitadas

- `AMPLITUDE_LIMIT` (50) e `AMPLITUDE_LIMIT_ILEGIVEL` (1.000.000) **intocados**.
- `Math.max(...values)` **não** virou `reduce` (adiado de propósito).
- `sitio/docs/`, legado e dependências **não** tocados.
- `git add` só dos dois arquivos — sem `git add -A`. Working tree limpo.

Commit:

```
a17c1c8  fix(domain): contra nunca null havendo existentes; rotulos medidos e testes de fronteira/amplitude zero
         2 files changed, 42 insertions(+), 8 deletions(-)
```

**Estado: fatia 02 corrigida, suíte verde em `feat/camada-de-graficos`.**

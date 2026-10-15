# SDD ledger — plan: docs/plans/02-dominio-escalas.md

Spec: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` (§5, §10.7)
Repo: `sitio` · Branch: `feat/camada-de-graficos`

> **Nota de processo:** o pré-voo desta fatia foi feito no chat, mas eu **não escrevi este
> ledger na hora** — só descobri a falta ao tentar acrescentar a linha de dispatch. Fica
> registrado como falha de processo: o ledger é o mapa de recuperação pós-compactação, e um
> ledger escrito depois do fato vale menos.

## Pré-voo — scan de conflitos (2026-10-14)

| par | o que um produz × o outro consome | achado |
|---|---|---|
| T1 × T2 | T1 exporta `seriesSpan`/`amplitudeRatio`; T2 acrescenta `AMPLITUDE_LIMIT`/`comparabilidade` no MESMO arquivo | ok |
| T2 × T3 | T2 define o veredito com dois estados; T3 acrescenta `'ilegivel'` | **DEFEITO de sequência** — T3 estende o que T2 escreveu; ordem obrigatória T2 → T3. Ver R17 |
| T1 consigo | fixture `serie(id, min, max)` produz amplitude `max − min` | ok |
| T1 consigo | teste do par "patológico" travava `1.192.196` — que é o número da §5 medido sobre valores **crus**; com as amplitudes do anexo arredondadas a 2 casas dá **1.192.259** | **DEFEITO** — corrigido. Ver R6 |
| T2 consigo | teste "o insumo é a MAGNITUDE" com `homicidios` × `pib` → 1,068 | ok — é o que impede alguém de reintroduzir `unit.type` como critério |
| T3 consigo | o limiar do caso patológico vinha como "a medir" | **DEFEITO** — fechado por medição antes do dispatch. Ver R17 |
| 02 × 01 | consome o typedef `Series` (só lê `series.data`) | ok — não importa nada de `data/` |
| 02 × 05 | exporta `comparabilidade`, `AMPLITUDE_LIMIT` para o store `axes` | ok |
| 02 × 08 | o veredito alimenta a ficha da modal | ok |

## Rulings

- **R6 — os números de razão da §5 são sobre valores crus.** As fixtures do anexo têm
  amplitudes arredondadas a 2 casas; `50.337.190 ÷ 42,22 = 1.192.259,4`, não `1.192.196`.
  Ruling: os testes travam o valor que **as fixtures produzem** (1.192.259) e o plano diz por
  que diverge do publicado. Custo se errado: nenhum — o teste continua pegando regressão.
- **R17 — o limiar do caso patológico é 1.000.000×, e NÃO cai em faixa vazia.** Eu havia
  escrito no plano que o limiar devia ser "medido", supondo (como no corte de 50) que
  houvesse uma faixa vazia acima de 125. **Medi os 78 pares reais e a suposição é falsa:** a
  região 92.267–3.759.751 é densa, com 14 pares. Não existe limiar livre. Ruling: fixar em
  **1.000.000** (seis ordens de grandeza), o que marca **14 pares (18%)** como ilegíveis, e
  **declarar** que o número é convenção, não medição — como o teto de 10 cores da §1.
  **Rejeitado** cortar em 125 (topo da faixa vazia): marcaria **40 pares — mais da metade do
  site** — e um aviso duro que dispara em metade dos casos perde força, pelo mesmo motivo que
  a §5 já rejeita o aviso que pisca no zoom. Registrado na §5 da spec e na Tarefa 3 do
  plano. **Custo se errado:** entre 125× e 1.000.000× o app oferece normalizar/remover em vez
  de recusar — reversível com uma constante, e o número está escrito num só lugar.
- **R18 — a ordem T2 → T3 no mesmo arquivo é obrigatória.** A Tarefa 3 estende o veredito
  que a Tarefa 2 define (`'convive'|'avisa'` ganha `'ilegivel'`). Implementar a T3 antes da
  T2 daria um arquivo que não compila. É o motivo de as três irem num dispatch só, sequencial.
- **R19 — o teste de `'avisa'` não pode usar um par patológico.** Consequência direta do R17
  que eu **não propaguei**: o teste de `'avisa'` da Tarefa 2 usava
  `populacao-total-anual × selic-meta-acum-12m`, que mede **1.192.259×**. Ao fixar o limiar
  patológico em 1.000.000, esse par passou para o outro lado e o veredito virou `'ilegivel'`
  — o teste ficou falso por construção, e só quebra depois que a Tarefa 3 entra (porque antes
  dela a função só conhece dois estados). O implementador **parou e reportou** em vez de
  inventar remédio, o que é exatamente o comportamento certo. Ruling: **trocar a fixture**, não
  mexer no limiar — `mvgr-nominal` (222.000) × `selic-meta` (42,22) = **5.258×**, dentro da
  faixa de aviso. O par patológico continua tendo os seus próprios testes na Tarefa 3.
  **Rejeitado:** subir `AMPLITUDE_LIMIT_ILEGIVEL` acima de 1.192.259 — contraria a medição do
  R17 e a §5 já commitada. **Custo se errado:** nenhum no código; a lição de processo é que
  **mudar uma constante de decisão exige reler os testes que dependiam da decisão anterior** —
  eu mudei o limiar e não reli o teste que o usava.

## Progresso

- `Task 1-3: dispatched` (base `2b99af8`, um dispatch para os três passos — é o MESMO arquivo,
  `src/domain/scales.js`; agente `sa-0-135778c1`).
- `Task 1-2: complete (commits a4f5c0f, 85e9ec5)` — TDD real, RED e GREEN capturados.
- `Task 3: NEEDS_CONTEXT devolvido pelo implementador` — ele encontrou uma contradição real e
  **parou em vez de inventar remédio**. Ver R19.
- `Task 3: resolução R19 aplicada no plano + brief 2 corrigido (commit cbc6ed4); conclusão
  re-dispatched (agente `sa-0-fe882d5d`).`
- `Task 1-3: complete (commits a4f5c0f, 85e9ec5, 0ab5409)` — **39 testes verdes em 5
  arquivos**. Domínio puro confirmado (`grep svelte|fetch|window|document` → vazio). Os dois
  cortes em constantes nomeadas (`scales.js:37`, `scales.js:44`), veredito de três estados
  (`scales.js:67-69`).
- `Task 1-3: review dispatched` (pacote `review-2b99af8..0ab5409.diff`, 4 commits — 3 do
  implementador + 1 do controlador em `docs/plans/`; agente `sa-0-ae687b1d`).
- `Task 1-3: review returned` — **Spec ✅ · Task quality: Approved.** 0 Critical, 2 Important,
  5 Minor.
- `Task 1-3: minor (deferred):` `Math.max(...values)` espalha o array inteiro em
  `scales.js:16` (estoura a stack em série muito longa — hipotético, as séries têm centenas de
  pontos; `reduce` resolve de graça).
- `Task 1-3: fix round 1/5 dispatched` — achados: (1) Important do revisor (contrato de
  `contra`, R20); (2) Important `plan-mandated` (critério de aceite obsoleto — só texto, já
  corrigido pelo controlador, R21); (3) Minors **dobrados** pelo controlador (rótulos medidos
  + testes de fronteira e de amplitude zero). Agente `sa-0-1e6944fa`.
- `Task 1-3: fix round 1/5 (4 addressed, 0 open; commit a17c1c8)` — `comparabilidade` com a
  semente corrigida (a primeira existente sempre entra), rótulos medidos e os dois testes
  novos. **42 testes verdes** (39 → 42), árvore limpa. `Math.max(...values)` mantido, como
  mandado.
- `Task 1-3: re-review dispatched` (escopada: `review-0ab5409..a17c1c8.diff`, 2 commits — 1 do
  implementador + 1 do controlador em `docs/plans/`; agente `sa-0-ceccc900`).

## Rulings — acrescentados após a revisão

- **R20 — `contra` só é `null` quando não há existentes.** O revisor pegou uma violação real de
  contrato: semeando o acumulador com `ratio: 1` e comparando com `>`, duas séries de amplitude
  idêntica (razão exatamente 1) produziam `contra: null` — e o typedef promete `null` só para
  "sem existentes". Quem consome é a fatia 08. Ruling: a **primeira** existente sempre entra no
  acumulador (`if (contra === null || ratio > piorRatio)`), mais um teste que fixa a razão 1.
  **Custo se errado:** a ficha da modal diria "nada a comparar" numa combinação que tem com o
  que comparar — erro de informação, não de crash.
- **R21 — dobrei três Minors na rodada de correção, e isso é exceção deliberada.** A skill diz
  que Minor não entra no loop. Dobrei dois deles por um motivo específico: os **rótulos
  numéricos errados** (o teste dizia `20.921.102×` onde a fixture produz `20.886.801`) violam
  uma convenção que o `AGENTS.md` torna **vinculante** — *número medido, não estimado* — então
  não são polimento, são conformidade. E os **testes de fronteira e de amplitude zero** fecham
  dois caminhos que estavam sem decisão escrita (o `>` estrito, e a razão indefinida de uma
  série plana). Dobrar custou uma linha de dispatch; um round separado custaria uma revisão.
  **Adiei** o `Math.max(...values)` → `reduce`, que é hardening hipotético e não convenção.
  **Custo se errado:** uma rodada de correção maior do que o mínimo — nenhum risco de escopo,
  porque tudo é edição nos dois mesmos arquivos de teste.

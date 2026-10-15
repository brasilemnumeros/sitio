# SDD ledger — plan: docs/plans/01-contrato-de-dados.md

Spec: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` (§6, §8 regra 5, §9.3, §10.7)
Repo: `sitio` · Branch: `feat/camada-de-graficos`

## Pré-voo — scan de conflitos (2026-10-14)

| par | o que um produz × o outro consome | achado |
|---|---|---|
| T1 × T2 | T1 (`validate.js`) exporta `validateSeries` e `SchemaError`; T2 (`series.js`) importa os dois | ok |
| T1 × T3 | T1 exporta `validateUnit` e `SchemaError`; T3 (`catalog.js`) importa os dois | ok |
| T1 consigo | o teste importa `{ SchemaError, validateSeries, validateUnit }` — os três são exportados pelo código do passo 3 | ok |
| T1 consigo | mensagem esperada `/o app pediu "ipca-acum-12m"/` × implementação (`mas o app pediu "${expectedId}"`) | ok |
| T1 consigo | teste "descarta a chave de convivência `rate`" × `validateSeries` devolvendo só `{date, value}` | ok |
| T2 consigo | o `fetchImpl` falso devolve `{ok, status, json}` — exatamente o que `fetchAndValidate` lê | ok |
| T2 consigo | teste "não envenena o cache" (500 → rejeita; 2ª chamada tem de buscar de novo) × `cache.delete(url)` no `catch` | ok |
| T3 consigo | `validateCatalog` devolve `unit: null` quando ausente; o teste de catálogo bem-formado usa fixture **com** `unit` | ok |
| T3 consigo | o teste importa `readFileSync` e `fileURLToPath` — ambos usados; não importa `join` nem usa | ok |
| T3 consigo | caminho do catálogo real: `new URL('../../../indicators.json', import.meta.url)` a partir de `sitio/app/src/data/` → `sitio/indicators.json` | ok — **corrigido no plano** (era `../../../../`, apontava para a raiz) |
| 01 × 00 | consome `SCHEMA_VERSION` de `src/domain/schema.js` | ok |
| 01 × 02/03/05 | exporta o typedef `Series` e `validateSeries`/`SchemaError` | ok |
| 01 × §6 (spec) | a spec atribui unidade/fonte ao `dados/`; o catálogo **não** pode exigi-las | ok — corrigido: `unit` opcional, com teste dedicado |
| 01 × spec real | `expect(c.indicators).toHaveLength(13)` e 7 grupos contra o `indicators.json` real | ok — conferido por medição nesta sessão |

Nenhum conflito aberto. Nenhum ruling necessário neste pré-voo.

## Progresso

- `Task 1-3: dispatched` (base `5de10ff`, um dispatch para os três módulos — ruling R14;
  agente `sa-0-4daaacd1`). Briefs regenerados depois das correções de plano (o teste de
  `unit` ausente e o caminho do `indicators.json` já entram neles).
- `Task 1-3: report received — DONE_WITH_CONCERNS` (commits `22d781d`, `ea51685`, `3b6e8a7`;
  23 testes verdes em 4 arquivos). O implementador reportou um **desvio** e o controlador
  **verificou o fato**: ver R16.
- `Task 1-3: review dispatched` (pacote `review-911138a..3b6e8a7.diff`, 3 commits).
- `Task 1-3: review returned` — **Spec ✅ · Task quality: Approved.** 0 Critical, 2 Important,
  5 Minor. O revisor **julgou o desvio por mérito e o aceitou**, confirmando contra o
  arquivo real que T1 e T3 se contradizem — e que a alternativa (dois validadores) seria
  pior. O Minor dele sobre `decimals` default 0 no caminho canônico é exatamente o que o
  R16 elimina.
  - ⚠️ item do revisor ("não dá para verificar a evidência RED → GREEN do diff"): **confirmado
    como lacuna real** → entra na rodada de correção, reformulado como prova de que os testes
    **não são vazios** (rodar com a implementação fora e capturar a falha). Provar a ordem
    retroativamente é impossível; provar que os testes falham sem o código, não.
- `Task 1-3: minor (deferred):` `validateUnit` descarta campos extra da unidade (`locale:
  'pt-BR'`) · a chave do cache é só a URL (`expectedId` não entra na chave nem é rechecado
  no hit) · `ISO_DATE` aceita datas impossíveis como `1999-13-45` (regex veio do brief) ·
  boilerplate de rede duplicado entre `series.js` e `catalog.js`.
- `Task 1-3: fix round 1/5 dispatched` — achados: (1) **R16 emendado** (reverter a relaxação
  do `validateUnit`; `validateCatalog` passa a PRESERVAR o registro); (2) Important do
  revisor (`description`/`yAxisMax` descartados em silêncio — resolvido pelo mesmo conserto);
  (3) Important do revisor (evidência de que os testes falham sem a implementação).
  Agente `sa-0-b599fcaa`.
- `Task 1-3: fix round 1/5 (3 addressed, 0 open; commit 2efd1e8)` — `validateUnit` estrito de
  novo (`validate.js:48`), `catalog.js` não importa mais `validateUnit` e preserva o registro
  (`catalog.js:49`, `...ind`); 24 testes verdes em 4 arquivos. As três provas de falha foram
  capturadas movendo cada módulo para fora e rodando o teste correspondente.
- `Task 1-3: re-review dispatched` (escopada: `review-bd61036..2efd1e8.diff`, 1 commit;
  agente `sa-0-eec6bb6a`).
- `Spec §10.1 corrigida` (commit `docs/specs`) — o desvio da R13 estava registrado só no
  README dos planos, e a convenção do projeto exige que a decisão esteja **no detalhe
  canônico**. A §10.1 passa a dizer que a saída é só `app.js`, com a medição e a alternativa
  rejeitada escritas.

## Rulings

- **R16 — o catálogo não valida `unit`; o `validateUnit` fica estrito.** O implementador
  reportou que os briefs T1 e T3 se contradizem e **está certo** — conferido no arquivo
  real: `caged-total-mensal` e `populacao-total-anual` trazem `{type:'number', symbol:''}`
  **sem `decimals`**, então o `validateUnit` estrito da T1 reprova o próprio
  `indicators.json` que a T3 exige que valide. **É defeito do plano, não do implementador.**
  Ele relaxou o `validateUnit` (aceitar `symbol` vazio, `decimals` ausente → 0). Ruling:
  **reverter a relaxação** e, em vez disso, tirar a validação de `unit` do caminho do
  catálogo — porque `validateUnit` também é usado pelo `validateSeries`, que é o caminho
  **canônico**, e ali um `percentage` sem símbolo seria defeito de verdade. Relaxar o
  validador para acomodar dado de transição enfraquece o contrato que fica. A §6 já diz que
  unidade **não** pertence ao `indicators.json` (ela vive em `dados/`), então o catálogo
  simplesmente não deve olhar para esse campo. **Custo se errado:** o `app` perde a validação
  de unidade no registro durante a transição — irrelevante, porque nenhum consumidor lê
  `unit` do catálogo (a fatia 05 já tira a unidade da **série carregada**) e o campo sai do
  arquivo na fatia 11.

- **R14 — as três tarefas da fatia 01 vão num dispatch só.** T1 (`validate.js`), T2
  (`series.js`) e T3 (`catalog.js`) são três módulos da **mesma camada**, criados em
  sequência, com o código exato já prescrito no plano (é transcrição + teste), e uma
  **única superfície de revisão** (`src/data/`). Três dispatches dariam três revisões do
  mesmo diff. Ruling: um dispatch, uma revisão. **Custo se errado:** um diff de revisão
  maior que o ideal num diretório só — nenhum risco de conflito, já que nenhum outro
  processo escreve ali.
- **R15 — o `bundle exec jekyll build` não é critério de aceite nesta máquina.** Descoberto
  ao custo de 900s de um subagente na fatia 00: o render não roda (bundler 2.7.1 ausente no
  Ruby 2.6 do sistema; `em-websocket` ausente no jekyll do `~/.gem`), por causas
  **pré-existentes e alheias ao projeto**. Ruling: onde o plano exigir verificação de
  publicação, a prova é carregar o **`Jekyll::EntryFilter` real** e conferir caminho a
  caminho. A fatia 10 foi corrigida nesse ponto (passo 4 e critério de aceite). **Custo se
  errado:** uma fatia futura repete os 15 minutos perdidos — por isso o aviso está no
  próprio plano, não só aqui.


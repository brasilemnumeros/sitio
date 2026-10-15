# SDD ledger — plan: docs/plans/03-dominio-mandatos.md

Spec: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` (§4, §7, §7.3.5, §7.3.6, §9.4)
Repo: `sitio` (+ `dados` para os arquivos de governo) · Branch: `feat/camada-de-graficos`

## Pré-voo — scan de conflitos (2026-10-14)

| par | o que um produz × o outro consome | achado |
|---|---|---|
| T1 × T2 | T1 cria `dados/governos/federal.json`; T2 não o lê (só o schema) | ok |
| T2 × T3 | T2 exporta `deltaNoMandato`/`COBERTURA`/`pontosEsperados`; T3 importa os três | ok |
| T3 × T1 | T3 lê `dados/governos/federal.json` (T1) e `dados/*/*.json` | ok — caminho `../../../../` a partir de `sitio/app/src/domain/` = raiz do projeto |
| T2 consigo | fixture `mensal()` devolvia `{id, data}` sem `granularity`, mas `deltaNoMandato` passou a precisar dela | **DEFEITO** — corrigido: fixtures ganham `granularity`. Ver R5 |
| T2 consigo | teste "cobertura completa" espera `CALCULAVEL` com 48 pontos no Lula I (esperados 48) | ok |
| T2 consigo | teste "PARCIAL quando a série começa depois" → 34 pontos vs 48 esperados | ok |
| T3 consigo | `serieReal()` devolvia `{id, data}` sem `granularity` | **DEFEITO** — corrigido (mapa `GRANULARIDADE`). Ver R5 |
| T3 consigo | teste "só a MVG-R é PARCIAL num mandato fechado" | **DEFEITO** — a régua correta marca 15 células, não 2. Substituído pelo teste das 15. Ver R5 |
| T3 × dados reais | a matriz `ESPERADO` transcrita do anexo | ok — recomputada sobre os dados reais nesta sessão, bate célula a célula |
| 03 × 01 | consome o typedef `Series` (que agora tem `granularity`) | ok |
| 03 × 09 | exporta `deltaNoMandato`/`formatarPeriodo`/`COBERTURA` para a matriz | ok |
| 03 × 11 | a fatia 11 corrige os meses duplicados da MVG-R, o que muda 35 → 34 pontos | ⚠️ **dependência declarada** — este plano é executado ANTES da fatia 11, então o teste das 15 vale para os dados como estão hoje. Se a fatia 11 vier primeiro, reexecutar a medição. |

## Rulings

- **R5 — a régua da cobertura é por CONTAGEM, não por data.** O plano original marcava
  PARCIAL comparando as datas cruas do primeiro/último ponto com as do mandato. Medido
  sobre os 13 arquivos reais: isso marca **49 das 104 células**, porque todo ponto mensal
  cai no dia 1º enquanto o mandato começa no meio do mês (Temer, 12/05/2016). Ruling:
  PARCIAL quando `pontos < pontosEsperados(granularity, mandato)`, com o esperado contando
  os períodos da granularidade no intervalo do mandato. Essa régua reproduz **exatamente as
  15 células** que a §7.3 publica ("15 células ficam abaixo do esperado para a própria
  granularidade da série") — é a definição que a própria spec usa. **Custo se errado:** a
  matriz marca 13 células como parciais nos mandatos fechados (10 delas por causa dos 12
  dias de Temer). É verboso, mas a §7.3.5 escolheu a verbosidade de propósito, e o período
  real vai dentro da célula.
- **R6 — os números de razão da §5 são sobre valores crus.** As fixtures do anexo têm
  amplitudes arredondadas a 2 casas; `50.337.190 ÷ 42,22 = 1.192.259,4`, não `1.192.196`.
  Ruling: os testes travam o valor que **as fixtures produzem** (1.192.259) e o plano diz
  por que diverge do publicado. Custo se errado: nenhum — o teste continua pegando
  regressão.
- **R22 — FHC I entra no modelo de governos.** O plano deixava em aberto se o arquivo começava
  em FHC I (1995) ou FHC II (1999). Ruling: **FHC I entra** — o modelo é **fato** (quem governou
  quando), e começar em FHC II fingiria que FHC I não existiu num produto cuja promessa é
  identificar os governos ao longo da série. As séries o cobrem parcialmente (`caged`, `pib`,
  `populacao`, `homicidios` desde 1995-01; `selic-over`, `ipca` e `proporcao-homicidios` desde
  1995-12). **Consequência medida:** a matriz vai de **104 para 117 células** (13 × 9). O teste
  da Tarefa 3 **filtra FHC I** para continuar afirmando exatamente os números publicados na
  §7.3 — a medição de 8 colunas continua válida como medição. Registrado na §7.3/anexo da spec
  e na Tarefa 1 do plano. **Rejeitado:** começar em FHC II só para não mexer nas contagens —
  otimiza o documento à custa do dado. **Custo se errado:** uma coluna a mais na matriz; a
  spec diz explicitamente que a medição publicada é de 8 colunas.
- **R23 — o repo `dados` ganha a mesma branch.** A fatia escreve em **dois repos**: os arquivos
  de governo nascem em `dados/` (é fato, não apresentação — §7.1) e o código em `sitio/`.
  Ruling: criar `feat/camada-de-graficos` também no `dados` (feito), para nenhum dos dois
  receber commit em `main` sem consentimento. **Custo se errado:** dois branches para lembrar de
  integrar em vez de um — nenhum risco de publicação.

## Progresso

- `Task 1-3: dispatched` (bases: `sitio` = `00bf71c`, `dados` = `1c52a06`; agente
  `sa-0-d240d7c2`). A Tarefa 1 commita no repo **`dados`**; as Tarefas 2 e 3, no **`sitio`**.
- `Task 1-3: complete (dados ee76a83 · sitio 149c60a, 964de4c)` — **57 testes verdes em 7
  arquivos**, árvore limpa nos dois repos. O implementador **recalculou a matriz em Python**
  de forma independente sobre os 13 JSON reais e reproduziu **célula a célula**: 104 células,
  4 sem cobertura, 1 ponto único, 99 com Δ, e as **15 "abaixo do esperado"** (10 do Temer).
  Confirmou também o MVG-R no Lula I = 35 pontos, e que os meses duplicados (2005-10, 2015-10)
  são dado real — registrados, não "consertados" (fatia 11).
- `Task 1-3: review dispatched` — **dois** pacotes, porque a fatia toca dois repos:
  `review-00bf71c..964de4c.diff` (sitio, 2 commits) e
  `../dados/.superpowers/sdd/03-dominio-mandatos/review-1c52a06..ee76a83.diff` (dados, 1
  commit). Agente `sa-0-a19c7cb9`.
- **Nota:** o repo `dados` agora tem um `.superpowers/sdd/` próprio (auto-ignorado por um
  `.gitignore` com `*`). Confirmei que `git status` do `dados` segue limpo.
- `Task 1-3: review returned` — **Spec ✅ · Task quality: Approved · 0 Critical · 0 Important ·
  6 Minor.** O revisor **reproduziu a matriz inteira de forma independente** em Python sobre os
  13 JSON reais + `federal.json` e confirmou célula a célula: 104 células, 4 sem cobertura, 1
  ponto único, 99 com Δ (76 calculável + 23 parcial), e as **15 "abaixo do esperado"** com 10 do
  Temer. Confirmou também `grep` → zero cor nos arquivos de governo, zero `GOVERNMENT_PERIODS`
  em `app/src/`, e que o teste **computa** a matriz em vez de repetir a constante.
  - ⚠️ item do revisor ("não reexecutei a suíte"): **resolvido pelo controlador** — a suíte foi
    rodada nesta sessão (57 testes / 7 arquivos, verde). Não é lacuna.
- `Task 1-3: minor (deferred):` o teste de medição depende do layout com `dados/` como repo-irmão
  (quebraria se o app virasse repo próprio — mas o CI não roda `npm test`) · o mapa
  `GRANULARIDADE` local duplica o conhecimento de cadência das séries · `motivoDaAusencia` assume
  série contígua (teórico) · Temer tem `tipo: "sucessor"` e o interinato de maio–agosto não é
  capturado por um `tipo` único · FHC I não é exercitado por nenhum teste (o filtro o exclui).
- `Task 1-3: complete (dados ee76a83 · sitio 149c60a, 964de4c, review clean)` — **primeira fatia
  sem achado Critical nem Important.** Rulings: R5, R6, R22, R23.




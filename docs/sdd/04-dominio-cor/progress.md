# SDD ledger — plan: docs/plans/04-dominio-cor.md

Spec: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` (§1, §10.7)
Repo: `sitio` · Branch: `feat/camada-de-graficos`

## Pré-voo — scan de conflitos (2026-10-14)

| par | o que um produz × o outro consome | achado |
|---|---|---|
| T1 × T2 | T1 exporta `rgbParaOKLab`; T2 usa `paraLinear`/`paraSRGB` internos | ok — `paraLinear`/`paraSRGB` nascem na T1 e a T2 os reusa no mesmo arquivo |
| T2 × T3 | T2 exporta `VISOES`/`simularDaltonismo`; T3 usa os dois em `separacaoMinima` | ok |
| T3 × T4 | T3 exporta `LIMIAR_ENVELOPE`; T4 define `LIMIAR_COLISAO = LIMIAR_ENVELOPE` | ok — ordem obrigatória T3→T4 |
| T1 consigo | round-trip exato nas 6 cores | **medido**: OK nas 6 (inclui `#0e1117` e `#ffffff`) |
| T2 consigo | "preserva o cinza" — depende de cada linha das matrizes somar 1 | **medido**: somas = 1,000000 nas três matrizes → o cinza é preservado por construção |
| T2 consigo | "deuteranopia colapsa o par azul/roxo": `deut < normal/3` | **medido**: normal 0,1114 → deut 0,0067 (razão 0,06) → passa com folga |
| T2 consigo | as matrizes de Machado et al. em RGB **linear** | **medido**: reproduzem o 0,006 do par citado na §1 (0,0067) — matriz certa |
| T3 consigo | piso `LIMIAR_MEDIDO = 0.02` contra o envelope real | **DEFEITO** — o global medido é 0,0950; um piso de 0,02 não pega regressão nenhuma. Ver R7 |
| T4 consigo | `LIMIAR_COLISAO = 0.05` e os testes de colisão | **DEFEITO** — o par mais apertado da paleta está a 0,1112, então 0,05 **nunca dispara**. Ver R8 |
| T4 consigo | teste "avisa" usando `#9d99ed` como cor próxima | **DEFEITO** — dE(#6351ca, #9d99ed) = **0,2081**, ou seja, não é próxima. Ver R8 |
| 04 × 05 | exporta `PALETA_PADRAO` (usada pelas cores padrão das séries) | ok |
| 04 × 06 | `PALETA_PADRAO` nas cores das linhas | ok |
| 04 × 08 | `avisoDeColisao` no seletor de cor do chip | ok |

## Rulings

- **R7 — o piso do envelope é 0,09, medido, não 0,02 chutado.** O plano trazia
  `LIMIAR_MEDIDO = 0.02` como "piso conservador". Medido: a paleta da §1 tem mínima de
  **0,0950** no pior caso entre as quatro visões. Um piso de 0,02 deixaria a paleta
  degradar até 5× antes de o teste reclamar — inútil como rede. Ruling: `LIMIAR_ENVELOPE
  = 0.09`, logo abaixo do pior caso medido, e o teste ainda afirma
  `separacaoGlobal ≈ 0,095`. **Custo se errado:** um ajuste manual que derrube a separação
  para 0,09–0,095 passaria; abaixo disso, o teste pega.
- **R8 — o limiar do aviso de colisão É o envelope da paleta.** O plano trazia
  `LIMIAR_COLISAO = 0.05` e um teste que usava `#9d99ed` como "cor próxima" de `#6351ca` —
  medido, elas distam **0,2081**, quatro vezes o limiar. O teste falharia e o limiar nunca
  dispararia para cores da própria paleta (o par mais apertado está a 0,1112). Ruling:
  `LIMIAR_COLISAO = LIMIAR_ENVELOPE` (0,09) — a régua do que o app avisa passa a ser o
  envelope que ele próprio aceita. Testes refeitos com pares medidos (`#6a58c8` a 0,0213
  dispara; `#00fddc`/`#d25200` a 0,4275 não). **Custo se errado:** o aviso fica mais
  sensível que o necessário — informa a mais, nunca bloqueia (§1).
- **R9 — a normalização da §1 está confirmada.** A §1 publicava 0,095 sem dizer a unidade.
  Medido nesta sessão: ΔE_ok = **distância euclidiana em OKLab**, e a implementação da
  tarefa 1 reproduz **0,0950** exatamente. O plano foi reescrito de "a medir" para "medido",
  com a tabela por visão. Custo se errado: nenhum — se a medição no app divergir dos
  números registrados, o passo 4 da tarefa 3 manda parar e reconciliar.

## Progresso

- `Task 1-4: dispatched` (base `05b709b`, um dispatch para os quatro passos — é o MESMO
  arquivo, `src/domain/color.js`; agente `sa-0-d47a1a5e`).
- `Task 1-4: complete (commit 3cb3e33)` — **76 testes verdes em 8 arquivos**. O envelope
  **reproduziu a §1 exatamente**: normal 0,1112 · protanopia 0,0953 · deuteranopia **0,0950** ·
  tritanopia 0,1061 · global **0,0950**. Sem afrouxar teste.
- **Verificação por sabotagem (feita pelo controlador):** trocar `#00fddc` por `#3ac9e0` em
  `PALETA_PADRAO` faz **2 testes falharem** — o teste de não-regressão do envelope morde de
  verdade, que era o critério de aceite mais importante da fatia. Arquivo restaurado; árvore
  limpa.
- `Task 1-4: review dispatched` (pacote `review-05b709b..3cb3e33.diff`, 1 commit; agente
  `sa-0-955c14b2`).
- `Task 1-4: review returned` — **Spec ✅ · Task quality: Approved · 0 Critical · 1 Important ·
  3 Minor.** O revisor **executou `color.js` de verdade** e conferiu a paleta cor a cor contra
  a §1, as matrizes de Machado em RGB linear (somou as linhas = 1,000, logo o cinza é
  preservado), e que não existe rota que bloqueie a cor escolhida. Julgou as três observações
  do implementador por mérito e **deu razão às três**.
- **R25 — o aviso de colisão media na visão errada.** `avisoDeColisao` usava `deltaEOK` em
  **visão normal**, mas comparava contra `LIMIAR_COLISAO = LIMIAR_ENVELOPE = 0,09`, que é o
  **pior caso entre as quatro visões**. Medido pelo controlador: o par que a **§1 cita** como o
  colapso do daltonismo (`#309aff` × `#9581ff`) dista **0,1114** em visão normal — acima do
  limiar, então a régua antiga **não avisava** — e **0,0067** sob deuteranopia. O aviso ficava
  cego exatamente no risco que o envelope existe para pegar. Ruling: medir o **pior caso**
  (`separacaoGlobal([cor, outra])`). **Custo se errado:** o aviso fica mais sensível (mais
  avisos em cores escolhidas à mão) — informa a mais, nunca bloqueia (§1).
- `Task 1-4: minor (deferred):` tolerância do teste do envelope (`toBeCloseTo(0.095, 2)` aceita
  0,090–0,100) — é o desenho pedido pelo brief ("não igualdade com 0,095"), pega quebras
  grossas, não deriva fina.
- `Task 1-4: fix round 1/5 dispatched` — achados: (1) **R25** (o Important do revisor); (2) e
  (3) dois Minors **dobrados** (prosa de `oklabParaRGB` e comentário da paleta ingênua — ambos
  do mesmo tipo: documentação que não descreve o código). Agente `sa-0-4775bbf0`.
- `Task 1-4: fix round 1 INTERROMPIDO por timeout` (62s, agente `sa-0-4775bbf0`) — mas o
  implementador **fez quase tudo antes de cair**: `color.js:160` já tem
  `separacaoGlobal([cor, outra])`, a prosa de `oklabParaRGB` está corrigida (`color.js:46`), os
  testes novos estão no lugar, e a suíte passa com **77 testes**. Nada commitado; faltava só um
  comentário. Conclusão mínima re-dispatched (agente `sa-0-d719a7ea`) — instruída a **não
  refazer nada**, só trocar o comentário da paleta ingênua (`color.test.js:116`) e commitar.
  - **Terceira interrupção por timeout da sessão.** Padrão a registrar: dispatches longos com
    muitas instruções estão sendo cortados; os que sobrevivem são os curtos e de escopo único.
- `Task 1-4: fix round 1/5 COMPLETA (commit 5a5a769, 77 testes verdes)` — a conclusão mínima
  funcionou em 43s depois de a execução completa cair em 62s. **Confirmação direta, executando
  o código:** `avisoDeColisao('#309aff', ['#9581ff'])` → `{colide: true, distancia: 0.00666,
  contra: 0}` — exatamente o previsto (0,0067), onde a régua antiga devolvia `colide: false`.
- `Task 1-4: re-review dispatched` (escopada: `review-2450a5f..5a5a769.diff`, 1 commit; agente
  `sa-0-da1201f8`).




- **Desvios reportados pelo implementador, para o revisor julgar:** (a) fez **um** commit em vez
  dos quatro que os briefs sugeriam (o alvo é um arquivo só); (b) **não** editou a spec, porque
  o brief só manda registrar a data **em caso de divergência** — e não houve; (c) a paleta
  ingênua do teste mede global 0,0216, não o 0,0061 que a §1 cita para outra construção.


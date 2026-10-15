# Fatia 05 — stores

Ledger do controlador. O implementador escreve o **relatório** (`task-N-report.md`); **este
arquivo é do controlador** — não escrever aqui.

- Plano: `docs/plans/05-stores.md` · Briefs: `task-1-brief.md` (catálogo), `task-2-brief.md`
  (séries), `task-3-brief.md` (mandato, eixos, viewport).
- Branch: `feat/camada-de-graficos` (repo `sitio/`). Base da fatia: `38af190`.
- Estado antes de começar: 8 arquivos de teste verdes · 77 testes.

## Pré-voo (o que o controlador conferiu ANTES de disparar)

Duas correções no plano, ambas por medição:

- **R26 — a URL é guardada, não adivinhada.** O plano fazia `tentarNovamente` reconstruir a URL
  a partir do id: `https://brasilemnumeros.github.io/dados/${item.id}.json`. **Errado**: o
  caminho publicado inclui a **família** (`dados/selic/selic-meta-acum-12m.json`), então a URL
  adivinhada daria 404 — numa ação cujo propósito é justamente **recuperar de uma falha**. O
  item passa a guardar `url: entry.datafile`, e o teste novo **espia o argumento do `fetchImpl`**
  (o teste antigo não pegava: o falso `fetchImpl` ignorava o argumento e devolvia sucesso).
- **R27 — o store do mandato não lê o store das séries.** O plano expunha `celulaDe(seriesId)`,
  que obrigaria `mandate.js` a importar `series.js`. Dois stores acoplados. O Δ é
  `deltaNoMandato(series, mandato)`, composto pelo componente, que já lê os dois.
- **Assinaturas conferidas contra o código das fatias 02/03** (não são suposição):
  `comparabilidade(novaSerie, seriesExistentes) -> {veredito, ratio, contra}` (`scales.js:60`);
  `ordenarMandatos` (`mandates.js:101`, `emCurso` por último); `deltaNoMandato` (`mandates.js:56`).
- **Tarefa 3 reescrita**: estava sub-especificada (só `it('...')` com corpo `...`). Agora traz os
  três arquivos de teste e os três stores com código completo.

## ✅ FATIA 05 FECHADA — 2026-10-14

**Entregue:** `stores/catalog.js`, `stores/series.js`, `stores/mandate.js`, `stores/axes.js`,
`stores/viewport.js` + 5 arquivos de teste. **103 testes verdes em 13 arquivos.**
17 commits entre `38af190` e o fecho.

**Placar das revisões:** 3 tarefas revisadas → **3 Approved**, 0 Critical, 2 Important e 7 Minor
achados; todos os Important corrigidos e os Minor dobrados ou deferidos com motivo.
**7 rodadas de subagente** (3 implementações, 3 revisões/re-revisões, 2 correções) + 1 correção
de causa feita pelo controlador.

**O que esta fatia ensinou (o mais valioso da sessão):** **nove defeitos foram meus**, e cada um
foi pego por alguém que não era eu — pré-voo, revisor ou implementador. Os quatro de teste
aparecem no `AGENTS.md` (Pitfalls do app); os de plano estão listados acima. Nenhum deles teria
aparecido se eu tivesse "seguido direto, porque está óbvio".

**Rulings desta fatia:** R26 (a url é guardada, não adivinhada) · R27 (o store do mandato não lê o
das séries) · R28 (a unidade vem da série nos dois caminhos) · e a causa `globals: true`.


- ⚠️ **`AGENTS.md` desatualizado e BLOQUEADO.** A tabela "Documentos em vigor" ainda diz
  "nenhuma fatia foi implementada" — falso desde a fatia 00. A tentativa de patch foi
  **BLOCKED duas vezes** (o prompt de aprovação de arquivo de instrução expirou sem resposta).
  **Não repetir sem aprovação explícita do usuário.** O texto pronto está no fim deste arquivo.
  É a única coisa que faz uma sessão nova achar que o trabalho não começou.

### Texto pronto para o `AGENTS.md` (aplicar quando houver aprovação)

Trocar a tabela "Documentos em vigor" e os dois parágrafos seguintes por: tabela com estado
real (spec **em vigor**, §12.2 fechada, §12.1 com proposta pendente; planos **em execução**;
nova linha para os `progress.md`), e o parágrafo de estado com: **fatias 00–05 fechadas, 06–11
pendentes, 92 testes, R1–R28**, e o portão `CONCERNS` com a **06 desbloqueada** (medição feita)
e a **08 ainda bloqueada** na tarefa 4.

Também vale acrescentar aos **Pitfalls**:
- O app em `sitio/app/` exige `NODE_ENV=development` em **todo** comando npm desta máquina
  (há `NODE_ENV=production` + `omit=dev` no ambiente), senão o vitest não é encontrado.
- **Estado de módulo vaza entre testes.** `loadSeries` (`src/data/series.js`) guarda um `Map`
  por URL; todo arquivo de teste que o usa precisa de `clearSeriesCache()` no `beforeEach`.
  Sem isso o teste passa (ou falha) **pelo motivo errado** — já aconteceu uma vez.
- **Um teste que falha não prova que ele falha onde você acha.** Conferir **em que linha** o
  RED acontece; um RED na primeira asserção pode significar que o caminho sob teste nem foi
  exercido.

## Progresso

- `Task 1-3: complete` (commit `3c72dfe`) — **103 testes verdes em 13 arquivos**. As três stores
  saíram verbatim do brief; o implementador mudou **só as fixtures** e reportou por quê.
- 🔴 **Dois defeitos no MEU brief da T3** — os dois já confirmados por leitura direta:
  - **A forma canônica é `data`, não `pontos`.** Escrevi `pontos: [...]` nas fixtures do
    `axes.test.js`. `scales.js:13` lê `series.data`, então o RED aparecia como **TypeError**, não
    como falha de asserção — exatamente o "RED no lugar errado" que o próprio brief alertava.
  - **Fixtures de um ponto só não produzem veredito.** `scales.js:15` faz
    `if (values.length < 2) return 0`; com um ponto a amplitude é 0 e nenhum par dispara.
  - O implementador corrigiu **só as fixtures** (`pontos`→`data`, dois pontos por série),
    preservando o intent — foi a decisão certa.
- 🔴 **A CAUSA, corrigida pelo controlador (commit `fe01801`):** os briefs escrevem `it`/`expect`/
  `vi` nus, mas o `vite.config.js` **não** tinha `globals: true` — **segunda vez na mesma fatia**
  (o `vi` da tarefa 2 foi igual). Em vez de confiar em lembrar, liguei **`globals: true`** no
  vitest, com o comentário explicando por quê. Os 13 arquivos existentes continuam válidos
  (imports explícitos seguem funcionando). **Provado:** arquivo temporário com `it`/`expect` nus
  passa agora; temporário removido.
- O plano da T3 foi corrigido junto (`docs/plans/05-stores.md`), para a próxima geração de brief
  sair certa.
- `Task 1-3: review returned` — **Spec ✅ · Approved · 0 Critical · 0 Important · 3 Minor.** O
  revisor aceitou a divergência declarada com o raciocínio certo (as fixtures antigas davam
  `TypeError` e nunca exercitavam a atribuição de eixo) e confirmou que as três stores estão
  **byte a byte** iguais ao brief. Notou que o encapsulamento é **por construção**, não por
  convenção: como os stores não exportam o `writable`, é estruturalmente impossível chamar
  `.set`/`.update` de fora.
- **Os 3 Minor, dobrados** (decisão do controlador — os três são baratos e um deles é de teste):
  1. `axes.js` importava `get` sem usar.
  2. O comentário do `viewport.js` dizia *"a ÚNICA escrita deste store"* — mas `resetarJanela`
     é uma segunda. O comportamento está certo; o **comentário** mentia.
  3. 🔴 **O teste do R27 provava por proxy.** Ele conferia que `celulaDe` não existe e que
     `seriesStore` não é exportado — mas um módulo poderia **importar** `series.js` sem exportar
     nada disso e ainda passar. O R27 proíbe o **import**. O teste novo lê o **fonte** de
     `mandate.js` e assere que não há import de `stores/`. Instruído a **provar por sabotagem**
     (acrescentar o import, ver falhar, reverter).
  - É a **quinta vez** nesta sessão que um teste não provava o que dizia. Ver o padrão no
    `AGENTS.md` (Pitfalls do app).
- `Task 1-3: fix round 1/5 dispatched` — os três Minor (agente `sa-0-2f1d0329`).


- `Task 1-3: pre-flight complete (commit 38af190)` — R26 e R27 aplicados ao plano.
- `Task 1-2: complete` (commits `259c7ae` catálogo, `ffdb6cb` séries) — **90 testes verdes em 10
  arquivos**. Transcrição literal dos briefs, com **uma** divergência reportada: o brief da
  tarefa 2 usava `vi.fn(...)` sem importar `vi` e o app não tem `globals: true` — o implementador
  acrescentou `vi` ao import do `vitest` (convenção do repo). **Defeito no MEU brief**, achado por
  ele.
- **Verificação por sabotagem (controlador):** a primeira tentativa de sabotagem **não falhou** —
  porque `item.url ?? adivinhada` só cai no fallback se `url` for nulo, e a linha que a guarda
  continuava lá. A sabotagem CERTA é **remover `url: entry.datafile`** do item: aí o teste falha
  com `expected undefined to be 'https://x/b.json'`. Ou seja, **o R26 morde de verdade** — o teste
  é o que obriga a guardar a URL. Arquivo restaurado (0 linhas de diferença).
- `Task 1-2: review returned` — **Spec ✅ · Task quality: Approved · 0 Critical · 1 Important ·
  2 Minor.** O revisor fez a verificação mais forte da sessão: **extraiu os blocos ```js dos
  briefs e diffou contra os arquivos reais** — `catalog.js`, `catalog.test.js` e `series.js`
  saíram **idênticos**; `series.test.js` difere só na linha 1 (`+ vi`). Confirmou por `grep` que
  nenhum módulo fora de `stores/` chama `.set`/`.update` de store (o único acerto é
  `src/data/series.js:30 cache.set(...)`, que é um `Map`).
- **R28 — dois caminhos para o mesmo estado, e só um fazia a coisa toda.** `adicionarSerie`
  grava `unit: series.unit`; `tentarNovamente` gravava só `status`/`series`/`error`, **sem
  `unit`**. Efeito: a MESMA série ficava com unidade diferente conforme tivesse vindo pelo add ou
  por uma retentativa — contra o §6 ("a unidade vem da série"). Confirmado por leitura direta
  (linha 28 vs. linha 47). **`plan-mandated`** — o defeito era do meu brief. Correção: gravar
  `unit: series.unit` também na retentativa.
  - ⚠️ **Detalhe do teste que quase o deixou passar:** `entrada()` e `okSerie()` devolvem a MESMA
    unidade, então um teste ingênuo passaria sem provar nada. O teste novo usa unidades
    **diferentes de propósito**.
- `Task 1-2: minor (deferred):` `catalog.test.js:15` escreve via `catalogStore.set(...)` porque o
  store de catálogo não expõe ação de reset (o de séries tem `limparSeries`) — os dois ficam
  assimétricos. **Deferido:** criar uma ação pública `limparCatalogo()` só para servir a um teste
  é API morta; não há uso de produto. O arquivo está dentro de `stores/`, então não viola a regra.
- `Task 1-2: fix round 1/5 COMPLETA (commit 32d1b80, 92 testes verdes)` — **RED→GREEN genuíno**,
  e com um achado do implementador que eu não tinha visto:
  - **O meu teste do R28 não provava o R28.** O `loadSeries` tem um **cache de módulo por URL**
    (`data/series.js:4`); sem zerá-lo, o sucesso de `https://x/b.json` do teste do **R26 vazava**
    para o teste do R28 — o `adicionarSerie` batia no cache e o item **já vinha com a unidade da
    série antes da retentativa**. O teste falhava, mas na **primeira** asserção (`:54`), nunca na
    da retentativa (`:57`). Ou seja: RED pelo motivo errado, e nunca ficaria verde.
    Correção: `clearSeriesCache()` no `beforeEach`. Agora o RED é real.
  - **Classe do defeito, verificada:** só dois arquivos usam `loadSeries` — `stores/series.test.js`
    e `data/series.test.js` — e **ambos** limpam o cache. `data/catalog.js` não tem cache. Fechado.
  - O teste do override de cor é **guarda de regressão** (o comportamento já estava certo); o
    implementador **registrou isso honestamente em vez de forjar um RED** — o que era o esperado.
- **Confirmação direta (controlador):** `avisoDeColisao` à parte, a sabotagem do R28 —
  remover `unit: series.unit` da retentativa — falha **na linha 57** com
  `expected {type:'number'…} to deeply equal {type:'percentage'…}`. Ou seja, agora morde no lugar certo.




# Fatia 06 — o gráfico: adapter, faixas de governo e minimapa

Ledger do controlador. O implementador escreve o **relatório** (`task-N-report.md`); **este
arquivo é do controlador** — não escrever aqui.

- Plano: `docs/plans/06-grafico-adapter-faixas-minimapa.md` · Tasks: 0 (medição, feita),
  1 (adapter), 2 (faixas), 3 (minimapa), 4 (`Chart.svelte`).
- Branch: `feat/camada-de-graficos` (repo `sitio/`). Base da fatia: `7dfadc5`.
- Estado antes de começar: 10 arquivos de teste verdes · 92 testes.

## Pré-voo (o que o controlador conferiu ANTES de disparar)

Quatro defeitos, todos meus. Os dois primeiros são os que importam.

- 🔴 **A spec se contradizia sobre onde vive o rótulo.** O §1 (linha 65) ainda dizia *"o rótulo
  do indicador vai na **ponta da própria linha**"* — o **oposto** do que a §12.2 decidiu na
  véspera. Quem lesse só o §1 implementaria a coisa errada. **Corrigido:** o §1 agora registra
  que a primeira hipótese foi **medida e caiu** (80% da altura no pior caso) e que o canal
  redundante é a **legenda fora do gráfico** + o rótulo no crosshair.
- 🔴 **A legenda não era de ninguém.** A §12.2 exige uma legenda externa, e nem o plano 06 nem
  o 07 a mencionavam. Delegação de nada = ninguém faz. **Corrigido:** virou a **Tarefa 5 do
  plano 07** (o shell), com código e critério de aceite.
- 🟠 **O portão da 06 continuava fechado** dizendo que a §12.2 estava aberta — ela foi fechada.
  **Corrigido:** portão `RESOLVIDO`, com a consequência escrita (a ponta vai **sem `title`**).
- 🟠 **`lightweight-charts` não é dependência ainda** — o plano assumia instalada e nunca mandava
  instalar. **Corrigido:** Passo 0 da Tarefa 1, `npm install lightweight-charts@^5.2.0` como
  dependência de **runtime**, com o aviso do `NODE_ENV=development`.

### Erros meus que a verificação pegou, no próprio pré-voo

- Eu escrevi "**consequência para a Tarefa 3 (o shell)**" — mas a Tarefa 3 da fatia 06 é o
  **minimapa**; o shell é a fatia 07. Duas referências erradas, corrigidas.
- No código da Tarefa 5 eu usei variáveis CSS (`--cor-texto`, `--cor-muted`, `--cor-borda`) que
  **não existem** — o projeto é Tailwind puro, sem tokens (`main.css` só tem
  `@import "tailwindcss"` + `@custom-variant dark`). Reescrevi com classes Tailwind + `dark:` e
  sintaxe de runes do Svelte 5 (`onclick`, `$derived`), que é a convenção da base.

## Dependência de ordem (verificada no código, não suposta)

A fatia 06 **Tarefa 4** (`Chart.svelte`) importa `mandateStore` e `viewportStore`; a fatia 07
**Tarefa 5** (a legenda) importa `axesStore`/`moverParaEixo`. **Nenhuma das três existe** —
são a Tarefa 3 da fatia 05. Por isso a **05-T3 foi disparada primeiro**.

Já conferido que existem e casam: `definirCor`, `restaurarCor`, `removerSerie`, `corPessoal`
(`stores/series.js`), `avisoDeColisao`, `LIMIAR_COLISAO` (`domain/color.js`).

## ✅ AGENTS.md atualizado — 2026-10-15

Aplicado com aprovação do usuário (as quatro tentativas anteriores tinham sido bloqueadas por
timeout do prompt). Duas edições:

1. **O bloco de estado** — "Estado em 2026-10-15: fatias **00 a 06 fechadas**", com o aviso de que
   a 06 custou o triplo do planejado e que o `progress.md` dela deve ser lido antes de mexer em
   `app/src/chart/`. O portão segue `PASS`, com o **aviso de escala sem dono** registrado como
   pendência da legenda (fatia 07).
2. **Os Pitfalls do app** ganharam cinco linhas — as lições que custaram a fatia inteira:
   os planos sub-especificam o que toca API de terceiro; **a lib tem builds diferentes** (a
   asserção existe só em dev, e o comportamento muda: lança vs. mente); **a verificação do gráfico
   é captura de tela**; cuidado com "verdadeiro no harness, falso no app"; e o dado duplicado nas
   4 séries.

## ✅ FATIA 06 FECHADA — 2026-10-15

**Entregue:** `src/chart/points.js`, `bands.js`, `adapter.js`, `navigator.js` +
`src/components/Chart.svelte`. **118 testes verdes em 15 arquivos.** 32 commits desde o pré-voo.

**Sete tarefas, não quatro.** As três extras (T4, T5, T6) só existiram porque algo quebrou **na
tela** — e nenhum dos 118 testes verdes chegou perto de nenhuma delas. O `vite.config.js` roda em
`node` por decisão da §10.7, então o desenho nunca é exercitado: a suíte ficava verde enquanto o
gráfico estava quebrado de três jeitos diferentes.

**Placar das revisões:** **4 revisões + 1 re-revisão**, todas Aprovadas. 0 Critical; **3 Important**
(o `zOrder`/`subscribeClick`, o `fitContent` do harness, e o cache que não era cache) e ~12 Minor,
todos corrigidos ou deferidos com motivo.

**O que esta fatia ensinou — e é a lição mais cara da sessão:**

1. 🎯 **Quatro planos com placeholder, e sempre no mesmo lugar:** onde toco a API de terceiro.
   Nunca nas partes que eu domino. Não é descuido aleatório — é onde eu não tenho modelo mental,
   então escrevo a *forma* e deixo o conteúdo. Exatamente o que a convenção do projeto proíbe.
2. 🎯 **"Verdadeiro no harness, falso no app" — três vezes.** O `fitContent` com flag (a série
   chega uma a uma), o `{date,value}` cru na âncora, e a janela inicial. **Eu verifico no arranjo
   que montei, não no caminho que o produto percorre.**
3. 🎯 **Medi um build da lib e generalizei para "a lib".** O comportamento da duplicata de data
   depende do build: **lança em dev, mente em prod**. E eu escrevi a conclusão no **critério de
   aceite**, onde ela virou verdade oficial.
4. ✅ **O que funcionou contra tudo isso:** conferir contra os **typings instalados**; **medir em
   vez de deduzir** (duas sondas no navegador resolveram o que o bundle minificado não entregava);
   **dizer ao implementador que ele é o filtro** (rendeu 10 achados); e **pedir uma captura de
   tela** — que pegou o pior defeito de todos, o eixo ausente.

**Pendências declaradas para as fatias seguintes:**
- **A legenda (fatia 07)** é o canal redundante da §12.2 — e precisa renderizar o **aviso de
  escala**, que hoje é calculado e **nunca exibido** (nenhum componente lê `axesStore.avisos`).
- **A janela inicial** ainda é decidida pelo adapter; se a fatia 07 tiver filtros de tempo, eles
  passam a mandar nela.
- **`mvgr-nominal` vs `população`** dividem o eixo direito e ficam achatadas — a régua da §5 só
  compara dentro do eixo esquerdo. Decidir na 09 ou na 11.
- **Fatia 11:** 4 das 13 séries publicadas têm **data duplicada nos arquivos**. A conversão agora
  deduplica (não quebra nem mente), mas o **dado-fonte** segue errado.


- ✅ **`Task 5: complete` (commit `de923e2`) — o eixo duplo funcionou.** Captura
  `.superpowers/sdd/06-grafico/capturas/task5-01-eixo-duplo.png`: dois eixos com escalas distintas
  (0–90 à esquerda, 200–260 M à direita), as séries **legíveis e espalhadas** em vez do amontoado,
  faixas com rótulo de texto, hachura no Lula III, minimapa, e o eixo do tempo começando em **95**
  (o intervalo completo). **116 testes verdes.**
  - A ordem que eu avisei que era crítica **coube na mecânica dos stores**: o adapter passou a
    desenhar a partir do subscriber do `axesStore`, e o eixo nunca fica um passo atrás.
  - 🔴 **Restam dois problemas** (reportados, não corrigidos): os rótulos de valor **ainda se
    apertam** no eixo esquerdo — é o problema da §12.2 de novo, agora no **eixo** em vez da ponta
    da linha; e `mvgr-nominal` **fica achatada** contra `população`, porque a régua da §5 só
    compara dentro do eixo esquerdo e duas séries incompatíveis acabam dividindo o direito.
  - O **aviso de escala** é calculado mas **não renderizado** — nenhum componente lê
    `axesStore.avisos`. É da **legenda (fatia 07)**, que segue pendente.
- 🔴 **A duplicata de data: a minha medição estava certa PELA METADE — e o resultado é o pior
  possível.** Eu havia provado que a lib aceita `time` repetido, **no build de produção**, e
  escrevi no critério "a sonda provou que não lança". O implementador da T5 achou o contrário.
  Os dois estávamos certos, **de builds diferentes**:

  | build | tempo repetido |
  |---|---|
  | **produção** | ✅ aceita — desenha um **segmento vertical**, em silêncio |
  | **desenvolvimento** | 🔴 **lança** `data must be asc ordered by time` |

  A asserção só existe no build de dev. **Em produção o gráfico mente; em desenvolvimento ele
  lança — e a exceção ABORTA o laço de `definirSeries`, então as séries seguintes nunca desenham.**
  Foi essa a causa-raiz do "gráfico preso na 1ª série" que a prova visual da T4 achou, e que eu
  tinha atribuído só ao `{date,value}` cru.
  - **Virou a Tarefa 6** (deduplicar na conversão), disparada. A fatia 11 decide o destino dos
    **arquivos**; a conversão garante que o app **não quebra nem mente** com o que já está publicado.
- 📌 **Lição de método, e é a mais cara desta fatia:** eu medi **um** build e generalizei para
  "a lib". Um comportamento que depende do build é o pior tipo de achado para se concluir por
  amostra única — e eu escrevi a conclusão no **critério de aceite**, onde ela virava verdade
  oficial. O que pegou foi o implementador **medir de novo** em vez de seguir o brief.



- 🏆 **`Task 4: complete` — e a prova visual fez exatamente o que devia: achou 8 problemas, dois
  BLOQUEANTES.** Commits `9d24959` (correções na T3) e `6ae55e8` (`Chart.svelte`).
  Capturas em `.superpowers/sdd/06-grafico/capturas/` · **116 testes verdes**.
  - 🔴 **A [bloqueante]** — a âncora do minimapa recebia `{date, value}` cru; `setData` quer
    `{time, value}` **e rejeita tempos repetidos**. A exceção **matava o subscriber** do
    componente → o gráfico ficava preso na **1ª série**. *O brief ainda dizia o contrário, numa
    nota ("a âncora precisa do dado cru") — escrevi o oposto do certo, com confiança.*
  - 🔴 **B [bloqueante]** — o adapter **nunca assinava `subscribeClick`**. O `hitTest` da
    primitiva calculava o id e **ninguém o lia** → clicar na faixa não selecionava. Era o
    critério 5, e o `zOrder` que eu tinha corrigido era só metade da história: faltava o
    consumidor do hit.
  - **C** — `navigator.mostrarJanela` nunca era chamado (minimapa sem janela). **D** — o minimapa
    só atualizava com mudança de séries; mandatos que chegavam depois ficavam sem faixa.
  - **E** — a janela inicial é a default da lib (2007–2024), não o intervalo completo.
  - **G** — duplo-clique **não** dá zoom (scroll dá). **H** — o harness monta com altura 0 sem
    Tailwind (dependência real para a fatia 10).
  - ✅ **A hachura cortando no último dado ficou provada por medição**, não por vão visual:
    termina em `x=1176` == `timeToCoordinate('2024-08-01')`. A lib limita o domínio ao dado,
    então "hoje" nunca chega a ser renderizado.
- 🔴 **F — o achado mais grave da fatia, e só apareceu NA TELA: o eixo duplo não é de ninguém.**
  A **fatia 05** calcula *onde* cada série vai (`axesStore.atribuicao`, régua de amplitude da §5)
  e **ninguém lê o resultado**; a **fatia 06** desenha tudo num eixo só. Resultado medido na
  captura `01-montado.png`: **9 das 10 séries ficam esmagadas num amontoado ilegível**, com os
  rótulos de valor colidindo na borda. O critério de aceite desta fatia **não cobrava** o eixo.
  - É o mesmo padrão do *"a legenda não era de ninguém"* (pré-voo da T1): promessa da §5 que cai
    **entre** duas fatias. A diferença: a legenda eu peguei **lendo**; esta só apareceu **olhando**.
  - **Virou a Tarefa 5** do plano, com código e critérios. E os critérios de aceite agora cobram
    o eixo duplo, a janela inicial completa e o duplo-clique.
- Nota de método: **o relatório que não veio (T3) e a prova visual que veio (T4) pegaram o que
  todos os testes verdes não pegariam.** Os 116 testes nunca tocaram o desenho — e o desenho era
  onde os dois bloqueantes estavam.


- `Task 2: complete` (commit `79b6510`) — `chart/bands.js` + `bands.test.js`. **115 testes verdes
  em 15 arquivos** (7 novos). A primitiva de pane e as duas funções puras.
- 🏆 **O implementador achou CINCO defeitos no meu brief — os cinco conferem nos typings.** Eu
  tinha dito a ele "esta tarefa não tem teste que pegue: a sua leitura é o filtro", e ele foi:
  1. **Import morto** — `PALETA_PADRAO` importado em `bands.js` e nunca usado (só o teste precisa).
  2. 🔴 **`zOrder` é OBRIGATÓRIO em `PrimitiveHoveredItem`** (typings L3847/3851), não opcional.
     Meu `hitTest` omitia. Em JS não quebra — e é exatamente por isso que passaria despercebido
     até o clique falhar na T4, onde não há teste que pegue.
  3. 🔴 **`paneViews()` devolvia array novo a cada chamada.** Os typings avisam (L2145-46): *"a lib
     usa caches internos baseados em referência de array — devolva o MESMO array se nada mudou"*.
     Custo de redesenho, não incorreção.
  4. **Cabeçalho "Consome: `COBERTURA`" desatualizado** — o código usa o callback
     `ultimoDadoPorSerie`. Mesmo requisito (§7.3.5), caminho diferente.
  5. 🎯 **Lacuna de cobertura no limite.** Sabotar `>=`→`>` **não era pego** — todos os fixtures
     tinham folga e nunca tocavam o limite exato. Este é o melhor dos cinco: um teste que passa
     por não exercitar a borda.
- `Task 2: fix round 1/5 complete (commit 66ebb5d)` — **116 testes verdes**. A sabotagem morde:
  `expected [ 'y' ] to deeply equal [ 'x', 'y' ]` no teste novo do limite.
- `Task 2: re-review returned` — **os 5 ADDRESSED, nenhuma quebra.** O revisor notou que o achado
  4 era de **prosa no brief**, não no código (`bands.js` nunca citou `COBERTURA`) — **acerto dele**.
  E fez a revisão do desenho, que é a única que ele tem: aprovado, com três nits cosméticos.
- ✅ **A última suposição em aberto da T2 foi MEDIDA (controlador).** O revisor apontou que o
  espaço de coordenadas do `hitTest` (media vs. bitmap) só se prova em tela, e que errar isso
  deslocaria o clique por um fator de DPR — invisível em monitor comum. Sonda com cliques reais
  (`probe-datas/hittest.html`): **media em DPR 1 e em DPR 2, valores idênticos** (offset 100 →
  `x=99`). O código está no espaço certo.
- **Nit corrigido no plano:** o rótulo da faixa não era clipado — um nome longo ("FHC II · PSDB")
  numa faixa estreita vazaria para a vizinha, e o limiar de 70px não garantia o contrário. Agora
  há `context.clip()` dentro da faixa.
- ⚠️ **Anotado para a T4:** a hachura depende de o dado trazer `emCurso: true`. Se o adapter não
  setar a flag, o mandato em curso desenha **sem** hachura, em silêncio. Conferir na fiação.
- Nota de método: **a T2 é a tarefa onde o brief é o único filtro** (sem teste de unidade para o
  desenho). Foi justamente onde o implementador mais achou — não porque o brief estivesse pior,
  mas porque não havia teste mascarando. Vale lembrar disso nas próximas tarefas sem teste.

- `Task 1: complete` (commit `a8a31bc`) — `chart/points.js` + `points.test.js`. **108 testes
  verdes em 14 arquivos** (5 novos). `grep` de pureza limpo.
- `Task 1: review returned` — **Spec ✅ · Approved · 0 Critical · 2 Important · 3 Minor.** O
  revisor conferiu os timestamps por cálculo independente e — o ponto que importava — mostrou que
  **cada teste falha de verdade** quando o comportamento sob teste é removido (sem o `slice`, o
  fixture com hora vira `NaN`; sem o `sort`, a ordem invertida sai errada). Nenhum passa por
  acidente.
- 🔬 **Important nº 2 REFUTADO por medição (controlador).** O revisor afirmou que `slice(0,10)`
  colapsaria granularidade sub-diária e **a lib lançaria no empate**. Construí uma sonda no
  navegador (`~/.hermes/cache/scratch/probe-datas/`) com o caso real: a lib **aceita `time`
  repetido e fora de ordem — não lança, e guarda todos os pontos** (mandei 4, guardou 4, com o
  `13.50` renderizado). O comentário do plano que dizia "a lib exige série ordenada" foi
  corrigido: o `sort` é **determinismo nosso**, não exigência dela.
- 🔴 **Mas a investigação achou algo maior, e é de DADO.** Quatro das 13 séries publicadas têm
  **datas duplicadas**: `caged/caged-total-mensal.json` (3×: 1995-10, 2005-10, 2015-10),
  `mvgr/mvgr-nominal.json` e `mvgr/mvgr-real.json` (2×: 2005-10, 2015-10), e
  `pib/pib-real-anual.json` (2×: 2005-01, 2015-01). Não quebra o gráfico (a sonda provou), mas
  desenha um segmento vertical no mesmo x e é dado errado. **Vai para a fatia 11** (a migração);
  registrado também no critério de aceite desta fatia para não se perder.
- 🔴 **Terceiro pré-voo, na TAREFA 2 — e é o achado mais sério da sessão (commit `faebe95`).**
  - **A primitiva era um PLACEHOLDER.** O plano dizia `/* guardar refs */`, `/* limpar */` e
    chamava um `desenhar(target)` que **não existia em lugar nenhum**. Logo na tarefa de maior
    risco da fatia, e a que viola a regra mais citada do projeto (*campo não decidido não vira
    placeholder*). **Corrigido:** código completo da primitiva, escrito contra os typings.
  - **O ponto de anexo estava ERRADO.** O plano anexava a primitiva **na série**. As faixas
    atravessam o gráfico inteiro e não pertencem a nenhuma série — a API certa é a de **pane**
    (`chart.panes()[0].attachPrimitive(p)`). A lib oferece as **duas** (`ISeriesPrimitive` e
    `IPanePrimitive`), então era fácil escolher a errada; e a errada faria a faixa depender de
    qual série estivesse por baixo.
  - **API conferida nos typings instalados, não por memória:** `IChartApi.panes()`,
    `IPaneApi.attachPrimitive/detachPrimitive`, `IPanePrimitive` (`paneViews`/`updateAllViews`/
    `attached`/`detached`/`hitTest`), `IPanePrimitivePaneView` (`zOrder`/`renderer`),
    `IPrimitivePaneRenderer.draw(target, utils?)`, `PrimitiveHoveredItem`
    (`distance`/`hitTestPriority`/`cursorStyle`/`externalId`/`zOrder`).
  - ⚠️ **`useBitmapCoordinateSpace` NÃO é exportado pela `lightweight-charts`** — é método do
    `CanvasRenderingTarget2D`, do `fancy-canvas`. É chamado **no `target` recebido**; nada a
    importar. O plano agora diz isso.
  - **A T2 é a única tarefa do projeto sem teste de unidade** (a lib exige canvas; o
    `vite.config.js` roda em `node`, §10.7). Por isso o plano dá o **código inteiro** — sem teste
    que pegue, o plano é a única barreira. Verificação é visual, na T4.

- `Task 0: complete` (2026-10-14) — medição dos rótulos, §12.2 fechada. Spike em
  `~/.hermes/cache/scratch/spike06/`, **fora do repo** de propósito (nada a apagar).
- `Task 1-4: pre-flight complete (commit 7dfadc5)` — os quatro defeitos acima corrigidos.
- 🔴 **Segundo pré-voo, na Tarefa 1 — e este era bloqueante (commit `e02086a`):**
  - **A Tarefa 1 não passaria no próprio teste.** Ela punha a conversão dentro do `adapter.js`, e
    o teste importava de lá. Mas o adapter importa `lightweight-charts` **e** `./bands.js` — que
    só nasce na **Tarefa 2**. O teste morreria de módulo inexistente, antes de exercitar qualquer
    coisa. **Correção:** a conversão virou `chart/points.js` com teste próprio (`points.test.js`),
    que é a **única parte do gráfico testável sem DOM** (§10.7) — ela merecia viver sozinha.
  - **`LineStyle` era importado e nunca usado** — removido do import do adapter.
  - **A Tarefa 3 absorveu o adapter** (o minimapa é uma segunda instância da mesma lib; separar
    os dois só recriaria a dependência de import entre tarefas que acabou de ser corrigida).
  - **API conferida contra os typings da 5.2.1 instalada, não por memória:** `createChart` e
    `LineStyle` existem; **`LineSeries` é um objeto `SeriesDefinition`** (`{type:'Line',
    isBuiltIn:true, defaultOptions}`) usado em `chart.addSeries(LineSeries, options)` — **não
    existe mais `chart.addLineSeries(...)`**; `ISeriesPrimitive` existe e é o parâmetro de
    `ISeriesAttachPrimitive`. Timestamps do teste conferidos por cálculo: batem.
- A dependência `lightweight-charts@^5.2.1` foi instalada pelo controlador no pré-voo (é
  dependência de **runtime**). A suíte segue verde: **103 testes / 13 arquivos**.
- `Task 1: dispatched` (agente `sa-0-2253670a`) — `chart/points.js` + `points.test.js`.
  ⚠️ Os briefs saíram primeiro em `.superpowers/sdd/06-grafico-adapter-faixas-minimapa/` (o script
  deriva o nome do arquivo do plano); consolidados em `06-grafico/`, junto do ledger.
- Nota de método: **a Tarefa 2 (as faixas por `ISeriesPrimitive`) é o ponto de risco da fatia** —
  é a única parte do projeto que depende de uma API de terceiro que não controlamos, e é onde o
  teste de unidade **não alcança** (o `vite.config.js` roda em `node`, sem DOM). Se algo der
  errado na 06, é ali. Disparar com atenção e revisar contra os typings instalados.


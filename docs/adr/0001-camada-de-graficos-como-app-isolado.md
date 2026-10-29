# ADR 0001 — Reconstruir a camada de gráficos como app isolado

- **Status:** Aceita (emendada em 2026-10-14 — ver D7)
- **Data:** 2026-10-13 · **Emenda:** 2026-10-14
- **Projeto:** Brasil em Números (`www.brasilemnumeros.ong.br`)
- **Repositórios:** `sitio` (camada de apresentação) e, a partir da emenda de 2026-10-14, `dados` (contrato das séries — ver D7)

## Resumo

A camada de gráficos será **reconstruída do zero como uma aplicação isolada** — build próprio, Svelte + TradingView Lightweight Charts — servida pela página Jekyll atual. O restante do site (blog, páginas institucionais, layouts, posts) **não é tocado**. A restrição invariante do projeto, **custo zero** de hospedagem e de aquisição de dados, é preservada.

## Contexto

### O sistema hoje

- `sitio/` — site Jekyll publicado no GitHub Pages, via `.github/workflows/github-pages.yml`. O gráfico é montado por 7 classes ES (~2.700 linhas: `chart-creator.js` com 1.739 e `chart-integration.js` com 1.026), coordenadas por **estado global em `window`**.
- `dados/` — repositório independente; um notebook Colab por família de indicador gera `{indicatorName, data:[{date, rate}]}`, publicado em `brasilemnumeros.github.io/dados/...` e consumido pelo navegador através de URL absoluta registrada em `sitio/indicators.json`.

### Problemas que motivaram a revisão

1. **Estado global mutável** em `window` (`chartManager`, `chartInstance`, `multiselectScope`, `indicatorsConfig`, `indicatorsData`, `chartIntegration`, `updateChartsFromMultiselect`) — a coordenação real ocorre por globais, não pelas classes.
2. **Duplicação severa**: `createDatasets`, `createIndependentDatasets` e `createSynchronizedDatasets` são ~450 linhas quase idênticas dentro do mesmo arquivo.
3. **Períodos de governo hardcoded em três lugares independentes**, com nomes inconsistentes: `GOVERNMENT_PERIODS` (`chart-creator.js`), os botões de `config-modal.html` e o mapa período→datas de `chart-integration.js` (que usa `"Lula 3"` enquanto o botão diz `"Lula II"`).
4. **Seleção de indicadores duplicada**: o dropdown de `multiselect.html` e a modal de configuração fazem a mesma coisa em dois lugares.
5. **Biblioteca inadequada ao objetivo**: Chart.js não tem crosshair/readout nativo nem candlestick e degrada acima de ~10 mil pontos — daí as ~2.700 linhas tentando compensar, incluindo cinco plugins de CDN (datalabels, annotation, zoom, adaptador de datas, hammerjs).
6. Menores: `indicators.json` buscado duas vezes; `console.log` de debug em produção; fallback morto (`/data/selic-acum-12m.json`); `defaultIndicator` referenciado e inexistente.
7. **Não existe contrato de série** (emenda de 2026-10-14). Os 13 JSONs publicados usam **dois nomes para o mesmo campo**: `{date, rate}` em `selic/`, `ipca/`, `igp-m/`, `pib/`, `mvgr/` e `caged/`; `{date, value}` em `homicidios/` e `populacao/`. Também não há declaração de unidade nem de comparabilidade entre séries — a informação que o front-end precisa para saber se duas séries podem conviver no mesmo eixo não existe em lugar nenhum.

### Restrição invariante: custo zero

O projeto **não pode custar nada** para hospedar nem para obter dados. Verificado em out/2026:

- GitHub Pages: grátis em repositório público (~100 GB/mês soft, site ≤ 1 GB).
- GitHub Actions: **ilimitado e grátis em repositório público** (2.000 min/mês se privado).
- Alternativas de hospedagem estática, também grátis no nosso volume: Cloudflare Pages (banda ilimitada, 500 builds/mês), Netlify/Vercel (100 GB/mês).
- Dados: BCB SGS (`api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json`), IBGE e IPEAdata são APIs públicas gratuitas, sem chave de API.

**Conclusão relevante:** o custo **não muda** com a escolha de stack. "Refatorar × reconstruir" não é uma questão de custo neste projeto.

### Objetivo declarado

Uma experiência de consulta e comparação de indicadores inspirada no **tradingview.com**, cujo recurso central é **identificar os governos ao longo da série temporal** — federal hoje, com intenção de expandir para governos estaduais.

## Processo decisório

Perguntas feitas e respondidas ao longo da sessão (o espaço de busca considerado):

| Pergunta | Resposta |
|---|---|
| O que puxa para reconstruir? | Código de gráficos emaranhado + desejo de capacidades novas + ansiedade de stack. **Explicitamente não** a manutenção do Ruby/Jekyll |
| Qual a ambição? | Página-app com comparação **sobreposta**; o tier de painéis empilhados foi descartado por não bater com o objetivo |
| "Identificar governos" significa o quê? | Faixas + clicáveis (zoom/filtro) + trilho de mandatos + **painel de comparação por mandato** |
| Onde o app mora? | App isolado com build próprio, servido pela página Jekyll atual |
| Framework? | Svelte |
| Biblioteca? | TradingView Lightweight Charts |
| Ritmo | Sem pressa — desenhar a versão bem feita, não a incremental |
| O `dados` está congelado? (emenda) | Não. O produto é inteiramente nosso: schema, registry e contrato são alteráveis se isso favorecer o objetivo. Daí a D7 |

### Alternativas consideradas e rejeitadas

| Alternativa | Por que foi rejeitada |
|---|---|
| Refatorar tudo no lugar | Não resolve a biblioteca de gráficos nem o paradigma de seleção |
| Reconstruir o site em stack nova (Astro / Cloudflare Pages) | É uma segunda decisão, maior e desnecessária para o objetivo; o blog está bem servido pelo Jekyll. Fica como opção futura, sem retrabalho |
| Trocar apenas a biblioteca, mantendo o fluxo atual | A opção mais barata (2–5 dias), mas **não resolve a queixa principal**: a forma de escolher indicadores |
| Escrever o app em JS vanilla dentro do Jekyll | Reproduziria a mesma teia de estado global que motivou a revisão |
| Vue em vez de Svelte | Serve (o site já usa petite-vue), mas Svelte é mais enxuto para envolver uma lib imperativa de gráficos |
| **Apache ECharts** em vez de Lightweight Charts | Faixas (`markArea`) e zoom (`dataZoom`) nativos e mais generalista, porém bundle de 80–130 KB e o "feel" teria de ser construído à mão. O feel **é** o produto |
| Painéis empilhados por indicador (multi-pane) | Não corresponde ao objetivo de comparar séries sobrepostas |
| Coluna lateral de indicadores (watchlist) | Preferiu-se a **modal de busca** no estilo *symbol search* do TradingView |
| Aceitar os dois formatos de JSON no front-end (emenda) | Trata a divergência de schema como premissa. O pipeline é nosso: a divergência é bug do pipeline, não requisito do cliente |
| Inferir comparabilidade por `unit.type` (emenda) | Medido nos 13 arquivos: falha nas duas direções. `homicidios-anual` (`number`) × `pib-real-anual` (`percentage`) têm razão de amplitude **1,068** — convivem bem apesar de unidades declaradas diferentes. `populacao-total-anual` e `homicidios-anual` são ambas `number` e distam **4.853.304×** |
| Normalizar todas as séries para índice base 100 (emenda) | Rejeitada como padrão por decisão de produto: obriga a série a nascer de uma origem arbitrária, e o valor real é o conteúdo do produto. Fica apenas como opção explícita do usuário |

## Decisão

**D1 — Escopo: reconstruir apenas a camada de gráficos.** O app passa a ser uma unidade isolada, com build próprio. `sitio/index.html` vira um *shell* (`<div id="app">` + bundle). Blog, `_layouts/`, posts e páginas institucionais permanecem como estão.

**D2 — Framework: Svelte.** Compila para runtime mínimo e é adequado para orquestrar UI reativa em volta de uma biblioteca imperativa de gráficos.

**D3 — Biblioteca: TradingView Lightweight Charts** (v5.x, Apache-2.0, ~12 KB gzip, ESM). Pan, zoom e crosshair nativos, com escala de tempo precisa. As **faixas de governo** exigem um `ISeriesPrimitive` customizado, pois a lib não tem anotação nativa — custo aceito em troca do feel. Requer **atribuição**: NOTICE + link visível para tradingview.com (rodapé ou página de licenças). Não há rótulos nos pontos: o readout do crosshair substitui o plugin de datalabels.

**D4 — Alvo de UX.** Página única com: **modal de busca** de indicadores (agrupados, busca por digitação, seleção por teclado) → *chips* das séries selecionadas → **um gráfico grande** com as séries sobrepostas → **faixas de governo clicáveis** (clicar **seleciona e destaca** o mandato e o trecho da série; o zoom da janela é gesto separado — arraste, scroll ou duplo-clique) → **trilho de mandatos** como seletor de período → **painel de comparação por mandato** (quanto cada indicador variou em cada governo). Tema escuro. Os filtros de tempo saem da modal e viram uma barra. Sem painéis empilhados.

**D5 — Períodos de governo viram dado.** Passam a ser JSON versionado em `dados/governos/` (um índice + um arquivo por entidade), com esfera (`federal`, `estadual`, `municipal`), cargo, titular, partido, tipo (`eleito`/`sucessor`/`interino`), datas explícitas de exercício, `mandatoDe` opcional e marcação de mandato em curso — eliminando as três duplicações atuais e viabilizando a expansão estadual sem multiplicar regra em código.

**Emenda de 2026-10-14 (cor, em duas etapas):** primeiro a **cor saiu do dado** — manter uma cor por mandato à mão não sobrevive a 27 unidades federativas, quanto mais a 5.570 municípios. Na segunda etapa, no mesmo dia, **a cor de partido saiu do gráfico**: ela obrigaria a escolher entre **cor de marca** (colide entre partidos — o vermelho é o mais disputado no Brasil — e é desenhada para fundo branco, não para o fundo escuro) e **cor por espectro político** (juízo editorial sem fonte auditável, que faria o site afirmar uma classificação em vez de publicar um dado). As faixas ficam **sem cor**, com alternância sutil entre mandatos vizinhos e o **rótulo trazendo governo e sigla** (`Lula III · PT`). A identificação por partido passa a ser **logo pequeno + sigla**, no trilho e na ficha do mandato. O gráfico fica com uma paleta só: as séries.

**Emenda de 2026-10-14 (escopo municipal):** o modelo **suporta** municipal — o caminho de arquivo e o índice já o comportam — mas o dado **não será populado** nesta rodada. Popular 5.570 entidades é projeto de dados por si só; a fonte candidata é o TSE.

**D6 — Custo zero é invariante.** A hospedagem segue estática e gratuita; nenhuma decisão desta ADR introduz custo recorrente.

**D7 — Contrato de dados entra no escopo (emenda de 2026-10-14).** O repo `dados` passa a ser afetado por esta ADR. Os notebooks passam a publicar um **schema de série canônico** — um único nome de campo, unidade explícita, sem divergência entre famílias — e a **comparabilidade entre séries é declarada**, não inferida em runtime: o registro do indicador diz com quem ele pode conviver num mesmo eixo. Uma verificação por magnitude (razão de amplitude acima de um limiar) fica apenas como rede de segurança para combinações não previstas.

Duas restrições acompanham a D7:

1. ~~**A página atual não pode quebrar.**~~ **Substituída em 2026-10-14:** não há legado a preservar. A camada de gráficos atual sai de cena por inteiro — sem fase de convivência entre as duas páginas, sem flag de alternância, sem `index.html` carregando os dois caminhos. O que resta da restrição original é uma questão de **ordem de deploy** entre os dois repos (a página no ar lê `rate` até o app novo entrar), em aberto na spec.
2. **O detalhamento do schema e do campo de comparabilidade não é decidido nesta ADR** — vai para a spec de design. Esta emenda registra o escopo e a intenção, não a forma.

### Decisões de design tomadas em 2026-10-14 (rastreabilidade; o detalhe canônico é a spec)

Registradas aqui apenas para que a ADR não contradiga a spec:

- **Composição da página:** painel de comparação em matriz larga, sempre visível, abaixo do gráfico (opção C entre três wireframes).
- **Conteúdo da célula da matriz:** Δ = último − primeiro valor dentro do mandato, **na unidade do indicador**. Sem normalização percentual, sem campo de direção ("queda é bom") no registro.
- **Interação das faixas de governo:** clique **seleciona e destaca**; pan/scroll/duplo-clique dão zoom. Minimapa com o intervalo total. Filtro/isolamento de mandato rejeitado.
- **Trilho de mandatos:** seletor desacoplado do eixo do tempo, uma caixa por governo com largura igual — não é régua temporal.
- **Escalas:** o usuário escolhe o eixo e o app sugere um padrão; séries de magnitude incompatível não entram em silêncio (aviso + escolha entre normalizar e remover).
- **Modal de busca:** cascata de três colunas (grupo → indicador → ficha), com a busca por digitação disponível nas três. A ficha é onde vivem unidade, granularidade, período, fonte e o aviso de compatibilidade de escala — visível antes da escolha, não depois como erro.
- **Limite de 10 séries sobrepostas** *(terceiro estado no mesmo dia: 5 → sem limite → 10)*. O limite de 5 protegia a legibilidade da matriz, o que era paternalismo — a escolha é do usuário. Mas **sem limite não há teto de cores**, e a paleta é finita: com o teto em 10, **o limite passa a vir da paleta, não do layout** — base melhor, porque é medida e não estética. O botão de adicionar fica visível e desabilitado ao atingir o teto, com o motivo, e nada é removido automaticamente.
- **Paleta das séries: envelope medido, 10 entradas fixas, sem ciclo, com canal redundante.** Medido em 2026-10-14: a paleta atual do site tem 6 cores escolhidas à mão, cicladas por `index % 6` — a partir do 7º indicador duas séries ficam com a mesma cor — e sua mínima distância entre pares é **ΔE_ok = 0,104**, com o par vermelho/laranja abaixo de 0,12. A primeira tentativa de substituta (10 matizes igualmente espaçados) passa em visão normal (0,084) e **colapsa no daltonismo: 0,0061 sob deuteranopia**, ou seja, cores idênticas. A paleta adotada **otimiza o pior caso entre quatro tipos de visão** (normal, protanopia, deuteranopia, tritanopia) e chega a **0,095** de mínima — 15× melhor no pior caso — ao custo de o contraste cair de 6,0:1 para **3,20:1** (WCAG pede 3:1) e de os tons ficarem feios. **O envelope é medido; o gosto escolhe dentro dele.** Como a margem é fina, foi decidido também um **canal redundante de identificação**: o rótulo do indicador na ponta da linha (ou no eixo), para que a cor seja decoração e a identificação venha do texto — a mesma regra das faixas de governo. Medição válida para o fundo **escuro**; um tema claro exigiria remedição.
- **Cor customizada pelo usuário: mantida**, como segunda camada sobre a paleta medida — o padrão é o envelope e a mudança é override pessoal, chaveado pelo **`id`** do indicador; o seletor **avisa** (com a distância medida) quando a cor escolhida colide com outra série, mas **não bloqueia**; e a persistência é **local** (`localStorage`, com "restaurar padrão"), **fora da URL**, porque um link reproduz a visão dos dados e não as cores de quem o mandou. A garantia de daltonismo vale **só para o padrão**.
- **Testes: Vitest, unidade em `domain/` e `data/`, sem componente nem navegador por ora.** O alvo prioritário é a camada pura, porque são as contas que erram calado — e elas testam sem navegador, sem rede e sem *mock*. Duas decisões medidas viram teste: o **envelope da paleta** (falha se alguém quebrar a separação no daltonismo ao ajustar as cores à mão) e **escala + cobertura parcial com os números do anexo como fixture**. O critério de cobertura é *"toda regra que decide algo tem um teste"*, não porcentagem. Rodam **antes** do build no CI.
- **Arquitetura do app:** cinco camadas com dependência descendente (componentes → stores → domínio → fronteira/dados → estático). Só a camada de fronteira conhece a Lightweight Charts; o domínio é puro e testável. **O gráfico é espelho do store, não dono do estado** — a janela visível volta por callback explícito do adapter.
- **Governos (D5):** JSON em `dados/governos/` (índice + um arquivo por entidade); `inicio`/`fim` guardam **exercício efetivo**, não mandato formal, e nunca são derivados de regra; reeleição são mandatos separados agrupáveis por `titular`; **nenhuma cor, nem no dado nem derivada** — a identificação por partido é **logo pequeno + sigla** (trilho e ficha) e o rótulo da faixa traz governo e sigla; municipal suportado pelo modelo mas não populado.
- **Cobertura parcial da célula** *(generalizada em 2026-10-14)*: qualquer célula cujo Δ **não cobre o mandato inteiro** é marcada — não só o mandato em curso, também a série que começa depois do início do mandato (o MVG-R no "Lula I" só existe a partir de 03/2004, então aquele Δ cobriria 34 dos 48 meses). Faixa **hachurada** no gráfico cortando no último dado disponível, mesma linguagem no trilho, e na matriz o **período real usado** dentro da célula. Consequência: não é preciso mostrar contagem de pontos — o período real é informação de verdade; contagem de pontos, não.
- **Estados (carregando, erro, vazio):** regra única — **nenhum vazio silencioso**, todo lugar onde falta dado diz por quê. Carregamento com esqueleto na forma do conteúdo e progresso por série; erro de uma série é degradação parcial (o resto da tela segue usável), não tela de erro; e a matriz tem estados de célula distintos, nunca `0` nem `—`.
- **Sem legado.** Nada da camada atual é preservado: sem fase de convivência entre as duas páginas, sem flag de alternância, sem `index.html` carregando dois caminhos. O `/` vira o shell e o legado é apagado. Substitui a restrição nº 1 da D7.
- **Build e integração:** Vite com fonte em `sitio/app/` e `package.json` próprio; saída em `assets/js/app/` com **nome fixo**, gitignored, construída no CI e cacheada pelo `?v=` do projeto. Tailwind **não precisa de configuração nova** (o v4 varre `.svelte` sozinho) — mas **arquivo no `.gitignore` não é varrido**, e a falha é silenciosa, então o CI ganha uma **checagem de classe-canário** que falha o build. Loop de dev: `vite dev` com fixture. Atribuição do TradingView no **rodapé global** + `NOTICE`.

### Decisões tomadas na execução das fatias 00–06 (2026-10-14/15)

O detalhe canônico continua sendo a spec; isto é o registro do que foi decidido **durante a
execução** e que ainda não estava em nenhum documento durável. As demais decisões de execução
já estão consolidadas nas seções acima — nominalmente, não se repetem aqui.

- **Os números de razão publicados na §5 são sobre valores crus — as fixtures dos testes é que
  não são.** As fixtures do anexo têm amplitudes arredondadas a 2 casas, então
  `50.337.190 ÷ 42,22 = 1.192.259,4`, e não o `1.192.196` que a §5 publica. Os testes travam o
  que **as fixtures produzem**, e o plano diz por que diverge do publicado. *Custo se errado:*
  nenhum no código — o teste continua pegando regressão; o que se perde é a leitura direta do
  número da §5 como se fosse o que a suíte mede.
- **O catálogo não valida `unit`.** `sitio/indicators.json` é curadoria de apresentação (a tabela
  da §6 já diz isso), então a unidade **não** é assunto dele: quem valida é o `validateSeries`, no
  caminho canônico, e o `validateUnit` fica **estrito** (um `percentage` sem `symbol` é recusado).
  Uma tentativa de relaxá-lo para acomodar o catálogo foi revertida. *Custo se errado:* duas
  fontes de verdade para a mesma unidade, que é exatamente o que a §6 proíbe.
- **O store do mandato não lê o store das séries.** O Δ é `deltaNoMandato(series, mandato)` — uma
  função pura — e quem compõe os dois é o consumidor (a matriz, na fatia 09). O `mandate.js` não
  importa `series.js`; a proibição é do **import**, não de um comportamento observável, então o
  teste a verifica lendo o fonte. *Custo se errado:* a camada de mandato passa a depender de estado
  de UI, e o Δ deixa de ser reconstruível a partir de dois argumentos.
- **A unidade vem da SÉRIE, nos dois caminhos de carga.** `adicionarSerie` e `tentarNovamente`
  gravam `unit: series.unit` — não do registro do catálogo. *Custo se errado:* a **mesma** série
  aparece com unidades diferentes conforme tenha carregado de primeira ou por retentativa.

> **Nota de rastreabilidade:** as decisões de execução que **não** são de produto — batching de
> dispatch, escolha de modelo, `NODE_ENV`, `task-brief` e o idioma dos identificadores — não sobem
> para cá. As que descrevem o **ambiente** desta máquina vivem no `AGENTS.md`, onde quem executa
> olha primeiro.

### Decisões e reaberturas da fatia 07 (2026-10-15)

- **🔴 A §12.2 foi REABERTA — a decisão do `lastValueVisible` foi tomada sem medir o eixo.** A
  §12.2 tinha notado o sintoma (*"os rótulos invadem a coluna dos números do eixo"*) e o aceitou
  como custo, sem medir o quanto piora. Medido agora, com 10 séries divididas nos dois eixos:
  ~8 rótulos empilhados lendo `10.00` no eixo esquerdo. **É o mesmo problema da §12.2 — a pilha
  de rótulos — só que no eixo em vez da ponta.** O que **continua** decidido: a ponta não é o
  canal redundante; o canal é a legenda. O que **não está** decidido: se o rótulo de valor por
  série sobrevive. Três saídas registradas na spec, nenhuma medida. O conserto é da camada de
  gráfico e exige o mesmo método que fechou a §12.2 — **medir, não estimar.**
- **🔴 Contradição aberta entre a §1 e o `AGENTS.md` sobre tema.** A §1 diz *"uma página única,
  **tema escuro**"*; o `AGENTS.md` diz que dark mode é class-based e que se deve sempre parear
  com variantes `dark:`. Os componentes seguiram o `AGENTS.md` (claros por padrão) e o canvas do
  gráfico segue a §1 (escuro fixo, `FUNDO = '#0e1117'`) — resultado: página clara com canvas
  escuro. **Não é inconsistência de código: são dois documentos que se contradizem, e nada os
  obrigava a se encontrar.** Decisão pendente: qual dos dois é a fonte, e o outro se alinha.
- **A casca monta marcadores de posição e cada tarefa troca o seu** — a única ordem que funciona:
  T2–T5 precisam de página montada para se verificar, e import de arquivo inexistente quebra o
  build. O `data-bloco` sobrevive ao componente real, então a ordem da §1 fica conferível por DOM
  depois de tudo montado.
- **O aviso de escala — calculado desde a fatia 05 e nunca exibido — passou a ser renderizado**
  (a legenda), nos dois graus da §5: `avisa` acima de 50×, `ilegivel` acima de 1.000.000×. O item
  já estava anotado no `AGENTS.md` como pendência sem dono; a fatia 07 era a dona e **o plano não
  o carregava**. Fica o registro: uma pendência escrita com dono não é suficiente se o plano
  seguinte não a lê.
- **A janela do gráfico não age num gráfico sem barra nenhuma** (`setVisibleRange`/`fitContent`
  lançam `Value is null` com zero barras). Defeito da fatia 06, achado pela 07. A guarda está no
  adapter; **a alcançabilidade no app foi medida por terceiro, não pelo controlador** — registrado
  como tal, não como provada.

### Migração dos dados — fatia 11 (2026-10-15)

- **Os 13 JSONs publicam o schema canônico** (`dados/`, commit `dbc0035`): `schema:1`, `id`,
  `unit`, `granularity`, `source`, e `data:[{date, rate, value}]` — **`rate` e `value` iguais** na
  fase de convivência (§6). Nenhum valor mudou; a conversão é de forma, provada par a par.
  A **célula de publicação nos notebooks ficou adiada** por decisão do usuário — a conversão é a
  ponte até uma re-execução no Colab. **Os notebooks são a fonte; o script não os substitui.**
- **A dedupe de mês repetido atingiu 4 arquivos, não 2** — `caged`, `mvgr-nominal`, `mvgr-real` e
  `pib-real-anual` (o plano previa só a MVG-R). Em `mvgr-real` os dois valores repetidos eram
  **diferentes**; ficou o posterior. O efeito não é só na MVG-R: a matriz da §7.3 mudou em
  **duas colunas** (Lula I e Dilma II), e o anexo mudou contagens (`caged` 371→368, `mvgr-*`
  259→257, `pib-real-anual` 32→30). Re-medido e escrito com data (`704ac16`); **agregados
  intactos** (104 células · 4 sem cobertura · 1 ponto único · 15 abaixo do esperado).
- **🔴 Terceira contradição de documentação: §6 × §12.1, sobre onde mora a `unit`.** A §6 (e a
  R16, "o catálogo não valida `unit`") põe a unidade em `dados/`; a **§12.1 exige** a unidade no
  `indicators.json`, porque o **distintivo de escala da linha renderiza ANTES de a série
  carregar** — sem ela o distintivo fica em branco em silêncio. O código segue a §12.1 e mantém
  o campo. **A §6 está errada sobre isto, ou a §12.1 está — decidir qual.** Terceira vez nesta
  série de fatias que dois documentos se contradizem sem nada que os obrigue a se encontrar
  (as outras duas: §1 × `AGENTS.md` sobre tema; e o caminho relativo que a spec publicava errado).
- **O `source` saiu do `indicators.json`** (13×): a ficha o lê da **série carregada**, e nenhum
  template vivo o usava — só o `chart-manager.js` legado, que a fatia 10 apaga.

### Tema, local e a reabertura do E2E (2026-10-15)

- **O app é escuro, só.** A §1 ("tema escuro") **vence** o `claro + dark:` deste `AGENTS.md`.
  Decisão do usuário, tomada ao ver o defeito na tela: página clara com canvas escuro. O que
  resolveu foi **uma linha** — `class="dark"` no `<html>` do `app/index.html` — porque os
  componentes já tinham as 143 variantes `dark:` escritas e o `dark:` do projeto é por classe
  (`html.dark`, ver `assets/css/main.css`). **O site Jekyll não é afetado**: o `index.html` do
  app é entrada própria. Isto encerra a contradição §1 × `AGENTS.md` **na direção da §1**;
  o `AGENTS.md` é que precisa mudar, e é o único dos dois que ainda diz o contrário.
- **Local serve dado LOCAL.** O app buscava dois conjuntos de dados de formas diferentes: as
  séries pelo `datafile` do catálogo, e os **governos por uma URL publicada hardcoded**
  (`stores/mandate.js`). A segunda funcionava em produção por acidente e **falhava em dev** —
  o trilho de mandatos aparecia vazio. Agora o dev server serve `/dados/**` do repo irmão
  (`../../dados/`, **não** `../dados/` — são repos separados) e um `define` do Vite troca
  `__BASE_DADOS__` por `/dados` em `serve` e pela URL do Pages em `build`. **Conferido: o
  artefato de produção continua com a URL do Pages.**
- **🔴 A §10.7 foi reaberta: E2E passa a ser "sim".** A tabela decidia "não por ora", com o
  argumento de que o build do CI e a classe-canário (§10.3) cobriam o encaixe. **O argumento
  caiu por medição, três vezes:** a fatia 07 ficou sem Tailwind em silêncio, a 06 ficou sem o
  eixo duplo, e a 07 de novo com o `setVisibleRange` lançando no gráfico vazio. **Nos três a
  falha era silenciosa e nos três só uma captura de tela pegou** — a classe-canário cobre um
  caso (o Tailwind) e é cega para os outros dois. Captura continua necessária (é ela que vê o
  desenho) mas **exige que alguém olhe**; o E2E é o que faz o CI recusar sozinho.

### O gesto do minimapa (2026-10-15)

- **O arrasto era ABSOLUTO, e as pontas não tinham alça.** Cada `pointermove` re-centrava a
  janela no cursor (`from = centro - meia`), então **10px de mouse saltavam ~5 anos** — e com a
  ponta batendo no limite do dado a janela colapsava na borda: o "zoom numa fatia mínima"
  relatado pelo usuário. E como `meia` era constante, **redimensionar não existia**. Corrigido
  em `chart/navigator.js`: o gesto passou a ser **relativo** (guarda onde o ponteiro agarrou e
  aplica a diferença) e as pontas ganharam alça com 6px de tolerância e cursor `ew-resize`.
  Medido depois: mover 120px desloca ~2,9 anos **mantendo a largura**; agarrar a borda esquerda
  move **só** `from` com `to` parado.
- **Dois erros meus no caminho, os dois de UNIDADE** — e é a segunda vez que este arquivo cobra
  isso (o comentário do `mostrarJanela` já avisava). Primeiro comparei **segundos com pixels** no
  clamp (`coordinateToTime` devolve ~1,7e9; a coordenada é ~800) e a função passou a devolver
  `null` **sempre**. Depois confundi o **espaço do container com o do gráfico**: a lib reserva
  faixa para as escalas de preço, então o pane tem 1010px onde o container tem 1120 — **54px de
  erro** contra 6px de tolerância, e a alça nunca era encontrada. A conversão agora acontece
  **uma vez**, na entrada do gesto, e os nomes dizem a unidade.
- **🔴 O gesto do minimapa NÃO tem teste, e isto está registrado no arquivo.** Três testes E2E
  foram escritos e ficaram `fixme` (`app/e2e/minimapa.spec.js`): rodando só aquela spec, em três
  execuções seguidas falharam **3/3, 1/3 e 2/3**, e as falhas migram entre os testes — logo não é
  o gesto. Cinco abordagens foram tentadas e descartadas (esperar por estado, assentamento,
  achar a alça pelo cursor — esta ficou —, `scrollIntoView`, repetir o gesto 4×). **Hipótese
  aberta e não confirmada:** `adapter.js:79` — `setVisibleRange` dispara o mesmo callback que
  escreve na store, então a escrita programática **volta** com o valor que o gráfico aplicou. Uma
  guarda de eco foi tentada e **piorou** (5 falhas em vez de 2); revertida. Enquanto isto não
  fechar, a verificação do minimapa é captura de tela — o que é precisamente o que a §10.7
  reabriu para não depender.
  **→ Fechado em 2026-10-19:** a hipótese do eco estava **errada** (o eco converge); o que tirava a
  janela do usuário era o fit automático e o `setData`. Ver a seção *"O gesto do minimapa tem teste,
  e ele achou DOIS defeitos do app"*, abaixo.





### Estado inicial: divulgação progressiva (decidido) e a busca duplicada (2026-10-17)

- **DECIDIDO — o estado zero vira minimalista: o shell (filtros, trilho, comparação) só aparece
  quando há série a controlar.** No zero a página mostrava três controles **sem alvo**: filtros
  desabilitados, 9 caixas de mandato que só acendiam, e uma promessa de matriz. **Medido no app
  real (2026-10-17):** os três somam **124 px de conteúdo + 48 px de gaps = 172 px**, i.e. **47%
  do shell de 364 px** no zero; escondendo-os o shell cai para **192 px**. Ao entrar a 1ª série o
  conteúdo cresce **+665 px** sob a casca fixa contra **+837 px** sob a divulgação — mas **o
  gráfico domina os dois**, então o custo marginal de esconder (172 px) é pequeno; a preocupação
  da §9.2 com o salto não se paga aqui. **Regra implementada:** `mostrarCasca = itens.length > 0
  && !todosCarregando` — enquanto carrega, o `Esqueleto` do bloco 3 já desenha a forma (§9.2). A
  **ordem** da §1 não muda; só a **presença** vira condicional. **Custo honesto:** três E2E
  codificavam a filosofia antiga (`casca.spec`, `exemplo.spec`, `trilho.spec` afirmavam os blocos
  no zero) e tiveram a **intenção** reescrita — não foi troca de seletor. **Alternativas
  rejeitadas:** (A) manter a casca desabilitada-com-motivo — mostra o que a ferramenta faz, ao
  custo de encher a abertura de controle morto; (C) substituir os três blocos por **uma linha
  única** ("Filtros, mandatos e comparação aparecem quando você adicionar uma série") — preserva
  "nada silencioso" e o layout estável sem controle morto, mas é a **pedagogia que a §9.1 já
  rejeitou**. A captura do zero está em `app/e2e/.artefatos/casca-tema-escuro.png`.
- **A busca aparecia DUAS vezes no estado inicial — essa saiu.** A §1 põe a barra de busca no
  topo (bloco 1, presente em todo estado) e o `EstadoInicial` tinha um segundo "Buscar
  indicador…" dentro da caixa vazia. No estado em que não há o que controlar, a tela mostrava
  dois campos idênticos. O campo do `EstadoInicial` foi **removido**; a busca passou a ser só a
  do topo, e a caixa inicial ficou com o que ela acrescenta de fato — o atalho "Selic × IPCA".
  **A §9.1 continua valendo** ("um campo que abre a busca, mais um atalho de exemplo"): a página
  segue com um campo (o bloco 1) e o atalho; o que saiu foi a redundância, não o campo. Sem
  churn de teste: todos os E2E abrem a busca por `.first()` no botão do topo, que é o que ficou.

### Fechamento da fatia 10/T5 e da 11/T4 — e a 11/T3 caindo por conflito (2026-10-19)

- **A atribuição do TradingView saiu (fatia 10/T5).** O `NOTICE` existe com o **texto da licença
  Apache-2.0 verbatim** (v5.2.1, lido de `node_modules/lightweight-charts/LICENSE`) e o link está no
  **rodapé global** (`src/components/Footer.astro`) — não na página do gráfico, que era a alternativa
  que quebraria em silêncio. Duas decisões **além** do texto da spec (§10.5), porque o texto não
  bastava: a licença é **publicada** (`scripts/preparar-publico.sh` → `public/NOTICE` → `dist/NOTICE`),
  porque quem redistribui o binário tem de **entregar uma cópia** a quem o recebe; e a atribuição
  ganhou **guarda** (`scripts/testar-atribuicao.sh`, encadeada no `verificar`), que prova o `<a>`
  **inteiro** (href, nome como texto do link, `rel="noopener noreferrer"` com `target="_blank"`).
  **Alternativa rejeitada:** só o `NOTICE` no repo — cumpre a letra do plano, não a licença.
- **O `rate` saiu do contrato publicado (fatia 11/T4).** Os 13 JSONs publicam **só** `value`; a
  retirada é de **forma**, não de conteúdo — provado por comparação: 2.439 pontos antes e depois,
  `date`/valor **idênticos**. O alvo era um **script único**, `dados/converter-schema-canonico.py`,
  e não "a célula canônica de cada notebook" como o plano dizia (essa célula **não existe**; os
  notebooks seguem no shape legado e o converter aceita `rate` **ou** `value` — é o único ponto de
  canonicalização). **A ordem de deploy do §6 não mudou:** os commits estão ordenados
  (`dbc0035` convivência → `f9741ed` sem `rate`), então `main` pode receber a convivência primeiro.
  Adiantou-se a **autoria**, não a **publicação**. **Alternativa rejeitada:** deixar o `rate` no repo
  até o dia do push — custaria refazer o trabalho e não ganharia nada, já que nada foi enviado.
- **A 11/T3 caiu — e a queda é o registro.** O plano mandava **tirar a `unit` do
  `sitio/indicators.json`** (§6). A **§12.1** é emenda posterior e manda o contrário: o **distintivo
  de escala tem de aparecer antes de a série carregar**, e é do registry que o app lê a unidade.
  Executar a T3 teria apagado o distintivo **em silêncio**. A `unit` **fica**. O `comparabilidade`
  também **não** entra à mão: a §6 já diz que ele é **função pura dos dados**, não campo curado.
  Registrado no plano (marcado SUPERSEDED) e no ledger.
- **O `--check` do converter era um no-op — e virou verificador de verdade.** Ele só chamava
  `converter(..., escrever=False)`: o `help` prometia "só compara" e não comparava nada. Agora compara
  o disco com a saída canônica e **falha (exit 1)** apontando arquivo e divergência. **Limite
  registrado no próprio script:** ele verifica **forma** (chave `rate` residual, metadados, contagem,
  deduplicação, chaves extras) e **não** integridade de **valor** — como o converter normaliza o
  arquivo em disco, um valor trocado é ponto fixo da conversão, e não há fonte independente no repo.

### O gesto do minimapa tem teste, e ele achou DOIS defeitos do app (2026-10-19)

Os três E2E do minimapa saíram do `fixme` — e o caminho até lá é o registro que importa, porque o
obstáculo **não era o gesto** (já corrigido em 2026-10-15). Eram dois defeitos do app, ambos
jogando fora a janela do usuário **logo depois** de ele a escolher. Medidos, não inferidos
(`app/scripts/medir-janela.mjs` reproduz os dois; foi o instrumento que produziu estes números):

- **O fit automático não ouvia o filtro de tempo.** O `fitContent` adiado de `adapter.js` (150ms)
  era desarmado só por gesto **no gráfico grande** (`pointerdown`/`wheel`); **clicar num preset não
  contava**. Corrida medida: o fit dispara ~20-40ms depois de o filtro habilitar, e o preset só
  escreve ~60-86ms depois do clique — quando a ordem invertia, o preset ia para o lixo.
- **`setData` move a janela visível.** Uma série cuja data **ESTENDE o domínio de tempo** desloca o
  range ao entrar: medido, `selic-meta-acum-12m` (320 barras) levou `2015-06→2025-06` a
  `2020-08-31→2025-10-31` (1887d); **re-setar a MESMA data não move**. O eco do adapter aceitava a
  mudança como se fosse escolha do usuário.
- **A hipótese que estava registrada acima (o "laço de eco do `adapter.js`") estava ERRADA.** O eco
  devolve o **mesmo** valor e converge; o que clobberava a janela era o fit e o `setData`.
- **Terceiro achado, de um frame:** o fit adiado tem **duas etapas** (`setTimeout` →
  `requestAnimationFrame`), e o `assumir()` cancelava só o timeout. Escolhendo o preset entre as
  duas, o rAF pendente ainda rodava `fitContent()` e enquadrava o alcance TOTAL — uma corrida de um
  frame, que fazia "redimensionar" falhar **1/30** com o teste correto.

**A decisão: AUTORIA da janela** — um conceito só, no lugar de dois remendos. Quem **ESCOLHE** a
janela (preset do filtro de tempo, arrasto do minimapa, gesto no gráfico grande) **declara**; daí
em diante (a) o fit não roda e (b) uma atualização de **DADO** não a move (o adapter guarda a janela
e a devolve no **frame seguinte**, porque `setVisibleRange` na mesma volta do `setData` não pega).
`"Tudo"` (`resetarJanela`) avisa `false`: não é uma janela, é a **ausência** dela — o fit é
**rearmado**.

Três decisões de forma, com alternativa rejeitada:

- **A autoria viaja como EVENTO, não como estado** (`aoEscolherJanela` em `stores/viewport.js`). A
  forma da store fica `{from, to}` — é o que a barra de filtros lê e o que o `viewport.test.js`
  afirma. **Alternativa rejeitada:** um campo booleano na store (muda a forma que os dois lados leem).
- **O adapter guarda e DEVOLVE a janela, em vez de a store nunca saber da mudança.** **Alternativa
  rejeitada:** suprimir a escrita da store durante o `definirSeries`. O valor errado vive **um
  frame** (medido: escrita aos 155ms, devolução aos 171ms), e a devolução acontece **antes do paint
  do mesmo frame** — não há piscada a corrigir, e uma guarda que não guarda nada é exatamente o que
  este projeto trata como defeito silencioso.
- **Sem retry no teste.** O `gestoAte` (até 4 tentativas) foi **removido**: afirmar "arrastar desloca
  a janela" com retry transforma falha determinística em sorte e o teste deixa de provar a primeira
  tentativa, que é a que o usuário faz. O teste agora arrasta **para a esquerda**, porque o preset
  ancora a janela na **última data** (`"voltar de qualquer zoom"`) e para a direita o arrasto é
  clampeado — 0/4 medições de efeito, que era a outra metade do falso vermelho.

**Verificação:** 60 execuções do gesto (`--repeat-each=10` × duas baterias) com **0 falhas** no
código final (antes: 3/30 e 1/30). O teste de regressão novo (`exemplo.spec.js`, "a janela escolhida
sobrevive a adicionar série") foi sabotado **nos dois mecanismos, na causa exata**, e fica **vermelho
nos dois**. Referência: `app/e2e/minimapa.spec.js` tem o registro completo, inclusive as cinco
abordagens descartadas.

### O celular ganha guarda — e a auditoria de largura achou dois defeitos (2026-10-19)

A pergunta "o site está renderizando bacana em mobile?" virou medição. O contexto que a motivou: o
E2E tinha **um** projeto, desktop, e **nenhuma** asserção olhava a largura da tela.

**O que a medição achou.** Site e app **funcionais** de 320px para cima: nenhum transbordo no
documento em página nenhuma, o app empilha, e a tabela de comparação e a fileira de chips rolam. No
**app**, porém, dois defeitos de largura — os dois invisíveis para os 144 unitários e para os 20 E2E
de comportamento, porque nenhum deles olha a largura (números em §12.1.1 da spec).

**Três decisões:**

- **Dois projetos de Playwright** (`desktop` e `mobile`), com a suíte inteira rodando nos dois.
  **Alternativa rejeitada:** um segundo arquivo de config — o projeto do Playwright já é isso, e dois
  configs seriam dois lugares para a suíte divergir.
- **O descritor mobile é `Pixel 7` (Android/Chromium), não iPhone.** O CI instala **só o chromium**
  (`playwright install --with-deps chromium`); um descritor WebKit não sobe lá. **Custo medido:** a
  suíte vai de ~50s para ~1,7min.
- **O guarda das páginas do SITE não pode morar no E2E.** O E2E roda contra o dev server do Vite e,
  em CI, vem **antes** do `astro build` — quando `dist/` ainda não existe. Ele virou
  `sitio/scripts/testar-mobile.mjs`: mede as **20 páginas** de `dist/` a 375px e entra na cadeia do
  `verificar`. **Alternativa rejeitada:** pô-lo no E2E, onde em CI ele varreria uma pasta que ainda
  não existe — guarda que não guarda nada.

**Achado de tabela, no mesmo dia:** `devices['Desktop Chrome']` traz `viewport: {1280, **720**}`, e o
`use` do projeto **sobrepõe** o do topo. O "desktop 1280×900" documentado rodava a **720**, em
silêncio, desde que o config nasceu. Cada projeto agora declara o `viewport` que quer.

**O Giscus 404 NÃO é defeito**, e fica registrado para não se reinvestigar. O widget sonda a
Discussion pelo título e recebe 404 enquanto ela não existe; o giscus **cria** a Discussion no
**primeiro comentário** — a única que o repo tem foi criada exatamente assim (por `giscus[bot]`, com
o texto do comentário). Provado: com o título de uma Discussion existente a mesma API responde
**200**; `repo-id`/`category-id` do site batem com a API; e o visitante vê a caixa funcional
("Escreva · Prévia · Entre com GitHub"). Um 404 de sondagem não vira correção.

**Verificação:** **44 E2E passam, 2 puladas** (as de celular, no desktop) + **144 unitários**; o
canário e o ramo de transbordo do `testar-mobile.mjs` **sabotados na causa exata** — servindo o
`.css` como `text/plain` e medindo a 150px — e o script **sai 1** nos dois.

### A data do dado: uma convenção só, medida no crosshair (2026-10-19)

**O gatilho foi uma observação de tela, não um teste:** ao passar o mouse sobre "Selic × IPCA" (o
exemplo do próprio site), a bolinha do crosshair aparecia **ora numa linha, ora na outra, nunca nas
duas**. O usuário levantou a hipótese: "será que as datas das séries estão divergentes?". Estavam.

**O que a medição achou.** `selic-meta-acum-12m` (320 pontos) carimbava no **último dia do mês** e
`ipca-acum-12m` (355) no **dia 01**: **zero datas em comum** (a união tinha 675 = 320 + 355, ou seja,
nenhuma colisão), com 315 dos 320 pontos da Selic a **1 dia** de um ponto do IPCA — as duas grades se
intercalavam. No catálogo inteiro havia três convenções: fim do mês (`selic-meta`, `selic-over`,
`igpm`), dia 01 (as outras nove) e dia 15 (`homicidios-armas-fogo-anual`, cujo irmão usa dia 01).

**Por que a bolinha não podia aparecer nas duas.** Lido no fonte da lib (e não inferido): o crosshair
resolve **um** `timePointIndex` a partir do x, e cada série só desenha o marcador se tiver um ponto
**exato** naquele índice (`valueAt` com `MismatchDirection.None`); o `CrosshairMode.Magnet` (default
da v5) ajusta só o **y**. Medido num spike com o dado real, varrendo 271 posições: **0** com as duas
bolinhas; com a mesma grade em ambas, **254 de 254**.

**Decisão: a data é o primeiro dia do período de referência — dia 01 do mês (anual: 1º de janeiro).**
É a convenção da própria fonte (o SGS carimba `01/04/2022` para abril) e a que 9 das 13 séries já
usavam. Aplicada **só aos JSON publicados**; os notebooks **não** foram tocados (decisão do usuário).
Alternativas rejeitadas: **(a) desenhar o marcador no ponto mais próximo de cada série** — o marcador sairia do x do crosshair e passaria a mentir sobre quando o
valor existe; **(b) avisar que as grades divergem** — honesto, mas deixaria a comparação no mesmo x
misturando **meses diferentes** (Selic de maio desenhada ao lado do IPCA de junho); **(c) não fazer
nada** — a divergência de ~29 dias entre o mesmo mês de referência cresce com o zoom.

> ⚠️ **Correção (2026-10-28): o aplicador citado não existia.** Esta decisão dizia que a mudança foi
> aplicada por `dados/canonicalizar-dados.py`; esse arquivo não está no histórico do repo `dados` e
> `igpm-acum-12m`, `selic-meta-acum-12m` e `selic-over-acum-12m` continuavam carimbando o **fim** do
> mês. A canonicalização foi feita de fato em 2026-10-28, sobre os 3 JSONs, sem script versionado
> (o único conversor do repo, `converter-schema-canonico.py`, só deduplica e adiciona `value`).

**Achado colateral, corrigido junto: o acumulado de 12 meses era soma aritmética.** `ipca-acum-12m`
e `igpm-acum-12m` faziam `.rolling(12).sum()` — soma de 12 taxas mensais, não capitalização
composta. Provado que a fonte era a mesma antes de trocar o valor: a soma aritmética do SGS
**reproduz o disco** em 355/355 e 349/349 pontos (Δ máx 3,5e-15); e o composto
(`prod(1+r) − 1`) bate com a série **oficial** 13522 em **355 meses, Δ máx 0,01**. O valor muda até
**2,00 p.p.** (IPCA, 1995-12) e **5,06 p.p.** (IGP-M, 2021-05). A Selic já era composta (produto
diário) e o `MVG-R` também — eram os dois acumulados os desvios.

**Custo medido na matriz da §7.3:** `igpm`, `selic-meta` e `selic-over` no **Temer** caem de 32 para
31 pontos (o ponto de maio/2016 era `2016-05-31`, dentro de um mandato que começa em `2016-05-12`, e
virou `2016-05-01`, mês de referência da Dilma II). O resumo vira **96 calculáveis + 3 parciais** e as
células abaixo do esperado vão de **15 para 18**.

**Limite honesto, e ele é o preço da decisão:** os notebooks continuam gerando a forma antiga, então
**rodar um notebook reverte o arquivo**. O `--check` do script é a guarda que pega a reversão, e o
item aberto está registrado na spec (junto com a régua da §7.3, que supõe o mês do início dentro do
mandato e por isso marca 13 células do Temer como "abaixo do esperado" sem que estejam).

**Verificação:** 144 unitários e 44 E2E verdes (o teste de medição da §7.3 remedido); captura de tela
no app real mostrando **as duas bolinhas e os dois rótulos de eixo** na mesma vertical.

### O minimapa cobre a área de plotagem — e o dev do site passa a servir dado local (2026-10-19)

**Os dois achados vieram da mesma pergunta do usuário** ("o minimapa não era pra mostrar nada dentro
dele? e a largura não deveria respeitar os limites do gráfico acima?"), e a captura de tela foi o que
separou um do outro: a tela dele não tinha **faixa nenhuma** — nem no minimapa, nem no gráfico grande.

**1. Por que a tela estava sem faixa (defeito de ambiente, não de desenho).** O `npm run dev` do
SITE roda `build:app` em modo BUILD, então `__BASE_DADOS__` caía no ramo de produção e os governos
eram buscados na URL publicada. Medido: `https://brasilemnumeros.github.io/dados/governos/federal.json`
responde **404** (é o item 1 do deploy pendente) — e o `catch` de `carregarMandatos` engole a falha
(§9.3, de propósito). Resultado: gráfico e minimapa sem faixa, sem erro nenhum. **Decidido:** o
script `dev` do `sitio` exporta `DADOS_LOCAL=1`, e o `vite.config.js` trata isso como o `serve` do
app — local serve dado local, também no site. O artefato de produção continua com a URL do Pages
(conferido: `build` sem a variável). Alternativa rejeitada: procurar `/dados` em *runtime* com
fallback para o Pages (esconderia o 404 em produção, que é o que precisa ser visto).

**2. A largura era mesmo mentira — e não era deslocamento, era ESCALA.** Medido no app a 1280px: a
área de plotagem do gráfico grande é `[54, 1064)` (as duas escalas de preço da §5 reservam 54px à
esquerda e 56px à direita) e o minimapa ocupava `[0, 1120)`. A mesma data caía a **−28px** (2003),
**+1,6px** (2011) e **+31px** (2019) — o erro cruzava zero no meio e chegava a ~55px nas pontas.
**Decidido:** o container do minimapa recebe margens iguais às larguras das escalas, lidas da
própria lib (`priceScale('left'|'right').width()`), porque elas acompanham os rótulos. Verificado:
as duas áreas ficam **idênticas** (erro 0,0px nas pontas) e as faixas caem sob as do gráfico acima.

Rejeitadas, com o motivo medido:

- **`minimumWidth` nas escalas** (a opção que a doc da lib sugere para empilhar gráficos): com a
  escala **invisível** a lib reserva **0** — medido `width()` = 0 e o canvas ocupando os 600px
  inteiros do teste. Não reserva nada.
- **Número fixo (54/56px)**: a largura da escala depende do rótulo; uma série com números maiores
  alarga o eixo e o minimapa voltaria a desalinhar, em silêncio.
- **`padding` no container**: a lib posiciona o canvas a partir do *padding box*, então o pane
  continuaria largo. Com margem, a caixa do container é a própria plotagem.
- **Não mexer**: a cortina do minimapa é justamente o "onde eu estou"; 31px de erro numa barra de
  1120 é visível e faz a informação mentir.

**Resíduo aceito e medido:** as áreas são idênticas, mas o `fitContent` do minimapa deixa um range
lógico fracionário (`0,709…358` contra `0…358` do gráfico), então a mesma data cai até **1,5px** à
esquerda (0,15% de 1010px). Tentados e descartados: `setVisibleLogicalRange(0…n−1)` e
`setVisibleRange` com as pontas do dado — a lib **renormaliza** o range do minimapa depois do
resize e o valor volta a 0,709. Não vale mais código para 1,5px; o número está no código e na spec.

**Verificação:** 144 unitários e **46 E2E** verdes (o teste novo compara a caixa do minimapa com a
área de plotagem, não com o container — comparar com o container passaria com o defeito); capturas
no app (5173) e no **site** (4321) com as faixas presentes e alinhadas.

### O clique no mandato FILTRA o período — e a §2 reaberta (2026-10-19)

**Pedido do usuário, literal:** *"os botões abaixo de mandato desejo que filtrem o período"* →
*"simples, filtra apenas aquele mandato"*. Até aqui o trilho era um SELETOR puro: o clique realçava a
faixa e não mexia na janela. Agora o mesmo clique **enquadra** o gráfico no período do governo.

**A §2 tinha rejeitado exatamente isto** ("o mandato vira o enquadramento... rejeitado por competir
com o zoom pelo mesmo estado"), e o motivo era bom *quando foi escrito*: sem autoria de janela,
enquadrar pelo mandato seria mais um escritor no mesmo estado, e o fit automático desfaria a escolha.
A **§8.1** (posterior) resolveu o conflito — quem escolhe **declara** a autoria (`escolhaDoUsuario`)
e o dado deixa de mover a janela. Com isso a rejeição perdeu o fundamento e o usuário decidiu
reverter. **O que segue rejeitado é o isolamento** (esmaecer o resto e torná-lo inalcançável): a
janela enquadra, mas o resto continua alcançável pelo minimapa.

**Decidido:**

| situação | comportamento |
|---|---|
| clique num mandato fechado | janela = `inicio`…`fim`, com `escolhaDoUsuario: true`; a faixa acende |
| clique no mandato **em curso** (`fim: null`) | janela = `inicio`…**última data disponível** (`dataMaxima`) |
| clique de novo no mesmo | `limparSelecao()` + `resetarJanela()` → intervalo completo |
| clique num preset de tempo | `limparSelecao()` — **um dono por vez** |

**A última data disponível é a peça que exigiu código, e não é cosmética.** `fim: null` não pode ir
cru para o adapter: lá o `null` significa "mantenha a borda direita ATUAL", então o filtro do mandato
em curso ficaria amarrado à janela anterior (medido: a ponta direita tinha de ser recente e não
nula). A função pura `janelaDoMandato(mandato, dataMaxima)` (em `domain/mandates.js`) fecha a ponta.
`dataMaxima` deixou de ser cálculo local do `TimeFilters`: virou `dataMaximaStore`
(`stores/series.js`), **uma fonte só** — o filtro de tempo conta os "10a" a partir dela e o trilho
fecha a janela nela; duas cópias divergiriam.

**Um dono por vez é regra, não coincidência.** Os presets de tempo derivam o "aceso" da **duração**
da janela. Um mandato de 4 anos contra o preset de 5 anos fica a **1,0** (tolerância 0,5), então hoje
nenhum preset acenderia por acidente — mas "quase" não é guarda: a coincidência depende do dado (um
mandato de 5 anos exatos acenderia o "5a", e Dilma I tem 2011-01-01→2014-12-31 = 4,00 anos, medido).
Por isso `ativo()` e `tudoAtivo` ganharam a guarda `selecionado === null`, e os dois lados limpam a
seleção do outro.

**Resíduo declarado:** arrastar no minimapa (ou dar zoom no gráfico) move a janela **sem** desmarcar
o mandato — o botão segue aceso enquanto a janela é outra. O gesto não estava na decisão; fica aberto
em AGENTS.md ("Aberto, sem bloquear").

#### O defeito que o caminho novo acordou: intervalo invertido

Ao escrever o teste "escolher um preset desmarca o mandato", a lib lançou
`Assertion failed: right should be >= left`. A causa **não** era o mandato: o preset de tempo
declarava só a ponta ESQUERDA (`from: dataMaxima − N anos`) e o adapter completava a direita com a
janela **ATUAL** — o que sempre foi verdade *por acidente*, porque a janela atual sempre terminava em
`dataMaxima`. Com um mandato escolhido a atual está no **passado**: medido `from = 2015-10` e
`to = 2006-12`.

Dois consertos, e a razão de serem dois:

1. **A fonte** (o que estava errado): o preset passou a declarar as DUAS pontas
   (`from: fromDe(preset)`, `to: dataMaxima`) — que é o que a própria documentação dele já dizia
   ("ancora a janela na última data"). Ele deixa de depender do que está na tela.
2. **A guarda** (o que impede o silêncio): 🔴 em DEV a lib **lança**, mas o build
   `standalone.production.mjs` **remove as asserções** e desenharia errado em silêncio — a armadilha
   que o AGENTS registra. `adapter.definirJanela` passou a recusar um par invertido (`to < from`) com
   `console.warn` e **sem tocar no gráfico**. A guarda mora no adapter (a última linha antes da lib)
   e não na store: um par de UMA ponta continua sendo preenchido com o que está na tela, e é **essa**
   combinação que inverte — uma validação na store não pegaria o caso.

**Provado por sabotagem** (regra do projeto): removida a guarda, o teste novo falha com o erro exato
da lib (`pageerror ... right should be >= left`); com ela, passa e o `console.warn` mostra o par
recusado (`{from: 1748736000, to: 1167609600}`).

#### Achado pré-existente, medido — e NÃO corrigido aqui

Com o exemplo carregado, num viewport **estreito** o botão "Tudo" fica **apagado** embora o gráfico
mostre o intervalo completo. Causa: o `fitContent` arredonda o `barSpacing` e a borda esquerda ecoa
em **1996-02-01** contra o dado começando em **1995-12-01** (`dataMinima`) → `tudoAtivo` falso. No
desktop a mesma medida fecha exata. **Confirmado com e sem esta mudança** (probe na app dev, 412px,
antes e depois do `git stash`: idêntico) — não é regressão do mandato. Fora do escopo desta decisão;
registrado em AGENTS.md como aberto.

**Verificação:** **150 unitários** (19 arquivos) e **54 E2E** verdes (2 puladas), nos dois projetos;
capturas no app (5173) e no **site** (4321, servindo dado local) com a janela da Dilma I (eixo
2011–2015), a faixa acesa e **nenhum preset aceso**; nenhuma falha de rede nem exceção. E2E novos no
`trilho.spec.js`: filtra e limpa, mandato em curso com ponta direita, preset desmarca o mandato, e a
guarda do intervalo invertido.

## Consequências

**Positivas**

- Fronteira clara: a camada de gráficos vira uma unidade que dá para entender, testar e evoluir sozinha; o resto do site não é afetado.
- Fim das três duplicações de períodos de governo e do emaranhado de globais, exatamente na camada que mais muda.
- O visual e a interação que são o produto (feel TradingView) passam a ser nativos, não improvisados.
- Base pronta para, se quiser, migrar o site para Astro depois, sem retrabalhar o app.
- Com a D7, a divergência `rate`/`value` deixa de ser dívida herdada pelo front-end, e a comparabilidade passa a ser um dado declarado que sobrevive à chegada de novos indicadores — em vez de uma heurística que precisa ser recalibrada.

**Negativas / riscos**

- ~200–400 linhas de código custom (o primitive das faixas) passam a ser nossas para manter.
- Perde-se o "valores sempre visíveis" nos pontos — o substituto é o readout do crosshair.
- Lightweight Charts é específica para séries temporais financeiras; gráficos genéricos futuros (pizza etc.) exigiriam outra biblioteca.
- Atribuição obrigatória do TradingView.
- Passa a existir um passo de build (npm) no `sitio/`, somando-se ao Ruby do Jekyll. *(Atualizado em 2026-10-14: como não há legado, nada precisa "continuar funcionando durante a transição" — a virada é um commit. O que sobra é a **ordem de deploy** entre os dois repos.)*
- Os plugins de Chart.js (datalabels, annotation, zoom) e o dropdown/modal atuais saem de cena.
- **A D7 acopla os dois repos:** republicar `dados` em formato novo sem coordenar com o `sitio` derruba o gráfico em produção. A mitigação escolhida é a **convivência curta de chaves** (publicar `value` junto de `rate` e retirar `rate` depois) — pela ordem de deploy, não por uma fase de convivência entre páginas, que deixou de existir.
- **A D7 toca notebooks Colab.** Cada família de indicador precisa ser ajustada e reexecutada; o custo não está no site, está no pipeline — e é lá que mora o risco de regressão silenciosa nos dados.

**Neutras**

- `chart-creator.js`, `chart-integration.js`, `multiselect-manager.js`, `config-modal.html` e `multiselect.html` são descartados na camada de gráficos.

## Fora de escopo (não decidido nesta ADR)

- **Automatizar o pipeline de dados** (GitHub Actions em vez de notebooks Colab manuais) — desejável, mas não especificado aqui. A D7 toca os notebooks *manualmente executados*, não a automação deles.
- ~~Migração de stack do site (Astro / Cloudflare Pages)~~ — **a parte do Astro foi decidida na
  ADR 0002 (2026-10-18)**: o site migra para Astro 7 e o Ruby sai. **Cloudflare Pages continua não
  avaliado** e segue fora de escopo.
- Ferramentas de análise (médias móveis). Séries normalizadas a base 100 ficam disponíveis apenas como opção explícita do usuário, nunca como padrão.
- **Fonte e população dos dados de governos.** O modelo comporta `federal`, `estadual` e `municipal`, mas nesta rodada só federal e estadual são o alvo: a fonte candidata é o TSE, e municipal (~5.570 entidades) é projeto de dados por si só.
- Correções dos demais achados da revisão que não pertencem à camada de gráficos (ex.: `jekyll-analytics` ausente do Gemfile, `404.html` com `layout: page` inexistente — **confirmado por build local em 2026-10-14**, o Jekyll emite `Layout 'page' requested in 404.html does not exist` —, `blog_categories` não utilizado por nenhum template, e `tailwind.config.js`, que ninguém lê desde a v4 — **confirmado com o CLI v4.3.3 em 2026-10-14**: apontando o `content` dele para uma pasta inexistente, as classes continuam sendo geradas).

## Próximos passos

1. ~~Mockups do layout~~ **feito** (sessão de 2026-10-14: composição da página, conteúdo da matriz de comparação, interação das faixas, trilho de mandatos, escalas).
2. Desenho da solução em seções, aprovado uma a uma — **em andamento**. Decididas: composição da página, modal de busca, interação das faixas, trilho de mandatos, painel de comparação, escalas, contrato de dados (D7), limite de 10 séries com a paleta medida para daltonismo, cor customizada do usuário, arquitetura do app, modelo de governos (D5), cobertura parcial da célula, estados, build/integração com o Jekyll e testes. Falta: modal de busca no celular, sobreposição dos rótulos na ponta das linhas, logos dos partidos (assets e a questão de uso de marca) e duração visível no trilho. A paleta de 10 exige **remedição se o app ganhar tema claro**.
3. Spec de design em `sitio/docs/specs/` — **escrita** em `2026-10-14-camada-de-graficos-design.md`; seções 1 a 10 decididas e a 12 listando o que falta desenhar.
4. Plano de implementação.

## Referências

- Spec de design da camada de gráficos: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md`.
- Revisão de arquitetura da camada de gráficos (sessão de 2026-10-13).
- Sessão de mockups e desenho de UX (sessão de 2026-10-14).
- `sitio/assets/js/chart-creator.js`, `sitio/assets/js/chart-integration.js`, `sitio/assets/js/multiselect-manager.js`, `sitio/_includes/config-modal.html`, `sitio/_includes/multiselect.html`, `sitio/indicators.json`.
- `dados/*/*.json` (13 séries, 1995–2025) — medição de amplitude que fundamenta a regra de comparabilidade da D7.
- API SGS/BCB: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json`
- Lightweight Charts: `https://github.com/tradingview/lightweight-charts` (Apache-2.0)

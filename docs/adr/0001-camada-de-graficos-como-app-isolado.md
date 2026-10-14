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
- **Arquitetura do app:** cinco camadas com dependência descendente (componentes → stores → domínio → fronteira/dados → estático). Só a camada de fronteira conhece a Lightweight Charts; o domínio é puro e testável. **O gráfico é espelho do store, não dono do estado** — a janela visível volta por callback explícito do adapter.
- **Governos (D5):** JSON em `dados/governos/` (índice + um arquivo por entidade); `inicio`/`fim` guardam **exercício efetivo**, não mandato formal, e nunca são derivados de regra; reeleição são mandatos separados agrupáveis por `titular`; **nenhuma cor, nem no dado nem derivada** — a identificação por partido é **logo pequeno + sigla** (trilho e ficha) e o rótulo da faixa traz governo e sigla; municipal suportado pelo modelo mas não populado.
- **Cobertura parcial da célula** *(generalizada em 2026-10-14)*: qualquer célula cujo Δ **não cobre o mandato inteiro** é marcada — não só o mandato em curso, também a série que começa depois do início do mandato (o MVG-R no "Lula I" só existe a partir de 03/2004, então aquele Δ cobriria 34 dos 48 meses). Faixa **hachurada** no gráfico cortando no último dado disponível, mesma linguagem no trilho, e na matriz o **período real usado** dentro da célula. Consequência: não é preciso mostrar contagem de pontos — o período real é informação de verdade; contagem de pontos, não.
- **Estados (carregando, erro, vazio):** regra única — **nenhum vazio silencioso**, todo lugar onde falta dado diz por quê. Carregamento com esqueleto na forma do conteúdo e progresso por série; erro de uma série é degradação parcial (o resto da tela segue usável), não tela de erro; e a matriz tem estados de célula distintos, nunca `0` nem `—`.
- **Sem legado.** Nada da camada atual é preservado: sem fase de convivência entre as duas páginas, sem flag de alternância, sem `index.html` carregando dois caminhos. O `/` vira o shell e o legado é apagado. Substitui a restrição nº 1 da D7.
- **Build e integração:** Vite com fonte em `sitio/app/` e `package.json` próprio; saída em `assets/js/app/` com **nome fixo**, gitignored, construída no CI e cacheada pelo `?v=` do projeto. Tailwind **não precisa de configuração nova** (o v4 varre `.svelte` sozinho) — mas **arquivo no `.gitignore` não é varrido**, e a falha é silenciosa, então o CI ganha uma **checagem de classe-canário** que falha o build. Loop de dev: `vite dev` com fixture. Atribuição do TradingView no **rodapé global** + `NOTICE`.

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
- Migração de stack do site (Astro / Cloudflare Pages).
- Ferramentas de análise (médias móveis). Séries normalizadas a base 100 ficam disponíveis apenas como opção explícita do usuário, nunca como padrão.
- **Fonte e população dos dados de governos.** O modelo comporta `federal`, `estadual` e `municipal`, mas nesta rodada só federal e estadual são o alvo: a fonte candidata é o TSE, e municipal (~5.570 entidades) é projeto de dados por si só.
- Correções dos demais achados da revisão que não pertencem à camada de gráficos (ex.: `jekyll-analytics` ausente do Gemfile, `404.html` com `layout: page` inexistente — **confirmado por build local em 2026-10-14**, o Jekyll emite `Layout 'page' requested in 404.html does not exist` —, `blog_categories` não utilizado por nenhum template, e `tailwind.config.js`, que ninguém lê desde a v4 — **confirmado com o CLI v4.3.3 em 2026-10-14**: apontando o `content` dele para uma pasta inexistente, as classes continuam sendo geradas).

## Próximos passos

1. ~~Mockups do layout~~ **feito** (sessão de 2026-10-14: composição da página, conteúdo da matriz de comparação, interação das faixas, trilho de mandatos, escalas).
2. Desenho da solução em seções, aprovado uma a uma — **em andamento**. Decididas: composição da página, modal de busca, interação das faixas, trilho de mandatos, painel de comparação, escalas, contrato de dados (D7), ausência de limite de séries, arquitetura do app, modelo de governos (D5), cobertura parcial da célula, estados e build/integração com o Jekyll. Falta: modal de busca no celular, logos dos partidos (assets e a questão de uso de marca), duração visível no trilho e testes. A paleta de 10 está fechada, mas exige **remedição se o app ganhar tema claro**.
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

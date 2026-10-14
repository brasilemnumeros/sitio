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

**D5 — Períodos de governo viram dado.** Passam a ser um JSON versionado com escopo (`federal`, `estadual`), datas de início/fim, rótulo e cor — eliminando as três duplicações atuais e viabilizando a expansão para governos estaduais sem multiplicar regra em código.

**D6 — Custo zero é invariante.** A hospedagem segue estática e gratuita; nenhuma decisão desta ADR introduz custo recorrente.

**D7 — Contrato de dados entra no escopo (emenda de 2026-10-14).** O repo `dados` passa a ser afetado por esta ADR. Os notebooks passam a publicar um **schema de série canônico** — um único nome de campo, unidade explícita, sem divergência entre famílias — e a **comparabilidade entre séries é declarada**, não inferida em runtime: o registro do indicador diz com quem ele pode conviver num mesmo eixo. Uma verificação por magnitude (razão de amplitude acima de um limiar) fica apenas como rede de segurança para combinações não previstas.

Duas restrições acompanham a D7:

1. **A página atual não pode quebrar.** Ela lê `rate` e é servida no ar; a migração de formato exige janela de convivência (formato novo publicado em paralelo, ou leitor tolerante no app antigo até a virada).
2. **O detalhamento do schema e do campo de comparabilidade não é decidido nesta ADR** — vai para a spec de design. Esta emenda registra o escopo e a intenção, não a forma.

### Decisões de design tomadas em 2026-10-14 (rastreabilidade; o detalhe canônico é a spec)

Registradas aqui apenas para que a ADR não contradiga a spec:

- **Composição da página:** painel de comparação em matriz larga, sempre visível, abaixo do gráfico (opção C entre três wireframes).
- **Conteúdo da célula da matriz:** Δ = último − primeiro valor dentro do mandato, **na unidade do indicador**. Sem normalização percentual, sem campo de direção ("queda é bom") no registro.
- **Interação das faixas de governo:** clique **seleciona e destaca**; pan/scroll/duplo-clique dão zoom. Minimapa com o intervalo total. Filtro/isolamento de mandato rejeitado.
- **Trilho de mandatos:** seletor desacoplado do eixo do tempo, uma caixa por governo com largura igual — não é régua temporal.
- **Escalas:** o usuário escolhe o eixo e o app sugere um padrão; séries de magnitude incompatível não entram em silêncio (aviso + escolha entre normalizar e remover).

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
- Passa a existir um passo de build (npm) no `sitio/`, somando-se ao Ruby do Jekyll. A página atual precisa continuar funcionando durante a transição.
- Os plugins de Chart.js (datalabels, annotation, zoom) e o dropdown/modal atuais saem de cena.
- **A D7 acopla os dois repos:** republicar dados em formato novo sem coordenar com o `sitio` derruba o gráfico em produção. A janela de convivência deixa de ser opcional.
- **A D7 toca notebooks Colab.** Cada família de indicador precisa ser ajustada e reexecutada; o custo não está no site, está no pipeline — e é lá que mora o risco de regressão silenciosa nos dados.

**Neutras**

- `chart-creator.js`, `chart-integration.js`, `multiselect-manager.js`, `config-modal.html` e `multiselect.html` são descartados na camada de gráficos.

## Fora de escopo (não decidido nesta ADR)

- **Automatizar o pipeline de dados** (GitHub Actions em vez de notebooks Colab manuais) — desejável, mas não especificado aqui. A D7 toca os notebooks *manualmente executados*, não a automação deles.
- Migração de stack do site (Astro / Cloudflare Pages).
- Ferramentas de análise (médias móveis). Séries normalizadas a base 100 ficam disponíveis apenas como opção explícita do usuário, nunca como padrão.
- Fonte de dados para governos estaduais (candidata: dados abertos do TSE).
- Correções dos demais achados da revisão que não pertencem à camada de gráficos (ex.: `jekyll-analytics` ausente do Gemfile, `404.html` com `layout: page` inexistente, `blog_categories` não utilizado por nenhum template).

## Próximos passos

1. ~~Mockups do layout~~ **feito** (sessão de 2026-10-14: composição da página, conteúdo da matriz de comparação, interação das faixas, trilho de mandatos, escalas).
2. Desenho da solução em seções, aprovado uma a uma — **em andamento**. Decididas: composição da página, interação das faixas, trilho de mandatos, painel de comparação, escalas e contrato de dados (D7). Falta: modal de busca, arquitetura do app Svelte, formato do arquivo de governos (D5), tratamento de erro, testes e integração com o build do Jekyll.
3. Spec de design em `sitio/docs/specs/` — **escrita** em `2026-10-14-camada-de-graficos-design.md`; parcial por construção, com a seção 9 listando o que falta desenhar.
4. Plano de implementação.

## Referências

- Spec de design da camada de gráficos: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md`.
- Revisão de arquitetura da camada de gráficos (sessão de 2026-10-13).
- Sessão de mockups e desenho de UX (sessão de 2026-10-14).
- `sitio/assets/js/chart-creator.js`, `sitio/assets/js/chart-integration.js`, `sitio/assets/js/multiselect-manager.js`, `sitio/_includes/config-modal.html`, `sitio/_includes/multiselect.html`, `sitio/indicators.json`.
- `dados/*/*.json` (13 séries, 1995–2025) — medição de amplitude que fundamenta a regra de comparabilidade da D7.
- API SGS/BCB: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json`
- Lightweight Charts: `https://github.com/tradingview/lightweight-charts` (Apache-2.0)

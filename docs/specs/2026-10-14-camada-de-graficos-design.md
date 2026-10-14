# Spec de design — Camada de gráficos como app isolado

- **Data:** 2026-10-14
- **Status:** Em elaboração — seções 1 a 7 decididas; seção 10 lista o que falta desenhar
- **ADR pai:** `sitio/docs/adr/0001-camada-de-graficos-como-app-isolado.md` (inclui a emenda D7)
- **Projeto:** Brasil em Números (`www.brasilemnumeros.ong.br`)

Esta spec **não repete** as decisões de arquitetura (Svelte, Lightweight Charts, app isolado, custo zero) — elas vivem na ADR 0001 e são premissa aqui. O que segue é o desenho da experiência e do contrato de dados.

---

## 1. Composição da página

Uma página única, tema escuro, com as peças empilhadas nesta ordem:

1. **Barra de busca** — um campo que abre a modal de busca de indicadores (seção 1.1).
2. **Chips das séries selecionadas** — uma por indicador ativo, com cor, nome e um "×" de remoção.
3. **Gráfico grande** — série temporal com as faixas de governo pintadas ao fundo.
4. **Barra de filtros de tempo** — saiu da modal de configuração; é controle do gráfico.
5. **Trilho de mandatos** — o seletor de mandato (seção 3).
6. **Painel de comparação por mandato** — matriz indicador × mandato, largura total, **sempre visível** (não é aba).

Decisão de fundo: o painel de comparação fica **abaixo do gráfico, em largura total**, e não numa coluna lateral. Duas razões: o gráfico não perde largura (o *feel* da série temporal é o produto), e a matriz completa de mandatos é o que responde "quem fez o quê" — o objetivo declarado. Uma coluna lateral forçaria escolher entre os dois.

O painel **não** vem em abas. Ele é sempre visível, mesmo custando página longa.

**Limite de séries sobrepostas: 5.** A razão principal não é o gráfico, é a **matriz do painel de comparação**: 5 linhas × 8 mandatos ainda se lê de um relance; 8 linhas viram parede. O limite também protege a legenda (precisa caber) e a régua do objetivo — sobrepor 8 séries não é comparar, é decorar.

### 1.1 Modal de busca de indicadores

**Cascata de três colunas**, no espírito do *symbol search* do TradingView:

| coluna | conteúdo |
|---|---|
| 1 | grupos/categorias (os 7 do `indicators.json`: política monetária, inflação, crescimento, imobiliário, trabalho, demografia, segurança pública) |
| 2 | indicadores do grupo escolhido, com caixa de seleção |
| 3 | **ficha** do indicador: unidade, granularidade, período coberto, número de pontos, fonte, e o **aviso de compatibilidade de escala** com o que já está no gráfico |

A **busca por digitação está disponível em todas as três** — filtra e colapsa a cascata numa lista. Isso é o que torna os três cliques do pior caso aceitáveis: a cascata é para **navegar** quem não sabe o que quer; a digitação é para **achar** quem já sabe.

Por que a cascata, e não uma lista plana agrupada ou um master-detail de duas colunas:

1. **Escala para a expansão estadual.** Cada nível novo de hierarquia (escopo → família → unidade federativa) vira **uma coluna a mais**, não uma lista mais longa. Com 27 UFs por família, a lista plana vira rolagem de centenas de linhas sem hierarquia para atravessar.
2. **É o único lugar onde o aviso de compatibilidade de escala cabe.** A seção 5 decidiu que séries incompatíveis não entram em silêncio — mas o chip é pequeno demais e o gráfico já está desenhado quando o problema aparece. A ficha resolve isso **antes** da escolha, transformando um erro futuro em informação presente.

**Pendência conhecida:** a modal é larga e **não cabe no celular**. No mobile ela precisa virar outra coisa — provavelmente lista com a ficha em folha deslizante. Não desenhado.

---

## 2. Interação do gráfico

### Clique na faixa de governo

**Clicar seleciona, não dá zoom.** O viewport não se move. A faixa clicada acende (contorno), o trecho da série dentro daquele mandato é realçado, o resto das faixas e da linha esmaece, e o painel de comparação passa a destacar aquele mandato.

**Zoom é gesto separado e explícito:** arrastar, scroll e duplo-clique. Um clique, um efeito.

Justificativa: se o clique desse zoom, o mandato selecionado sairia de contexto no exato momento em que o usuário quer compará-lo. Além disso, zoom e filtro competiriam pelo mesmo estado do viewport — e essa disputa é a origem do emaranhado atual.

### Rejeitado

**Filtro/isolamento de mandato** (o mandato vira o enquadramento e o resto é esmaecido mas inalcançável no gráfico). Rejeitado por competir com o zoom pelo mesmo estado.

### Minimapa

Um **minimapa** com o intervalo temporal completo e todas as faixas, sempre visível, é o mapa de navegação: mostra onde está a janela visível e permite voltar de qualquer zoom. É o que torna o clique-destaca seguro — sem ele, ao dar zoom o usuário perderia a referência do todo.

### Faixas de governo no gráfico

Renderizadas por um `ISeriesPrimitive` customizado do Lightweight Charts (a lib não tem anotação nativa). Requisitos:

- pintadas ao fundo da área de plotagem, uma por mandato, com o rótulo do governo;
- clique = seleção (seção acima);
- **não** recortam nem filtram a série;
- a faixa já passada (mandato em curso) tem tratamento visual próprio — Lula III é mandato em aberto.

---

## 3. Trilho de mandatos

O trilho é um **seletor**, não uma régua temporal. Uma caixa por governo, **largura igual**, desacoplado do eixo do tempo do gráfico.

Papéis separados por elemento, sem sobreposição:

| elemento | papel |
|---|---|
| gráfico | mostra a série |
| minimapa | tempo e zoom (intervalo completo, sobrevive ao zoom) |
| trilho | qual mandato está selecionado |

Por que não uma régua alinhada ao eixo do tempo: Dilma II durou 1,7 ano contra 4 dos mandatos cheios, o que daria ~27 px de largura num gráfico de 515 px — não cabe o nome nem o alvo de clique. E como o trilho alinhado não acompanha o zoom, clicar num mandato fora da janela faria o gráfico saltar enquanto o trilho fica parado (teleporte).

Com largura igual, todo mandato é alcançável e legível em qualquer zoom, inclusive no celular.

**Refinamento em aberto (não decidido):** uma barrinha proporcional à duração dentro de cada caixa, caso a perda da leitura visual de duração incomode. Entra na seção 10.

---

## 4. Painel de comparação por mandato

Matriz **indicador × mandato**, uma linha por série selecionada, uma coluna por governo. Preenchida com:

> **Δ = último valor do mandato − primeiro valor do mandato**, na unidade do indicador.

Sem barra, sem cor de julgamento, sem campo de direção ("queda é bom para juros, alta é boa para PIB").

Por que Δ absoluto e não Δ percentual: o Δ percentual põe tudo na mesma régua e por isso parece mais comparável — mas distorce justamente nos mandatos mais frágeis. Medido nos dados reais, o PIB da Dilma I dá −124% porque o denominador era 2,7%; base pequena gera percentual gigante. E ninguém precisa comparar "variação % da SELIC" com "variação % do PIB": não é a pergunta do produto.

A matriz é **comparável na horizontal** (mesmo indicador entre mandatos — dá um ranking real) e **não na vertical** (14 p.p. de juros e 0,3% de PIB são coisas incomparáveis). Isso é uma limitação assumida, não um defeito a esconder.

Consequência que economiza trabalho: **nenhum indicador precisa declarar direção/sentido** no registro. Era o custo da alternativa (heatmap por linha) e ele sai da conta.

---

## 5. Escalas, eixos e comparabilidade

### O problema, medido

Os indicadores do site cobrem ordens de grandeza que não convivem: `%` (2 a 53), contagem (população, 154 a 205 milhões), moeda (MVG-R, 37 mil a 264 mil). Os **78 pares** possíveis foram medidos pela razão de amplitude (span maior ÷ span menor) e o espectro tem um vazio limpo:

| faixa da razão | pares | o que são |
|---|---|---|
| 1,05 – 21,2 | 38 | percentuais entre si; homicídios × percentuais; `mvgr-nominal` × `mvgr-real` |
| **21,2 – 125** | **0** | nenhum par do site cai aqui |
| 125 – 20.921.102 | 40 | contagem absoluta e moeda contra percentuais |

### A regra

**O usuário escolhe o eixo, e o app sugere um padrão.**

- **Razão de amplitude ≤ 50×** → um eixo só, sugerido automaticamente, sem aviso.
- **Razão > 50×** → o app não encaixa em silêncio: avisa que a série não é legível na escala atual e oferece **normalizar para base 100** (aí sim, como ação explícita do usuário) ou **remover**.
- **Limite de dois eixos** (esquerda/direita), com a atribuição **visível na legenda** e trocável por clique. Mais de dois não é legível em hipótese alguma.
- Casos patológicos (população-total × população-variação, **20.921.102×**) não são salvos nem por dois eixos — a série menor vira uma reta colada no zero. Aí o aviso tem de ser mais duro: a combinação não é legível, ponto.

**O corte é 50**, mas o valor exato não é crítico: qualquer limiar dentro de (21,2 · 125) particiona os dados de hoje de forma idêntica. 50 é o meio da faixa vazia.

**O cálculo é sobre a série inteira, não sobre a janela visível.** Um aviso que se recalcula no zoom pisca na tela enquanto o usuário arrasta, e um aviso que aparece e desaparece ensina o usuário a ignorá-lo.

### Por que a regra é por magnitude, e não por tipo de unidade

Medição nos 13 arquivos — `unit.type` falha nas duas direções:

- `homicidios-anual` (`number`) × `pib-real-anual` (`percentage`) → razão **1,068**. Convivem perfeitamente num eixo só, apesar de unidades declaradas diferentes.
- `populacao-total-anual` (`number`) × `homicidios-anual` (`number`) → razão **4.853.304**. Mesma unidade declarada, sete ordens de grandeza de distância.

### Rejeitado

- **Índice base 100 como padrão.** Obriga toda série a nascer de uma origem arbitrária, quando o valor real (juro a 14%, inflação a 6%) *é* o conteúdo do produto. Fica apenas como ação explícita do usuário no fluxo do aviso.
- **Dois eixos com atribuição automática escondida em heurística** — é o que o site faz hoje (`decideAxisForNewIndicator`, `yAxisConfig`) e o que um commit recente já tentou desfazer.
- **Escala automática única** — a série de maior magnitude manda e as menores desaparecem sem erro na tela.

---

## 6. Contrato de dados (emenda D7)

### Schema de série canônico

Um arquivo por indicador em `dados/`:

```json
{
  "schema": 1,
  "id": "selic-meta-acum-12m",
  "unit": { "type": "percentage", "symbol": "%", "decimals": 2 },
  "granularity": "monthly",
  "source": "Banco Central do Brasil",
  "data": [ { "date": "1999-03-01", "value": 44.22 } ]
}
```

- **`value` substitui `rate`.** "rate" é nome errado para contagem de população, e foi exatamente assim que o campo divergiu entre famílias — hoje `homicidios/` e `populacao/` usam `value`, os outros seis usam `rate`.
- **`schema: 1`** existe para o app **recusar em voz alta** um formato que não entende, em vez de plotar um gráfico vazio em silêncio. Mesmo princípio da recusa explícita de séries incompatíveis (seção 5).
- **`id` no arquivo** permite o app conferir se o dado que chegou é o que ele pediu.
- **`indicatorName` sai.** É texto livre que nenhum consumidor lê; a identidade é o `id`.

### Propriedade dos campos — cada coisa num lugar só

| onde | o quê | por quê |
|---|---|---|
| `dados/` (notebook) | valores, unidade, granularidade, fonte | é o que o notebook sabe |
| `sitio/indicators.json` | agrupamento, `chartType`, título do eixo, cores, escape hatch de comparabilidade | é curadoria de apresentação, e muda sem republicar dado |

Repetir metadado nos dois lados recriaria a duplicação que a ADR condena (os períodos de governo em três lugares). Este é o ponto da spec onde isso é proibido explicitamente.

### Comparabilidade: medida, com veto declarado

A comparabilidade **não é um campo preenchido à mão** — é uma função pura dos dados (razão de amplitude sobre a série inteira, seção 5), logo não pode ficar errada nem envelhecer quando chega o 14º indicador.

O registro do indicador ganha apenas um **escape hatch**, para o dia em que a curadoria discordar do número:

```json
{ "comparabilidade": { "sempre": ["id-a"], "nunca": ["id-b"] } }
```

Zero trabalho editorial hoje; veto disponível quando precisar.

### Transição — a página atual não pode quebrar

A página em produção lê `rate`. Durante a janela de convivência, os notebooks publicam `{"date", "rate", "value"}`:

1. `dados/` republica com os dois campos. A página atual continua funcionando sem ser tocada.
2. O app novo lê `value`.
3. Publicado o app novo, `rate` é removido de `dados/`.

A chave redundante é explicitamente temporária. O JSON dobra de tamanho — 13 arquivos de algumas centenas de pontos; irrelevante em banda e em custo (que é zero por invariante).

### Risco assumido

A emenda acopla os dois repos: republicar `dados` em formato novo sem coordenar com `sitio` derruba o gráfico em produção. O custo real da D7 não está no site — está nos **notebooks Colab**, um por família, que precisam ser ajustados e reexecutados à mão. É lá que mora o risco de regressão silenciosa nos dados.

---

## 7. Modelo de governos (D5)

Períodos de governo viram dado versionado, não constante em código. Elimina as três duplicações atuais: `GOVERNMENT_PERIODS` (`chart-creator.js`), os botões de `config-modal.html` e o mapa período→datas de `chart-integration.js` — este último com nomes divergentes ("Lula 3" contra "Lula II").

### 7.1 Esferas, arquivos e onde mora

| esfera | entidade | quantas |
|---|---|---|
| federal | Brasil | 1 |
| estadual | 26 estados + DF | 27 |
| municipal | municípios (código IBGE de 7 dígitos) | ~5.570 |

Um **índice** e um **arquivo por entidade**:

```
dados/governos/index.json          → o que existe: esferas, entidades, contagens
dados/governos/federal.json
dados/governos/estadual/SP.json
dados/governos/municipal/SP.json   → por UF; por município só se precisar
```

Um arquivo único não serve: 5.570 entidades × ~8 mandatos dão dezenas de milhares de registros, e a UI precisa saber **o que existe antes de baixar**.

**Municipal: o modelo suporta, o dado não é populado.** Popular 5.570 entidades é um projeto de dados por si só (fonte candidata: TSE) e fica fora desta rodada — mas o caminho de arquivo e o índice já o comportam, para não haver retrabalho.

**Onde mora: `dados/`** — apesar de hoje ser curadoria à mão e não saída de notebook. É **fato** (quem governou quando), não apresentação, e a divisão de propriedade da seção 6 reserva o `sitio/` para curadoria de apresentação. Além disso, o TSE como fonte futura indica que isso *vira* pipeline: nascendo em `dados/`, ninguém precisa mover depois.

### 7.2 Schema

```json
{
  "schema": 1,
  "esfera": "federal",
  "entidade": { "codigo": "BR", "nome": "Brasil" },
  "cargo": "presidente",
  "mandatos": [
    {
      "id": "federal-2019-bolsonaro",
      "titular": "Jair Messias Bolsonaro",
      "rotulo": "Bolsonaro",
      "partido": "PL",
      "tipo": "eleito",
      "inicio": "2019-01-01",
      "fim": "2022-12-31"
    },
    {
      "id": "federal-2015-dilma",
      "titular": "Dilma Vana Rousseff",
      "rotulo": "Dilma II",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2015-01-01",
      "fim": "2016-08-31",
      "mandatoDe": { "inicio": "2015-01-01", "fim": "2018-12-31" }
    },
    {
      "id": "federal-2016-temer",
      "titular": "Michel Miguel Elias Temer Lulia",
      "rotulo": "Temer",
      "partido": "MDB",
      "tipo": "sucessor",
      "inicio": "2016-05-12",
      "fim": "2018-12-31",
      "mandatoDe": { "inicio": "2015-01-01", "fim": "2018-12-31" }
    },
    {
      "id": "federal-2023-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula III",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2023-01-01",
      "fim": null,
      "emCurso": true
    }
  ]
}
```

Campos: `id` estável (`<esfera>-<ano-de-início>-<slug>`), `rotulo` curto para faixa e trilho, `titular` completo para matriz e detalhe, `partido`, `tipo` (`eleito` | `sucessor` | `interino`), `inicio`/`fim` de **exercício**, `mandatoDe` opcional, `emCurso`.

### 7.3 Decisões de modelagem

**1. `inicio`/`fim` guardam o exercício efetivo, não o mandato formal.** É o que a faixa deve pintar e o que a matriz deve medir. Temer exercendo a partir de 12/05/2016 é um período real — e foi interino de maio a agosto, o que motiva o campo `tipo`. O mandato formal não se perde: fica em `mandatoDe`.

**2. Datas são explícitas e nunca derivadas de regra.** Tentador assumir "posse em 1º de janeiro, quatro anos" — e é falso na história brasileira: a posse presidencial era **15 de março** até 1994 (Collor 1990-03-15, Itamar 1992-10-02, FHC I só em 1995-01-01). O município começa em 1989. Afastamentos e intervenções existem. Data explícita é o que impede o modelo de carregar direito eleitoral dentro.

**3. Reeleição são dois mandatos agrupáveis, não um período fundido.** Lula I e Lula II ficam separados (preservando a leitura por mandato) e `titular` é a chave para agrupar e responder "como foi o governo Lula". É também o que mata a inconsistência de nomes, separando `rotulo` de `titular`.

**4. A cor sai do dado e passa a ser derivada** (emenda à D5). O dado guarda `partido`; o app deriva a cor por paleta determinística a partir dele, com fallback por titular para quem não tem partido conhecido, e **override opcional** no registro quando a curadoria discordar. Cor à mão não sobrevive a 27 UFs, quanto mais a 5.570 municípios.

**5. Mandato em curso aparece, marcado.** `fim: null` + `emCurso: true`. Tem faixa no gráfico, caixa no trilho e coluna na matriz — mas a célula **não pode mentir**: o Δ dele é **parcial até o último ponto de cada série**, e esse ponto **varia por série** (hoje o IPCA termina em 2025-06, a SELIC em 2025-10). E mandato em curso **não entra em ranking** de "maior variação" sem esse aviso — ele perderia para todos, sempre, só por ser mais curto.

Forma visual, decidida:

- **Na faixa do gráfico: hachura diagonal, cortando no último dado disponível** — não na data de hoje. Hachura é convenção estabelecida para "período em aberto" e **não depende de cor**: funciona no tema escuro, no claro, e para quem não distingue cores.
- **No trilho: a mesma linguagem** (marca hachurada na caixa), para que a faixa e o seletor falem a mesma língua.
- **Na matriz: a data de corte vive dentro de cada célula**, em corpo menor, com a coluna inteira em fundo levemente marcado. É verboso de propósito — é o único formato em que cada número aparece acompanhado da data que o torna verdadeiro. Nenhum cabeçalho de coluna pode resumir isso, porque o corte é por série.

**Rejeitados:** só o contorno tracejado na faixa (discreto demais — se perde em tela pequena e com muitas faixas, e um mandato inacabado passaria por completo); notação de aproximado (≈) com as datas no tooltip (o ≈ não diz **até quando**, e duas séries com cortes separados por cinco meses pareceriam igualmente parciais); e deixar a coluna da matriz vazia com "—" (o mais conservador contra ranking, mas joga fora a informação que o usuário provavelmente mais quer: o que está acontecendo agora).

**6. Ordenação do trilho** é cronológica por `inicio`, com o mandato em curso sempre na ponta direita.

---

## 8. Arquitetura do app

Cinco camadas, e a dependência **desce**: nenhum nível conhece o de cima.

| camada | onde | papel | regra |
|---|---|---|---|
| 1 · componentes | `src/components/` | UI e reatividade | não conhecem a biblioteca de gráficos |
| 2 · stores | `src/stores/` | fonte única da verdade | um assunto por store, escrita por ação nomeada |
| 3 · domínio | `src/domain/` | as contas que decidem algo | **sem Svelte, sem DOM, sem rede** — função pura |
| 4 · fronteira e dados | `src/chart/`, `src/data/` | falam com o mundo exterior | **únicos** que conhecem a Lightweight Charts e a rede |
| 5 · estático | `indicators.json`, `dados/`, governos | já publicado | custo zero |

```
src/
  components/   App · SearchModal · SeriesChips · Chart · TimeFilters · MandateRail · ComparisonPanel
  stores/       series · mandate · axes · viewport · catalog
  domain/       scales · mandates · format
  chart/        adapter · bands · navigator
  data/         series · catalog
```

Regras que a estrutura codifica:

1. **Só `chart/` importa a Lightweight Charts.** Nenhum componente faz `import` da biblioteca. Trocar de biblioteca é mexer numa pasta.
2. **Só `Chart.svelte` fala com `chart/adapter`.** É o único componente que monta coisa no gráfico.
3. **`domain/` é puro.** Comparabilidade de escala, Δ por mandato e formatação são funções de entrada e saída. Isso existe por um motivo específico: são as duas contas que **erram calado** — gráfico bonito com número errado não levanta exceção. Sendo puras, viram teste unitário sem navegador, sem rede e sem mock.
4. **Nada em `window`.** O que hoje é `chartManager`, `chartInstance`, `multiselectScope`, `indicatorsConfig`, `indicatorsData`, `chartIntegration` e `updateChartsFromMultiselect` vira store nomeado.
5. **`data/` valida o `schema` e falha em voz alta**, consistente com a seção 6.

### 8.1 De quem é o estado da janela visível

**O gráfico é espelho do store, não dono do estado.**

A direção é uma só: store → adapter. Dar zoom é **escrever** no store, e o adapter reage. A única informação que volta é a janela visível, por **callback explícito** do adapter para o store `viewport` — nunca por leitura do gráfico em outro componente.

O que isso compra: a tela inteira é reconstruível a partir do estado — link compartilhável, desfazer e teste deixam de ser problemas separados. O que custa: duas representações da mesma verdade (store e gráfico), que precisam ser mantidas em sincronia pelo adapter.

**Alternativa rejeitada:** deixar a janela visível morar dentro do gráfico e a UI só ler. Tem menos sincronização, porque não há duas cópias — mas o estado real passa a viver dentro de um objeto de terceiros, e reconstruir a tela exige perguntar ao gráfico. É o caminho curto de volta ao problema que motivou a reconstrução: quem desenha mandando no resto.

---

## 9. Descartado nesta camada

`chart-creator.js`, `chart-integration.js`, `multiselect-manager.js`, `config-modal.html`, `multiselect.html`, os cinco plugins de Chart.js via CDN e a heurística de eixo automático (`decideAxisForNewIndicator`).

---

## 10. Ainda não desenhado

Ordem sugerida de ataque:

1. **Modal de busca no celular** — a cascata de três colunas não cabe; provavelmente vira lista com a ficha em folha deslizante. E a navegação por teclado da cascata (↑↓ entre itens, ←→ entre colunas, ⏎ adicionar) precisa de regra escrita.
2. **Carregamento, erro e estado vazio** — incluindo o comportamento quando um `datafile` falha ou devolve `schema` desconhecido, e o que a tela mostra enquanto as séries chegam.
3. **Testes** — a camada 3 é pura e é o alvo prioritário; ferramenta e cobertura ainda não escolhidas.
4. **Build e integração com o Jekyll** — a ferramenta de build do app (Vite ou outra) **não está decidida**; nesta spec o app aparece apenas como `src/`, sem `package.json`. E falta o shell `index.html` e a transição com a página antiga no ar.

---

## Anexo — os 13 arquivos de série, medidos (2026-10-14)

| id | campo | unidade | pontos | período | min | max | amplitude |
|---|---|---|---|---|---|---|---|
| `populacao-total-anual` | value | number | 30 | 1995-01–2024-01 | 154.524.335 | 204.861.525 | 50.337.190 |
| `caged-total-mensal` | rate | number | 371 | 1995-01–2025-08 | 20.937.049 | 48.704.360 | 27.767.311 |
| `mvgr-nominal` | rate | currency | 259 | 2004-03–2025-07 | 42.000 | 264.000 | 222.000 |
| `mvgr-real` | rate | currency | 259 | 2004-03–2025-07 | 36.986,10 | 90.827,57 | 53.841,46 |
| `selic-over-acum-12m` | rate | percentage | 359 | 1995-12–2025-10 | 2,14 | 53,09 | 50,94 |
| `selic-meta-acum-12m` | rate | percentage | 320 | 1999-03–2025-10 | 2,00 | 44,22 | 42,22 |
| `igpm-acum-12m` | rate | percentage | 349 | 1996-07–2025-07 | −7,97 | 32,00 | 39,97 |
| `ipca-acum-12m` | rate | percentage | 355 | 1995-12–2025-06 | 1,64 | 20,41 | 18,77 |
| `proporcao-homicidios-armas-fogo-anual` | value | percentage | 28 | 1995-01–2022-01 | 59,04 | 72,43 | 13,39 |
| `pib-real-anual` | rate | percentage | 32 | 1995-01–2024-01 | −3,55 | 7,53 | 11,08 |
| `homicidios-anual` | value | number | 29 | 1995-01–2023-01 | 21,22 | 31,59 | 10,37 |
| `homicidios-armas-fogo-anual` | value | number | 28 | 1995-01–2022-01 | 14,32 | 22,88 | 8,56 |
| `populacao-variacao-anual` | value | percentage | 29 | 1996-01–2024-01 | −0,35 | 2,06 | 2,41 |

Pares mais compatíveis medidos: `igpm` × `selic-meta` (1,056) · `selic-meta` × `selic-over` (1,207) · `pib` × `proporcao-homicidios` (1,208) · `homicidios` × `homicidios-armas-fogo` (1,212).

Pares menos compatíveis medidos: `populacao-total` × `populacao-variacao` (20.921.102) · `caged` × `populacao-variacao` (11.540.627) · `homicidios-armas-fogo` × `populacao-total` (5.880.513).

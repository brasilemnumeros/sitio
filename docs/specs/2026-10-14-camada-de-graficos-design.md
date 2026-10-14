# Spec de design — Camada de gráficos como app isolado

- **Data:** 2026-10-14
- **Status:** Em elaboração — seções 1 a 10 decididas; a 11 é o que sai de cena e a 12 lista o que falta desenhar
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

**Sem limite de séries sobrepostas.** Havia um limite de 5, justificado pela legibilidade da matriz; ele foi **removido em 2026-10-14**. Bloquear o usuário por um risco que é dele é paternalismo — se vai ficar ilegível, é escolha dele. E o limite protegia um *layout*, não o desempenho: o Lightweight Charts aguenta dezenas de séries no volume deste projeto.

O que substitui o limite não é aviso nem gate, são **duas obrigações de layout**:

- **A matriz degrada rolando**, com o cabeçalho dos mandatos **fixo** — sem isso, com 12 séries o usuário perde a referência de qual coluna está lendo.
- **A legenda quebra em linhas** e continua identificando cada série.

**Risco que mudou de dono.** Este parágrafo apontava a paleta derivada do `partido` como risco aberto. Com a decisão de **não usar cor de partido** (seção 7.3), esse risco desapareceu — não há duas paletas para acomodar. Sobrou o simétrico, e ele continua aberto: **não há limite de séries**, então a **paleta das séries** precisa produzir tantas cores distinguíveis quantas o usuário escolher. Sem limite não existe "número máximo de cores" — a paleta tem de **degradar com elegância** quando os tons separáveis acabarem. Entra na seção 12.

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

**Pendência conhecida:** a modal é larga e **não cabe no celular** (seção 12). No mobile ela precisa virar outra coisa — provavelmente lista com a ficha em folha deslizante. Não desenhado.

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

- pintadas ao fundo da área de plotagem, uma por mandato, **sem cor de partido**: alternância sutil de tom entre mandatos vizinhos, para separá-los sem introduzir significado;
- o rótulo traz **governo e sigla do partido** — `Lula III · PT`. **Texto, não cor**;
- clique = seleção (seção acima);
- **não** recortam nem filtram a série;
- o mandato em curso leva hachura e corta no último dado disponível (seção 7.3).

**Por que sem cor de partido** (decidido em 2026-10-14): a cor por partido obrigaria a escolher entre duas coisas ruins. **Cor de marca** colide entre partidos — o vermelho é o mais disputado no Brasil (PT, PCdoB, PSOL, PSTU, PCO) — e não sobrevive ao fundo escuro, porque marca é desenhada para fundo branco. **Cor por espectro político** é juízo editorial sem fonte auditável: faria o site **afirmar uma classificação** no lugar de publicar um dado, num projeto cujo resto tem fonte declarada.

Sem cor, o gráfico fica com **uma paleta só** — as linhas das séries carregam todo o significado e as faixas são contexto puro — e a identificação por partido passa a ser feita por **logo e sigla**, que informam sem classificar.

**O logo não cabe na faixa do gráfico**: Dilma II tem ~27 px de largura num gráfico de 515. Ele vive no trilho e na ficha do mandato (abaixo).

---

## 3. Trilho de mandatos

O trilho é um **seletor**, não uma régua temporal. Uma caixa por governo, **largura igual**, desacoplado do eixo do tempo do gráfico. Cada caixa carrega: **logo pequeno do partido**, o rótulo do governo e a sigla, **hachura** quando o mandato está em curso e **contorno** quando está selecionado.

Papéis separados por elemento, sem sobreposição:

| elemento | papel |
|---|---|
| gráfico | mostra a série |
| minimapa | tempo e zoom (intervalo completo, sobrevive ao zoom) |
| trilho | qual mandato está selecionado |

Por que não uma régua alinhada ao eixo do tempo: Dilma II durou 1,7 ano contra 4 dos mandatos cheios, o que daria ~27 px de largura num gráfico de 515 px — não cabe o nome nem o alvo de clique. E como o trilho alinhado não acompanha o zoom, clicar num mandato fora da janela faria o gráfico saltar enquanto o trilho fica parado (teleporte).

Com largura igual, todo mandato é alcançável e legível em qualquer zoom, inclusive no celular.

**Refinamento em aberto (não decidido):** uma barrinha proporcional à duração dentro de cada caixa, caso a perda da leitura visual de duração incomode. Entra na seção 12.

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

### Transição — não há legado a preservar

Decidido em 2026-10-14: **nada do legado é mantido.** A camada de gráficos atual (Chart.js, as ~2.700 linhas, os cinco plugins de CDN, o `multiselect`, a modal de configuração) sai de cena por inteiro, e a transição **não tem fase de convivência**: não existe período com as duas páginas no ar, nem flag para alternar entre elas, nem `index.html` carregando os dois caminhos de código ao mesmo tempo.

Isso **substitui a restrição nº 1 da D7** ("a página atual não pode quebrar"), que pressupunha justamente uma convivência.

O que sobra da restrição original é uma questão de **ordem de deploy** entre os dois repos, porque `dados/` e `sitio/` publicam separadamente: entre a republicação das séries com `value` e o deploy do app existe um intervalo em que a página no ar lê um campo que já não existe.

**Decidido: convivência curta de chaves.** `dados/` publica `{"date","rate","value"}` primeiro; o app entra em seguida; `rate` é retirado num commit posterior. Não é sustentar código antigo — o código antigo estará deletado — é não deixar minutos de gráfico quebrado em produção. O JSON dobra de tamanho nesse intervalo, o que é irrelevante em banda e em custo (que é zero por invariante).

**Rejeitado:** publicação única (`value` só, aceitando o intervalo de quebra). Mais simples, mas exige que os dois pushes aconteçam em sequência imediata e que ninguém abra o site no meio — depende de sorte, não de processo.

### Risco assumido

Republicar `dados` em formato novo sem coordenar com o `sitio` derruba o gráfico em produção. O custo real não está no site — está nos **notebooks Colab**, um por família, que precisam ser ajustados e reexecutados à mão. É lá que mora o risco de regressão silenciosa nos dados.

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

**4. Sem cor de partido: a identificação é logo e sigla** (emenda à D5, em duas etapas). O dado guarda `partido` — a **sigla** — e **não guarda cor**. O gráfico tem uma paleta só, a das séries; as faixas de governo são contexto sem cor, com alternância sutil entre mandatos vizinhos e o rótulo trazendo governo e sigla (`Lula III · PT`). A identificação por partido vive em dois lugares, ambos de texto e imagem, nenhum de cor: **logo pequeno + sigla no trilho**, e **logo com o nome completo do partido na ficha do mandato**.

Por que não cor, em uma frase por caminho: **cor de marca** colide entre partidos (o vermelho é o mais disputado no Brasil — PT, PCdoB, PSOL, PSTU, PCO) e é desenhada para fundo branco, não para o fundo escuro do gráfico; **cor por espectro político** é juízo editorial sem fonte auditável, e faria o site afirmar uma classificação no lugar de publicar um dado com fonte declarada.

**Rejeitados:** cor derivada por hash do nome do partido (dois partidos podem cair no mesmo tom por azar, e não há como garantir separação — foi a primeira proposta, descartada); cor de marca oficial (colide e falha no contraste do tema escuro); cor por espectro político (juízo editorial, e cria a colisão entre a paleta das faixas e a das séries).

**5. Cobertura parcial é marcada — e não é só o mandato em curso.** A regra é uma só: **qualquer célula cujo Δ não cobre o mandato inteiro leva marca**, qualquer que seja o motivo (o mandato está em curso, ou a série começa depois do início dele). Célula com Δ parcial que aparece sem aviso é atribuir a um governo uma variação que ele não produziu inteiro.

A medição que motivou a generalização (2026-10-14, sobre os 13 arquivos e 8 mandatos): **15 das 104 células** ficam abaixo do esperado, e o caso que importa não é o mandato em curso — esse já era conhecido. É este: o **MVG-R** só começa em **03/2004**, então no mandato rotulado "Lula I" ele tem **35 dos 48 pontos possíveis**, e o Δ cobriria **34 de 48 meses** enquanto a coluna se chama "Lula I". No "FHC II" ele tem **0 pontos** e nem existe célula.

Por isso a célula não carrega **contagem de pontos** — carrega o **período real usado**. Contagem de pontos é um número que ninguém sabe interpretar (2 pontos numa série anual é normal; 2 numa mensal é defeito); o período real é informação de verdade, e responde a mesma pergunta. *(A contagem de pontos chegou a ser proposta como uma coluna; a medição a tornou desnecessária.)*

Forma visual, decidida:

- **Na faixa do gráfico: hachura diagonal, cortando no último dado disponível** — não na data de hoje. Hachura é convenção estabelecida para "período em aberto" e **não depende de cor**: funciona no tema escuro, no claro, e para quem não distingue cores.
- **No trilho: a mesma linguagem** (marca hachurada na caixa), para que a faixa e o seletor falem a mesma língua.
- **Na matriz: o período real usado vive dentro de cada célula** (`parcial 03/2004–12/2006` ou `parcial até 10/2025`), em corpo menor. É verboso de propósito — é o único formato em que cada número aparece acompanhado do intervalo que o torna verdadeiro. Nenhum cabeçalho de coluna pode resumir isso, porque a cobertura varia **por série**.

Mandato em curso também **não entra em ranking** de "maior variação" sem esse aviso — ele perderia para todos, sempre, só por ser mais curto.

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

## 9. Estados: carregando, erro e vazio

**Regra que governa a seção inteira: nenhum vazio silencioso.** Todo lugar onde falta dado diz *por quê* falta. É a mesma lógica da recusa em voz alta do `schema` (seção 6) e da marca de cobertura parcial (seção 7.3) — um estado sem explicação é lido como defeito, e o usuário não tem como distinguir os dois.

Escala disso: como o caso "sem dado" é raro (4 de 104 células da matriz, medido na seção 7.3), nada aqui merece cerimônia. Merece **correção discreta**.

### 9.1 Estado inicial (nenhum indicador escolhido)

Um campo que abre a busca, mais um **atalho de exemplo** ("Selic × IPCA") para o primeiro uso.

**Rejeitado:** tela de boas-vindas com texto explicativo. Ela reaparece toda vez que o usuário limpa a seleção, e quem já conhece o site paga pedágio em toda visita. O atalho de exemplo resolve o primeiro uso sem obrigar ninguém a lê-lo.

### 9.2 Carregando

**Esqueleto na forma do conteúdo** — a área do gráfico e as linhas da matriz — em vez de spinner central. Assim a página não pula de layout quando o dado chega, e o usuário já sabe onde as coisas vão ficar.

O progresso é **por série**, não um indicador global único: as séries vêm de arquivos diferentes e uma pode demorar mais que as outras.

### 9.3 Erro

**Erro em uma parte é degradação parcial, não tela de erro.** Falhou 1 de 5 séries: o chip daquela série vira erro com as duas ações possíveis (**tentar de novo** / **remover**) e o resto da tela continua usável — gráfico e matriz seguem com as que chegaram. Tela de erro cheia por causa de uma série é desproporcional e faz o usuário perder o trabalho que já fez.

**Erro total** (nada carregou) usa a mesma linguagem, com título, motivo e botão de tentar de novo.

**`schema` desconhecido** cai aqui: o app recusa em voz alta em vez de plotar vazio em silêncio (seção 6), sem a linha de série que não pôde ser interpretada.

### 9.4 Os estados de célula da matriz

Medido na seção 7.3: dos 104 cruzamentos, **4 não têm cobertura** e **1 é indefinido**.

| estado | aparência | exemplo real |
|---|---|---|
| **Δ calculável** | o número, na unidade do indicador | a maioria |
| **cobertura parcial** | o número **com o período real usado** | `mvgr-nominal` no Lula I → `parcial 03/2004–12/2006` |
| **sem cobertura** | cinza apagado, dizendo **por quê** | `mvgr-nominal` no FHC II → "série começa em 2004-03" |
| **ponto único** | âmbar, explicitamente sem Δ | `homicidios-anual` no Lula III → 1 dado em 2023 |

"Sem cobertura" e "ponto único" são **estados distintos**, e nenhum deles é `0` nem `—`: com um ponto **existe dado**, então "—" faria o usuário concluir que falta dado que existe; e `0` seria falso nos dois casos.

### 9.5 Sem limite de séries

Não há gate nem aviso (seção 1). A obrigação que sobra é de layout: **a matriz rola com o cabeçalho dos mandatos fixo**, para que o usuário não perca a referência de qual coluna está lendo quando houver 12 séries.

---

## 10. Build e integração com o Jekyll

### 10.1 Ferramenta, onde o app mora, e o que sai dele

- **Vite**, com a fonte em **`sitio/app/`** e **`package.json` próprio** — separado do `package.json` do site, que declara só Tailwind e Prettier. O app fica autocontido: pode virar repo próprio depois sem mover arquivo.
- **Saída com nome fixo**: `sitio/assets/js/app/app.js` e `app.css`, **gitignored** e construídos no CI — como o `main.dist.css` já é. Cache-bust pelo `?v={{ site.time | date: '%s' }}` que o projeto usa em todo script.
- **Trade-off registrado:** hash de conteúdo é mais eficiente em cache, mas exigiria um manifest para o HTML descobrir o nome gerado. O bundle tem dezenas de KB; trocou-se eficiência de cache por não acoplar HTML a artefato de build.

### 10.2 Ordem do pipeline no CI

`checkout` → setup Node → `npm ci` em `sitio/` → `npm ci && npx vite build` em `sitio/app/` → Tailwind CLI **rodando da raiz de `sitio/`** → **checagem da classe-canário** → `jekyll-build-pages` → upload e deploy.

### 10.3 Dois achados medidos (2026-10-14)

**1. Arquivo no `.gitignore` não é varrido pelo Tailwind.** Medido com o CLI v4.3.3: uma classe dentro de uma pasta ignorada **não** apareceu no CSS gerado, enquanto classes dentro de um `.svelte` em pasta normal apareceram — sem nenhum `@source`, sem nenhum `@config`.

Consequências: (a) `sitio/app/src` **não pode** entrar no `.gitignore`; (b) a falha é **silenciosa** — a UI perde estilo e nada acusa erro. Daí a **checagem da classe-canário** no pipeline: o build falha se uma classe exclusiva do app não estiver no CSS. Mesmo princípio da seção 9 (nenhum vazio silencioso) aplicado ao build em vez da tela.

**2. `tailwind.config.js` é config morta.** Medido: apontando o `content` dele para uma pasta inexistente, as classes continuam sendo geradas. O v4 só lê esse arquivo se for referenciado por `@config`, e o `main.css` não o referencia. Ou seja, o `darkMode: "class"` do arquivo **não faz nada** — o dark mode real vem do `@custom-variant` no `main.css`. Não é escopo desta camada, mas é achado: um arquivo que parece autoritativo e não é.

### 10.4 Loop de desenvolvimento

**Decidido: `vite dev`, com dado de mentira.** O app roda sozinho num endereço local com recarga instantânea, sem o cabeçalho e o rodapé do Jekyll, e com fixture no lugar dos JSONs reais. É rápido e cobre o gráfico, a modal e a matriz — a maior parte do trabalho. O encaixe real (o shell, o dado real, o carregamento sem CDN) é verificado pelo build do CI, que já falha alto no canário.

**Rejeitado, por ora:** `vite build --watch` somado a `jekyll serve`. Testa o encaixe continuamente, mas cada mudança espera dois builds e depende de um Jekyll que **nesta máquina só roda com instalação manual de gems** (o `bundle exec jekyll` do projeto não funciona aqui). Fica como opção caso o loop rápido se mostre insuficiente — "não ficou legal, mudamos depois".

### 10.5 Atribuição do TradingView

**Link no rodapé global** — uma linha, vale para todas as páginas, e não depende de o gráfico continuar na página em que está hoje. A alternativa (link só na página do gráfico) quebraria em silêncio no dia em que a página mudasse. Mais o arquivo **`NOTICE`** no repo, como a D3 exige.

### 10.6 A virada

Sem fase de convivência (seção 6). O `/` vira o shell do app num commit, e os arquivos do legado saem — a **seção 11** lista o que sai. A ordem de deploy entre os dois repos está na seção 6.

---

## 11. Descartado nesta camada

`chart-creator.js`, `chart-integration.js`, `multiselect-manager.js`, `config-modal.html`, `multiselect.html`, os cinco plugins de Chart.js via CDN e a heurística de eixo automático (`decideAxisForNewIndicator`).

---

## 12. Ainda não desenhado

Ordem sugerida de ataque:

1. **Modal de busca no celular** — a cascata de três colunas não cabe; provavelmente vira lista com a ficha em folha deslizante. E a navegação por teclado da cascata (↑↓ entre itens, ←→ entre colunas, ⏎ adicionar) precisa de regra escrita.
2. **Paleta das séries sem limite** — quantas cores distinguíveis ela produz, e o que fazer quando os tons separáveis acabarem: repetir tom com estilo de linha diferente, variar luminosidade, ou outra coisa. Sem limite de séries, cor repetida faz a legenda parar de identificar as séries.
3. **Logos dos partidos** — assets (SVG em `sitio/assets/img/partidos/`), tamanho no trilho e na ficha, e a **questão de uso de marca num repositório público**, que não é decisão técnica e não foi resolvida aqui.
4. **Duração visível no trilho** — a barrinha proporcional dentro da caixa de largura igual, caso a perda da leitura visual de duração incomode (seção 3).
5. **Testes** — a camada 3 é pura e é o alvo prioritário; ferramenta e cobertura ainda não escolhidas.
6. **Leitura por espectro político** — descartada do gráfico em 2026-10-14. Se voltar, será como **modo explícito do usuário**, nunca como padrão, e com a fonte da classificação citada e visível — porque é juízo editorial, não dado.

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

### Cobertura por mandato (medida em 2026-10-14)

Pontos de cada série dentro de cada mandato federal, conforme o modelo da seção 7 (exercício efetivo). **Δ precisa de 2+ pontos; "—" é ausência de cobertura.**

| série | FHC II | Lula I | Lula II | Dilma I | Dilma II | Temer | Bolsonaro | Lula III |
|---|---|---|---|---|---|---|---|---|
| `caged-total-mensal` | 48 | 49 | 48 | 48 | 21 | 31 | 48 | 32 |
| `homicidios-anual` | 4 | 4 | 4 | 4 | 2 | 2 | 4 | **1** |
| `homicidios-armas-fogo-anual` | 4 | 4 | 4 | 4 | 2 | 2 | 4 | **—** |
| `proporcao-homicidios-armas-fogo-anual` | 4 | 4 | 4 | 4 | 2 | 2 | 4 | **—** |
| `igpm-acum-12m` | 48 | 48 | 48 | 48 | 20 | 32 | 48 | 31 |
| `ipca-acum-12m` | 48 | 48 | 48 | 48 | 20 | 31 | 48 | 30 |
| `mvgr-nominal` | **—** | **35** | 48 | 48 | 21 | 31 | 48 | 31 |
| `mvgr-real` | **—** | **35** | 48 | 48 | 21 | 31 | 48 | 31 |
| `pib-real-anual` | 4 | 5 | 4 | 4 | 3 | 2 | 4 | 2 |
| `populacao-total-anual` | 4 | 4 | 4 | 4 | 2 | 2 | 4 | 2 |
| `populacao-variacao-anual` | 4 | 4 | 4 | 4 | 2 | 2 | 4 | 2 |
| `selic-meta-acum-12m` | 46 | 48 | 48 | 48 | 20 | 32 | 48 | 34 |
| `selic-over-acum-12m` | 48 | 48 | 48 | 48 | 20 | 32 | 48 | 34 |

Resumo: **104 células possíveis** (13 × 8) · **99 calculáveis (95%)** · **4 sem cobertura (3%)** — `mvgr-*` no FHC II (a série começa em 2004-03) e os dois `homicidios-*` no Lula III (as séries terminam em 2022) · **1 indefinida** — `homicidios-anual` no Lula III, com 1 ponto só.

**15 células** ficam abaixo do esperado para a própria granularidade da série. A maioria é consequência do mandato em curso (Lula III) ou do início tardio da série. O caso que motivou a regra de cobertura parcial da seção 7.3 é `mvgr-nominal` e `mvgr-real` no **Lula I**: 35 pontos onde caberiam 48, porque as séries começam em **03/2004** — o Δ cobriria 34 dos 48 meses sob um rótulo que diz "Lula I".

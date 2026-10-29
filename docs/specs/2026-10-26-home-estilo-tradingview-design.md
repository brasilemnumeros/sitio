# Home como terminal de análise — design

- Data: 2026-10-26
- Estado: aprovado (2026-10-27)
- Escopo: apenas a home (`/`). Blog, posts, categorias, links, políticas e 404 não mudam.
- Mockups: `.superpowers/brainstorm/` (local, fora do repo)

## Intenção

A home hoje é uma pilha de seis blocos numa coluna `max-w-6xl`, com o gráfico fixo em 480px.
Para um produto cujo valor é comparar séries ao longo do tempo, o gráfico é o menor
elemento da tela. A mudança faz a home parecer uma ferramenta de análise — o gráfico ocupa
o viewport, e os controles vivem em gavetas que abrem por cima dele — sem alterar o
comportamento do gráfico, dos stores ou do contrato de dados.

A referência declarada é o TradingView, e o usuário escolheu o arranjo **A · Terminal
clássico**: barra superior fina, trilho à direita, barra inferior, gavetas fechadas na
abertura. Não é uma cópia visual: é a mesma hierarquia (gráfico primeiro, controles
recolhidos).

## O que existe hoje

| Peça | Onde | Comportamento |
|---|---|---|
| Casca do site | `src/layouts/Base.astro`, `src/components/Nav.astro`, `Footer.astro` | Nav fixa, footer, botão de feedback e toast de artigos em **todas** as páginas |
| Página da home | `src/pages/index.astro` | `<Base shell="app">` + `<div id="app">` + script do app |
| App | `app/src/App.svelte` | `<main class="mx-auto flex max-w-6xl flex-col gap-4 p-4">` com 6 blocos |
| Gráfico | `Chart.svelte` | Canvas fixo `h-[480px]` + minimapa `h-[48px]` |
| Filtros de tempo | `TimeFilters.svelte` | Escreve em `viewport`; limpa seleção de mandato |
| Trilho de mandatos | `MandateRail.svelte` | Escreve em `mandate` e `viewport` |
| Comparação | `ComparisonPanel.svelte` | Matriz larga: linha por série, coluna por governo |
| Legenda | `SeriesLegend.svelte` | Identificação textual + troca de cor + eixo |
| Busca | `SearchModal.svelte` + `Ficha.svelte` | Modal com cascata, ficha e fontes |
| Permalink | `permalink-init.js` | Lê `?series=` uma vez na entrada; escreve com `replaceState` |

Consequências que o desenho precisa assumir: `Base.astro` acrescenta feedback e toast mesmo
com `shell="app"`; a legenda existe porque com 10 séries os rótulos no canvas ocupam ~80%
da altura da área de plot (comentário em `SeriesLegend.svelte`); a matriz de comparação é
larga por natureza e não cabe numa coluna de 300px.

## Objetivos

1. O gráfico ocupa o viewport: `100dvh` menos a barra superior, minimapa fixo no rodapé.
2. A home abre sem nav e sem footer do site, com as duas gavetas fechadas.
3. Nenhuma função atual some: busca, legenda, eixos, filtros de tempo, mandatos, comparação,
   permalink, estados de carregamento/erro.
4. A home abre com conteúdo: um **preset do dia** determinístico (sem aleatoriedade).
5. Link com `?series=` continua mandando em tudo; preset só entra quando não há ids.
6. Mobile utilizável: gráfico em tela cheia, gavetas como folhas deslizantes.

## Não-objetivos

- Redesenhar blog, posts, categorias, links ou 404.
- Trocar a biblioteca/implementação do gráfico, o adapter ou o minimapa.
- Novos indicadores, novas métricas, novos eixos.
- GTM, eventos de analytics novos ou mudanças no gate de consentimento.
- Tema claro na home (continua escura fixa).

## Anti-objetivos

- Abrir a home com gráfico vazio e nenhuma pista de como começar.
- Esconder a legenda textual; a identificação não pode voltar a depender só de cor.
- Gaveta que empurra o gráfico para fora da tela ou faz a página rolar.
- Preset aleatório que quebra link compartilhado ou repetibilidade.
- Controles "mortos" visíveis sem série (regra §9.1 do desenho atual).

## Restrições

- Astro 7 + Svelte 5 (runes) + Tailwind 4; sem dependências novas de UI.
- O app é build separado (`app/` → `public/assets/js/app/`), injetado em `<div id="app">`.
- E2E Playwright em `app/e2e` falha com qualquer `console.error`.
- Teste do gate de analytics (`scripts/testar-analytics.mjs`) precisa continuar passando.
- Comentários do projeto são em português e explicam o porquê; `AGENTS.md` manda não presumir
  GTM nem disparar nada antes do consentimento.

## Abordagens consideradas

| | Arranjo | O que ganha | O que custa |
|---|---|---|---|
| **A** | Terminal clássico: topo 34px, trilho direito 34px, barra inferior 26px, gavetas fechadas | Previsível; cada controle tem lugar fixo; escala para telas médias | Consome ~34px de cada borda mesmo fechado |
| B | Gráfico total com pílulas flutuantes | Área máxima de gráfico | Controles sem lugar fixo; difícil descobrir no celular |
| C | Dois tempos: estado de escolha → gráfico cheio | Acolhe quem chega | Duas telas para construir e testar |

**Escolhida: A**, com o refinamento pedido: gaveta direita para séries/legenda/eixos, gaveta
inferior para mandatos + comparação, ambas colapsadas por padrão, e abertura preenchida pelo
preset do dia em vez de vazia.

## Desenho

### Estrutura (desktop ≥ 768px)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 34px  ● Brasil em Números   ⌕ Buscar…⌘K   1A 5A 10A Máx   preset ⤓ ⤢ │
├───────────────────────────────────────────────────────┬──────────────┤
│                                                       │ 34px         │
│                    gráfico (flex-1)                   │ trilho       │
│                                                       │ (ícones)     │
│                                                       │              │
├───────────────────────────────────────────────────────┴──────────────┤
│ 48px  minimapa                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ 26px  ▬ Comparação por mandato                    2 séries · 2 eixos │
└──────────────────────────────────────────────────────────────────────┘
```

Altura total = `100dvh`. `<main>` vira `flex h-dvh flex-col overflow-hidden`; o bloco do
gráfico é `flex-1 min-h-0`. A página não rola; quem rola são as gavetas.

### Medidas

| Elemento | Fechado | Aberto |
|---|---|---|
| Barra superior | 34px | 34px |
| Trilho direito | 34px | 320px (320–360 conforme largura) |
| Área do gráfico | `flex-1` | `flex-1` (encolhe, não some) |
| Minimapa | 48px | 48px |
| Barra inferior | 26px | 40–45% da altura, máximo 360px |
| Topo (mobile) | 30px | 30px |

Breakpoint: `md` (768px). Abaixo disso, ver Mobile.

### Barra superior

- Marca compacta (quadrado azul + "Brasil em Números"), altura 34px, sem fundo próprio.
- Busca: pílula que abre o `SearchModal` existente. Atalho `⌘K` / `Ctrl+K`.
- Janela de tempo: os presets do `TimeFilters` (`1A`, `5A`, `10A`, `Tudo`) como
  segmento. São os quatro existentes; nenhum rótulo é renomeado nem removido.
  O estado "sem preset aceso" já existe quando há mandato escolhido — preservar.
- Chip do preset atual, que abre um menu com os presets nomeados + "do dia". Escolher um
  preset **substitui** as séries em cena, numa única escrita atômica (sem estados
  intermediários na URL). Se a seleção atual não corresponde a nenhum preset — série
  adicionada/removida à mão ou `?series=` arbitrário — o chip mostra "Personalizado".
- Ações: permalink (copia a URL) e tela cheia (`requestFullscreen`, opcional; se falhar,
  não mostra). Não há menu do site.
- Navegação para o conteúdo: link discreto **"Artigos"** → `/blog` (decisão minha; sem ele a
  home vira uma ilha). A marca permanece identidade, não link para si mesma.

### Gaveta direita — séries, legenda e eixos

Uma **vista única rolável**, sem abas, com três seções nesta ordem:

1. `SeriesChips` — status por série (carregando/erro), "tentar de novo" e aviso do teto de
   10 séries. Continua com `data-bloco="chips"`; sai da página, não do produto.
2. `SeriesLegend` — identificação textual, avisos de colisão de cor e de escala, cor e remoção.
3. Eixos — atribuição `left`/`right` (`axesStore` + `moverParaEixo`) e o aviso de escala.

Botão "+ Série" abre a busca. Fechada, mostra três ícones (séries, eixos, aparência) que
rolam a gaveta até a seção correspondente, não trocam de painel. Botão de fechar no
cabeçalho; `Esc` fecha a gaveta com foco de volta ao gatilho.

### Gaveta inferior — mandatos e comparação

Duas seções empilhadas, na ordem:

1. `MandateRail` como faixa de seleção (largura total, uma caixa por governo, texto
   `Lula III · PT`). O clique continua escrevendo `mandate` e `viewport`.
2. `ComparisonPanel` como matriz de largura total. Em telas estreitas, rolagem horizontal
   **dentro** da gaveta; a primeira coluna (indicador) fica fixa (`position: sticky`).

A gaveta cresce para cima e reduz a área do gráfico; o minimapa permanece visível. Abrir e
fechar não altera `viewport` nem `mandate`.

### Mobile (< 768px)

- Topo 30px: marca, busca (ícone + campo curto), chip da janela de tempo.
- Gráfico `flex-1`; minimapa 40px.
- Gaveta direita vira folha lateral de tela cheia (ou 88% da largura), com overlay.
- Gaveta inferior vira bottom sheet com alça; arrastar para baixo ou tocar no overlay fecha.
  A matriz mostra 3 governos por vez e rola na horizontal.
- Sem hover: todo controle tem estado visível e alvo ≥ 44×44px.

### Estados

| Estado | Como aparece |
|---|---|
| Sem série | `EstadoInicial` **dentro** da área do gráfico, com busca e o atalho "Selic × IPCA" preservado. A moldura não muda |
| Preset indisponível (falha de catálogo) | Marca d'água com a marca e a pílula de busca; nada mais |
| Carregando | `Esqueleto` dentro da área do gráfico (sem alterar a moldura); barra inferior inerte |
| Erro parcial | `SeriesChips` com o erro e "tentar de novo", na gaveta direita; ícone com ponto de atenção quando ela está fechada |
| Erro total | `ErroTotal` sobre a área do gráfico, com "tentar novamente" |
| Preset do dia carregado | Gráfico + marca d'água com o nome do preset e das séries |

A regra §9.1 (controles só existem quando há série) continua: sem série, as alças das
gavetas ficam desabilitadas, não escondidas — a moldura não pula.

### Preset do dia

- Arquivo novo `app/src/data/presets.js`, puro e testável.
- `presets`: lista nomeada de conjuntos por id de indicador:
  - `juros` — `selic-meta-acum-12m`, `selic-over-acum-12m`
  - `inflacao` — `ipca-acum-12m`, `igpm-acum-12m`
  - `habitacao` — `mvgr-nominal`, `mvgr-real`
  - `violencia` — `homicidios-anual`, `homicidios-armas-fogo-anual`
  - `atividade` — `pib-real-anual`, `populacao-variacao-anual`
  - `trabalho` — `caged-total-mensal`
- `presetDoDia(dataISO, lista)`: escolhe por hash determinístico da data (fuso
  `America/Sao_Paulo`, formato `AAAA-MM-DD`), sem `Math.random`. Mesmo dia → mesmo preset
  para todo mundo; dia seguinte → próximo da lista (rotação, não sorteio).
- Aplicação: depois do catálogo ficar `ready` e **somente** se a query não trouxer a chave
  `series`. Ids desconhecidos no preset são ignorados em silêncio, como no permalink.
- Escolher um preset nomeado no menu **substitui** o conjunto em cena numa escrita atômica
  (uma atualização de store, uma reescrita de URL), reusando a reindexação de cores do
  `seriesStore`. Se a seleção não corresponder a nenhum preset, o chip mostra "Personalizado".
- O preset entra pelo caminho normal de `adicionarSerie`, então URL, eixos, cores e avisos
  seguem idênticos aos de uma escolha manual.
- Não existe "surpreenda-me" nesta versão.

### Precedência de estado na entrada

1. Query com a chave `series` e ao menos um id válido → permalink (comportamento atual).
2. Query com a chave `series` e nenhum id válido → nada é adicionado; `EstadoInicial`.
   Um link explícito nunca é sobrescrito por preset.
3. Query sem a chave `series` → preset do dia.
4. Falha de catálogo → estado de erro total (sem preset).

O preset escreve a URL com `replaceState`, como qualquer série; um link salvo no dia 26
continua abrindo o conjunto do dia 26, e isso é intencional.

### Teclado e foco

- `⌘K` / `Ctrl+K`: busca. `Esc`: fecha a camada do topo (busca → gaveta → nada).
- Foco preso dentro da gaveta aberta (`inert` no resto), devolvido ao gatilho ao fechar.
- Gavetas fechadas usam `hidden`/`inert`, não apenas `translate`, para não receberem foco.

### Acessibilidade

- Alças das gavetas são `<button>` com `aria-expanded` e `aria-controls`.
- A legenda textual continua sendo o canal redundante de identificação; nada de cor sozinha.
- Contraste mínimo AA no texto de eixos e valores (hoje alguns rótulos são bem apagados;
  ajustar sem mudar a paleta das séries).
- `prefers-reduced-motion`: transições de gaveta viram corte seco.
- A matriz mantém cabeçalhos de coluna legíveis por leitor de tela (usar `<table>` com
  `<th scope="col">`, como hoje).

### O que muda em cada arquivo

| Arquivo | Mudança |
|---|---|
| `src/layouts/Home.astro` (novo) | `<html class="dark">`, `Meta`, analítica, consentimento; **sem** Nav/Footer/feedback/toast |
| `src/pages/index.astro` | Usa `Home.astro`; mantém `<div id="app">` + link do CSS + script |
| `src/components/Nav.astro` | Nada (o ramo `shell="app"` fica sem uso; remoção é limpeza opcional) |
| `app/src/App.svelte` | Nova moldura `h-dvh`, topo, gavetas; blocos viram conteúdo de gaveta |
| `app/src/components/HomeToolbar.svelte` (novo) | Marca, busca, janela, preset, permalink |
| `app/src/components/SeriesDrawer.svelte` (novo) | Envolve `SeriesLegend` + eixos |
| `app/src/components/BottomDrawer.svelte` (novo) | Envolve `MandateRail` + `ComparisonPanel` |
| `app/src/components/TimeFilters.svelte` | Variante compacta (segmento) sem mudar a lógica de `viewport` |
| `app/src/components/Chart.svelte` | Altura vem do container (`flex-1`), com `ResizeObserver` se necessário |
| `app/src/data/presets.js` (novo) | Lista + `presetDoDia` |
| `app/src/main.js` / `permalink-init.js` | Chamada do preset quando não há ids |

### O que não muda

Stores, domínio (escalas, mandatos, cor, formato), adapter do canvas, contrato de dados,
minimapa, modal de busca, ficha e o gate de analytics. A única exceção é o **nome da chave**
do permalink, que passa de `?indicators=` para `?series=` (ver decisões).

## Testes e critérios de aceite

- Unitários: `presetDoDia` determinístico (mesma data → mesmo preset; datas consecutivas →
  presets diferentes); preset com id inexistente é ignorado; lista vazia → sem preset.
- E2E (`app/e2e`):
  - `casca.spec.js`: adaptar às novas gavetas; continua exigindo fundo `#0e1117`, `dark` e
    zero erro de console.
  - novo `presets.spec.js`: `/` sem query carrega o preset do dia; `/?series=` ganha;
    preset não duplica séries.
  - `mobile.spec.js`: gavetas abrem/fecham por toque; gráfico ≥ 50% da altura do viewport.
  - `permalink.spec.js` e `exemplo.spec.js` continuam passando.
- `scripts/testar-analytics.mjs` continua passando (nenhum evento novo, nada antes do
  consentimento).
- Critérios visuais: em 1440×900 e 1280×800 a página não rola; em 390×844 o gráfico ocupa a
  tela e as duas gavetas abrem sem cortar conteúdo.

## Riscos

- **Altura em navegadores móveis**: `dvh` resolve a barra de endereço, mas `100vh` em iOS
  antigo não; usar `100dvh` com fallback `100vh`.
- **Canvas em container que muda de altura**: o `Chart` precisa reagir a resize; sem isso o
  canvas fica com a altura antiga e o traço sai borrado. Verificar `ResizeObserver`.
- **Gaveta inferior + minimapa**: com a matriz aberta em tela pequena, o gráfico pode ficar
  abaixo do mínimo legível; limitar a gaveta a 45% da altura.
- **Testes E2E existentes** dependem de `data-bloco` e da ordem dos blocos; a reestruturação
  exige atualizá-los junto, não depois.

## Decisões minhas (para conferir)

- Link "Artigos" no topo da home; marca não é link.
- Presets fixos por grupo do catálogo; presets de uma série são aceitáveis.
- Escolher preset **substitui** as séries em cena; seleção fora de preset mostra "Personalizado".
- `SeriesChips` vai para a gaveta direita (status, erro e "tentar de novo" não existem na legenda).
- Remover a última série volta ao `EstadoInicial` dentro do gráfico, com o atalho "Selic × IPCA".
- As cinco janelas de tempo atuais são mantidas, com os mesmos rótulos.
- `?series=` com ids inválidos não recebe preset: cai no `EstadoInicial`.
- O permalink passa a ser `?series=`; `?indicators=` deixa de ser lido, **sem alias**, e os 12
  links dos posts são atualizados na mesma fatia.
- Gaveta inferior contém mandatos **e** comparação; filtros de tempo sobem para o topo.
- Feedback e toast de artigos saem da home junto com nav e footer.
- Sem persistência de gavetas: toda visita abre limpa, com o preset do dia.

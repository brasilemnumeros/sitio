# Comparação por mandato no celular: lista por indicador

**Data:** 2026-11-05 · **Tamanho:** mudança média · **Emenda:** §4 de
`2026-10-14-camada-de-graficos-design.md` e a seção "Mobile" de
`2026-10-26-home-estilo-tradingview-design.md` no ponto em que falam de rolagem horizontal.

## O problema, medido

No celular (390×844), a matriz de comparação tem **1169px de largura dentro de uma gaveta de
372px**. Pior: a coluna fixa do indicador mede **368px** — 99% da tela — porque o
`whitespace-nowrap` a estica até o nome mais longo. Rolar na horizontal não resolve: a coluna
grudada continua cobrindo as nove colunas de governo. Na prática, a gaveta abre mostrando só os
nomes das séries.

A suposição da spec de 2026-10-26 — "a matriz mostra 3 governos por vez e rola na horizontal" —
não sobrevive a 372px. E o problema não é só de largura: a comparação é **horizontal por
definição** (mesmo indicador entre governos); comparar indicadores diferentes na vertical é
explicitamente sem sentido. Uma matriz espremida convida à leitura errada.

Segundo defeito, no mesmo assunto: a folha da ficha do indicador (`SearchModal`) desenha um
grabber (`h-1 w-10`), mas ele é **decorativo** — não há `pointerdown`/`pointerup`. A gaveta de
comparação tem o gesto de arrastar, mas na barra de baixo, não num grabber.

## O que foi descartado

- **Seletor de indicador + uma lista por vez.** Economiza altura, mas exige um toque para trocar
  de indicador e some com a leitura conjunta das séries escolhidas. Fica como evolução se o uso
  com 4+ séries ficar longo demais.
- **Matriz transposta (mandatos nas linhas, séries nas colunas).** Cabe com 1–2 séries, mas volta
  a estourar com 3+, e inverte a leitura para a vertical entre indicadores diferentes. Rejeitada.

## A decisão

**No desktop, nada muda.** A matriz com cabeçalho e coluna fixos continua igual.

**No celular, a comparação vira uma lista por indicador:**

- Um **cartão por série selecionada**, na ordem em que as séries estão no gráfico.
- Cabeçalho do cartão: bolinha da cor + nome + unidade (`R$ correntes`, `%`, …).
- Dentro do cartão, **uma linha por mandato, em ordem cronológica**: `Lula I · PT` à esquerda e,
  à direita, o Δ na unidade do indicador.
- Δ parcial mantém o período real em corpo menor embaixo do número
  (`parcial 03/2004–12/2006`). Sem cobertura continua dizendo o motivo
  (`série começa em 2004-03`), e ponto único continua dizendo `ponto único — sem Δ`. Nenhum
  estado vira `0` ou `—` (§9.4).
- O mandato em curso leva a mesma hachura, agora como marcador na borda esquerda da linha.
- Indicador que ainda carrega ou que falhou ganha o cartão com o estado, em vez de sumir (§9.3).
- **Zero rolagem horizontal.** A gaveta rola só na vertical.

A leitura continua sendo a mesma pergunta do produto: dentro do cartão, o mesmo indicador entre
os nove mandatos. Nada de barra, cor de julgamento ou ranking por "melhor".

## A gaveta (mobile)

- **Grabber** de 40×4px na borda superior, o convite ao swipe down.
- **Título na janela**, abaixo do grabber: "Comparação por mandato", com o resumo
  (`N séries · M eixos`) e o "×" no mesmo cabeçalho.
- O cabeçalho fica **fora da área rolável**: título e "×" não somem quando a lista rola.
- Quando aberta, a gaveta **vai até o fim da tela** (`bottom-0`) e a barra inferior de 32px
  **some no celular** — o título não se repete. No lugar dela, um rodapé de 28px dentro da gaveta
  com o aviso de dados e o link "Termos".
- **Fechar:** swipe down no grabber (limiar de 80px), "×" no cabeçalho ou toque no véu. A barra
  fechada continua sendo a alça com título e resumo, como hoje.
- No desktop a barra continua sempre visível e o cabeçalho/grabber não existem.

## O gesto (as duas folhas)

- Mesmo limiar da alça atual: **80px** de deslocamento vertical. Menos que isso é toque.
- `pointerdown` com `setPointerCapture` (dentro de `try/catch`), `pointerup` decide, `pointercancel`
  descarta. O elemento do grabber leva `touch-none` para o navegador não tratar o arrasto como
  rolagem.
- O gesto **só fecha**; a folha não segue o dedo (mesma escolha da alça atual).
- Aplicado ao grabber da comparação e ao da ficha do indicador. Na ficha, `fecharFicha()` já é o
  caminho único de fechar, então o gesto chama a mesma função do "×".

## Por dentro

- `app/src/components/ComparisonPanel.svelte` continua sendo a fonte da leitura: calcula
  `deltaNoMandato` e renderiza **as duas formas**, com CSS decidindo qual aparece
  (`hidden md:block` para a matriz, `md:hidden` para a lista). É o mesmo padrão de
  `SearchModal` ("quem decide o layout é o CSS", §12.1); as duas formas leem o mesmo domínio, não
  há estado novo.
- **`ComparisonList.svelte`** (novo) desenha os cartões. O conteúdo dos quatro estados de célula
  é extraído para **`ConteudoCelula.svelte`**, usado pelo `<td>` da matriz e pela linha da lista —
  o estado não pode ser reimplementado em dois lugares.
- `BottomDrawer.svelte` ganha o grabber e o cabeçalho mobile; `CLASSE_PAINEL` passa a ancorar em
  `bottom-0` (só é montado aberto) e a barra fica `max-md:hidden` quando expandida.
- `SearchModal.svelte` ganha os handlers no grabber da ficha e um `data-testid` para o teste.
- O limiar de 80px vira uma constante/regra compartilhada (domínio puro), usada pela alça atual,
  pelo grabber da comparação e pelo da ficha — para os três não divergirem.
- O foco ao abrir continua indo para o "×" visível. No celular, o "×" da barra está escondido;
  o componente escolhe o botão que tem `getClientRects()` (o visível).

## Testes

- `app/e2e/mandato-janela.spec.js`: o teste da matriz passa a ter dois ramos — desktop afirma a
  `<table>`; celular afirma a lista (um cartão por série, 9 linhas na ordem cronológica, textos de
  parcial/sem cobertura). O teste de arrasto usa o grabber no celular e a alça no desktop.
- `app/e2e/busca.spec.js`: novo teste de swipe down no grabber da ficha fecha a ficha (volta para
  "Escolha um indicador").
- `app/e2e/mobile.spec.js`: abrir/fechar a gaveta continua sem transbordo na página.
- `app/e2e/mandato-janela.spec.js`: a lista aberta em 320px não rola na horizontal (mede a lista,
  o nome longo e o documento), e os alvos de fechar têm 44×44px.
- Unitário: o limiar (`80px`) e a decisão de fechar ganham teste no domínio.

## Não-objetivos

- Não mexer na matriz do desktop, no cálculo do Δ, nos estados de célula ou na ordem dos mandatos.
- Não introduzir ranking, barras, cores de julgamento ou seletor de mandato dentro da gaveta.
- Não mudar a altura fechada da barra (36px / 32px no celular).

## Execução (2026-11-05)

- O gesto virou uma ação Svelte única em `app/src/arrastar-para-fechar.js`, com o limiar em
  `app/src/domain/gesto.js` — usado pela alça, pelo grabber da comparação e pelo da ficha.
- O cabeçalho do cartão mostra `símbolo · rótulo do eixo` (`% · percentual`, `R$ · moeda`), que é
  o que o dado carrega; o mockup dizia "R$ correntes" apenas como exemplo.
- No celular a gaveta aberta vai até `bottom-0`, a barra de 32px fica `hidden` e o aviso de dados
  reaparece num rodapé de 28px dentro da folha. Os specs que procuravam a barra por papel passaram
  a afirmar esse estado (grabber visível, barra oculta) em `visual.spec.js` e `mandato.spec.js`.
- O E2E afirma a forma por viewport: a matriz no desktop, a lista no celular, e a troca de uma para
  a outra ao alargar a tela — as duas existem no DOM por decisão de CSS, como em `SearchModal`.

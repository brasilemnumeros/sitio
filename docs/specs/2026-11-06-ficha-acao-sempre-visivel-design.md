# A ação da ficha não fica atrás do texto

**Data:** 2026-11-06 · **Tamanho:** mudança pequena · **Emenda:** §1.1 e §12.1 de
`2026-10-14-camada-de-graficos-design.md` (a ficha, no desktop e na folha do celular)

## O problema

A ficha era **um único `overflow-y-auto`**: título, descrição, link do notebook, metadados,
aviso de proveniência e a ação. Como a `descricao` vem do catálogo e não tem limite de tamanho, um
texto longo empurrava o botão para fora da coluna — e não havia pista de que havia mais coisa
abaixo.

Medido com o pior caso do catálogo em 2026-11-06 (“Esgoto — população atendida com rede coletora
(%)”, 680 caracteres):

| Janela | Coluna útil | Conteúdo da ficha | O botão ficava |
|---|---|---|---|
| 1280×900 | 700px | 765px | 17px abaixo da dobra |
| 1440×800 | 615px | 765px | 102px abaixo |
| 1280×720 | 547px | 765px | **170px abaixo** |
| 1024×768 | 588px | 765px | 129px abaixo |
| 390×844 (celular) | 585px* | 585px* | cabia |

\* na folha do celular a descrição quebra em menos linhas (a largura é a da tela), então o caso
atual cabia. Nada garantia isso quando o catálogo crescesse.

O efeito é de produto, não de pixel: a pessoa termina de ler a ficha e **precisa descobrir sozinha
que há uma ação abaixo**. Uma ação que não está na tela não existe.

## O que foi descartado

- **Aumentar a modal** (`85vh` → `90vh`). Empurra o problema: a 720 de altura o conteúdo continua
  maior, e a janela do usuário não é nossa para negociar.
- **Botão no topo, antes da descrição.** Resolve a posição inicial e quebra a ordem “ler → decidir”;
  além disso o botão some ao rolar para ler o resto, e a ação secundária (“Trocar o gráfico por
  esta série”) não tem lugar natural ali.
- **Só recolher a descrição.** Reduz o caso comum, mas não é garantia: com o texto expandido o
  botão volta a sair (é exatamente o que acontece ao clicar em “Ler mais”).

## A decisão

**Duas caixas** dentro de `app/src/components/Ficha.svelte`:

1. **Miolo rolável** — título, descrição, link do notebook, metadados e aviso de proveniência.
2. **Rodapé fixo** — “Adicionar ao gráfico” / “Remover do gráfico” e a ação secundária “Trocar o
   gráfico por esta série”, com borda superior. Não rola nunca, em nenhum tamanho de janela.

A ação passa a ter **sempre o mesmo lugar**, independentemente do tamanho da descrição. No celular
o mesmo conserto mantém o botão acima da borda da folha quando a descrição inteira está aberta.

**E a descrição abre recolhida em 4 linhas**, com “Ler mais” / “Ler menos” logo abaixo:

- **O botão só existe quando há o que revelar.** A decisão é **medida no DOM**
  (`scrollHeight > clientHeight`), não estimada por contagem de caracteres: a coluna muda de largura
  entre desktop e celular, e um botão que mente ensina a não confiar nele (mesma postura da pista
  dos chips em `SearchModal`). Um `ResizeObserver` refaz a medição quando a largura muda (girar o
  celular, redimensionar a janela).
- **A expansão é presa ao id do indicador**, não a um booleano: trocar de ficha (inclusive por
  hover/setas) sempre abre recolhido, sem efeito de reset.
- **O toggle não herda `aoTeclado`.** Lá `⏎` confirma a ação da ficha (adicionar/remover); aqui
  `⏎` é a ativação nativa do botão.
- **A descrição não é truncada em silêncio:** 4 linhas + reticências + um caminho explícito para o
  texto inteiro. O que saiu foi o *scroll obrigatório*, não a informação.

### Por que 4 linhas

É o ponto em que o miolo ainda cabe, recolhido, na coluna de 288px do desktop em 720 de janela
(medido: 456px úteis contra 483px de conteúdo — sobra só o aviso de proveniência para rolar). Com
menos linhas a ficha esconde texto que caberia; com mais, ela volta a empurrar o rodapé para o
limite da janela.

## Como fica (medido em 2026-11-06, mesmo corpus)

| Cenário | Antes | Depois |
|---|---|---|
| 1440×900 | botão 17px fora | ficha 574px, botão visível |
| 1280×720 | botão 170px fora | ficha 547px; miolo rola 483px em 456px, botão visível |
| 1024×768 | botão 129px fora | botão visível |
| 390×844 | cabia | cabe; rodapé acima da borda |
| descrição expandida | — | miolo rola (707px de conteúdo), rodapé intacto |

Descrição curta (ex.: “IPCA (%)”) não mostra “Ler mais”.

## Como fica provado

- **E2E** (`app/e2e/busca.spec.js`), nos dois projetos (desktop 1280×900 e Pixel 7):
  - “descrição longa não esconde a ação: rodapé fixo e ‘Ler mais’” — com a descrição mais longa do
    catálogo, a ação está **dentro da ficha e da janela sem rolar** (`toBeInViewport` mais a
    geometria), a descrição está recolhida em 4 linhas, o texto medido é maior que a caixa, e o
    “Ler mais” expande sem tirar o rodapé do lugar. No desktop, prova também que quem rola com o
    texto aberto é o **miolo**, não o rodapé.
  - “descrição que cabe não ganha ‘Ler mais’” — a outra metade da promessa.
- **Nota de teste:** no celular a folha sobe em 200ms (`transition-transform`). Medir a posição no
  mesmo frame do ⏎ pega a posição de partida (fora da tela) e acusa um defeito inexistente; a
  espera é `toBeInViewport`, que repete até a transição terminar. Foi o que aconteceu na primeira
  rodada deste teste.

## Não-objetivos

- Pista visual de rolagem (degradê na base do miolo). Avaliada e **não** pedida nesta rodada; o
  corte do texto na borda do rodapé é o próprio sinal.
- Recolher os metadados (Unidade…Fonte), mudar a ordem da ficha, ou mexer no aviso de proveniência.
- Mudar a ação secundária, o teto de 10 séries ou a regra de teclado da modal.
- Guardar a preferência de “descrição aberta” — ela vive só enquanto a busca está aberta.

# Tour de primeira visita (desktop)

**Data:** 2026-11-01 · **Tamanho:** mudança pequena-a-média · **Specs tocadas:**
`2026-10-26-home-estilo-tradingview-design.md` (§1 moldura, §9 estados)

## O problema

Quem chega **entende o que o site é** — o problema é descobrir o que ele faz. O terminal tem sete
tarefas e treze controles, e cinco deles são ícones sozinhos num trilho de 44px, sem rótulo. A
única ajuda existente é um balão de primeiro uso no "limpar filtros" (`SeriesDrawer.svelte`), que
só ensina o que a pessoa já tentou usar — quem nunca abre a gaveta nunca descobre que ela existe.

## O que queremos

Um **tour com destaques** na primeira visita, no desktop. Seis passos, na ordem em que a pessoa
esbarra neles, encerrável a qualquer momento e reabrível depois.

1. **Busca** (`⌘K`) — achar qualquer indicador.
2. **Janelas de tempo** — 1a / 5a / 10a / Tudo, e "Personalizado".
3. **Mandato** no topo, com a **comparação por mandato** da barra inferior (a conversão do produto
   é compartilhar o gráfico).
4. **Trilho de controles** — engrenagem (séries, cores, eixos), copiar link, tela cheia.
5. **Legenda** — o olho esconde sem remover; o × remove.
6. **Eixo Y** — arrastar para cima/baixo na escala da direita aumenta ou reduz a escala, e
   **duplo clique na escala devolve o automático**.

O passo 6 só existe porque foi verificado: arrastar na escala de preço muda a faixa (medido:
-4…56 → -20…75) e o duplo clique restaura (-4…56). O duplo clique é **parte do passo**, não um
detalhe — sem ele o tour ensina uma porta que não volta.

## Não-objetivos

- **Celular.** A 390px o trilho e a legenda só aparecem com gaveta/folha aberta, que cobre o
  gráfico; um tour ali ensinaria por cima da coisa ensinada. Decide-se por `innerWidth >= 1024`.
- **Tela de boas-vindas.** Rejeitada de propósito em `EstadoInicial.svelte`: reaparece toda vez que
  a seleção é limpa e cobra pedágio de quem já conhece. O tour é diferente: acontece **uma vez por
  navegador** e não depende do estado da seleção.
- **Roteiro por tarefa** (o "mapa de recursos" do tipo "quero comparar duas séries"). Foi a
  alternativa recomendada na conversa, mas o dono do projeto escolheu o tour; o mapa pode vir
  depois e conviver com ele.

## Como

**Biblioteca: `driver.js` (1.10.2, MIT, zero dependências, ~5kb).** Cuida do que dá trabalho:
overlay com recorte, balão posicionado, `scroll-into-view`, foco preso no balão, `Esc`, setas.
Descartados: **intro.js** (AGPL-3.0 — uso comercial exige licença paga, e contradiz o MIT/CC BY
declarado em `/sobre`), **shepherd.js** (MIT, mas carrega `floating-ui` para fluxos longos) e
**fazer à mão** (~60 linhas para o desenho, e o custo real está no foco/teclado).

- Um componente novo `Tour.svelte` (sem store): recebe `abrir` e a lista de passos, e chama
  `driver().drive()`. O `App.svelte` é dono do estado, como no resto das camadas.
- **Quando dispara:** 600ms depois do primeiro frame com o gráfico montado — o mesmo cuidado da
  dica do "limpar filtros", que espera o `fitContent` assentar para não disparar sozinha.
- **Quando NÃO dispara:** se a URL trouxe `?series=` (link compartilhado — a pessoa veio ver um
  gráfico, não fazer tour), se `innerWidth < 1024`, ou se a chave `tour-visto` já estiver no
  `localStorage`. A chave é gravada **ao abrir**, como a da dica: quem fechou no passo 2 não vê
  tudo de novo na próxima visita.
- **Reabrir:** um botão `?` no pé do trilho (abaixo de tela cheia), com o rótulo acessível "Ver o
  tour de novo". Sem ele o tour é beco sem volta.
- **Tema:** o `driver.css` vem claro; o app é escuro fixo. As variáveis do driver vão para o
  `app.css` com as cores do terminal (`#0e1117`, `border-slate-700`, texto `slate-200`).
- **Acessibilidade:** `Esc` fecha (driver.js já faz); o foco entra no balão e volta ao `?` ao
  fechar. O tour é `aria-hidden` para leitor de tela? Não — o driver.js usa `role="dialog"`; o
  conteúdo de cada passo é texto curto em português.

## Guardas e testes

- **Vitest:** nada de DOM aqui; se a decisão "deve disparar?" virar função pura
  (`deveMostrarTour({ largura, temSeries, jaVisto })`), ela ganha teste.
- **Playwright (`tour.spec.js`):** (1) primeira visita mostra o passo 1; (2) `Esc` fecha e grava a
  chave; (3) recarregar não mostra de novo; (4) `?series=` na URL não mostra; (5) o `?` do trilho
  reabre; (6) a 390px não mostra. — O E2E já falha com qualquer `console.error`, então o
  `driver.css` quebrado aparece como falha de teste, não como tela feia.
- **Guarda de build:** `scripts/testar-publico.sh` passa a exigir a string do tour no `app.js`?
  **Não.** O tour é opcional por definição; o que precisa de guarda é o oposto — que ele não
  dispare em cima de um link compartilhado. Isso é o teste 4.

## Decisões que ficam com o construtor

- Nome do arquivo e assinatura do componente.
- Texto exato de cada balão (curto: título de 2–4 palavras + uma frase).
- Se o passo 3 destaca o seletor de mandato do topo, a barra inferior, ou os dois em sequência
  (o driver.js destaca UM elemento por passo; a barra inferior é a que ensina a comparação).
- Se `driver.css` entra por `import` no componente (o Vite o junta ao `app.css`) ou é copiado —
  a primeira opção, salvo se o CSS escopado do Svelte interferir.

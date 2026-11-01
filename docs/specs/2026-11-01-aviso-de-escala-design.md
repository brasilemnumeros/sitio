# Aviso de escala sai de cena; a atribuição automática de eixo fica

**Data:** 2026-11-01 · **Tamanho:** mudança pequena · **Emenda:** §5 de
`2026-10-14-camada-de-graficos-design.md`

## O problema

Quando uma série tem amplitude muito diferente das que já estão no gráfico, o app mostrava dois
avisos: um bloco amarelo ou vermelho na ficha da modal, **antes** de adicionar ("Escala
incompatível", "a série não é legível no mesmo eixo") e um selo `⚠ escala N×` na seção Eixos,
**depois**. Nenhum dos dois bloqueia nada, e o app já resolve o caso: ao adicionar,
`recalcularEixos` manda a série para o eixo esquerdo, que passa a ser desenhado.

O texto, porém, descreve um impedimento que não existe. Medido em uso: quem lê o bloco entende
"não dá para adicionar" e desiste — o oposto de "informar, não punir", que era a intenção
declarada do componente.

## A decisão

**Nenhum aviso de escala.** Nem antes (ficha), nem depois (Eixos). O app continua fazendo a única
coisa que de fato importa: **colocar a série incompatível no eixo que não está em uso**, com a
escala daquele lado aparecendo sozinha, e deixando o controle manual `esq./dir.` na seção Eixos.

A pessoa percebe pela tela — duas escalas, a linha desenhada — e resolve no controle que já
existe, se quiser. O app não explica escala em lugar nenhum.

## O que sai

1. `app/src/components/Ficha.svelte` — o bloco `{#if aviso.veredito !== 'convive'}` (título +
   duas frases), as derivações `aviso` e `nomeContra` e o import de `comparabilidade`.
2. `app/src/components/AxesPanel.svelte` — o selo `⚠ escala N×` e o helper `avisoEscala`.
3. `app/src/stores/axes.js` — o campo `avisos` da store. `recalcularEixos` continua chamando
   `comparabilidade` para DECIDIR o eixo (é a única coisa que ele precisa dela agora) e passa a
   publicar só `atribuicao`.
4. `app/src/stores/axes.test.js` — as asserções sobre `avisos` saem; ficam as que provam a
   atribuição (conviventes à direita, incompatível à esquerda, os dois eixos só).

## O que fica, e o que passa a guardá-lo

- Limiares (50× e 1.000.000×) e a decisão automática de eixo: **não mudam**.
- `moverParaEixo` (o botão `esq./dir.`) e o teto de 10 séries com `motivoDoLimite()`: **não mudam**.
- A guarda deixa de ser sobre texto e passa a ser sobre **comportamento**: um E2E adiciona, pelo
  caminho do produto, uma série de amplitude >50× a um gráfico que já tem uma e prova que (a) a
  escala da esquerda aparece e (b) a barra inferior conta **2 eixos**. É o que o aviso tentava
  explicar, medido no gráfico em vez de escrito na ficha.

## Não-objetivos

- Normalizar séries para base 100 (a §5 antiga mencionava; nunca foi implementado e não entra aqui).
- Mexer na legenda, nos chips ou na matriz de comparação.

# "Trocar o gráfico por esta série": ação explícita na ficha

**Data:** 2026-11-04 · **Tamanho:** mudança pequena · **Emenda:** §1.1 e §9.5 de
`2026-10-14-camada-de-graficos-design.md`

## O problema

A home nunca abre num gráfico vazio: o preset do dia já vem carregado. Então o primeiro
"Adicionar ao gráfico" sempre cai num gráfico que já tem 2–3 séries do mesmo grupo — e a pessoa
que queria só aquela série acaba com uma mistura que não pediu, num segundo eixo, sem um caminho
óbvio de volta (remover uma a uma pela faixa de chips).

## O que foi descartado, e por quê

Um diálogo no momento de adicionar ("já existem séries de outro grupo; remover as demais?") com
opção "não perguntar mais". Cai por quatro motivos:

1. **Grupo é navegação, não comparabilidade.** O preset `atividade` mistura PIB e população de
   propósito; o grupo `trabalho` tem contagem (Caged) e % (PNAD); Selic e IPCA são grupos
   diferentes e comparam bem. O aviso dispararia em caso legítimo e ficaria quieto em caso ruim.
2. **O app já resolve o eixo** sozinho (`recalcularEixos` manda a incompatível para o eixo
   esquerdo). Foi exatamente esse o motivo de o aviso de escala sair em 2026-11-01: aviso que
   descreve um impedimento inexistente faz a pessoa desistir.
3. **Diálogo destrutivo no meio do add**, sem desfazer, apagando estado construído (cor pessoal,
   séries ocultas, atribuição de eixo).
4. **"Não perguntar mais" é preferência invisível e permanente** — cria dois modos de adicionar
   sem nenhuma pista na tela de qual está ativo, e o app não tem tela de configurações.

## A decisão

Uma **ação secundária, explícita, na ficha** — não uma interrupção. Quem quer comparar, compara
(o botão principal continua adicionando). Quem quer recomeçar com aquela série, recomeça.

- **Onde:** em `app/src/components/Ficha.svelte`, abaixo do "Adicionar ao gráfico", como botão
  de texto (sem borda, `text-xs`), visualmente secundário.
- **Quando aparece:** só quando há séries no gráfico **e** o indicador ainda não está nele.
  Com o gráfico vazio não há o que trocar; com o indicador já no gráfico o botão da ficha é
  "Remover do gráfico" e nada mais.
- **Rótulo proposto:** **"Trocar o gráfico por esta série"**. Diz exatamente o que acontece —
  inclusive que o resto sai. O rótulo **não pode começar com "Adicionar"**: o E2E já localiza o
  botão principal por `getByRole('button', { name: 'Adicionar' })`, que casa por substring, e um
  segundo botão com esse prefixo deixaria o locator ambíguo (`app/e2e/busca.spec.js:50`).
- **Sem confirmação em diálogo.** O rótulo é a confirmação; a ação é explícita por definição.
  (Decisão minha — se você preferir uma confirmação, muda aqui e só aqui.)
- **Sem preferência salva, sem "não perguntar mais", sem gatilho por grupo.**

## Como funciona por dentro

Nova função em `app/src/stores/series.js`, o par de `substituirSeries` para o caso de UMA série:

```js
export async function substituirPorSerie(entry, { fetchImpl } = {}) { … }
```

- **Uma emissão só** (`seriesStore.set({ itens: [...] })`), pelo mesmo motivo documentado em
  `substituirSeries`: nunca mostrar a mistura dos dois conjuntos nem um gráfico vazio no meio do
  caminho. Por isso **não** é `limparSeries()` seguido de `adicionarSerie()`.
- Reusa `paraItem`, `carregarItem` e `registrarFalha`. A cor volta ao índice 0 da paleta
  (`reindexarCores`), que é o que "recomeçar" significa.
- Passa `expectedId: entry.id` — a defesa contra arquivo trocado na URL que `substituirSeries`
  não tem (lá o `datafile` vem curado do preset; aqui vem da ficha, mas o id é conhecido e não há
  razão para abrir mão da checagem).
- Falha de rede/carregamento é **parcial e visível**: a série fica `erro` com a mensagem crua e o
  botão "tentar de novo" do chip — o gráfico anterior já saiu, então não há rollback (§9.3).

Ligação: `SearchModal.svelte` passa mais uma prop, `aoSubstituir`, e a `Ficha` a chama. A store
continua sendo a fonte da verdade; nenhum estado novo em componente.

## Teclado

`⏎` na ficha continua sendo a **ação principal** (adicionar; remover se já está). A troca é
mouse/toque/`Tab`. A troca é destrutiva e não deve ser alcançável por um `⏎` reflexo — por isso o
botão **não** herda o `aoTeclado` da modal (que trata `⏎` como `confirmarAcao`, ou seja, adicionar
em vez de trocar). Ele recebe só o `Esc`, para fechar a ficha como qualquer outro controle dela.

## Teto de 10 séries

No teto, o "Adicionar" fica desabilitado com o motivo (`motivoDoLimite()`), mas a troca continua
**habilitada** — ela é justamente a saída do teto sem remover uma a uma. O botão não mostra
motivo nenhum: ele não está limitado.

## Não-objetivos

- Diálogo, "não perguntar mais", gatilho por grupo, heurística por amplitude ou por contagem.
- Desfazer/undo da troca (o app não tem undo; se ele vier, vem para tudo).
- Mudar o preset do dia, o tour, o permalink ou a atribuição de eixos.
- Analytics: o app não instrumenta eventos hoje (`gtag` só existe no site, pós-consentimento).

## Como fica provado

- **Vitest** (`app/src/stores/series.test.js`): a troca deixa exatamente 1 item, na cor 0, com
  `expectedId` respeitado (arquivo com id trocado → `erro`), e o item antigo não sobrevive.
- **E2E** (`app/e2e/busca.spec.js`): com 2 séries no gráfico, abrir a ficha de uma terceira pelo
  caminho do produto, clicar em "Trocar o gráfico por esta série" e provar que a faixa de chips
  tem 1 chip, que a legenda desenha 1 série e que a URL reflete só ela.
- O `getByRole` do botão principal passa a `exact: true` para não casar com o novo rótulo.

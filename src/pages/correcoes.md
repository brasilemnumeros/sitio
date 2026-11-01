---
layout: ../layouts/Base.astro
title: Correções e erratas
description: Como apontar um erro nos dados do Brasil em Números, o que acontece depois e o registro público das correções já feitas.
---

# Correções e erratas

Trabalhar com dados públicos é trabalhar com dado que muda: os órgãos de origem
revisam séries, corrigem defasagens e republicam bases. Esta página existe para
tornar explícito **como um erro é tratado aqui** — inclusive o erro que ainda não
foi encontrado.

## Como apontar um erro

Abra uma _issue_ em [github.com/brasilemnumeros](https://github.com/brasilemnumeros)
informando:

- **qual indicador** e **qual período** (mês e ano bastam);
- **qual valor** aparece no site e **qual valor** você espera;
- se possível, o **link do dado na fonte oficial** (IBGE, Banco Central, Ipea, FGV,
  MTE). É o que permite confirmar rápido.

Não é necessário se identificar, e **não envie dados pessoais** na _issue_.

## O que acontece depois

1. **Confirmação na fonte primária.** Comparamos o valor exibido com o dado do
   órgão produtor.
2. **Se o erro é do site** (extração, consolidação, arredondamento, data): a série
   é corrigida e a correção é registrada na tabela abaixo, com data.
3. **Se o erro é da fonte** (o órgão publicou o valor assim): o dado é mantido
   como está — reproduzir a fonte é o compromisso do site — e pode ser anotada uma
   ressalva na ficha do indicador.
4. **Se a série foi revisada na origem**: atualizamos o dado e, quando a mudança
   altera algum número já publicado, registramos também.

**Prazos-alvo:** resposta ao apontamento em até **5 dias úteis**; correção
publicada em até **15 dias úteis** a partir da confirmação. São metas de trabalho
de um projeto independente, não uma obrigação contratual.

## Histórico de erratas

| Data | Indicador | Período | O que estava errado | Correção |
|---|---|---|---|---|
| — | — | — | Nenhuma errata registrada até 1 de novembro de 2026 | — |

## O que este site não promete

Os dados são **reproduzidos de fontes públicas** e podem conter erro, estar
desatualizados ou defasados em relação ao órgão produtor. Antes de usar um número
em uma decisão ou em uma publicação, **confira na fonte primária** indicada na
ficha do indicador. Os detalhes estão nos [Termos de Uso](/termos-de-uso.html).

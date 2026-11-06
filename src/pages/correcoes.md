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

Abra uma _issue_ no
[repositório de dados](https://github.com/brasilemnumeros/dados/issues/new?labels=erro-de-dado)
informando:

- **qual indicador** e **qual período** (mês e ano bastam);
- **qual valor** aparece no site e **qual valor** você espera;
- se possível, o **link do dado na fonte oficial** (IBGE, Banco Central, Ipea, FGV,
  MTE). É o que permite confirmar rápido.

No gráfico, a **bandeira do trilho** já abre a issue com a série, a janela visível e o link do
estado preenchidos — basta descrever o que está errado; o período e os valores você completa ali
mesmo, antes de enviar.

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
| 2026-11-01 | `igpm-acum-12m` | toda a série | O acumulado em 12 meses era a **soma** das taxas mensais, que subestima o resultado | Passa a **compor** as taxas da própria fonte; 331 dos 349 valores mudaram (dez/2002: 22,92% → 25,31%) |
| 2026-11-01 | `selic-meta` (era `selic-meta-acum-12m`) | toda a série | Publicava a média da meta no mês sob o nome "acumulado em 12 meses"; a meta é anualizada, e acumulá-la é um construto | Volta a publicar o **nível** (out/2025 = 15,00% ao ano), com `id` novo; a URL antiga `?series=selic-meta-acum-12m` deixa de funcionar |
| 2026-11-01 | `selic-over-acum-12m` | out/2025 | O último ponto incluía um mês ainda em aberto | 12,77% → 13,71% |
| 2026-11-01 | `mvgr-real` | out/2005 em diante | A variação do IPCA era aplicada **duas vezes** em out/2005 e out/2015 | Até +4,8% no fim da série; base (mar/2004) passou a constar no nome |
| 2026-11-01 | `mvgr-nominal` | 2005-2025 | Série nunca regerada após as revisões do SCR | 125 dos 257 valores corrigidos (até 3,17%) |
| 2026-11-01 | `caged-total-mensal` | toda a série | Base desatualizada: o MTE revisou o estoque | Todos os valores ~+1,3 milhão; série vai até ago/2026 |
| 2026-11-01 | `populacao-total-anual`, `populacao-variacao-anual` | toda a série | A série vinha de **interpolação do IPEADATA**, não do IBGE, e indicava queda de população em 2021-2022 | Passa às Projeções 2024 do IBGE: 2021 +0,45% e 2022 +0,36% (não há queda) |
| 2026-11-01 | `homicidios-anual`, `homicidios-armas-fogo-anual` | toda a série | O denominador trocava de população (vintage) ao longo da série | Denominador único; taxas mudaram até 0,78 por 100 mil |
| 2026-11-01 | `proporcao-homicidios-armas-fogo-anual` | 2019 | Era a razão entre as duas **taxas**, não entre as contagens | 67,76% → 66,38% |
| 2026-11-01 | `homicidios-armas-fogo-anual` | todas as datas | O carimbo vinha no dia 15 da API, isolado das demais séries | Passa ao dia 01 |
| 2026-11-01 | `pib-real-anual` | 2024 | Valor desatualizado na fonte | 3,40% → 3,42% |

## O que este site não promete

Os dados são **reproduzidos de fontes públicas** e podem conter erro, estar
desatualizados ou defasados em relação ao órgão produtor. Antes de usar um número
em uma decisão ou em uma publicação, **confira na fonte primária** indicada na
ficha do indicador. Os detalhes estão nos [Termos de Uso](/termos-de-uso.html).

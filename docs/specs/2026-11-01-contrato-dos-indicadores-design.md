# Contrato dos indicadores: fonte única e versão única

**Data:** 2026-11-01 · **Status:** aceita (usuário aprovou a abordagem e dispensou
retrocompatibilidade — os 13 arquivos serão ajustados depois da definição)

## Intenção

Hoje o contrato está em quatro lugares (prosa no `dados/AGENTS.md`, `validate.js`,
`validar.py` e o plano 01) e os dois validadores já divergem. Além disso, duas informações
prometidas pela ADR D7 não existem no arquivo: a **comparabilidade declarada** e **o que o
número mede**. Definir o contrato de forma normativa, com uma fonte única e um corpus que os
dois validadores são obrigados a respeitar.

## Abordagem escolhida (opção 1 da conversa)

Documento normativo com regras numeradas + **corpus de conformidade compartilhado** em
`dados/tests/contrato/`, consumido pelo validador Python e pelo teste JS. Sem dependência nova.
Descartadas: JSON Schema (não expressa mês repetido/id/ordem e adicionaria `ajv` +
`jsonschema`) e "só o documento" (mantém a divergência).

## Decisões

- **Schema 1 (versão única)**: some o campo `rate` (o IPCA já não o publica), entram `eixo` e
  `medida`; validação estrita (campo desconhecido é erro).
- **`eixo`** (`percentual`, `reais`, `contagem`, `por-100-mil`) é a comparabilidade declarada;
  o `unit.type` obrigatório por eixo está na tabela do contrato.
- **`medida`** (`nivel`, `acumulado-12m`, `variacao-anual`, `estoque`, `participacao`) devolve
  o "acumulado 12 meses" que se perdeu quando o catálogo parou de duplicar `granularity`.
- **Ordem ascendente, um ponto por período, lacuna = ausência, sem `null`** — regras que o JS
  não verificava e o Python verificava.
- **Onde fica:** `docs/contrato-de-indicadores.md` (normativo, vivo) e o `dados/AGENTS.md`
  referencia o documento e o código das regras.
- **Corpus no `dados`** (é sobre arquivos de dado, e o repo tem os testes em Python). O CI do
  `sitio` passa a fazer o checkout do `dados` **antes** dos testes de unidade — hoje o
  `integracao.test.js` lê `../dados` e o checkout acontece depois, o que já é um furo.

## Consequências

- Os 13 arquivos ganham `eixo`/`medida` e perdem `rate` (mudança mecânica, no repo `dados`).
- `validate.js` passa a recusar fora de ordem, período repetido, campo extra e `rate`.
- `Ficha` passa a mostrar a `medida` ao lado da granularidade.
- O catálogo continua com `escala` (só `unit.type`), com teste de consistência.

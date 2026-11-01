# Contrato dos indicadores — plano

**Goal:** tornar o contrato dos arquivos de série normativo, com uma fonte única, e migrar os
13 arquivos para o formato novo (schema 1, versão única).

**Spec:** `docs/specs/2026-11-01-contrato-dos-indicadores-design.md`
**Contrato:** `docs/contrato-de-indicadores.md` (normativo, C1…C14)

## Restrições

- Sem retrocompatibilidade: os 13 arquivos, os dois validadores e o corpus mudam juntos.
- O corpus roda nos dois validadores; o código da regra vai no nome do caso inválido.
- Mudanças alheias na árvore não entram em commit.

## Tarefas

1. **Contrato** — `docs/contrato-de-indicadores.md` com C1…C14, `eixo`, `medida`, lacunas,
   versionamento. ✅
2. **Corpus** — `dados/tests/contrato/{validos,invalidos}`. ✅
3. **Validador JS** — `validate.js` com códigos de regra, estrito, ordem/unicidade, calendário;
   `SCHEMA_VERSION = 2`. ✅ (testes, inclusive o corpus)
4. **Validador Python** — mesmas regras e códigos; testes com o corpus. ✅
5. **Dados** — 13 arquivos: `schema: 1`, `eixo`, `medida`, sem `rate`. ✅
6. **App** — `Ficha` mostra `medida`; testes de fixture atualizados. ✅
7. **Docs e CI** — `AGENTS.md` dos dois repos; checkout do `dados` antes dos testes de unidade. ✅
8. **Verificação** — build, Vitest, pytest, E2E, analytics.

# Fatia 03 — Períodos de governo como dado + contas de mandato

**Data:** 2026-10-14 · **Branch (ambos os repos):** `feat/camada-de-graficos` · **Ambiente:** `NODE_ENV=development npm test` dentro de `sitio/app` (R11).

## Resultado

Fatia implementada e verificada. Três commits, um por unidade de trabalho, nos repos corretos:

| repo | commit | mensagem |
|---|---|---|
| `dados` | `ee76a83` | `feat(governos): modelo federal versionado, sem cor de partido` |
| `sitio` | `149c60a` | `feat(domain): delta por mandato com os quatro estados de celula` |
| `sitio` | `964de4c` | `test(domain): trava a medicao de cobertura por mandato da spec` |

Estado final: `sitio` e `dados` com árvores limpas; suíte `sitio/app` **57 testes / 7 arquivos, todos verdes**.

## O que foi feito

### Tarefa 1 — arquivos de governo (repo `dados`)
- Criados `dados/governos/index.json` e `dados/governos/federal.json`, no schema da §7.2, transcritos do brief.
- 9 mandatos, começando em **FHC I (1995-01-01 – 1998-12-31)** — decisão R22: o arquivo é fato, não recorte da série.
- `inicio`/`fim` guardam o **exercício efetivo** (Temer em 2016-05-12; Dilma II até 2016-08-31); o mandato formal vive em `mandatoDe` (Dilma II e Temer). Última entrada é `emCurso: true` com `fim: null` (Lula III).
- **Nenhum campo guarda cor** — verificado por `grep -in "cor\|color"` nos dois arquivos: zero ocorrências. O dado carrega só a sigla (`partido`).
- Listas `estadual` e `municipal` ficam **vazias por decisão** (§7.1), como no brief.

### Tarefa 2 — contas puras (`sitio/app/src/domain/mandates.js`)
- `COBERTURA` (os quatro estados), `pontosNoMandato`, `pontosEsperados`, `deltaNoMandato`, `formatarPeriodo`, `ordenarMandatos`, conforme interfaces do brief.
- TDD observado: teste escrito primeiro → **RED** (`Cannot find module './mandates.js'`) → implementação → **GREEN**.
- `NODE_ENV=development npm test`: 6 arquivos / 53 testes verdes após a implementação.

### Tarefa 3 — o teste que trava a medição (§7.3)
- Criado `sitio/app/src/domain/mandates.medicao.test.js`, transcrito do brief, com o adaptador `p.value ?? p.rate` (temporário — a migração é a fatia 11).
- Filtra **FHC I** explicitamente (`m.rotulo !== 'FHC I'`), travando as **8 colunas publicadas** da §7.3 — não removido, como manda o brief.
- Os 4 testes passam:
  - `reproduz a matriz de cobertura do anexo, célula a célula` ✓
  - `resume a medição: 104 células, 4 sem cobertura, 1 ponto único` ✓
  - `reproduz as 15 células "abaixo do esperado" da §7.3` ✓
  - `MVG-R no Lula I: o período real usado é 03/2004–12/2006` ✓

## Evidência dos números medidos

Antes de escrever qualquer arquivo, a matriz foi **recalculada de forma independente em Python** sobre os 13 JSON reais de `dados/`. Todos os valores do brief conferem — nenhum número foi aceito por fé:

- **Matriz 13 × 8 = 104 células** reproduzida **célula a célula** (todas as 13 linhas idênticas ao `ESPERADO`).
- **4 células sem cobertura** (`mvgr-nominal|FHC II`, `mvgr-real|FHC II`, `homicidios-armas-fogo-anual|Lula III`, `proporcao-homicidios-armas-fogo-anual|Lula III`).
- **1 ponto único** (`homicidios-anual|Lula III`) · **99 células com Δ**.
- **15 células "abaixo do esperado"**, das quais **10 são do Temer**; contém `mvgr-nominal|Lula I` e `selic-meta-acum-12m|FHC II`.
- **MVG-R no Lula I = 35 pontos** (dado real: os meses 2005-10 e 2015-10 aparecem duplicados no JSON — 259 pontos para 257 meses; é dado, não erro do modelo, conforme o brief).

Confirmação empírica do ruling R5: a régua é **por contagem de pontos contra `pontosEsperados` da granularidade**, não por comparação de datas cruas. A versão por data crua marcaria **49** células; a contagem marca **15** — exatamente o número que a §7.3 publica.

## Critérios de aceite da fatia — conferência

- [x] `dados/governos/index.json` e `federal.json` no schema da §7.2, **sem cor** (grep confirmou).
- [x] Datas explícitas; nenhuma linha de código **deriva** data de regra.
- [x] `git grep -n "GOVERNMENT_PERIODS\|Lula 3"` em `sitio/` → só os arquivos do legado (`config-modal.html`, `assets/js/chart-creator.js`, `assets/js/chart-integration.js`) e o ADR/docs. **Zero ocorrências em `app/src/`.**
- [x] `npm test` verde: matriz 13 × 8 = 104 células, 4 sem cobertura, 1 ponto único, 99 com Δ, e as 15 células "abaixo do esperado".
- [x] Régua por contagem de pontos (`pontosEsperados`), não por data crua.
- [x] `deltaNoMandato` **nunca** devolve `delta: 0` para ausência de dado.
- [x] `ordenarMandatos` põe o mandato em curso na ponta direita.
- [x] **FHC I está no arquivo** (R22) e o teste da medição trava as 8 colunas filtrando FHC I explicitamente.

## Notas / achados

- **Sem contradição entre briefs ou entre brief e dados.** Todos os números publicados nos briefs (incluindo 35 pontos no MVG-R e as 15 células) reproduzem contra os JSON reais. Nada a reportar como NEEDS_CONTEXT.
- **Achado de qualidade de dado (já previsto no brief, registrado e não "consertado"):** `dados/mvgr/mvgr-nominal.json` e `mvgr-real.json` têm 259 pontos para 257 meses — os meses **2005-10** e **2015-10** aparecem duplicados. É a razão pela qual o Lula I conta 35 pontos. Cabe à fatia 11 (notebook do `mvgr`). O modelo conta pontos; a spec mediu 35.
- **Adaptador temporário** `p.value ?? p.rate` no teste de medição: as séries de `dados/` ainda publicam `rate` (a migração para `value` é a fatia 11, que não rodou). O adaptador sai quando a fatia 11 entrar.

## Arquivos

- Criados (repo `dados`): `governos/index.json`, `governos/federal.json`.
- Criados (repo `sitio`): `app/src/domain/mandates.js`, `app/src/domain/mandates.test.js`, `app/src/domain/mandates.medicao.test.js`.
- Nenhum arquivo existente modificado; nenhum `git add -A` usado em nenhum dos repos.

# Governos passam a morar no `sitio` (e entram no bundle)

**Data:** 2026-11-01
**Status:** aceita (2026-11-01)
**Decisão que muda:** ADR 0001, item **D5** (diz `dados/governos/`)

## Intenção

O repo `dados` não usa `governos/` para nada: é curadoria manual do app, versionada ao
lado de séries que têm outro dono, outro schema e outro pipeline. Manter ali cria um
acoplamento sem contrapartida — o `sitio` precisa do repo irmão só para ler dois JSONs
que ele mesmo consome. Passamos os dois arquivos para o `sitio` e removemos a cópia do
`dados`.

## Objetivos

- `governos/federal.json` e `governos/index.json` vivem no `sitio` e são versionados nele.
- O app deixa de fazer requisição para os governos: o dado entra no bundle.
- O repo `dados` deixa de ter `governos/` e de ser mencionado como fonte deles.
- Nenhuma falha nova em silêncio: sumir com o dado passa a ser erro de build/teste.

## Não-objetivos

- Não mexer no caminho das **séries** (`datafile` do catálogo, repo `dados`, middleware de
  dev, checkout do CI para o E2E) — isso continua como está.
- Não popular esferas `estadual`/`municipal`; o `index.json` continua só descrevendo o modelo.
- Não alterar o comportamento visual de faixas, trilho ou painel de comparação.

## Restrições

- **Ordem de publicação.** O site publicado hoje ainda busca
  `https://brasilemnumeros.github.io/dados/governos/federal.json`. O `catch` de
  `carregarMandatos` engole 404 e a home fica sem faixa em silêncio. Então: commitar e
  **publicar o `sitio` primeiro**; só depois o commit de remoção no `dados` pode ir ao ar.
  O push de cada repo é decisão do usuário.
- O contrato de URL publicado (ADR 0002) não muda: nenhuma rota nova é criada.
- O E2E continua precisando do repo `dados` para as séries.

## Abordagem escolhida

**A — embutir no bundle.** Alternativa descartada: publicar os JSONs em
`public/governos/` e continuar com `fetch` (mantém `catch` silencioso, guard de URL e uma
rota nova só para um dado que nenhum terceiro consome).

### Onde ficam

```
app/src/data/governos/federal.json   ← dado consumido pelo app (import)
app/src/data/governos/index.json     ← modelo das esferas (documentação; não é importado)
```

### Mudanças em código

| Arquivo | Mudança |
|---|---|
| `app/src/stores/mandate.js` | `import federal from '../data/governos/federal.json'`; some `URL_GOVERNOS` e o `fetch`. `carregarMandatos({ dados = federal })` passa a ser **síncrona** e recebe os dados por parâmetro (os testes passam fixture). |
| `app/src/App.svelte` / `app/src/components/Chart.svelte` | chamadas seguem iguais (não usam `await`). Comentário do `Chart` deixa de falar em "não vieram". |
| `app/vite.config.js` | remove `define.__BASE_DADOS__` — o único consumidor era o `mandate.js`. O middleware e o `DADOS_DIR` ficam (séries). |
| `app/src/domain/mandates.medicao.test.js` | lê `app/src/data/governos/federal.json` em vez de `dados/governos/federal.json`. |
| `app/src/stores/mandate.test.js` | cai o teste "governos fora do ar"; os demais usam `carregarMandatos({ dados: FIXTURE })` sem `await`. Novo teste: o arquivo real tem 9 mandatos, sem sobreposição e com a fronteira Dilma II → Temer em 2016-05-11/12. |
| `app/src/stores/filtros.test.js` | fixture por `dados`, sem `fetchImpl` nem `setTimeout`. |
| `app/e2e/mandato-janela.spec.js` | comentário do caminho do JSON atualizado (comportamento não muda). |

### Guarda do build

`scripts/testar-publico.sh` provava o ramo de produção procurando
`https://brasilemnumeros.github.io/dados` no bundle. Esse sinal deixa de existir.

**Decisão do usuário (2026-11-01): a guarda nova foi dispensada.** A antiga saiu (não
podia mais passar), e o `verificar` não afirma nada sobre o registro embutido. O que
garante o quê hoje, para não confundir:

- **Vitest** (`app/src/stores/mandate.test.js`) garante o **conteúdo**: 9 mandatos, sem
  sobreposição, fronteira Dilma II → Temer em 2016-05-11/12 e Lula III com
  `fim: null`/`emCurso: true`. O Vitest roda no CI **antes** do build, mas não pelo
  `npm run build`.
- **Build** garante só a **existência** do artefato: sem `federal.json`, o `import` falha
  e o bundle não é gerado.

Se o bundle voltar a embutir uma base de dado, a guarda certa é a URL que ele embutir —
o comentário em `scripts/testar-publico.sh` registra isso.

### Documentação

- **ADR 0003** (`docs/adr/0003-governos-no-sitio.md`): emenda o D5 da ADR 0001 — governos
  são dado versionado **no `sitio`** e entram no bundle; a identificação por sigla + logo
  e a ausência de cor de partido continuam valendo.
- `AGENTS.md`: tabela de dados (linhas sobre "dados não vivem aqui" e "séries e governos"),
  mapa (`app/src/data/`), seção do app e a menção ao D5.
- `.github/workflows/github-pages.yml`: comentário do checkout passa a dizer "séries" (o
  passo continua).
- `docs/specs/2026-10-14-camada-de-graficos-design.md` §7: nota datada de que os caminhos
  `dados/governos/...` passaram para `app/src/data/governos/` (o resto da spec vale).
- `docs/plans/` fica como histórico, sem edição.

### No repo `dados`

- `git rm -r governos/`.
- `AGENTS.md`: a seção "`governos/` (schema diferente)" sai; entra uma linha dizendo que o
  registro de mandatos mora no repo `sitio` (`app/src/data/governos/`) para quem procurar.

## Verificação

- `npm run build`
- `cd app && npm test`
- `cd app && npm run test:e2e`
- `npm run test:analytics`
- Conferir no `dist/assets/js/app/app.js` que o mandato está embutido e que não há URL do
  Pages para governos.
- Conferir que `git status` do `dados` não mostra mais `governos/` após o commit.

## Riscos residuais

- **Bundle maior:** ~2 KB. Irrelevante.
- **Atualizar governos exige rebuild do site** — já era assim: hoje o deploy do `sitio`
  também é o que publica o app. Nada muda na prática.
- **Janela entre os dois pushes:** se o `dados` for publicado antes do `sitio`, a home fica
  sem faixa até o deploy seguinte. Mitigação: ordem inversa, documentada no plano e no
  corpo do commit do `dados`.

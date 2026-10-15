# Patches locais do superpowers

Dois ajustes em scripts do plugin `superpowers`, porque o comportamento que
precisamos **não é configurável upstream** (ainda).

## Por que existem

**1. `sdd-workspace` — destino do workspace é fixo**

O script resolve `base="$root/.superpowers/sdd"` e não aceita configuração. Neste
projeto queremos os ledgers em `docs/sdd/`, **versionados** — ver
`docs/sdd/LEIA-ME.md` para o porquê.

**É pedido aberto no upstream, não invenção nossa:** issue
[#1991](https://github.com/obra/superpowers/issues/1991) pede exatamente um env var
com fallback, e o PR [#1999](https://github.com/obra/superpowers/pull/1999) o
implementa. O mantenedor consolidou isso no ticket
[#2398](https://github.com/obra/superpowers/tree/main) (configurabilidade) e ainda
**não mergeou**. [Verificado em 2026-10-15 contra a tag `v7.0.0`: a linha continua
`base="$root/.superpowers/sdd"`.]

Por isso o env var se chama **`SUPERPOWERS_WORKSPACE_DIR`** — o nome que o upstream
propôs. Quando o PR entrar, o patch vira redundante e basta remover o
`.superpowers.conf`.

**2. `task-brief` — só reconhece `Task N`, não `Tarefa N`**

Os planos deste projeto usam títulos em português (`### Tarefa 1: …`). O `awk` do
upstream casa `^#+[ \t]+Task[ \t]+N`, então sem o patch o brief sai **vazio** e o
script aborta com `task N not found in <plano>`. O patch troca o padrão por
`(Task|Tarefa)`.

## O que fazer depois de `hermes plugins update`

O update sobrescreve os dois scripts e **os patches somem em silêncio** — o sintoma
é sutil (os ledgers voltam para `.superpowers/sdd`, e os briefs param de gerar).

```bash
bash sitio/docs/sdd/patches/reapply.sh          # aplica
bash sitio/docs/sdd/patches/reapply.sh --check  # só verifica
```

O script é **idempotente** e **ancora em linhas estáveis** (`base="$root/.superpowers/sdd"`
e `Task[ \t]+`), não em blocos — a linha vizinha do `root=` mudou na v7 e quebrava um
patch que casasse duas linhas. Ele também **não toca** no resto do arquivo, então os
fixes próprios da versão nova sobrevivem.

## Estado verificado

Medido em 2026-10-15, aplicando sobre os scripts **limpos da `v7.0.0`**:

| verificação | resultado |
|---|---|
| `--check` em scripts limpos | 🔴 acusa os dois faltando |
| aplicar | ✅ os dois aplicados |
| rodar de novo | ✅ idempotente |
| `create-only .gitignore` da v7 (fix #2161) | ✅ preservado |
| marker `plan-path` da v7 | ✅ preservado |
| fim a fim com plano em português | ✅ brief gerado, workspace em `docs/sdd` |

## Histórico de versões

| versão | plan-scoping | `.gitignore` create-only | `SUPERPOWERS_WORKSPACE_DIR` |
|---|---|---|---|
| v6.3.0 (instalado em 2026-08-12) | não | **não** | não |
| v6.4.2 | sim | não | não |
| v7.0.0 (2026-10-10) | sim | **sim** | não |

O create-only foi o fix [#2161](https://github.com/obra/superpowers/pull/2161) /
#2399: o script reescrevia `*` no `.gitignore` a cada chamada, revertendo em silêncio
a escolha de um repo que versionasse o próprio `.gitignore`. Na v7 o comentário do
script já reconhece o caso por nome — *"a repo may commit its own `.gitignore` here
(e.g. to version `progress.md` ledgers)"*.

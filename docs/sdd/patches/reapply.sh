#!/usr/bin/env bash
# Reaplica os patches locais do superpowers DEPOIS de um `hermes plugins update`.
#
# Por que isto existe: os dois scripts abaixo são arquivos do plugin, e uma
# atualização os sobrescreve. Sem este script, os patches somem em silêncio — e o
# sintoma é sutil (o SDD volta a escrever em .superpowers/sdd, e os planos em
# português param de gerar brief com "task N not found").
#
# Uso:  bash reapply.sh            # aplica
#       bash reapply.sh --check    # só verifica, não escreve
set -euo pipefail

PLUGIN="${SUPERPOWERS_DIR:-$HOME/.hermes/plugins/superpowers}"
SCRIPTS="$PLUGIN/skills/subagent-driven-development/scripts"
CHECK=0
[ "${1:-}" = "--check" ] && CHECK=1

[ -d "$SCRIPTS" ] || { echo "não achei os scripts do superpowers em: $SCRIPTS" >&2; exit 2; }

ok=0; ja=0; falhou=0

# --- Patch 1: sdd-workspace — destino configurável -------------------------
# Upstream (até a v7.0.0) tem o caminho fixo: base="$root/.superpowers/sdd".
# A issue #1991 / PR #1999 pedem exatamente esta configurabilidade, sob o nome
# SUPERPOWERS_WORKSPACE_DIR — por isso usamos esse nome, para que um dia isto
# vire nativo. Este repo aponta para docs/sdd via .superpowers.conf.
f="$SCRIPTS/sdd-workspace"
if grep -q 'SUPERPOWERS_WORKSPACE_DIR' "$f"; then
  echo "✅ sdd-workspace: patch já aplicado"
  ja=$((ja+1))
elif [ "$CHECK" = 1 ]; then
  echo "🔴 sdd-workspace: patch FALTANDO"
  falhou=$((falhou+1))
else
  python3 - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text()
# Ancora SÓ na linha do base=, que é estável entre versões. A linha vizinha do
# root= mudou na v7 (Windows/Git Bash: `CDPATH='' cd -- ... && pwd -P`), então
# casar um bloco de duas linhas quebrava a cada release.
antigo = 'base="$root/.superpowers/sdd"'
novo = '''# Destino configurável — issue upstream #1991, PR #1999. O nome do env var é o
# que o upstream propôs, para que isto vire nativo quando o PR entrar.
if [ -n "${SUPERPOWERS_WORKSPACE_DIR:-}" ]; then
  rel=$SUPERPOWERS_WORKSPACE_DIR
elif [ -f "$root/.superpowers.conf" ]; then
  rel=$(head -n 1 "$root/.superpowers.conf" | tr -d '[:space:]')
else
  rel=".superpowers/sdd"
fi
base="$root/$rel"'''
if antigo not in t:
    print("  ⚠️  não achei 'base=\"$root/.superpowers/sdd\"' — o upstream mudou; revise à mão", file=sys.stderr)
    sys.exit(3)
p.write_text(t.replace(antigo, novo, 1))
PY
  echo "✅ sdd-workspace: patch aplicado"
  ok=$((ok+1))
fi

# --- Patch 2: task-brief — aceitar "Tarefa N" (português) ------------------
# Os planos deste projeto usam "### Tarefa N"; o upstream só reconhece "Task N",
# então sem isto o brief sai vazio e o script aborta com "task N not found".
f="$SCRIPTS/task-brief"
if grep -q 'Task|Tarefa' "$f"; then
  echo "✅ task-brief: patch já aplicado"
  ja=$((ja+1))
elif [ "$CHECK" = 1 ]; then
  echo "🔴 task-brief: patch FALTANDO"
  falhou=$((falhou+1))
else
  python3 - "$f" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text()
n = t.count("Task[ \\t]+")
if n == 0:
    print("  ⚠️  não achei 'Task[ \\t]+' — o upstream mudou; revise à mão", file=sys.stderr)
    sys.exit(3)
p.write_text(t.replace("Task[ \\t]+", "(Task|Tarefa)[ \\t]+"))
PY
  echo "✅ task-brief: patch aplicado"
  ok=$((ok+1))
fi

echo
echo "aplicados: $ok · já estavam: $ja · faltando: $falhou"
[ "$falhou" = 0 ] || exit 1

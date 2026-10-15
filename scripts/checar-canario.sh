#!/usr/bin/env bash
# Falha o build se a classe exclusiva do app não estiver no CSS gerado.
#
# Motivo (§10.3): o Tailwind v4 NÃO varre pasta no .gitignore e a falha é SILENCIOSA —
# a UI perde estilo e nada acusa erro. Mesmo princípio da §9: nenhum vazio silencioso.
#
# Canário: um utilitário de fundo ARBITRÁRIO que existe em UM ÚNICO arquivo —
# `app/src/App.svelte`. Se o Tailwind parar de varrer `app/src`, ele some do
# `main.dist.css` e o build falha.
#
# ⚠️ O NOME LITERAL DA CLASSE NÃO PODE APARECER NESTE ARQUIVO. O Tailwind também varre
# `scripts/` (não está no .gitignore) e extrai candidatos de comentários — escrever o nome
# aqui criaria um SEGUNDO produtor e cegaria o canário. Por isso o padrão é montado a
# partir de partes, para que o texto acima não contenha o token que o Tailwind reconhece.
#
# O sufixo de opacidade cheia (`/100`) é de propósito: a forma nua do mesmo utilitário
# também aparece em `docs/plans/`, que o Tailwind varre — e daria um falso OK.
set -euo pipefail

CSS="assets/css/main.dist.css"
COR_CANARIO="0e1117"
CANARIO="bg-\[\\#${COR_CANARIO}\]\\/100"

if [[ ! -f "$CSS" ]]; then
  echo "canário: $CSS não existe — rode o Tailwind antes." >&2
  exit 1
fi

if ! grep -qF "$CANARIO" "$CSS"; then
  echo "canário FALHOU: a classe exclusiva do app não está em $CSS." >&2
  echo "O Tailwind não está varrendo sitio/app/src (pasta ignorada? .gitignore?)." >&2
  exit 1
fi

echo "canário OK: o Tailwind varreu o app."

#!/usr/bin/env bash
# Falha o build se a classe exclusiva do app não estiver no CSS gerado.
#
# Motivo (§10.3): o Tailwind v4 NÃO varre pasta no .gitignore e a falha é SILENCIOSA —
# a UI perde estilo e nada acusa erro. Mesmo princípio da §9: nenhum vazio silencioso.
#
# Canário: um utilitário de fundo ARBITRÁRIO que existe em UM ÚNICO arquivo —
# `app/src/App.svelte`. Se o Tailwind parar de varrer `app/src`, ele some do CSS e o
# build falha.
#
# 🔴 Alvo mudou na fatia 05: o CSS do site agora é o que o `astro build` emite em
# `dist/assets/*.css` (nome com hash — o Astro pode emitir mais de um). Antes era o
# `assets/css/main.dist.css` do Tailwind CLI; esse arquivo continua existindo (o dev do
# APP o linka) mas NÃO é mais o que o site publica. Provar o do `dist/` é provar o que o
# visitante recebe. Buscamos o token em TODOS os `dist/assets/*.css`.
#
# ⚠️ O NOME LITERAL DA CLASSE NÃO PODE APARECER NESTE ARQUIVO. O Tailwind também varre
# `scripts/` (não está no .gitignore) e extrai candidatos de comentários — escrever o nome
# aqui criaria um SEGUNDO produtor e cegaria o canário. Por isso o padrão é montado a
# partir de partes, para que o texto acima não contenha o token que o Tailwind reconhece.
#
# O sufixo de opacidade cheia (`/100`) é de propósito: a forma nua do mesmo utilitário
# também aparece em `docs/plans/`, que o Tailwind varre — e daria um falso OK.
set -euo pipefail

COR_CANARIO="0e1117"
CANARIO="bg-\[\\#${COR_CANARIO}\]\\/100"

# Todos os CSS que o Astro emitiu. O glob pode casar zero: nesse caso `nullglob` deixa o
# array vazio e caímos no erro "não existe" abaixo (em voz alta), em vez de passar com
# um `grep` sem argumento.
shopt -s nullglob
CSS_DO_DIST=(dist/assets/*.css)
shopt -u nullglob

if [[ ${#CSS_DO_DIST[@]} -eq 0 ]]; then
  echo "canário: nenhum CSS em dist/assets/*.css — rode o build do site antes." >&2
  exit 1
fi

for css in "${CSS_DO_DIST[@]}"; do
  if grep -qF "$CANARIO" "$css"; then
    echo "canário OK: o Tailwind varreu o app (token em $css)."
    exit 0
  fi
done

echo "canário FALHOU: a classe exclusiva do app não está em nenhum dist/assets/*.css." >&2
echo "CSS conferido: ${CSS_DO_DIST[*]}" >&2
echo "O Tailwind não está varrendo sitio/app/src (pasta ignorada? .gitignore?)." >&2
exit 1

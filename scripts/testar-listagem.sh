#!/usr/bin/env bash
set -euo pipefail
falha=0
# Cada categoria tem de ter a SUA contagem — é o que prova que a coleção foi
# filtrada, e não que a página renderizou 10 posts em todas.
for par in "blog:10" "categorias/analises:4" "categorias/indicadores:5" "categorias/noticias:1"; do
  u=${par%%:*}; esperado=${par##*:}
  f="dist/$u.html"
  [ -f "$f" ] || { echo "listagem: falta $f" >&2; falha=1; continue; }
  n=$(grep -o '<article' "$f" | wc -l | tr -d ' ')
  [ "$n" -eq "$esperado" ] || { echo "listagem: $f tem $n <article>, esperado $esperado" >&2; falha=1; }
  grep -qE '<title>[^<]*[^ <][^<]*</title>' "$f" \
    || { echo "listagem: $f sem <title> util" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
echo "listagem ok"

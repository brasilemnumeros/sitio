#!/usr/bin/env bash
# A `/` não pode carregar a casca do site (fatia 12). O e2e da casca serve o APP em
# dev (`app/index.html`) e nunca vê a página do Astro — o guardião do HTML PUBLICADO
# é este script, rodando na cadeia do `verificar` contra o `dist/` de produção.
#
# Falha em voz alta se a `/` publicada contiver:
#   `<nav`               — a barra do `Nav.astro`;
#   `id="feedback-btn"`  — o botão flutuante de feedback;
#   `id="toast-artigos"` — o toast de convite para artigos;
#   `<footer`            — o rodapé (`Footer.astro`; a âncora de atribuição que
#                          morava lá vive no `Home.astro`, sem a tag). A barra
#                          inferior do app é um `<footer>` RENDERIZADO PELO JS no
#                          cliente: nunca pousa no `dist/index.html`, então a
#                          proibição vale permanentemente.
set -euo pipefail
falha=0
[ -f dist/index.html ] || { echo "home: falta dist/index.html — rode o build do site antes." >&2; exit 1; }
for token in '<nav' 'id="feedback-btn"' 'id="toast-artigos"' '<footer'; do
  if grep -qF "$token" dist/index.html; then
    echo "home: dist/index.html contém \"$token\" — a casca do site voltou para a /" >&2
    falha=1
  fi
done
[ "$falha" -eq 0 ] || exit 1
echo "home ok: / sem a casca do site"

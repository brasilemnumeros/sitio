#!/usr/bin/env bash
# Meta tags são falha silenciosa se sumirem (D6). O jekyll-seo-tag entrava de carona;
# agora são explícitas — e este script é o que impede o "sumiu e ninguém viu".
set -euo pipefail
falha=0
conferir() { grep -qF "$1" "$2" || { echo "meta: falta '$1' em $2" >&2; falha=1; }; }
conferir_exato() { grep -qF "$1" "$2" || { echo "meta: falta (exato) '$1' em $2" >&2; falha=1; }; }

PAGINA="${PAGINA:-dist/blog.html}"
conferir '<meta charset=' "$PAGINA"
conferir '<link rel="canonical"' "$PAGINA"
conferir 'property="og:title"' "$PAGINA"
conferir 'property="og:description"' "$PAGINA"
conferir 'property="og:type"' "$PAGINA"
conferir 'name="twitter:card"' "$PAGINA"
conferir 'application/ld+json' "$PAGINA"
# A raiz publica o canonical SEM `index.html` (semântica de `page.url` do Jekyll).
# A expressão crua produzia `…/index.html`; esta asserção exata pega a regressão.
case "$PAGINA" in
  *index.html) conferir_exato 'href="https://www.brasilemnumeros.ong.br/"' "$PAGINA" ;;
esac
[ "$falha" -eq 0 ] || exit 1
echo "meta ok"

#!/usr/bin/env bash
# Contrato do /feed.xml publicado (fatia 04/T1). O path é o linkado em blog/posts.
set -euo pipefail
FEED=dist/feed.xml
test -f "$FEED" || { echo "feed: falta $FEED" >&2; exit 1; }
itens=$(grep -c '<item>' "$FEED" || true)
[ "$itens" -eq 10 ] || { echo "feed: $itens itens, esperado 10" >&2; exit 1; }
grep -q '<link>https://www.brasilemnumeros.ong.br/noticias/2025/07/27/' "$FEED" \
  || { echo "feed: link de post faltando" >&2; exit 1; }
# XML bem formado: o parser reclama se não for (o feed é XML, não HTML).
python3 -c 'import xml.dom.minidom,sys; xml.dom.minidom.parse("dist/feed.xml")' \
  || { echo "feed: XML malformado" >&2; exit 1; }
echo "feed ok ($itens itens)"

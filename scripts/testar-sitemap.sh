#!/usr/bin/env bash
# Contrato do /sitemap.xml publicado (fatia 04/T2). Um arquivo, no path do Jekyll.
set -euo pipefail
S=dist/sitemap.xml
test -f "$S" || { echo "sitemap: falta $S" >&2; exit 1; }
grep -q '<urlset' "$S" || { echo "sitemap: não é um urlset único" >&2; exit 1; }
grep -q '<sitemapindex' "$S" && { echo "sitemap: virou índice" >&2; exit 1; }
urls=$(grep -c '<loc>' "$S" || true)
# 19 = 20 páginas do dist/ menos o 404 (medido no publicado).
[ "$urls" -eq 19 ] || { echo "sitemap: $urls urls, esperado 19" >&2; exit 1; }
# Só os posts têm lastmod — e são exatamente 10 (medido).
last=$(grep -c '<lastmod>' "$S" || true)
[ "$last" -eq 10 ] || { echo "sitemap: $last lastmod, esperado 10" >&2; exit 1; }
grep -q '/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros' "$S" \
  || { echo "sitemap: falta o post" >&2; exit 1; }
grep -q '/404' "$S" && { echo "sitemap: o 404 não deveria entrar" >&2; exit 1; }
echo "sitemap ok ($urls urls, $last lastmod)"

#!/usr/bin/env bash
# Contrato de URL (spec §4). NÃO basta contar arquivos: um teste que só confere
# existência passa com uma página vazia ou com Liquid/IAL cru no HTML (a lição da
# 03/T1). Para cada arquivo: existe, tem `<title>` NÃO vazio e não tem Liquid/IAL
# cru. É o mesmo teste que a fatia 07 roda no CI.
set -euo pipefail
falha=0
for f in index.html 404.html blog.html sobre.html links.html termos-de-uso.html \
         politica-de-privacidade.html categorias/analises.html \
         categorias/indicadores.html categorias/noticias.html \
         noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html; do
  arq="dist/$f"
  [ -f "$arq" ] || { echo "contrato: falta dist/$f" >&2; falha=1; continue; }
  # título não vazio: `title` ausente agora derruba o build, mas um título em
  # branco ainda passaria — e é meta invisível, a falha silenciosa do D6.
  grep -qE '<title>[^<]*[^ <][^<]*</title>' "$arq" \
    || { echo "contrato: $f sem <title> util" >&2; falha=1; }
  grep -qE '\{\{|\{%|\{:' "$arq" \
    && { echo "contrato: $f tem Liquid/IAL cru" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1

# O 404 não tem título de PÁGINA: publica o título do SITE (medido no publicado).
grep -qF '<title>Brasil em Números | Dados e informações sobre o Brasil em um só lugar</title>' dist/404.html \
  || { echo "contrato: título do 404 divergiu do publicado" >&2; falha=1; }
grep -qF 'href="/"' dist/404.html \
  || { echo "contrato: o 404 perdeu o link de volta para /" >&2; falha=1; }
[ "$falha" -eq 0 ] || exit 1
echo "contrato de URL ok"

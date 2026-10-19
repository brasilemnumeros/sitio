#!/usr/bin/env bash
# Contrato do /sitemap.xml publicado (fatia 04/T2). Um arquivo, no path do Jekyll.
set -euo pipefail
S=dist/sitemap.xml
ORIGEM=https://www.brasilemnumeros.ong.br
test -f "$S" || { echo "sitemap: falta $S" >&2; exit 1; }
grep -q '<urlset' "$S" || { echo "sitemap: não é um urlset único" >&2; exit 1; }
grep -q '<sitemapindex' "$S" && { echo "sitemap: virou índice" >&2; exit 1; }

# (1) TODO `<loc>` exceto a raiz termina em `.html`. É a divergência exata que
# motivou o endpoint próprio: o `@astrojs/sitemap` emitia `…/blog` (sem `.html`)
# e a contagem sozinha continuava 19 — ficava verde com o defeito.
while IFS= read -r loc; do
  [ "$loc" = "$ORIGEM/" ] && continue
  case "$loc" in
    *.html) ;;
    *) echo "sitemap: <loc> sem .html: $loc" >&2; exit 1 ;;
  esac
done < <(grep -o '<loc>[^<]*</loc>' "$S" | sed 's#<loc>##; s#</loc>##')

# (2) A omissão de uma página fixa é detectável: derivamos as páginas estáticas
# de `src/pages/**.{astro,md}` (exclui o `404`, exclui rota dinâmica com `[`),
# mapeamos `index.*` -> `/` e o resto -> `/<nome>.html`, acrescentamos as 3 URLs
# de categoria (o arquivo é dinâmico, então não sai do glob) e exigimos CADA uma
# no `dist/sitemap.xml`. Criar uma página e esquecer no sitemap FALHA aqui.
esperadas=()
while IFS= read -r arq; do
  base="${arq#src/pages/}"; base="${base%.*}"
  case "$base" in *'['*) continue ;; esac   # rota dinâmica
  [ "$base" = 404 ] && continue
  if [ "$base" = index ]; then esperadas+=("/"); else esperadas+=("/$base.html"); fi
done < <(find src/pages -type f \( -name '*.astro' -o -name '*.md' \) | sort)
esperadas+=(/categorias/analises.html /categorias/indicadores.html /categorias/noticias.html)
for u in "${esperadas[@]}"; do
  grep -qF "<loc>${ORIGEM}${u}</loc>" "$S" \
    || { echo "sitemap: falta a página fixa $u (fora do FIXAS?)" >&2; exit 1; }
done

urls=$(grep -c '<loc>' "$S" || true)
# 19 = 20 páginas do dist/ menos o 404 (medido no publicado).
[ "$urls" -eq 19 ] || { echo "sitemap: $urls urls, esperado 19" >&2; exit 1; }

# (1b) Todo `<lastmod>` casa `YYYY-MM-DDTHH:MM:SS+00:00` E só aparece em post:
# cada `<url>` é uma linha; se o `<loc>` é uma página fixa (derivada acima) NÃO
# pode ter `<lastmod>`; se é post, TEM de ter — e no formato exato.
fixas=""
for u in "${esperadas[@]}"; do fixas+="${ORIGEM}${u}"$'\n'; done
last=0
while IFS= read -r linha; do
  loc=$(printf '%s\n' "$linha" | sed -n 's#.*<loc>\([^<]*\)</loc>.*#\1#p')
  case "$linha" in *'<lastmod>'*) tem=1 ;; *) tem=0 ;; esac
  if printf '%s' "$fixas" | grep -qxF "$loc"; then
    [ "$tem" -eq 0 ] || { echo "sitemap: página fixa $loc com <lastmod>" >&2; exit 1; }
  else
    [ "$tem" -eq 1 ] || { echo "sitemap: post $loc sem <lastmod>" >&2; exit 1; }
    lm=$(printf '%s\n' "$linha" | sed -n 's#.*<lastmod>\([^<]*\)</lastmod>.*#\1#p')
    printf '%s\n' "$lm" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+00:00$' \
      || { echo "sitemap: lastmod fora do formato: $lm" >&2; exit 1; }
    last=$((last + 1))
  fi
done < <(grep -o '<url>.*</url>' "$S")
# 10 = os 10 posts (medido).
[ "$last" -eq 10 ] || { echo "sitemap: $last lastmod, esperado 10" >&2; exit 1; }

grep -q '/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros' "$S" \
  || { echo "sitemap: falta o post" >&2; exit 1; }
grep -q '/404' "$S" && { echo "sitemap: o 404 não deveria entrar" >&2; exit 1; }
echo "sitemap ok ($urls urls, $last lastmod)"

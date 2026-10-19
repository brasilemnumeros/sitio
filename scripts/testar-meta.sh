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

# --- Contrato do POST (fatia 03/T2) ---
# Um post NÃO publica o Meta de página: precisa de `og:type=article` e do JSON-LD
# `BlogPosting`. Sem isto ele regride para `website`/`WebPage` em SILÊNCIO (D6).
# O default é o post SEM áudio, que cobre também a caixa do player: ela NÃO é
# condicional (armadilha 1) — sem áudio sai vazia (`data-src=""`), e o Jekyll a
# publica assim mesmo. Se alguém a puser dentro do `if`, esta asserção avisa.
POST="${POST:-dist/indicadores/2025/11/14/luzes-sombras-queda-homicidios-brasil.html}"
if [ ! -f "$POST" ]; then
  echo "meta: falta o post $POST" >&2
  falha=1
else
  conferir 'property="og:type" content="article"' "$POST"
  conferir '"@type":"BlogPosting"' "$POST"
  # O canonical do post termina em `.html` (permalink default do Jekyll).
  case "$POST" in
    *luzes-sombras*)
      conferir_exato \
        'href="https://www.brasilemnumeros.ong.br/indicadores/2025/11/14/luzes-sombras-queda-homicidios-brasil.html"' \
        "$POST"
      ;;
  esac
  # `description` NÃO vazia: o Base derruba o build se ela faltar, mas um
  # `content=""` passaria — este grep pega o vazio.
  grep -qE 'name="description" content="[^"]' "$POST" || { echo "meta: description vazia em $POST" >&2; falha=1; }
  # Caixa do player: presente E vazia no post sem áudio.
  conferir 'id="podcast-player"' "$POST"
  conferir 'class="shk-player" data-src=""' "$POST"
fi

[ "$falha" -eq 0 ] || exit 1
echo "meta ok"

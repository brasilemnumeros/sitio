#!/usr/bin/env bash
set -euo pipefail
falha=0
# O app emite app.js E app.css (o CSS escopado dos componentes Svelte). Faltar o CSS
# é a falha SILENCIOSA que o site publica hoje — ver a medição 3 do brief.
for f in dist/assets/js/app/app.js dist/assets/js/app/app.css; do
  [ -f "$f" ] || { echo "publico: falta $f" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
# Os arquivos existirem NÃO basta: se o `<link>`/`<script>` sair do `index.astro`, a `/`
# publicada monta vazia e a suíte inteira ficaria verde (falha silenciosa). Confira a
# PÁGINA, que é o que o produto percorre.
for t in 'js/app/app.js' 'js/app/app.css' 'id="app"'; do
  grep -q "$t" dist/index.html || { echo "publico: / não inclui \"$t\"" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
# Os GOVERNOS são embutidos no bundle (2026-11-01); o CATÁLOGO e as SÉRIES vêm da base
# `__BASE_DADOS__`, que em PRODUÇÃO é o Pages do repo `dados`. Um artefato de dev (base `/dados`)
# publicado deixaria o gráfico vazio em silêncio — o `fetch` falharia e o app mostraria erro, mas
# ninguém veria isso no CI. A URL do Pages no bundle é o que prova o ramo de produção.
grep -q 'https://brasilemnumeros.github.io/dados/indicadores' dist/assets/js/app/app.js \
  || { echo "publico: app.js não aponta para o Pages (artefato de dev?)" >&2; falha=1; }
[ "$falha" -eq 0 ] || exit 1
# O AVISO SOBRE OS DADOS NA HOME (2026-11-01). A `/` não usa o rodapé do site, então o link
# para os Termos vive na barra inferior do app. Sem esta guarda, uma refatoração da barra
# apaga o único caminho do visitante do gráfico para a isenção — e nada falha em voz alta.
# O link é montado pelo Svelte, então no bundle ele aparece como string — a guarda procura o
# CAMINHO, não a tag inteira (que só existe no DOM depois de renderizar).
grep -q 'termos-de-uso.html' dist/assets/js/app/app.js \
  || { echo "publico: a home perdeu o link para os Termos (barra inferior)" >&2; falha=1; }
grep -q 'href="/termos-de-uso"' dist/sobre.html \
  || { echo "publico: /sobre perdeu o link para os Termos" >&2; falha=1; }
# O rodapé do site (todas as páginas menos a `/`) tem de oferecer o caminho de correção.
grep -q 'Corrigir um erro' dist/sobre.html \
  || { echo "publico: sumiu o caminho de correção de erro no rodapé" >&2; falha=1; }
[ -f dist/correcoes.html ] || { echo "publico: falta /correcoes.html" >&2; falha=1; }
[ "$falha" -eq 0 ] || exit 1
echo "publico ok"

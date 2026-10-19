#!/usr/bin/env bash
set -euo pipefail
falha=0
# O app emite app.js E app.css (o CSS escopado dos componentes Svelte). Faltar o CSS
# é a falha SILENCIOSA que o site publica hoje — ver a medição 3 do brief.
for f in dist/indicators.json dist/assets/js/app/app.js dist/assets/js/app/app.css; do
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
# O app publicado busca os governos no Pages — e NÃO em `/dados`, que é o ramo de DEV
# (`DADOS_LOCAL=1`, posto pelo `dev` do site). Um artefato de dev publicado deixa o gráfico e o
# minimapa SEM FAIXA, em silêncio: o `catch` de `carregarMandatos` engole a falha (§9.3), e a
# aparência engana ("minimapa vazio"). A URL do Pages no bundle é o que prova o ramo de produção.
grep -q 'https://brasilemnumeros.github.io/dados' dist/assets/js/app/app.js \
  || { echo "publico: app.js não aponta para o Pages (artefato de dev?)" >&2; falha=1; }
[ "$falha" -eq 0 ] || exit 1
echo "publico ok"

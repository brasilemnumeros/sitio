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

# Os quatro gaps da fatia 02/T2 são de TEXTO: contagem de <article> e <title>
# passariam verdes com qualquer um deles quebrado. As strings abaixo foram
# medidas na saída publicada (2026-10-18).

# As três intros DIVERGEM entre si e NÃO são a `description` do _config.yml.
grep -q 'Análises aprofundadas dos indicadores econômicos, suas relações e impactos na economia brasileira\.' dist/categorias/analises.html \
  || { echo "listagem: intro de analises divergiu" >&2; falha=1; }
grep -q 'Novidades sobre os indicadores econômicos disponíveis, metodologias e interpretações\.' dist/categorias/indicadores.html \
  || { echo "listagem: intro de indicadores divergiu" >&2; falha=1; }
grep -q 'Novidades, atualizações e marcos do projeto Brasil em Números\.' dist/categorias/noticias.html \
  || { echo "listagem: intro de noticias divergiu" >&2; falha=1; }

# Duas inconsistências do site REPRODUZIDAS de propósito — se alguém "consertar",
# o teste avisa (o comportamento publicado é que manda).
grep -q '← Voltar para o blog' dist/categorias/analises.html \
  || { echo "listagem: 'Voltar para o blog' de analises divergiu" >&2; falha=1; }
grep -q '← Voltar para Artigos' dist/categorias/indicadores.html \
  || { echo "listagem: 'Voltar para Artigos' de indicadores divergiu" >&2; falha=1; }

# A etiqueta do blog é SINGULAR (e não o `name` do mapa, que é plural).
grep -q '<span>Análise</span>' dist/blog.html \
  || { echo "listagem: etiqueta 'Análise' ausente/plural no blog" >&2; falha=1; }
grep -q '<span>Indicador</span>' dist/blog.html \
  || { echo "listagem: etiqueta 'Indicador' ausente/plural no blog" >&2; falha=1; }
grep -q '<span>Notícia</span>' dist/blog.html \
  || { echo "listagem: etiqueta 'Notícia' ausente/plural no blog" >&2; falha=1; }

# O cartão do blog diz "Podcast"; o da categoria diz "Podcast disponível".
grep -q 'Podcast</span>' dist/blog.html \
  || { echo "listagem: 'Podcast' ausente no cartão do blog" >&2; falha=1; }
grep -q 'Podcast disponível</span>' dist/categorias/analises.html \
  || { echo "listagem: 'Podcast disponível' ausente no cartão da categoria" >&2; falha=1; }

[ "$falha" -eq 0 ] || exit 1
echo "listagem ok"

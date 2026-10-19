#!/usr/bin/env bash
set -euo pipefail
DIR=src/content/posts
[ -d "$DIR" ] || { echo "posts: falta $DIR" >&2; exit 1; }

n=$(find "$DIR" -name '*.md' | wc -l | tr -d ' ')
[ "$n" -eq 10 ] || { echo "posts: $n arquivos, esperado 10" >&2; exit 1; }

# O slug da URL vem do NOME DO ARQUIVO (data-slug do Jekyll), não do title:
falha=0
while IFS= read -r f; do
  b=$(basename "$f")
  [[ "$b" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}-.+\.md$ ]] \
    || { echo "posts: $b não casa o padrão data-slug do Jekyll" >&2; falha=1; }
done < <(find "$DIR" -name '*.md')
[ "$falha" -eq 0 ] || exit 1

# A coleção tem de EXISTIR: sem ela o build passa e nada valida (o script ficaria
# verde contando arquivos de um diretório que ninguém lê).
grep -q 'posts:' src/content.config.ts \
  || { echo "posts: falta a coleção 'posts' em src/content.config.ts" >&2; exit 1; }

# O schema VALIDA: o build roda o content layer e falha se um front matter não
# casar `src/content.config.ts`. Sem esta linha o teste acima prova só nomes de
# arquivo — um post que o schema rejeita passaria.
npm run build >/dev/null || { echo "posts: o build falhou (veja o erro do Astro acima)" >&2; exit 1; }

echo "posts ok ($n arquivos)"

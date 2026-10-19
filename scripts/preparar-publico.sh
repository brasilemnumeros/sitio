#!/usr/bin/env bash
# Prepara o `public/` para o `astro build` (e para o `astro dev`).
#
# O `astro build` só publica o que está abaixo do `publicDir` (`public/`), então
# dois artefatos precisam pousar lá ANTES do Astro:
#
#   1. o catálogo `sitio/indicators.json` — copiado para `public/indicators.json`
#      (gitignored). A cópia publicada mantém o `datafile` do Pages; a reescrita
#      para `/dados/` é só do middleware, em dev (medição 10);
#   2. o artefato do app (`app.js` + `app.css`) — que o `app/vite.config.js` já
#      emite DIRETO em `public/assets/js/app/` via `outDir` (medição 1). Aqui só
#      conferimos que ele existe: um `dev`/`build` que esquecer o build do app
#      serviria a `/` VAZIA, em silêncio.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cp "$raiz/indicators.json" "$raiz/public/indicators.json"

for f in app.js app.css; do
  if [[ ! -f "$raiz/public/assets/js/app/$f" ]]; then
    echo "preparar-publico: falta public/assets/js/app/$f — rode o build do app antes." >&2
    exit 1
  fi
done

echo "preparar-publico ok"

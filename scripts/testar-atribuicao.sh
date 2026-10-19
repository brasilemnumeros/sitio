#!/usr/bin/env bash
# Atribuição do TradingView Lightweight Charts (Apache-2.0) — fatia 10/T5.
#
# A biblioteca vai EMBUTIDA no bundle do app. A licença exige (a) a atribuição e (b)
# entregar uma cópia da licença a quem recebe o binário. É uma obrigação LEGAL que pode
# sumir em SILÊNCIO: o build fica verde sem o link e sem o NOTICE. Este script é o que
# transforma a promessa em obrigação (ruling T5).
set -euo pipefail
falha=0

# A linha do rodapé tem de estar na PÁGINA publicada — não basta o componente existir.
# Confere o shell do app (`/`) E uma página de texto: o rodapé é GLOBAL, vale para todas
# as páginas e não some se a página do gráfico mudar (spec §10.5).
LINK='https://www.tradingview.com/'
NOME='TradingView Lightweight Charts'
for pagina in dist/index.html dist/blog.html; do
  if [ ! -f "$pagina" ]; then
    echo "atribuicao: falta $pagina — rode o build do site antes." >&2
    falha=1
    continue
  fi
  grep -qF "$LINK" "$pagina" \
    || { echo "atribuicao: $pagina sem o link do TradingView" >&2; falha=1; }
  grep -qF "$NOME" "$pagina" \
    || { echo "atribuicao: $pagina sem o nome visível do TradingView" >&2; falha=1; }
done

# O NOTICE versiona a licença: a Apache-2.0 exige entregar uma CÓPIA a quem recebe o
# binário. Só o link no rodapé não cumpre (ruling T5).
NOTICE='NOTICE'
if [ ! -f "$NOTICE" ]; then
  echo "atribuicao: falta o NOTICE (cópia da licença Apache-2.0)" >&2
  falha=1
else
  grep -qF 'Apache-2.0' "$NOTICE" \
    || { echo "atribuicao: o NOTICE não menciona Apache-2.0" >&2; falha=1; }
fi

[ "$falha" -eq 0 ] || exit 1
echo "atribuicao ok"

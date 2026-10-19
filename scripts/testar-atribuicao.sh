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
#
# 🔴 A asserção é sobre o <a> INTEIRO, não sobre pedaços soltos (revisão do T5): o href e
# o nome soltos no HTML passariam com o nome FORA do link ou com um `target="_blank"` SEM
# `rel="noopener noreferrer"` — e a convenção do repo ficaria sem guarda. Por isso
# extraímos a tag que aponta para o tradingview e provamos tudo DENTRO dela.
LINK='href="https://www.tradingview.com/"'
NOME='>TradingView Lightweight Charts</a>'
for pagina in dist/index.html dist/blog.html; do
  if [ ! -f "$pagina" ]; then
    echo "atribuicao: falta $pagina — rode o build do site antes." >&2
    falha=1
    continue
  fi

  # Uma tag <a> é `[^>]*` (atributos) + `>` + `[^<]*` (texto) + `</a>`. Extraímos só as
  # que contêm `tradingview.com`.
  ancoras="$(grep -oE '<a [^>]*tradingview\.com[^>]*>[^<]*</a>' "$pagina" || true)"
  if [ -z "$ancoras" ]; then
    echo "atribuicao: $pagina sem o <a> do TradingView" >&2
    falha=1
    continue
  fi

  while IFS= read -r ancora; do
    case "$ancora" in
      *"$LINK"*) ;;
      *) echo "atribuicao: $pagina — <a> do TradingView sem href para https://www.tradingview.com/" >&2; falha=1 ;;
    esac
    case "$ancora" in
      *"$NOME"*) ;;
      *) echo "atribuicao: $pagina — o nome 'TradingView Lightweight Charts' não é o texto do link" >&2; falha=1 ;;
    esac
    # Se o link abre em nova aba, o rel PRECISA trazer noopener e noreferrer (convenção
    # do repo). O par href+nome sem o rel tem de FALHAR.
    case "$ancora" in
      *'target="_blank"'*)
        case "$ancora" in *noopener*) ;; *) echo "atribuicao: $pagina — <a target=\"_blank\"> sem noopener" >&2; falha=1 ;; esac
        case "$ancora" in *noreferrer*) ;; *) echo "atribuicao: $pagina — <a target=\"_blank\"> sem noreferrer" >&2; falha=1 ;; esac
        ;;
    esac
  done <<< "$ancoras"
done

# O NOTICE versiona a licença: a Apache-2.0 exige entregar uma CÓPIA a quem recebe o
# binário. Só o link no rodapé não cumpre (ruling T5). Confere as DUAS cópias: a do
# repositório (`NOTICE`) e a PUBLICADA (`dist/NOTICE`) — quem recebe o binário é o
# visitante do site, então a cópia servida é a que cumpre a licença de fato.
for notice in 'NOTICE' 'dist/NOTICE'; do
  if [ ! -f "$notice" ]; then
    echo "atribuicao: falta $notice (cópia da licença Apache-2.0)" >&2
    falha=1
    continue
  fi
  grep -qF 'Apache-2.0' "$notice" \
    || { echo "atribuicao: $notice não menciona Apache-2.0" >&2; falha=1; }
done

[ "$falha" -eq 0 ] || exit 1
echo "atribuicao ok"

#!/usr/bin/env python3
"""Gera as figuras estáticas dos posts a partir dos JSON de `dados/indicadores`.

As imagens de `public/assets/img/` são usadas dentro dos textos dos posts; antes
eram capturas manuais e envelheciam em silêncio quando a série era revisada (o
texto era corrigido e a figura continuava com o dado velho). Aqui elas são
reproduzíveis: o script lê os mesmos arquivos que o app consome, então "dado
mudou" vira "rode de novo".

    uv run --with matplotlib --with pillow scripts/figuras.py

Saída: `public/assets/img/<nome>.webp` (3584 px de largura, como as antigas).

O diretório do repo `dados` é `../dados` por padrão e pode ser trocado com
`--dados` ou `DADOS_DIR` (a mesma convenção do `astro.config.mjs`).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.ticker import FuncFormatter  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
DADOS = Path(os.environ.get("DADOS_DIR", RAIZ.parent / "dados"))
SAIDA = RAIZ / "public" / "assets" / "img"

# Paleta das figuras antigas (tema escuro do site).
FUNDO = "#171c26"
PAINEL = "#1c2230"
GRADE = "#2b3446"
TEXTO = "#e6e8ee"
TEXTO_FRACO = "#9aa4b8"
LINHA = "#7aa2f7"
LINHA_2 = "#f7768e"
LINHA_3 = "#9ece6a"
BARRA = "#89b4fa"
BANDAS = ("#2b3446", "#333c52")

LARGURA_PX = 3584
ALTURA_PX = 1792
DPI = 200


# ---------------------------------------------------------------- utilidades


def serie(identificador: str) -> list[tuple[date, float]]:
    """Lê `indicadores/<familia>/<id>.json` e devolve [(data, valor)] ascendente."""
    for familia in (DADOS / "indicadores").iterdir():
        if not familia.is_dir():
            continue
        caminho = familia / f"{identificador}.json"
        if caminho.exists():
            bruto = json.loads(caminho.read_text(encoding="utf-8"))
            return [
                (date.fromisoformat(p["data"]), float(p["valor"])) for p in bruto["dados"]
            ]
    raise SystemExit(f"figuras: série {identificador} não encontrada em {DADOS}")


def fonte(identificador: str) -> str:
    for familia in (DADOS / "indicadores").iterdir():
        caminho = familia / f"{identificador}.json" if familia.is_dir() else None
        if caminho and caminho.exists():
            return json.loads(caminho.read_text(encoding="utf-8"))["fonte"]
    return ""


def mandatos() -> list[tuple[date, date | None, str]]:
    """Mandatos federais agrupados por rótulo base (FHC I e II viram 'FHC')."""
    caminho = RAIZ / "app" / "src" / "data" / "governos" / "federal.json"
    dados = json.loads(caminho.read_text(encoding="utf-8"))["mandatos"]
    agrupados: list[tuple[date, date | None, str]] = []
    for m in dados:
        inicio = date.fromisoformat(m["inicio"])
        fim = date.fromisoformat(m["fim"]) if m.get("fim") else None
        rotulo = m["rotulo"].split(" ")[0]
        if agrupados and agrupados[-1][2] == rotulo:
            anterior = agrupados[-1]
            agrupados[-1] = (anterior[0], fim, rotulo)
        else:
            agrupados.append((inicio, fim, rotulo))
    return agrupados


def novo_eixo(titulo: str, subfonte: str):
    fig, ax = plt.subplots(figsize=(LARGURA_PX / DPI, ALTURA_PX / DPI), dpi=DPI)
    fig.patch.set_facecolor(FUNDO)
    ax.set_facecolor(PAINEL)
    ax.set_title(titulo, color=TEXTO, fontsize=17, pad=18)
    ax.tick_params(colors=TEXTO_FRACO, labelsize=10)
    for lado in ax.spines.values():
        lado.set_color(GRADE)
    ax.grid(color=GRADE, linewidth=0.7, alpha=0.7)
    ax.set_axisbelow(True)
    fig.text(0.5, 0.015, f"Fonte(s): {subfonte}", ha="center", color=TEXTO_FRACO, fontsize=10)
    fig.subplots_adjust(left=0.085, right=0.915, top=0.9, bottom=0.1)
    return fig, ax


def faixas_de_mandato(ax, inicio: date, fim: date, rotulos=True) -> None:
    """Sombreia o fundo por mandato, com o rótulo no meio da faixa."""
    for indice, (comeco, termino, rotulo) in enumerate(mandatos()):
        direita = min(termino or fim, fim)
        if direita <= inicio or comeco >= fim:
            continue
        esquerda = max(comeco, inicio)
        ax.axvspan(esquerda, direita, color=BANDAS[indice % 2], alpha=0.45, linewidth=0)
        if rotulos:
            meio = esquerda + (direita - esquerda) / 2
            ax.text(
                meio,
                0.5,
                rotulo,
                transform=ax.get_xaxis_transform(),
                ha="center",
                va="center",
                color="#cfd6e6",
                fontsize=11,
                alpha=0.8,
            )


def eixo_de_anos(ax, inicio: date, fim: date) -> None:
    ax.set_xlim(inicio, fim)
    ax.xaxis.set_major_locator(mdates.YearLocator(1))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    for rotulo in ax.get_xticklabels():
        rotulo.set_rotation(0)
        rotulo.set_fontsize(9)


def milhar(valor, _pos=None) -> str:
    return f"{valor:,.0f}".replace(",", ".")


def milhoes(valor, _pos=None) -> str:
    return f"{valor / 1_000_000:,.1f}".replace(",", "X").replace(".", ",").replace("X", ".")


def reais(valor, _pos=None) -> str:
    return f"R$ {valor:,.0f}".replace(",", ".")


def porcento(valor, _pos=None) -> str:
    return f"{valor:,.1f}".replace(".", ",") + "%"


def decimal(valor, _pos=None) -> str:
    """Taxa por 100 mil habitantes: número, não percentual."""
    return f"{valor:,.1f}".replace(".", ",")


# ------------------------------------------------------------------- figuras


def figura_caged() -> None:
    dados = serie("caged-total-mensal")
    fig, ax = novo_eixo("CAGED - Total Mensal", fonte("caged-total-mensal"))
    inicio, fim = dados[0][0], dados[-1][0]
    faixas_de_mandato(ax, inicio, fim)
    ax.plot([d for d, _ in dados], [v for _, v in dados], color=LINHA, linewidth=1.8)
    ax.set_ylabel("Número de Empregos", color=TEXTO_FRACO, fontsize=11, labelpad=8)
    ax.yaxis.set_major_formatter(FuncFormatter(milhar))
    ax.set_xlabel("Ano", color=TEXTO_FRACO, fontsize=10)
    eixo_de_anos(ax, inicio, fim)
    salvar(fig, "caged")


def figura_caged_x_pib() -> None:
    caged = serie("caged-total-mensal")
    pib = serie("pib-real-anual")
    fig, ax = novo_eixo(
        "Estoque de Empregos Formais x PIB Real",
        "Banco Central do Brasil (CAGED) e IBGE (PIB)",
    )
    inicio, fim = caged[0][0], caged[-1][0]
    faixas_de_mandato(ax, inicio, fim, rotulos=False)
    ax.plot([d for d, _ in caged], [v for _, v in caged], color=LINHA, linewidth=1.8)
    ax.yaxis.set_major_formatter(FuncFormatter(milhar))
    ax.set_ylabel("Empregos formais", color=LINHA, fontsize=11, labelpad=8)
    eixo_de_anos(ax, inicio, fim)

    segundo = ax.twinx()
    segundo.set_facecolor("none")
    segundo.bar(
        [d for d, _ in pib], [v for _, v in pib], width=300, color=BARRA, alpha=0.55
    )
    segundo.set_ylabel("PIB real: variação anual (%)", color=BARRA, fontsize=11)
    segundo.tick_params(colors=TEXTO_FRACO, labelsize=10)
    for lado in segundo.spines.values():
        lado.set_color(GRADE)
    segundo.yaxis.set_major_formatter(FuncFormatter(porcento))
    segundo.axhline(0, color=GRADE, linewidth=0.8)
    salvar(fig, "caged-x-pib")


def figura_homicidios() -> None:
    total = serie("homicidios-anual")
    armas = serie("homicidios-armas-fogo-anual")
    proporcao = serie("proporcao-homicidios-armas-fogo-anual")
    fig, ax = novo_eixo(
        "Homicídios no Brasil",
        "MS/SVS (SIM) e IPEA/Atlas da Violência; taxa calculada pelo site",
    )
    inicio, fim = total[0][0], total[-1][0]
    faixas_de_mandato(ax, inicio, fim)
    ax.plot([d for d, _ in total], [v for _, v in total], color=LINHA, linewidth=1.9, label="Homicídios")
    ax.plot(
        [d for d, _ in armas],
        [v for _, v in armas],
        color=LINHA_2,
        linewidth=1.9,
        label="Por armas de fogo",
    )
    ax.set_ylabel("Taxa por 100 mil habitantes", color=TEXTO_FRACO, fontsize=11, labelpad=8)
    ax.yaxis.set_major_formatter(FuncFormatter(decimal))
    eixo_de_anos(ax, inicio, fim)
    ax.legend(loc="lower left", frameon=False, labelcolor=TEXTO, fontsize=11)

    segundo = ax.twinx()
    segundo.set_facecolor("none")
    segundo.plot(
        [d for d, _ in proporcao],
        [v for _, v in proporcao],
        color=LINHA_3,
        linewidth=1.5,
        linestyle="--",
        label="Armas ÷ total",
    )
    segundo.set_ylabel("Proporção de armas de fogo (%)", color=LINHA_3, fontsize=11)
    segundo.set_ylim(40, 85)
    segundo.tick_params(colors=TEXTO_FRACO, labelsize=10)
    for lado in segundo.spines.values():
        lado.set_color(GRADE)
    segundo.yaxis.set_major_formatter(FuncFormatter(porcento))
    salvar(fig, "homicidios")


def figura_mvgr_nominal() -> None:
    dados = serie("mvgr-nominal")
    fig, ax = novo_eixo(
        "MVG-R — valor mediano do imóvel em garantia (R$ correntes)",
        fonte("mvgr-nominal"),
    )
    inicio, fim = dados[0][0], dados[-1][0]
    faixas_de_mandato(ax, inicio, fim)
    ax.plot([d for d, _ in dados], [v for _, v in dados], color=LINHA, linewidth=1.9)
    ax.yaxis.set_major_formatter(FuncFormatter(reais))
    eixo_de_anos(ax, inicio, fim)
    salvar(fig, "mvgr-nominal")


def figura_mvgr_real() -> None:
    dados = serie("mvgr-real")
    fig, ax = novo_eixo(
        "MVG-R real — R$ constantes de março de 2004 (deflacionado pelo IPCA)",
        f"{fonte('mvgr-real')} e IBGE (IPCA)",
    )
    inicio, fim = dados[0][0], dados[-1][0]
    faixas_de_mandato(ax, inicio, fim)
    ax.plot([d for d, _ in dados], [v for _, v in dados], color=LINHA_3, linewidth=1.9)
    ax.yaxis.set_major_formatter(FuncFormatter(reais))
    eixo_de_anos(ax, inicio, fim)
    salvar(fig, "mvgr-real")


def figura_populacao() -> None:
    total = serie("populacao-total-anual")
    variacao = serie("populacao-variacao-anual")
    fig, ax = novo_eixo(
        "População total x variação anual",
        "IBGE, Projeções da População — Revisão 2024",
    )
    inicio, fim = total[0][0], total[-1][0]
    faixas_de_mandato(ax, inicio, fim, rotulos=False)
    ax.plot([d for d, _ in total], [v for _, v in total], color=LINHA, linewidth=1.9)
    ax.set_ylabel("Habitantes", color=LINHA, fontsize=11, labelpad=8)
    ax.yaxis.set_major_formatter(FuncFormatter(milhoes))
    eixo_de_anos(ax, inicio, fim)

    segundo = ax.twinx()
    segundo.set_facecolor("none")
    segundo.plot(
        [d for d, _ in variacao], [v for _, v in variacao], color=LINHA_3, linewidth=2.0
    )
    segundo.set_ylabel("Variação anual (%)", color=LINHA_3, fontsize=11)
    segundo.set_ylim(0, max(v for _, v in variacao) * 1.35)
    segundo.tick_params(colors=TEXTO_FRACO, labelsize=10)
    for lado in segundo.spines.values():
        lado.set_color(GRADE)
    segundo.yaxis.set_major_formatter(FuncFormatter(porcento))
    salvar(fig, "populacao-total-x-variacao")


def salvar(fig, nome: str) -> None:
    """Grava em .webp (raster final, como as imagens antigas)."""
    SAIDA.mkdir(parents=True, exist_ok=True)
    destino = SAIDA / f"{nome}.webp"
    temporario = destino.with_suffix(".png")
    fig.savefig(temporario, facecolor=fig.get_facecolor(), dpi=DPI)
    plt.close(fig)
    try:
        from PIL import Image

        with Image.open(temporario) as imagem:
            imagem.save(destino, "WEBP", quality=90, method=6)
        temporario.unlink()
    except ImportError:  # sem Pillow, o PNG fica no lugar
        print(f"figuras: Pillow ausente, mantido {temporario.name}", file=sys.stderr)
        return
    print(f"figuras: {destino.relative_to(RAIZ)}")


FIGURAS = {
    "caged": figura_caged,
    "caged-x-pib": figura_caged_x_pib,
    "homicidios": figura_homicidios,
    "mvgr-nominal": figura_mvgr_nominal,
    "mvgr-real": figura_mvgr_real,
    "populacao-total-x-variacao": figura_populacao,
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dados", type=Path, default=DADOS, help="repo dados")
    parser.add_argument("--saida", type=Path, default=SAIDA, help="diretório de saída")
    parser.add_argument(
        "figuras", nargs="*", choices=sorted(FIGURAS) + [[]], default=[], help="subconjunto"
    )
    args = parser.parse_args()

    globals()["DADOS"] = args.dados.resolve()
    globals()["SAIDA"] = args.saida.resolve()

    alvos = args.figuras or sorted(FIGURAS)
    for nome in alvos:
        FIGURAS[nome]()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

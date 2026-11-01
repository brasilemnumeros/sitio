<script>
  // VARIANTE ESCOLHIDA (2026-11-01) — caixa flutuante que acompanha o cursor, com os valores de
  // todas as séries naquele ponto. Substituiu a ideia anterior (número em cada linha da legenda):
  // a caixa lê a data e os valores como um bloco só.
  //
  // ⚠ A caixa NÃO lê o gráfico: posição e data vêm de `cursorStore`, publicado pelo adapter
  // (ADR 0001 — componente de UI não chama a lib). O que ela recebe por prop é só GEOMETRIA do
  // pane (larguras das escalas e a área ocupada pela legenda), para não cobrir o eixo Y nem a
  // legenda — reclamação do usuário em 2026-11-01.
  import { seriesStore } from '../stores/series.js';
  import { cursorStore } from '../stores/cursor.js';
  import { valorNaData } from '../domain/seriesValue.js';
  import { valorNaUnidade } from '../domain/format.js';

  let {
    largura = 0,
    altura = 0,
    margemEsquerda = 0,
    margemDireita = 0,
    legenda = null,
  } = $props();

  const cursor = $derived($cursorStore);
  const itens = $derived($seriesStore.itens.filter((i) => !i.oculta && i.status === 'ok'));

  const valorDe = (item) => valorNaData(item.series?.data ?? [], cursor.data);
  const textoDoValor = (item) => {
    const v = valorDe(item);
    return v === null ? '—' : valorNaUnidade(v, item.series?.unit ?? item.unit);
  };

  /** Mês e ano apenas (2026-11-01, a pedido do usuário): a caixa acompanha o cursor, não é um
   *  instrumento de leitura de dia. O dia fica no eixo do tempo, para quem precisar. */
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mesAno = (iso) => {
    const [a, m] = iso.split('-');
    return `${MESES[Number(m) - 1]}/${a}`;
  };

  const LARGURA_CAIXA = 245;
  const FOLGA = 14;
  /** Área útil da plotagem: entre as duas escalas e acima do eixo do tempo (~30px). */
  const area = $derived({
    x0: margemEsquerda + 6,
    x1: Math.max(margemEsquerda + 6, largura - margemDireita - 6),
    y0: 6,
    y1: Math.max(6, altura - 30 - 6),
  });

  const alturaCaixa = $derived(26 + 22 * itens.length);

  // Cabe à direita do cursor? Senão vira para a esquerda. Depois, o mesmo para cima/baixo.
  const candidato = $derived.by(() => {
    let x =
      cursor.x + FOLGA + LARGURA_CAIXA <= area.x1 ? cursor.x + FOLGA : cursor.x - LARGURA_CAIXA - FOLGA;
    let y =
      cursor.y + FOLGA + alturaCaixa <= area.y1 ? cursor.y + FOLGA : cursor.y - alturaCaixa - FOLGA;

    // 🔴 A LEGENDA É TERRITÓRIO RESERVADO. Se a caixa cair na faixa horizontal dela, desce para
    //    baixo do bloco — antes ela cobria nome e olho das séries justamente quando o cursor
    //    estava perto do canto superior esquerdo.
    if (legenda) {
      const cruza = x + LARGURA_CAIXA > legenda.x && x < legenda.x + legenda.w;
      if (cruza && y < legenda.y + legenda.h + 6) y = legenda.y + legenda.h + 6;
    }

    // Por último, prende na área útil (nunca por cima do eixo Y nem do eixo do tempo).
    x = Math.max(area.x0, Math.min(x, area.x1 - LARGURA_CAIXA));
    y = Math.max(area.y0, Math.min(y, area.y1 - alturaCaixa));
    return { x, y };
  });
</script>

{#if cursor.data && itens.length > 0}
  <div
    class="pointer-events-none absolute z-20 rounded border border-slate-700 bg-[#0e1117]/95 px-2 py-1.5 text-[12px] leading-5 shadow-lg"
    style="left:{candidato.x}px; top:{candidato.y}px; width:{LARGURA_CAIXA}px"
    data-testid="caixa-cursor"
  >
    <p class="mb-1 text-slate-400">{mesAno(cursor.data)}</p>
    <ul class="flex flex-col">
      {#each itens as item (item.id)}
        <li class="flex items-center justify-between gap-2">
          <span class="flex min-w-0 items-center gap-1.5">
            <span class="h-2 w-2 shrink-0 rounded-full" style="background:{item.cor}" aria-hidden="true"
            ></span>
            <span class="truncate text-slate-300">{item.name}</span>
          </span>
          <span class="shrink-0 tabular-nums text-slate-100">{textoDoValor(item)}</span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

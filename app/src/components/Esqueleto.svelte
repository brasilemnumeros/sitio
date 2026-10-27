<script>
  // §9.2 — carregando, na FORMA DO CONTEÚDO. É um esqueleto, não um spinner solto: reserva a
  // área do gráfico e a faixa do minimapa para a página não pular de layout quando o dado
  // chega, e mostra onde as coisas vão ficar.
  //
  // É FORMA, não dado — não lê store nenhuma (§8).
  //
  // ⚠ NÃO há esqueleto da MATRIZ aqui (bloco 3 do desenho antigo). A matriz passou a viver na
  // gaveta inferior (T8), e desenhá-la dentro do gráfico estouraria a moldura de `h-dvh`: a
  // área do gráfico agora é `flex-1` de um terminal, não uma pilha com espaço de sobra.
  //
  // Os retângulos são DECORATIVOS (`aria-hidden`): o progresso real é POR SÉRIE e já é
  // anunciado nos chips (§9.2). Repetir aqui seria ruído; o `role="status"` abaixo é o único
  // ponto falante, para a página não ficar muda para quem usa leitor de tela.
  const ROTULO = 'Carregando os dados das séries…';
  const CAIXA = 'animate-pulse rounded bg-slate-200 dark:bg-slate-800';
</script>

<div data-bloco="esqueleto" class="flex min-h-0 flex-1 flex-col gap-2" aria-busy="true">
  <span class="sr-only" role="status">{ROTULO}</span>

  <!-- 1 · área do gráfico — `flex-1` como o <Chart />, para o layout não pular nem a altura mudar -->
  <div class="{CAIXA} min-h-0 flex-1 w-full" aria-hidden="true"></div>

  <!-- 2 · minimapa — a mesma faixa do <Chart /> (40px no mobile, 48px a partir de `md`) -->
  <div class="{CAIXA} h-10 md:h-12 w-full shrink-0" aria-hidden="true"></div>
</div>

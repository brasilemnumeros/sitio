<script>
  // §9.2 — carregando, na FORMA DO CONTEÚDO. É um esqueleto, não um spinner solto: reserva a
  // área do gráfico e as linhas da matriz para a página não pular de layout quando o dado
  // chega, e mostra onde as coisas vão ficar.
  //
  // É FORMA, não dado — não lê store nenhuma (§8).
  //
  // Os retângulos são DECORATIVOS (`aria-hidden`): o progresso real é POR SÉRIE e já é
  // anunciado nos chips (§9.2). Repetir aqui seria ruído; o `role="status"` abaixo é o único
  // ponto falante, para a página não ficar muda para quem usa leitor de tela.
  const ROTULO = 'Carregando os dados das séries…';
  const LINHAS_DA_MATRIZ = 5;
  const COLUNAS_DA_MATRIZ = 4;
  const CAIXA = 'animate-pulse rounded bg-slate-200 dark:bg-slate-800';
</script>

<div data-bloco="esqueleto" class="flex flex-col" aria-busy="true">
  <span class="sr-only" role="status">{ROTULO}</span>

  <!-- 1 · área do gráfico — MESMA altura do <Chart /> (h-[480px]) para o layout não pular -->
  <div class="{CAIXA} h-[480px] w-full" aria-hidden="true"></div>

  <!-- 2 · minimapa — mesma faixa do <Chart /> (h-[48px]) -->
  <div class="{CAIXA} mt-2 h-[48px] w-full" aria-hidden="true"></div>

  <!-- 3 · as linhas da matriz de comparação (§9.2) — cabeçalho + linhas de células -->
  <div class="mt-6 flex flex-col gap-2" aria-hidden="true">
    <div class="{CAIXA} h-5 w-48"></div>
    {#each Array(LINHAS_DA_MATRIZ) as _, i (i)}
      <div class="flex gap-2">
        <div class="{CAIXA} h-6 w-32 shrink-0"></div>
        {#each Array(COLUNAS_DA_MATRIZ) as __, j (j)}
          <div class="{CAIXA} h-6 flex-1"></div>
        {/each}
      </div>
    {/each}
  </div>
</div>

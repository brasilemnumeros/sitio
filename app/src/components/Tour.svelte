<script>
  // TOUR DE PRIMEIRA VISITA (desenho de 2026-11-01). O `driver.js` desenha o overlay e os
  // balões; o app decide só QUANDO abrir (domínio `tour.js`) e QUAIS passos existem.
  //
  // Por que uma biblioteca: o desenho é a parte fácil (overlay com furo, balão posicionado);
  // o caro é foco preso, `Esc`, `Tab` que não escapa, alvo que precisa rolar para aparecer.
  // Por que esta: MIT, sem dependência nenhuma, ~5kb, JavaScript puro. O `intro.js` seria
  // AGPL — uso comercial exigiria licença, e o site declara MIT/CC BY na `/sobre`.
  import { driver } from 'driver.js';
  import 'driver.js/dist/driver.css';
  import { filtrarPassos } from '../domain/tour.js';

  let { aberto = false, aoFechar = () => {} } = $props();

  /**
   * Os seis passos, na ordem em que a pessoa esbarra neles. Os seletores são os contratos que
   * o DOM já publicava para os testes — nada de classe de Tailwind aqui, que muda com o layout.
   */
  const PASSOS = [
    {
      element: '[data-testid="botao-busca"]',
      popover: {
        title: 'Buscar',
        description:
          'Ache qualquer um dos indicadores pelo nome. <kbd>⌘K</kbd> abre a busca de qualquer lugar.',
      },
    },
    {
      element: '[data-bloco="filtros"]',
      popover: {
        title: 'Recortar o tempo',
        description: 'Um, cinco ou dez anos. "Tudo" volta ao horizonte completo, desde 1995.',
      },
    },
    {
      element: '[data-testid="barra-inferior"]',
      popover: {
        title: 'Comparar governos',
        description:
          'A matriz abaixo mostra a variação de cada indicador em cada mandato: uma linha por série, uma coluna por governo.',
      },
    },
    {
      element: '[data-testid="trilho"]',
      popover: {
        title: 'Controles do gráfico',
        description: `<p>De cima para baixo:</p>
          <ul>
            <li><b>engrenagem</b> — séries, cores e eixos;</li>
            <li><b>seta de retorno</b> — esquece os filtros de tempo e de mandato;</li>
            <li><b>elo</b> — copia o link com o estado atual do gráfico;</li>
            <li><b>cantos</b> — tela cheia;</li>
            <li><b>?</b> — revê este tour.</li>
          </ul>`,
        side: 'right',
      },
    },
    {
      element: '[data-testid="legenda-grafico"]',
      popover: {
        title: 'Legenda',
        description: 'O olho esconde a série sem tirá-la do gráfico. O × remove.',
      },
    },
    {
      // A escala é desenhada em canvas; o `Chart.svelte` publica um div invisível exatamente
      // sobre ela (`[data-testid="escala-y"]`) só para este passo ter onde apontar.
      element: '[data-testid="escala-y"]',
      popover: {
        title: 'Escala do eixo',
        description:
          'Arraste para cima ou para baixo nesta escala para reduzir ou aumentar o eixo Y. Duplo clique devolve o automático.',
        side: 'left',
      },
    },
    {
      // O último passo sai do gráfico e aponta para o conteúdo editorial: a home é uma ilha,
      // e o texto é onde o número ganha contexto e fonte. É convite, não recomendação.
      element: '[data-testid="link-artigos"]',
      popover: {
        title: 'Artigos e análises',
        description:
          'Confira também nossos artigos: cada análise parte de um indicador e vai além do gráfico — compara com outra série, situa o período e discute os limites da leitura.',
        side: 'bottom',
      },
    },
  ];

  // ⚠ Instância NÃO-reativa de propósito: `$state` dentro de um `$effect` que também a lê
  // (o `.drive()` logo abaixo) cria dependência da própria escrita — e o efeito se re-dispara
  // para sempre (`effect_update_depth_exceeded`, medido em 2026-11-01).
  let driverObj = null;

  $effect(() => {
    if (!aberto) return;

    // Elemento ausente (série em erro, legenda que ainda não montou) = passo pulado: o driver
    // centralizaria o balão no vazio. A caixa tem de ser não-vazia também — a âncora da escala
    // é um div com a largura que o adapter mediu, e ela pode existir com 0×0 no primeiro frame.
    const passos = filtrarPassos(PASSOS, (seletor) => {
      const el = document.querySelector(seletor);
      if (!el) return false;
      const caixa = el.getBoundingClientRect();
      return caixa.width > 0 && caixa.height > 0;
    });
    if (passos.length === 0) {
      aoFechar();
      return;
    }

    // Quem tinha o foco antes do tour. O driver guarda o `activeElement` de CADA passo e, do
    // passo 2 em diante, ele é um botão do popover anterior — que já foi removido do DOM.
    // Sem este retorno explícito, fechar o tour joga o foco no `<body>` e quem usa teclado
    // recomeça o Tab do topo da página.
    const focoAnterior = document.activeElement;

    const instancia = driver({
      steps: passos,
      showProgress: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Próximo',
      prevBtnText: 'Voltar',
      doneBtnText: 'Entendi',
      // O overlay escuro é o mesmo dos véus das gavetas; `#0e1117` é o fundo do terminal.
      overlayColor: '#0e1117',
      overlayOpacity: 0.75,
      // O filtro acima roda uma vez, na abertura. Se um alvo desaparecer ENTRE passos, o padrão
      // (`false`) faria o driver cair no elemento fantasma e centralizar o balão.
      skipMissingElement: true,
      popoverClass: 'tour-terminal',
      // Caminho "de bem": o driver avisa. Não dá para confiar SÓ nisto — ver o vigia abaixo.
      onDestroyed: () => {
        if (driverObj !== null) {
          driverObj = null;
          aoFechar();
        }
      },
    });
    driverObj = instancia;
    instancia.drive();

    // ⚠ O `driver.js` NEM SEMPRE chama `onDestroyed`: fechar por `Esc`, pelo "×" ou pelo véu
    // passa por um caminho interno que destrói sem emitir o gancho (medido em 2026-11-01 — o
    // popover sumia, `tourAberto` ficava `true` e o "?" nunca mais reabria o tour). O vigia
    // fecha o estado pelo fato observável, não pela promessa da biblioteca.
    const fecharSeInativo = () => {
      if (instancia.isActive()) return;
      clearInterval(vigia);
      driverObj = null;
      aoFechar();
    };

    const vigia = setInterval(fecharSeInativo, 150);

    // O vigia sozinho deixa uma janela de até 150ms em que o popover já sumiu mas `tourAberto`
    // ainda é `true` — quem clica no "?" nesse intervalo não reabre nada, porque o estado não
    // muda. O driver fecha por `keyup` (`Esc`) e por `click` ("×", véu), então esses dois
    // eventos fecham o estado na hora, com um microtask para deixar o driver terminar.
    const aposEvento = (e) => {
      if (e.type === 'keyup' && e.key !== 'Escape') return;
      queueMicrotask(fecharSeInativo);
    };
    window.addEventListener('keyup', aposEvento);
    window.addEventListener('click', aposEvento);

    return () => {
      clearInterval(vigia);
      window.removeEventListener('keyup', aposEvento);
      window.removeEventListener('click', aposEvento);
      const atual = driverObj;
      driverObj = null;
      atual?.destroy();

      // `document.contains(body)` é sempre verdadeiro — sem excluir o `<body>`, o "foco de
      // volta" seria devolver o foco a lugar nenhum.
      const alvo =
        focoAnterior && focoAnterior !== document.body && document.contains(focoAnterior)
          ? focoAnterior
          : document.querySelector('[data-testid="botao-tour"]');
      alvo?.focus();
    };
  });
</script>

<!-- O driver monta o popover no `<body>`, fora desta árvore — daí o `:global`. O CSS dele vem
     claro (`#fff`, `#2d2d2d`); sem o override o balão aparece branco no meio do terminal. -->
<style>
  :global(.driver-popover.tour-terminal) {
    background-color: #161b22;
    border: 1px solid #334155;
    border-radius: 6px;
    color: #e2e8f0;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.6);
  }

  :global(.tour-terminal .driver-popover-title) {
    color: #e2e8f0;
    font-size: 15px;
    font-weight: 600;
  }

  :global(.tour-terminal .driver-popover-description) {
    color: #cbd5e1;
    font-size: 13px;
    line-height: 1.5;
  }

  :global(.tour-terminal .driver-popover-description kbd) {
    border: 1px solid #475569;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 11px;
    color: #e2e8f0;
  }

  /* A lista de ícones do passo "Controles do gráfico". O popover tem 300px e `all: unset`, então
     sem esta regra o `<ul>` perde marcador, recuo e espaçamento. */
  :global(.tour-terminal .driver-popover-description ul) {
    margin: 6px 0 0;
    padding-left: 16px;
    list-style: disc;
  }

  :global(.tour-terminal .driver-popover-description li) {
    margin-bottom: 2px;
  }

  :global(.tour-terminal .driver-popover-description li b) {
    color: #f1f5f9;
    font-weight: 600;
  }

  :global(.tour-terminal .driver-popover-progress-text) {
    color: #94a3b8;
    font-size: 12px;
  }

  :global(.tour-terminal .driver-popover-footer-btn) {
    background-color: #1e293b;
    border: 1px solid #475569;
    border-radius: 4px;
    color: #e2e8f0;
    padding: 4px 8px;
  }

  :global(.tour-terminal .driver-popover-footer-btn:hover),
  :global(.tour-terminal .driver-popover-footer-btn:focus) {
    background-color: #334155;
    color: #f8fafc;
  }

  :global(.tour-terminal .driver-popover-close-btn) {
    color: #64748b;
  }

  :global(.tour-terminal .driver-popover-close-btn:hover) {
    color: #e2e8f0;
  }

  /* A seta é um quadrado com três bordas transparentes; a visível é a que aponta para o alvo. */
  :global(.tour-terminal .driver-popover-arrow-side-left.driver-popover-arrow) {
    border-right-color: #161b22;
  }

  :global(.tour-terminal .driver-popover-arrow-side-right.driver-popover-arrow) {
    border-left-color: #161b22;
  }

  :global(.tour-terminal .driver-popover-arrow-side-top.driver-popover-arrow) {
    border-bottom-color: #161b22;
  }

  :global(.tour-terminal .driver-popover-arrow-side-bottom.driver-popover-arrow) {
    border-top-color: #161b22;
  }
</style>

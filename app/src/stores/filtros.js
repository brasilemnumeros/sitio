import { derived } from 'svelte/store';
import { viewportStore } from './viewport.js';
import { mandateStore, aplicarMandato } from './mandate.js';
import { HORIZONTE_INICIO } from '../domain/horizonte.js';
import { dataEmSaoPaulo } from '../data/presets.js';

/**
 * "HÁ FILTRO EM CENA?" — a condição que faz o botão de limpar aparecer no trilho direito.
 *
 * Quais contam como filtro: a JANELA de tempo recortada e o MANDATO escolhido. NÃO contam as
 * séries (o chip de preset já troca o conjunto e tem "Do dia" no menu) nem a cor/eixo de uma
 * série (são apresentação por série, como a cor — o reset das cores não existe e não deve
 * existir escondido dentro de "limpar filtros").
 *
 * 🔴 A janela é medida por DURAÇÃO contra o horizonte do eixo, não por `from === null`: o
 * adapter ecoa o `fitContent` para a store e o "Tudo" chega aqui como uma janela REAL (com as
 * duas pontas). A folga de 1 ano cobre o arredondamento do `barSpacing` — o mesmo que faz a
 * borda esquerda ecoar ~1 mês antes do primeiro dado em viewport estreito (defeito conhecido,
 * registrado no AGENTS). Sem folga, o botão apareceria "para limpar" uma tela já limpa.
 */
const ANO_MS = 365.25 * 24 * 60 * 60 * 1000;

/** Duração do horizonte do eixo, em anos. `dataEmSaoPaulo()` a cada leitura: o "hoje" do eixo
 *  anda com o calendário, e uma aba aberta de um dia para o outro não pode mentir. */
function duracaoDoHorizonte() {
  return (Date.parse(dataEmSaoPaulo()) - Date.parse(HORIZONTE_INICIO)) / ANO_MS;
}

export const filtroAtivo = derived([viewportStore, mandateStore], ([janela, mandato]) => {
  if (mandato.selecionado) return true;
  if (!janela.from || !janela.to) return false; // sem janela = "Tudo" (o fit devolve as pontas depois)
  const d = (Date.parse(janela.to) - Date.parse(janela.from)) / ANO_MS;
  return d < duracaoDoHorizonte() - 1;
});

/**
 * "Limpar filtros" — volta a janela ao intervalo completo E solta o mandato, pelo MESMO caminho
 * dos dois controles que os escrevem (`aplicarMandato(null)` = `limparSelecao` + `resetarJanela`).
 * Nenhuma regra nova: se um dia a escolha de mandato mudar, o botão muda junto.
 */
export function resetarFiltros() {
  aplicarMandato(null);
}

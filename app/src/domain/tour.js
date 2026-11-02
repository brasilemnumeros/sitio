/** Largura a partir da qual o tour roda. Abaixo dela o trilho e a legenda só existem com
 *  gaveta/folha aberta, que cobre o gráfico inteiro: o tour ensinaria por cima do que ensina. */
export const LARGURA_MINIMA = 1024;

/** Chave de "já viu". Gravada ao ABRIR, não ao fechar — mesma regra de `dica-limpar-filtros`:
 *  quem fechou no passo 2 não vê o roteiro inteiro de novo na visita seguinte. */
export const CHAVE_TOUR = 'tour-visto';

/**
 * O tour aparece uma vez por navegador, no desktop, e nunca quando a URL trouxe séries: quem
 * abriu um link compartilhado veio ver um gráfico, não fazer tour.
 *
 * `consentimentoPendente` (2026-11-01): com a faixa de consentimento na tela o tour NÃO abre.
 * O overlay do driver.js é `z-index: 10000` e a faixa é `z-50`, então o tour cobria a faixa e
 * "Aprovar"/"Recusar" ficavam inalcançáveis — medido em 2026-11-01 (`elementFromPoint` no botão
 * devolvia o `path` do overlay; com o tour fechado devolvia o próprio botão). A ordem é
 * consentimento primeiro, onboarding depois: ao aprovar, a página recarrega, a faixa sai e o
 * tour entra. O botão "Ver o tour" do trilho continua funcionando a qualquer momento.
 */
export function deveMostrarTour({ largura, urlTemSeries, jaVisto, consentimentoPendente = false }) {
  if (jaVisto) return false;
  if (consentimentoPendente) return false;
  if (largura < LARGURA_MINIMA) return false;
  if (urlTemSeries) return false;
  return true;
}

/**
 * Um passo cujo elemento não está no DOM (série em erro, legenda ausente) vira balão
 * centralizado no vazio — o driver.js não pula sozinho. Quem decide o que existe é quem chama,
 * com `document.querySelector`; aqui a regra é pura e testável.
 */
export function filtrarPassos(passos, existe) {
  return passos.filter((passo) => existe(passo.element));
}

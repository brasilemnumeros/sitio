// O `post.excerpt` do Jekyll não existe no Astro.
//
// O Jekyll monta o excerpt a partir do PRIMEIRO BLOCO do corpo (o texto até a
// primeira linha em branco), renderiza esse bloco e aplica `strip_html`. Por
// isso o post dos homicídios, cujo corpo começa com `### Uma análise...`, tem
// trecho sem o `###`.
//
// Aqui partimos do HTML já renderizado (`entry.rendered.html`), e não do
// markdown cru: é o mesmo material que o Jekyll enxerga depois do kramdown, o
// que preserva de graça a pontuação inteligente (aspas curvas) e os links
// resolvidos. Medido em 2026-10-18: o post `ipca-vs-igpm` publica `“inflação”`
// com aspas curvas no trecho.
import type { CollectionEntry } from 'astro:content';

// Elementos vazios: não abrem profundidade no HTML.
const VAZIOS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// Recorta o primeiro elemento de topo do HTML renderizado.
function primeiroBloco(html: string): string {
  const inicio = html.search(/<[a-zA-Z]/);
  if (inicio === -1) return html;

  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:\s[^>]*)?(\/?)>/g;
  tag.lastIndex = inicio;
  let profundidade = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html))) {
    const [, fecha, nome, autoFecha] = m;
    if (fecha) {
      profundidade--;
      if (profundidade === 0) return html.slice(inicio, m.index + m[0].length);
    } else if (!autoFecha && !VAZIOS.has(nome.toLowerCase())) {
      profundidade++;
    }
  }
  return html.slice(inicio);
}

// O `strip_html` do Liquid remove as tags; aqui também decodificamos as
// entidades, porque o texto volta a ser texto (e o Astro reescapa o que for
// preciso). Espaços são colapsados, como o `truncatewords` do Ruby faz ao
// dividir em palavras.
function textoDoHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    // Resíduo de markdown que o CommonMark não converteu: o corpo do post do
    // IPCA tem `[post de lançamento]({% post_url … %})` e o destino com espaços
    // e Liquid não é um link válido, então o markdown deixa tudo literal. O
    // Jekyll resolvia o `{% post_url %}` ANTES do markdown; aqui o trecho fica
    // com o mesmo texto do publicado tirando o resíduo. (O corpo do post em si
    // continua com o Liquid cru — ver a lista de achados.)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// O `truncatewords` do Liquid: corta em `max` palavras e acrescenta `...`
// (três pontos, não o caractere `…` — medido no site publicado).
export function truncarPalavras(texto: string, max: number): string {
  const palavras = texto.split(/\s+/).filter(Boolean);
  if (palavras.length <= max) return palavras.join(' ');
  return `${palavras.slice(0, max).join(' ')}...`;
}

export function trecho(entry: CollectionEntry<'posts'>, maxPalavras: number): string {
  const html = entry.rendered?.html;
  // Sem o HTML renderizado não há como reproduzir o excerpt: falhar em voz alta
  // em vez de publicar um trecho vazio (ou diferente) em silêncio.
  if (!html) throw new Error(`trecho: post sem HTML renderizado: ${entry.id}`);
  return truncarPalavras(textoDoHtml(primeiroBloco(html)), maxPalavras);
}

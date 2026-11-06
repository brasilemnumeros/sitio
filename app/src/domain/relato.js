import { escreverSearch } from '../permalink.js';

/**
 * Monta o relato de erro de dado como uma issue pronta no repositório `dados`.
 *
 * Pura de propósito: NÃO lê `location`, `window` nem o catálogo. Origem, ids, janela e
 * mandato entram por parâmetro — é o que permite testar o formato sem DOM e sem rede.
 * ⚠ A janela chega como `{de, ate}`; quem chama mapeia `viewportStore.from/to` para cá.
 *
 * §9 do desenho: nada do navegador entra no corpo (sem user-agent, idioma, tela, referrer).
 * O que sai é o que a página `/correcoes` promete: indicador, período, valor visto, valor
 * esperado, fonte e um link que reabre a MESMA imagem (todas as séries do gráfico).
 */

/** O destino único: erro de dado é dado, não interface. */
export const REPO_ISSUES = 'https://github.com/brasilemnumeros/dados/issues/new';

/** A label que o repositório `dados` usa para triagem (criada em 2026-11-06). */
const LABEL = 'erro-de-dado';

/**
 * ⚠ O limite é da URL **codificada**, não do texto: medido em 2026-11-06 contra o GitHub, uma
 * URL de ~6,5 KB abre; 7 KB responde 500 e 8,3 KB responde 414. `ç` custa 6 caracteres na query
 * (`%C3%A7`), então contar 2000 "letras" não limita nada — daí o corte ser medido no resultado.
 */
const LIMITE_URL = 6000;

/** Texto livre do relato, antes de qualquer corte por tamanho de URL. */
const LIMITE_TEXTO = 2000;

/** Título do GitHub é curto; o nome do indicador pode ser longo. */
const LIMITE_TITULO = 120;

/** Campos de uma linha (período, valores) e o link da fonte. */
const LIMITE_CAMPO = 120;
const LIMITE_FONTE = 500;

const ou = (valor, fallback) => {
  const t = (valor ?? '').trim();
  return t === '' ? fallback : t;
};

/** Corte por CODE POINT: `slice` de string parte par substituto (emoji vira `\uFFFD`). */
const fatiar = (texto, limite) => [...(texto ?? '')].slice(0, limite).join('');

/**
 * @param {object} relato
 * @param {string} relato.id          id do indicador reportado
 * @param {string} relato.nome        nome do indicador reportado
 * @param {string} [relato.periodo]   período digitado (livre)
 * @param {string} relato.texto       o que está errado
 * @param {string} [relato.valorVisto]
 * @param {string} [relato.valorEsperado]
 * @param {string} [relato.fonte]
 * @param {string[]} relato.ids       TODAS as séries do gráfico, na ordem da store
 * @param {string} relato.urlBase     origin + pathname (quem chama lê do navegador)
 * @param {{de: string, ate: string}|null} [relato.janela]
 * @param {string|null} [relato.mandato]
 * @param {string} relato.data        AAAA-MM-DD de hoje
 * @returns {{titulo: string, corpo: string, url: string, cortado: boolean}}
 */
export function montarRelato({
  id,
  nome,
  periodo,
  texto,
  valorVisto,
  valorEsperado,
  fonte,
  ids,
  urlBase,
  janela,
  mandato,
  data,
}) {
  const periodoFinal = ou(fatiar((periodo ?? '').trim(), LIMITE_CAMPO), 'não informado');
  const sufixo =
    periodoFinal === 'não informado' ? 'possível erro no dado' : `valor de ${periodoFinal} parece errado`;
  const espacoDoNome = Math.max(1, LIMITE_TITULO - sufixo.length - 2);
  const titulo = `${fatiar((nome ?? '').trim(), espacoDoNome)}: ${sufixo}`;

  // `de`/`ate` vêm em ISO; a leitura é por mês, como o resto do app (AAAA-MM).
  const janelaFinal =
    janela?.de && janela?.ate ? `${janela.de.slice(0, 7)} a ${janela.ate.slice(0, 7)}` : 'não informada';

  const query = escreverSearch(ids ?? [], '');
  const permalink = `${urlBase}${query ? `?${query}` : ''}`;

  const montarCorpo = (textoFinal) =>
    [
      '### Indicador',
      `\`${id}\` — ${nome}`,
      '',
      '### Período',
      periodoFinal,
      '',
      '### O que está errado',
      ou(textoFinal, '(não informado)'),
      '',
      '### Valores',
      `- Aparece no site: ${ou(fatiar((valorVisto ?? '').trim(), LIMITE_CAMPO), 'não informado')}`,
      `- Esperado: ${ou(fatiar((valorEsperado ?? '').trim(), LIMITE_CAMPO), 'não informado')}`,
      '',
      '### Fonte oficial',
      ou(fatiar((fonte ?? '').trim(), LIMITE_FONTE), 'não informada'),
      '',
      '### Como reproduzir',
      permalink,
      `janela visível: ${janelaFinal} · mandato: ${ou(mandato, 'nenhum')}`,
      '',
      '---',
      `Enviado pelo formulário do site · ${data}`,
    ].join('\n');

  const montarUrl = (corpo) =>
    `${REPO_ISSUES}?${new URLSearchParams({ title: titulo, body: corpo, labels: LABEL }).toString()}`;

  const pontos = [...(texto ?? '').trim()].slice(0, LIMITE_TEXTO);
  let corpo = montarCorpo(pontos.join(''));
  let url = montarUrl(corpo);
  let cortado = false;

  // Acima do limite, a maior partição que ainda cabe — busca binária porque o custo de cada
  // codificação depende do conteúdo (acento, emoji e espaço não pesam igual).
  if (url.length > LIMITE_URL) {
    let baixo = 0;
    let alto = pontos.length;
    while (baixo < alto) {
      const meio = Math.ceil((baixo + alto) / 2);
      const tentativa = montarUrl(montarCorpo(pontos.slice(0, meio).join('')));
      if (tentativa.length <= LIMITE_URL) baixo = meio;
      else alto = meio - 1;
    }
    pontos.length = baixo;
    corpo = montarCorpo(pontos.join(''));
    url = montarUrl(corpo);
    cortado = true;
  }

  return { titulo, corpo, url, cortado };
}

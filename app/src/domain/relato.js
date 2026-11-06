import { escreverSearch } from '../permalink.js';

/**
 * Monta o relato de erro de dado como uma issue pronta no repositório `dados`.
 *
 * Pura de propósito: NÃO lê `location`, `window` nem o catálogo. Origem, ids, janela e
 * mandato entram por parâmetro — é o que permite testar o formato sem DOM e sem rede.
 *
 * §9 do desenho: nada do navegador entra no corpo (sem user-agent, idioma, tela, referrer).
 * O que sai é o que a página `/correcoes` promete: indicador, período, valor visto, valor
 * esperado, fonte e um link que reabre a MESMA imagem (todas as séries do gráfico).
 */

/** O destino único: erro de dado é dado, não interface. */
export const REPO_ISSUES = 'https://github.com/brasilemnumeros/dados/issues/new';

/** A label que o repositório `dados` usa para triagem (criada em 2026-11-06). */
const LABEL = 'erro-de-dado';

/** Texto livre do relato: acima disto a URL deixa de ser confiável nos navegadores. */
const LIMITE_TEXTO = 2000;

/** Título do GitHub é curto; o nome do indicador pode ser longo. */
const LIMITE_TITULO = 120;

const ou = (valor, fallback) => {
  const t = (valor ?? '').trim();
  return t === '' ? fallback : t;
};

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
 * @returns {{titulo: string, corpo: string, url: string}}
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
  const periodoFinal = ou(periodo, 'não informado');
  const titulo = `${nome}: ${
    periodoFinal === 'não informado' ? 'possível erro no dado' : `valor de ${periodoFinal} parece errado`
  }`.slice(0, LIMITE_TITULO);

  // `de`/`ate` vêm em ISO; a leitura é por mês, como o resto do app (AAAA-MM).
  const janelaFinal =
    janela?.de && janela?.ate ? `${janela.de.slice(0, 7)} a ${janela.ate.slice(0, 7)}` : 'não informada';

  const query = escreverSearch(ids ?? [], '');
  const permalink = `${urlBase}${query ? `?${query}` : ''}`;

  const corpo = [
    '### Indicador',
    `\`${id}\` — ${nome}`,
    '',
    '### Período',
    periodoFinal,
    '',
    '### O que está errado',
    ou(texto, '(não informado)').slice(0, LIMITE_TEXTO),
    '',
    '### Valores',
    `- Aparece no site: ${ou(valorVisto, 'não informado')}`,
    `- Esperado: ${ou(valorEsperado, 'não informado')}`,
    '',
    '### Fonte oficial',
    ou(fonte, 'não informada'),
    '',
    '### Como reproduzir',
    permalink,
    `janela visível: ${janelaFinal} · mandato: ${ou(mandato, 'nenhum')}`,
    '',
    '---',
    `Enviado pelo formulário do site · ${data}`,
  ].join('\n');

  const busca = new URLSearchParams({ title: titulo, body: corpo, labels: LABEL });
  return { titulo, corpo, url: `${REPO_ISSUES}?${busca.toString()}` };
}

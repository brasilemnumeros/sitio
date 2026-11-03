import { SchemaError } from './validate.js';

/** As três CLASSES DE ESCALA do distintivo da busca (§12.1). A unidade completa (símbolo,
 *  casas, idioma) é dona da SÉRIE — aqui fica só o que a lista precisa antes do dado chegar. */
const ESCALAS = new Set(['percentual', 'moeda', 'numero']);
/** `arquivo` é o caminho dentro do repo `dados/`, nunca URL: a base é resolvida na leitura. */
const ARQUIVO = /^[a-z0-9-]+\/[a-z0-9-]+\.json$/;

/**
 * @typedef {Object} CatalogEntry
 * @property {string} id
 * @property {string} nome
 * @property {string} grupo
 * @property {string} arquivo   caminho relativo em `dados/` (fonte)
 * @property {string} datafile  URL resolvida contra a base (é o que stores e componentes usam)
 * @property {'percentual'|'moeda'|'numero'} escala
 * @property {string} urlNotebook  URL do notebook que gera a série (o link de auditoria da ficha)
 */

/**
 * Valida o catálogo e resolve `arquivo` contra a base de dados.
 *
 * O catálogo é APRESENTAÇÃO: nome, grupo, descrição, escala e o caminho do arquivo. O que
 * descreve o dado — `unidade`, `granularidade`, `fonte` — mora na própria série e não é
 * duplicado aqui (2026-11-01; antes a unidade divergia da série em 8 de 13 registros).
 */
export function validateCatalog(raw, { base = __BASE_DADOS__ } = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new SchemaError('catálogo não é um objeto JSON');
  }
  if (raw.versao !== 1) {
    throw new SchemaError(`catálogo com versao ${JSON.stringify(raw.versao)}; esperado 1`);
  }
  const grupos = raw.grupos;
  if (grupos === null || typeof grupos !== 'object' || Array.isArray(grupos)) {
    throw new SchemaError('catálogo sem o mapa "grupos"');
  }
  if (!Array.isArray(raw.indicadores)) {
    throw new SchemaError('catálogo sem a lista "indicadores"');
  }
  // `id` é chave do `{#each ... (ind.id)}` da busca e `arquivo` é a chave do fetch da série:
  // repetido, o Svelte lança `each_key_duplicate` e a lista inteira sai do ar. O CI do `dados`
  // confere o mesmo (K8); aqui a mensagem precisa nomear o valor para dizer o que corrigir.
  const ids = new Set();
  const arquivos = new Set();
  const indicadores = raw.indicadores.map((ind, i) => {
    const where = `indicadores[${i}]`;
    if (ind === null || typeof ind !== 'object' || Array.isArray(ind)) {
      throw new SchemaError(`${where} não é objeto`);
    }
    if (typeof ind.id !== 'string' || ind.id === '') throw new SchemaError(`${where}.id ausente`);
    if (ids.has(ind.id)) {
      throw new SchemaError(`${where}: id ${JSON.stringify(ind.id)} repetido`);
    }
    ids.add(ind.id);
    if (typeof ind.nome !== 'string' || ind.nome === '') throw new SchemaError(`${where}.nome ausente`);
    if (!Object.hasOwn(grupos, ind.grupo)) {
      throw new SchemaError(`${where} (${ind.id}): grupo "${ind.grupo}" não existe em "grupos"`);
    }
    if (typeof ind.arquivo !== 'string' || !ARQUIVO.test(ind.arquivo)) {
      throw new SchemaError(
        `${where} (${ind.id}): arquivo deve ser caminho relativo "familia/arquivo.json", veio ${JSON.stringify(ind.arquivo)}`
      );
    }
    if (arquivos.has(ind.arquivo)) {
      throw new SchemaError(`${where} (${ind.id}): arquivo ${JSON.stringify(ind.arquivo)} repetido`);
    }
    arquivos.add(ind.arquivo);
    // O contrato C2 garante `id` == nome do arquivo; aqui o porteiro do runtime confere o mesmo
    // par, para que um catálogo editado à mão com o id trocado não chegue à tela. O `validar.py`
    // (K3) também confere, do lado do `dados` — este é o que sobrevive a uma publicação errada.
    const semExtensao = ind.arquivo.replace(/\.json$/, '').split('/').pop();
    if (ind.id !== semExtensao) {
      throw new SchemaError(
        `${where} (${ind.id}): id diverge do arquivo ${JSON.stringify(ind.arquivo)} (esperado "${semExtensao}")`
      );
    }
    if (!ESCALAS.has(ind.escala)) {
      throw new SchemaError(`${where}.escala deve ser percentual|moeda|numero, veio ${JSON.stringify(ind.escala)}`);
    }
    // K9 — o link de auditoria da ficha vem do catálogo, não do bundle. O porteiro do runtime
    // confere o mínimo (https e não vazio); a URL canônica e a existência do `.ipynb` no disco
    // são conferidas pelo `validar.py`, que tem o repo inteiro à mão.
    if (typeof ind.urlNotebook !== 'string' || !/^https:\/\/\S+$/.test(ind.urlNotebook)) {
      throw new SchemaError(
        `${where} (${ind.id}): urlNotebook deve ser uma URL https, veio ${JSON.stringify(ind.urlNotebook)}`
      );
    }
    // PRESERVA o resto do registro (R16 emendado): `descricao` e afins são curadoria de
    // APRESENTAÇÃO e pertencem ao catálogo (§6) — descartá-los em silêncio seria perda
    // invisível de dado.
    return { ...ind, datafile: `${base.replace(/\/+$/, '')}/${ind.arquivo}` };
  });
  return { grupos, indicadores };
}

/** O catálogo do site mora no repo `dados/`, ao lado das séries: `${base}/catalogo.json`. */
export function urlDoCatalogo(base = __BASE_DADOS__) {
  return `${base.replace(/\/+$/, '')}/catalogo.json`;
}

/** O diretório do catálogo é a BASE do `validateCatalog`: é contra ela que os `datafile`
 *  são resolvidos. Derivar da URL (em vez de usar `__BASE_DADOS__`) mantém a injeção do
 *  `url` nos testes honesta — o dado e a base não podem vir de lugares diferentes.
 *
 *  A URL tem de TERMINAR no arquivo: uma base com barra final (`…/indicadores/`) faria o
 *  último segmento sumir e resolvedor apontasse um nível acima, em silêncio — todo `datafile`
 *  errado, e o erro só apareceria quando alguém adicionasse a série. */
const SUFIXO_CATALOGO = '/catalogo.json';
const baseDaUrl = (url) => {
  if (!url.endsWith(SUFIXO_CATALOGO)) {
    throw new Error(`url do catálogo deve terminar em ${SUFIXO_CATALOGO}, veio ${url}`);
  }
  return url.slice(0, -SUFIXO_CATALOGO.length).replace(/\/+$/, '');
};

/**
 * Busca o catálogo na base de dados e devolve a lista validada.
 *
 * Nenhum fallback: rede caída, HTTP de erro, corpo que não é JSON e catálogo fora do contrato
 * sobem como `Error` com a mensagem do que houve. Um "catálogo vazio" silencioso deixaria a
 * home sem indicadores e sem dizer por quê (§9).
 */
export async function buscarCatalogo({ url = urlDoCatalogo(), fetchImpl = fetch } = {}) {
  let resposta;
  try {
    resposta = await fetchImpl(url);
  } catch (cause) {
    throw new Error('falha de rede ao buscar o catálogo', { cause });
  }
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} ao buscar o catálogo em ${url}`);
  // `json()` fica FORA do try acima de propósito: um corpo que não é JSON (o middleware
  // respondendo HTML, um proxy com página de erro) é um defeito DIFERENTE de "a rede caiu", e a
  // mensagem precisa dizer isso a quem lê a tela. O `SyntaxError` do parser vai em `cause`.
  let bruto;
  try {
    bruto = await resposta.json();
  } catch (cause) {
    throw new Error(`o catálogo em ${url} não é JSON`, { cause });
  }
  return validateCatalog(bruto, { base: baseDaUrl(url) });
}

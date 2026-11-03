import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSeries } from './validate.js';
import { validateCatalog } from './catalog.js';
import { PRESETS } from './presets.js';
import { EXEMPLO_IDS } from './exemplo.js';
import { raizDados } from '../../test-utils/raiz-dados.js';

/**
 * Teste de INTEGRAÇÃO — roda contra o dado PUBLICADO no repo `dados/`, não contra fixture.
 *
 * A fatia 01 provou que o contrato está certo; este teste prova que o dado CUMPRE o
 * contrato. É a diferença que deixou 4 séries com mês repetido passarem por 121 testes
 * verdes (as fixtures eram nossas, o dado publicado não).
 *
 * Lê do disco, sem rede (§6). A raiz vem de `raizDados()` (`DADOS_DIR` no CI) desde
 * 2026-11-01: com o `../../../../dados` fixo o Actions lia `<workspace>/dados` — um
 * diretório que não existe — e esta camada nunca rodou lá.
 *
 * Desde a mesma data o catálogo mora no repo `dados/`, ao lado das séries: ele deixou de
 * ser uma cópia que envelhecia aqui e virou o que este teste confere.
 */

const RAIZ_DADOS = raizDados();
const RAIZ_SERIES = join(RAIZ_DADOS, 'indicadores');
const CATALOGO = join(RAIZ_SERIES, 'catalogo.json');
const POSTS = fileURLToPath(new URL('../../../src/content/posts/', import.meta.url));
/** Espelho do `PREFIXO_NOTEBOOK` do `validar.py` (K9): o link da ficha é conferido nos dois lados. */
const PREFIXO_NOTEBOOK =
  'https://github.com/brasilemnumeros/dados/blob/main/indicadores/';

function catalogo() {
  return JSON.parse(readFileSync(CATALOGO, 'utf8'));
}

/**
 * Toda série publicada em `dados/indicadores/<familia>/*.json`.
 *
 * Varre TODAS as famílias (antes só as que o catálogo citava, o que escondia justamente a
 * família órfã que a conferência abaixo existe para pegar). `catalogo.json` mora na raiz de
 * `indicadores/`, não dentro de uma família, então o scan de diretórios não o alcança.
 */
function arquivosDeSerie() {
  const out = [];
  for (const fam of readdirSync(RAIZ_SERIES, { withFileTypes: true })) {
    if (!fam.isDirectory()) continue;
    for (const arquivo of readdirSync(join(RAIZ_SERIES, fam.name)).filter((n) => n.endsWith('.json'))) {
      out.push({ familia: fam.name, arquivo, caminho: join(RAIZ_SERIES, fam.name, arquivo) });
    }
  }
  return out;
}

/**
 * Os ids que o SITE conhece pelos posts publicados: os `?series=a,b` (e `&series=`) dos links.
 *
 * Ancorado no delimitador de query de propósito: um `\bseries=` solto casaria `data-series=`
 * ou `chart-series=` num trecho de HTML colado no post, e o "id" inventado reprovaria o build
 * por um motivo que não é o dado. `&amp;series=` entra junto: é o escape legal de `&` dentro
 * de `href`, e hoje nenhum post usa — sem a alternativa, o link passaria despercebido.
 *
 * Decodifica ANTES de partir por vírgula: o post da Selic escreve `series=selic-meta%2C…`, e
 * partir o texto cru transformaria `selic-meta%2Cselic-over-acum-12m` num id inexistente.
 */
function idsDosPosts() {
  const out = [];
  for (const nome of readdirSync(POSTS).filter((n) => n.endsWith('.md'))) {
    const texto = readFileSync(join(POSTS, nome), 'utf8');
    for (const [, bruto] of texto.matchAll(/(?:[?&]|&amp;)series=([^"'&#\s)<>\]]+)/g)) {
      let valor;
      try {
        valor = decodeURIComponent(bruto);
      } catch {
        // `%` solto na URL vira URIError sem dizer de onde veio: nomeia o arquivo.
        throw new Error(`post ${nome}: "series=${bruto}" não tem percent-encoding válido`);
      }
      for (const id of valor.split(',')) {
        if (id.trim()) out.push({ id: id.trim(), origem: `post ${nome}` });
      }
    }
  }
  return out;
}

describe('o contrato publicado em dados/ é o que o app valida (§6)', () => {
  it('o catálogo publicado passa em validateCatalog (o porteiro do runtime)', () => {
    // `validateCatalog` só era exercitado contra fixture: um `grupo` inexistente, um `arquivo`
    // absoluto ou um `escala` fora das três classes no catálogo REAL só apareceria em runtime,
    // na tela de erro. A mensagem do SchemaError já nomeia o registro e o campo — `toThrow`
    // a mostra inteira quando reprova.
    expect(
      () => validateCatalog(catalogo(), { base: RAIZ_SERIES }),
      'o catálogo publicado não passa no validador que o app roda',
    ).not.toThrow();
  });

  it('toda série publicada passa em validateSeries, com id == nome do arquivo', () => {
    const arquivos = arquivosDeSerie();
    // A contagem vem do disco (o `toHaveLength(13)` saiu em 2026-11-01), mas zero séries
    // não pode passar: seria o teste verde que não testa nada.
    expect(arquivos.length, `nenhuma série encontrada em ${RAIZ_SERIES}`).toBeGreaterThan(0);
    for (const { arquivo, caminho } of arquivos) {
      const id = arquivo.replace(/\.json$/, '');
      const serie = validateSeries(JSON.parse(readFileSync(caminho, 'utf8')), { expectedId: id });
      expect(serie.dados.length, `${arquivo} sem pontos`).toBeGreaterThan(0);
    }
  });

  it('nenhuma série tem mês repetido (o defeito da MVG-R/CAGED, corrigido)', () => {
    for (const { arquivo, caminho } of arquivosDeSerie()) {
      const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
      const meses = bruto.dados.map((p) => p.data.slice(0, 7));
      expect(new Set(meses).size, `${arquivo} tem mês repetido`).toBe(meses.length);
    }
  });

  it('o catálogo e o disco concordam: nenhuma série órfã ou declarada a menos', () => {
    const noDisco = new Set(arquivosDeSerie().map((a) => `${a.familia}/${a.arquivo}`));
    const noCatalogo = new Set(catalogo().indicadores.map((i) => i.arquivo));
    // As duas direções separadas: o array vazio mostra QUAL arquivo está sobrando, e o
    // `toEqual([])` reprova em voz alta (§9) em vez de esconder a diferença num diff de listas.
    expect(
      [...noCatalogo].filter((arquivo) => !noDisco.has(arquivo)),
      'o catálogo declara arquivo que não existe em dados/indicadores',
    ).toEqual([]);
    expect(
      [...noDisco].filter((arquivo) => !noCatalogo.has(arquivo)),
      'há série em dados/indicadores sem entrada no catálogo',
    ).toEqual([]);
  });

  it('toda entrada do catálogo tem escala igual a unidade.tipo da série (K4)', () => {
    for (const ind of catalogo().indicadores) {
      const serie = JSON.parse(readFileSync(join(RAIZ_SERIES, ind.arquivo), 'utf8'));
      // Antes de 2026-11-01 o catálogo repetia `unit` inteiro — e divergia em 8 de 13.
      expect(
        ind.escala,
        `${ind.id} (${ind.arquivo}): escala do catálogo × unidade.tipo da série`,
      ).toBe(serie.unidade.tipo);
      expect(ind, `${ind.id}: catálogo não deve duplicar a unidade`).not.toHaveProperty('unidade');
    }
  });

  it('todo urlNotebook aponta para notebook existente em dados/indicadores (K9)', () => {
    // O catálogo é lido em runtime de outro repo: um caminho de notebook com typo só apareceria
    // no clique. O `validar.py` confere antes do merge; este teste repete a conferência contra o
    // disco que o app consome, para o build do sitio também reprovar se o catálogo publicado
    // estiver inconsistente.
    for (const ind of catalogo().indicadores) {
      expect(
        ind.urlNotebook?.startsWith(PREFIXO_NOTEBOOK),
        `${ind.id}: urlNotebook fora do prefixo canônico`,
      ).toBe(true);
      const relativo = decodeURIComponent(ind.urlNotebook.slice(PREFIXO_NOTEBOOK.length));
      expect(existsSync(join(RAIZ_SERIES, relativo)), `${ind.id}: ${relativo} não existe`).toBe(
        true,
      );
    }
  });

  it('todo id que o site conhece existe no catálogo', () => {
    // Sem esta conferência, renomear um id no `dados` vira falha silenciosa no sitio: preset
    // com uma curva a menos, botão de exemplo inerte, link de post sem série. O catálogo
    // embutido era essa guarda — ele saiu do bundle (2026-11-01) e o teste assumiu o papel.
    const doSite = [
      ...PRESETS.flatMap((preset) =>
        preset.indicadores.map((id) => ({ id, origem: `preset "${preset.id}"` })),
      ),
      ...EXEMPLO_IDS.map((id) => ({ id, origem: 'exemplo (§9.1)' })),
      ...idsDosPosts(),
    ];
    expect(doSite.length, 'nenhum id conhecido do site foi coletado').toBeGreaterThan(0);
    // Os posts vêm de URL dentro de Markdown: se o extrator parar de casar, o teste ainda
    // passaria com PRESETS e EXEMPLO_IDS — e perderia justamente a metade mais frágil.
    expect(
      doSite.some(({ origem }) => origem.startsWith('post ')),
      'nenhum id extraído dos posts — o extrator de URL virou no-op',
    ).toBe(true);

    const publicados = new Set(catalogo().indicadores.map((i) => i.id));
    const faltando = doSite
      .filter(({ id }) => !publicados.has(id))
      .map(({ id, origem }) => `${id} (${origem})`);
    expect(faltando, 'ids citados pelo site que o catálogo não publica').toEqual([]);
  });
});

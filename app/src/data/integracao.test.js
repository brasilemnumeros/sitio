import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSeries } from './validate.js';

/**
 * Teste de INTEGRAÇÃO — roda contra o dado PUBLICADO no repo `dados/`, não contra fixture.
 *
 * A fatia 01 provou que o contrato está certo; este teste prova que o dado CUMPRE o
 * contrato. É a diferença que deixou 4 séries com mês repetido passarem por 121 testes
 * verdes (as fixtures eram nossas, o dado publicado não).
 *
 * Lê do disco, sem rede (§6).
 */

// `sitio/app/src/data/` → sobe 4 níveis → raiz do workspace → `dados/`.
const RAIZ_DADOS = fileURLToPath(new URL('../../../../dados', import.meta.url));
// `sitio/app/src/data/` → sobe 3 níveis → raiz do `sitio/` → `indicators.json`.
const REGISTRO = fileURLToPath(new URL('../../../indicators.json', import.meta.url));

/** O registro do site: quais arquivos são SÉRIES publicadas. */
function indicadoresRegistrados() {
  const { indicators } = JSON.parse(readFileSync(REGISTRO, 'utf8'));
  return indicators.map((ind) => {
    // ".../dados/<familia>/<arquivo>.json" → { familia, arquivo }
    const m = /\/([^/]+)\/([^/]+\.json)$/.exec(ind.datafile);
    if (!m) throw new Error(`datafile inesperado no registro: ${ind.datafile}`);
    return { id: ind.id, familia: m[1], arquivo: m[2] };
  });
}

/**
 * As séries reais em `dados/`. `governos/` NÃO entra: é o registro de mandatos (schema
 * próprio, chaves `mandatos`/`esferas`), não uma série — daí 15 JSONs virarem 13 séries.
 */
function arquivosDeSerie() {
  const familias = new Set(indicadoresRegistrados().map((i) => i.familia));
  const out = [];
  for (const fam of readdirSync(RAIZ_DADOS, { withFileTypes: true })) {
    if (!fam.isDirectory() || !familias.has(fam.name)) continue;
    for (const arquivo of readdirSync(join(RAIZ_DADOS, fam.name)).filter((n) => n.endsWith('.json'))) {
      out.push({ familia: fam.name, arquivo, caminho: join(RAIZ_DADOS, fam.name, arquivo) });
    }
  }
  return out;
}

describe('o contrato publicado em dados/ é o que o app valida (§6)', () => {
  it('os 13 arquivos reais passam em validateSeries, com id == nome do arquivo', () => {
    const arquivos = arquivosDeSerie();
    expect(arquivos).toHaveLength(13);
    for (const { arquivo, caminho } of arquivos) {
      const id = arquivo.replace(/\.json$/, '');
      const serie = validateSeries(JSON.parse(readFileSync(caminho, 'utf8')), { expectedId: id });
      expect(serie.data.length, `${arquivo} sem pontos`).toBeGreaterThan(0);
    }
  });

  it('nenhuma série tem mês repetido (o defeito da MVG-R/CAGED, corrigido)', () => {
    for (const { arquivo, caminho } of arquivosDeSerie()) {
      const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
      const meses = bruto.data.map((p) => p.date.slice(0, 7));
      expect(new Set(meses).size, `${arquivo} tem mês repetido`).toBe(meses.length);
    }
  });

  it('o registro do site e o dado em disco concordam: nenhuma série órfã ou faltando', () => {
    const noDisco = new Set(arquivosDeSerie().map((a) => `${a.familia}/${a.arquivo}`));
    const noRegistro = new Set(indicadoresRegistrados().map((i) => `${i.familia}/${i.arquivo}`));
    expect([...noDisco].sort()).toEqual([...noRegistro].sort());
  });
});

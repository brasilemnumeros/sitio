import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COBERTURA, deltaNoMandato, pontosEsperados } from './mandates.js';

const raiz = fileURLToPath(new URL('../../../../', import.meta.url)); // = brasilemnumeros/
const governos = JSON.parse(readFileSync(join(raiz, 'dados/governos/federal.json'), 'utf8'));
const MANDATOS = governos.mandatos.filter((m) => m.rotulo !== 'FHC I'); // 8 colunas da §7.3

const GRANULARIDADE = {
  'caged-total-mensal': 'monthly',
  'homicidios-anual': 'annual',
  'homicidios-armas-fogo-anual': 'annual',
  'proporcao-homicidios-armas-fogo-anual': 'annual',
  'igpm-acum-12m': 'monthly',
  'ipca-acum-12m': 'monthly',
  'mvgr-nominal': 'monthly',
  'mvgr-real': 'monthly',
  'pib-real-anual': 'annual',
  'populacao-total-anual': 'annual',
  'populacao-variacao-anual': 'annual',
  'selic-meta-acum-12m': 'monthly',
  'selic-over-acum-12m': 'monthly',
};

function serieReal(id) {
  for (const fam of readdirSync(join(raiz, 'dados'), { withFileTypes: true })) {
    if (!fam.isDirectory()) continue;
    const dir = join(raiz, 'dados', fam.name);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      if (f.replace(/\.json$/, '') !== id) continue;
      const bruto = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      // Adaptador temporário: as séries ainda publicam `rate` (migração = fatia 11).
      return {
        id,
        granularity: GRANULARIDADE[id],
        data: bruto.data.map((p) => ({ date: p.date, value: p.value ?? p.rate })),
      };
    }
  }
  throw new Error(`série ${id} não encontrada em dados/`);
}

const mandato = (rotulo) => MANDATOS.find((m) => m.rotulo === rotulo);

/**
 * A matriz do anexo da spec, transcrita (remedida em 2026-10-19, sobre os 13 JSONs já
 * deduplicados e com a data canônica). 0 = sem cobertura.
 *
 * A data passou a ser o dia 01 do mês de referência (`dados/canonicalizar-dados.py`). Efeito
 * medido: os pontos de maio/2016 das três séries que carimbavam no FIM do mês deixaram de cair
 * no mandato Temer (que começa em 2016-05-12) e passaram a cair na Dilma II — 32 → 31. É o mesmo
 * 31 que o `ipca-acum-12m` já tinha, porque ele já usava o dia 01.
 */
const ESPERADO = {
  'caged-total-mensal': [48, 48, 48, 48, 20, 31, 48, 32],
  'homicidios-anual': [4, 4, 4, 4, 2, 2, 4, 1],
  'homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 0],
  'proporcao-homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 0],
  'igpm-acum-12m': [48, 48, 48, 48, 20, 31, 48, 31],
  'ipca-acum-12m': [48, 48, 48, 48, 20, 31, 48, 30],
  'mvgr-nominal': [0, 34, 48, 48, 20, 31, 48, 31],
  'mvgr-real': [0, 34, 48, 48, 20, 31, 48, 31],
  'pib-real-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'populacao-total-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'populacao-variacao-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'selic-meta-acum-12m': [46, 48, 48, 48, 20, 31, 48, 34],
  'selic-over-acum-12m': [48, 48, 48, 48, 20, 31, 48, 34],
};

describe('medição da §7.3 sobre os dados reais', () => {
  it('reproduz a matriz de cobertura do anexo, célula a célula', () => {
    const obtido = {};
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      obtido[id] = MANDATOS.map((m) => deltaNoMandato(s, m).pontos);
    }
    expect(obtido).toEqual(ESPERADO);
  });

  it('resume a medição: 104 células, 4 sem cobertura, 1 ponto único', () => {
    const estados = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS) estados.push(deltaNoMandato(s, m).estado);
    }
    expect(estados).toHaveLength(104);
    expect(estados.filter((e) => e === COBERTURA.SEM)).toHaveLength(4);
    expect(estados.filter((e) => e === COBERTURA.PONTO_UNICO)).toHaveLength(1);
    expect(estados.filter((e) => e !== COBERTURA.SEM && e !== COBERTURA.PONTO_UNICO)).toHaveLength(99);
  });

  it('reproduz as 18 células "abaixo do esperado" da §7.3, com o mandato fechado', () => {
    // A régua é `pontos < esperados` para a granularidade da série — a mesma que a §7.3
    // publica. Comparar datas cruas marcaria 49 células (todo ponto mensal cai no dia 1º).
    const abaixo = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS.filter((x) => !x.emCurso)) {
        const pontos = deltaNoMandato(s, m).pontos;
        if (pontos < pontosEsperados(s.granularity, m)) abaixo.push(`${id}|${m.rotulo}`);
      }
    }
    expect(abaixo).toHaveLength(18);
    expect(abaixo.filter((c) => c.endsWith('|Temer'))).toHaveLength(13);
    expect(abaixo).toContain('mvgr-nominal|Lula I');
    expect(abaixo).toContain('selic-meta-acum-12m|FHC II');
  });

  it('MVG-R no Lula I: o período real usado é 03/2004–12/2006', () => {
    const c = deltaNoMandato(serieReal('mvgr-nominal'), mandato('Lula I'));
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(c.periodo.inicio.slice(0, 7)).toBe('2004-03');
    expect(c.periodo.fim.slice(0, 7)).toBe('2006-12');
  });
});

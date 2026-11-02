import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COBERTURA, deltaNoMandato, pontosEsperados } from './mandates.js';

const raiz = fileURLToPath(new URL('../../../../', import.meta.url)); // = brasilemnumeros/
// Os governos passaram a ser dado versionado no próprio `sitio` (2026-11-01), dentro do app.
const governos = JSON.parse(
  readFileSync(fileURLToPath(new URL('../data/governos/federal.json', import.meta.url)), 'utf8')
);
const MANDATOS = governos.mandatos.filter((m) => m.rotulo !== 'FHC I'); // 8 colunas da §7.3

const GRANULARIDADE = {
  'caged-total-mensal': 'mensal',
  'homicidios-anual': 'anual',
  'homicidios-armas-fogo-anual': 'anual',
  'proporcao-homicidios-armas-fogo-anual': 'anual',
  'igpm-acum-12m': 'mensal',
  'ipca-acum-12m': 'mensal',
  'mvgr-nominal': 'mensal',
  'mvgr-real': 'mensal',
  'pib-real-anual': 'anual',
  'populacao-total-anual': 'anual',
  'populacao-variacao-anual': 'anual',
  'selic-meta': 'mensal',
  'selic-over-acum-12m': 'mensal',
};

function serieReal(id) {
  // As séries moraram em `dados/<família>/` até 2026-11-01, quando o refactor as moveu para
  // `dados/indicadores/<família>/` (commit 2f367b). Este helper lê o disco direto, então o
  // caminho tem de acompanhar — senão o teste morre com "série não encontrada".
  for (const fam of readdirSync(join(raiz, 'dados', 'indicadores'), { withFileTypes: true })) {
    if (!fam.isDirectory()) continue;
    const dir = join(raiz, 'dados', 'indicadores', fam.name);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      if (f.replace(/\.json$/, '') !== id) continue;
      const bruto = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      // Schema 2: cada ponto tem só `date` e `value` (o `rate` de convivência saiu).
      return {
        id,
        granularidade: GRANULARIDADE[id],
        dados: bruto.dados.map((p) => ({ data: p.data, valor: p.valor })),
      };
    }
  }
  throw new Error(`série ${id} não encontrada em dados/`);
}

const mandato = (rotulo) => MANDATOS.find((m) => m.rotulo === rotulo);

/**
 * A matriz do anexo da spec, transcrita (remedida em 2026-10-28). 0 = sem cobertura.
 *
 * Duas mudanças de dado entraram juntas nesta medição:
 * - **Datas canônicas:** Igpm/Selic passaram a carimbar o dia 01 do mês de referência (a nota de
 *   2026-10-19 da spec dizia que já tinham, mas a mudança nunca foi aplicada). Efeito: os pontos
 *   de maio/2016 deixaram de cair no Temer (que começa em 2016-05-12) e passaram para a Dilma II —
 *   Temer 32 → 31, o mesmo 31 do `ipca-acum-12m`, que já usava o dia 01.
 * - **Fim do exercício da Dilma II:** 2016-08-31 (cassação) → 2016-05-11 (último dia de exercício),
 *   como manda a §7.3.1. Efeito: a coluna Dilma II das séries mensais cai de 20 para 17.
 * - **IGP-M refeito (2026-11-01):** a série passou a compor as variações mensais em vez de
 *   somá-las e ganhou o trecho que a fonte já tinha — 349 → 382 pontos, de
 *   `1996-07`–`2025-07` para `1995-01`–`2026-10`. Efeito: a última coluna (Lula III) sobe de
 *   31 para 46 (2023-01 a 2026-10).
 * - **As outras seis famílias refeitas (2026-11-01):** mesmos efeitos de cobertura, agora que
 *   cada série termina no último período fechado da fonte:
 *   `caged` e `mvgr` ganham 2025-08..2026-08 (Lula III 32/31 → 44); `pib` ganha 2025 (2 → 3);
 *   `homicidios` ganha 2024 no total (1 → 2) e 2023 em armas e proporção (0 → 1, o que tira as
 *   duas de "sem cobertura" e as transforma em ponto único);
 *   `populacao` passa a começar em 2000 (FHC II: total 4 → 3, variação 4 → 2) e vai até 2026
 *   (Lula III 2 → 4, nas duas);
 *   `selic-meta` (que publicava um acumulado construído e voltou a ser nível, começando em
 *   1999-03) vai até 2026-10 (Lula III 34 → 46); `selic-over` ganha o mesmo fim.
 *   Com isso o resumo da §7.3 vai a 4 → 2 células sem cobertura, 1 → 2 pontos únicos e
 *   18 → 20 células abaixo do esperado (as duas séries de população no FHC II, que agora
 *   começam em 2000/2001).
 */
const ESPERADO = {
  'caged-total-mensal': [48, 48, 48, 48, 17, 31, 48, 44],
  'homicidios-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 1],
  'proporcao-homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 1],
  'igpm-acum-12m': [48, 48, 48, 48, 17, 31, 48, 46],
  'ipca-acum-12m': [48, 48, 48, 48, 17, 31, 48, 45],
  'mvgr-nominal': [0, 34, 48, 48, 17, 31, 48, 44],
  'mvgr-real': [0, 34, 48, 48, 17, 31, 48, 44],
  'pib-real-anual': [4, 4, 4, 4, 2, 2, 4, 3],
  'populacao-total-anual': [3, 4, 4, 4, 2, 2, 4, 4],
  'populacao-variacao-anual': [2, 4, 4, 4, 2, 2, 4, 4],
  'selic-meta': [46, 48, 48, 48, 17, 31, 48, 46],
  'selic-over-acum-12m': [48, 48, 48, 48, 17, 31, 48, 46],
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

  it('resume a medição: 104 células, 2 sem cobertura, 2 pontos únicos', () => {
    const estados = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS) estados.push(deltaNoMandato(s, m).estado);
    }
    expect(estados).toHaveLength(104);
    expect(estados.filter((e) => e === COBERTURA.SEM)).toHaveLength(2);
    expect(estados.filter((e) => e === COBERTURA.PONTO_UNICO)).toHaveLength(2);
    expect(estados.filter((e) => e !== COBERTURA.SEM && e !== COBERTURA.PONTO_UNICO)).toHaveLength(100);
  });

  it('reproduz as 20 células "abaixo do esperado" da §7.3, com o mandato fechado', () => {
    // A régua é `pontos < esperados` para a granularidade da série — a mesma que a §7.3
    // publica. Comparar datas cruas marcaria 49 células (todo ponto mensal cai no dia 1º).
    const abaixo = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS.filter((x) => !x.emCurso)) {
        const pontos = deltaNoMandato(s, m).pontos;
        if (pontos < pontosEsperados(s.granularidade, m)) abaixo.push(`${id}|${m.rotulo}`);
      }
    }
    expect(abaixo).toHaveLength(20);
    expect(abaixo.filter((c) => c.endsWith('|Temer'))).toHaveLength(13);
    expect(abaixo).toContain('mvgr-nominal|Lula I');
    expect(abaixo).toContain('selic-meta|FHC II');
  });

  it('MVG-R no Lula I: o período real usado é 03/2004–12/2006', () => {
    const c = deltaNoMandato(serieReal('mvgr-nominal'), mandato('Lula I'));
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(c.periodo.inicio.slice(0, 7)).toBe('2004-03');
    expect(c.periodo.fim.slice(0, 7)).toBe('2006-12');
  });
});

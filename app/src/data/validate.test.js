import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SchemaError, validateSeries, validateUnit } from './validate.js';

// Pontos reais medidos (dados/indicadores/selic/selic-meta-acum-12m.json, 2026-10-14).
const serieValida = {
  schema: 1,
  id: 'selic-meta-acum-12m',
  unit: { type: 'percentage', symbol: '%', decimals: 2 },
  eixo: 'percentual',
  medida: 'acumulado-12m',
  granularity: 'monthly',
  source: 'Banco Central do Brasil',
  data: [
    { date: '1999-03-01', value: 44.22222222222222 },
    { date: '1999-04-01', value: 36.85 },
  ],
};

describe('validateSeries', () => {
  it('aceita uma série canônica e normaliza os pontos', () => {
    const s = validateSeries(serieValida, { expectedId: 'selic-meta-acum-12m' });
    expect(s.id).toBe('selic-meta-acum-12m');
    expect(s.data).toEqual([
      { date: '1999-03-01', value: 44.22222222222222 },
      { date: '1999-04-01', value: 36.85 },
    ]);
    expect(s.schema).toBe(1);
    expect(s.eixo).toBe('percentual');
    expect(s.medida).toBe('acumulado-12m');
  });

  it('recusa em voz alta uma versão desconhecida (§6, §9.3)', () => {
    expect(() => validateSeries({ ...serieValida, schema: 2 })).toThrow(SchemaError);
    expect(() => validateSeries({ ...serieValida, schema: 2 })).toThrow(/C1/);
  });

  it('recusa quando o id não é o do arquivo (C2)', () => {
    expect(() => validateSeries(serieValida, { expectedId: 'ipca-acum-12m' })).toThrow(/C2/);
  });

  it('recusa ponto sem "value" numérico (C10)', () => {
    const quebrada = { ...serieValida, data: [{ date: '1999-03-01' }] };
    expect(() => validateSeries(quebrada)).toThrow(/C10/);
  });

  it('recusa data fora do formato ou do calendário (C9)', () => {
    expect(() =>
      validateSeries({ ...serieValida, data: [{ date: '31/03/1999', value: 1 }] }),
    ).toThrow(/C9/);
    expect(() =>
      validateSeries({ ...serieValida, data: [{ date: '2019-02-31', value: 1 }] }),
    ).toThrow(/C9/);
  });

  it('recusa granularidade desconhecida (C6)', () => {
    expect(() => validateSeries({ ...serieValida, granularity: 'semanal' })).toThrow(/C6/);
  });

  it('recusa "rate": no schema 2 o ponto tem exatamente date e value (C8.1)', () => {
    const comRate = {
      ...serieValida,
      data: [{ date: '1999-03-01', rate: 44.22, value: 44.22 }],
    };
    expect(() => validateSeries(comRate)).toThrow(/C8\.1/);
  });

  it('recusa período repetido (C11) e ordem não ascendente (C12)', () => {
    expect(() =>
      validateSeries({
        ...serieValida,
        data: [
          { date: '1999-03-01', value: 1 },
          { date: '1999-03-15', value: 2 },
        ],
      }),
    ).toThrow(/C11/);
    expect(() =>
      validateSeries({
        ...serieValida,
        data: [
          { date: '1999-04-01', value: 1 },
          { date: '1999-03-01', value: 2 },
        ],
      }),
    ).toThrow(/C12/);
  });

  it('recusa eixo incompatível com a unidade (C4)', () => {
    expect(() => validateSeries({ ...serieValida, eixo: 'reais' })).toThrow(/C4/);
  });

  it('aceita unidade com locale e recusa locale fora de BCP 47 (C3.1)', () => {
    const moeda = {
      ...serieValida,
      unit: { type: 'currency', symbol: 'R$', decimals: 0, locale: 'pt-BR' },
      eixo: 'reais',
      medida: 'nivel',
    };
    expect(validateSeries(moeda).unit.locale).toBe('pt-BR');
    const ruim = { ...moeda, unit: { ...moeda.unit, locale: 'portugues' } };
    expect(() => validateSeries(ruim)).toThrow(/C3\.1/);
  });
});

describe('validateUnit', () => {
  it('exige symbol não vazio e decimals inteiro ≥ 0 (C3)', () => {
    expect(() => validateUnit({ type: 'number', symbol: '', decimals: 0 })).toThrow(/C3/);
    expect(() => validateUnit({ type: 'number', symbol: 'x', decimals: 1.5 })).toThrow(/C3/);
  });
});

/**
 * O CORPUS DE CONFORMIDADE — a fonte executável do contrato
 * (`sitio/docs/contrato-de-indicadores.md`). O validador de Python (`dados/scripts/validar.py`)
 * roda os MESMOS arquivos: é assim que os dois deixam de divergir.
 */
describe('corpus de conformidade (dados/tests/contrato)', () => {
  const raiz = fileURLToPath(new URL('../../../../dados/tests/contrato', import.meta.url));
  const ler = (dir) =>
    readdirSync(join(raiz, dir))
      .filter((n) => n.endsWith('.json'))
      .map((nome) => ({ nome, id: nome.replace(/\.json$/, '') }));

  it('todo caso VÁLIDO passa', () => {
    const casos = ler('validos');
    expect(casos.length).toBeGreaterThan(0);
    for (const { nome, id } of casos) {
      const bruto = JSON.parse(readFileSync(join(raiz, 'validos', nome), 'utf8'));
      expect(() => validateSeries(bruto, { expectedId: id }), nome).not.toThrow();
    }
  });

  it('todo caso INVÁLIDO falha com o código da regra que o nome do arquivo declara', () => {
    const casos = ler('invalidos');
    expect(casos.length).toBeGreaterThan(0);
    for (const { nome, id } of casos) {
      const bruto = JSON.parse(readFileSync(join(raiz, 'invalidos', nome), 'utf8'));
      const codigo = id.split('-')[0];
      // Sem `expectedId`: no corpus o nome do arquivo carrega o CÓDIGO, não o id da série.
      expect(() => validateSeries(bruto), nome).toThrow(
        new RegExp(`^${codigo.replace('.', '\\.')}:`),
      );
    }
  });
});

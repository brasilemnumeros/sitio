import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { SchemaError, validateSeries, validateUnit } from './validate.js';
import { raizDados } from './raiz-dados.js';

// Pontos reais medidos (dados/indicadores/selic/selic-meta.json, 2026-10-14).
const serieValida = {
  versao: 1,
  id: 'selic-meta',
  unidade: { tipo: 'percentual', simbolo: '%', casas: 2 },
  eixo: 'percentual',
  medida: 'acumulado-12m',
  granularidade: 'mensal',
  fonte: 'Banco Central do Brasil',
  dados: [
    { data: '1999-03-01', valor: 44.22222222222222 },
    { data: '1999-04-01', valor: 36.85 },
  ],
};

describe('validateSeries', () => {
  it('aceita uma série canônica e normaliza os pontos', () => {
    const s = validateSeries(serieValida, { expectedId: 'selic-meta' });
    expect(s.id).toBe('selic-meta');
    expect(s.dados).toEqual([
      { data: '1999-03-01', valor: 44.22222222222222 },
      { data: '1999-04-01', valor: 36.85 },
    ]);
    expect(s.versao).toBe(1);
    expect(s.eixo).toBe('percentual');
    expect(s.medida).toBe('acumulado-12m');
  });

  it('recusa em voz alta uma versão desconhecida (§6, §9.3)', () => {
    expect(() => validateSeries({ ...serieValida, versao: 2 })).toThrow(SchemaError);
    expect(() => validateSeries({ ...serieValida, versao: 2 })).toThrow(/C1/);
  });

  it('recusa quando o id não é o do arquivo (C2)', () => {
    expect(() => validateSeries(serieValida, { expectedId: 'ipca-acum-12m' })).toThrow(/C2/);
  });

  it('recusa ponto sem "valor" numérico (C10)', () => {
    const quebrada = { ...serieValida, dados: [{ data: '1999-03-01' }] };
    expect(() => validateSeries(quebrada)).toThrow(/C10/);
  });

  it('recusa data fora do formato ou do calendário (C9)', () => {
    expect(() =>
      validateSeries({ ...serieValida, dados: [{ data: '31/03/1999', valor: 1 }] }),
    ).toThrow(/C9/);
    expect(() =>
      validateSeries({ ...serieValida, dados: [{ data: '2019-02-31', valor: 1 }] }),
    ).toThrow(/C9/);
  });

  it('recusa granularidade desconhecida (C6)', () => {
    expect(() => validateSeries({ ...serieValida, granularidade: 'semanal' })).toThrow(/C6/);
  });

  it('recusa campo extra no ponto: ele tem exatamente data e valor (C8.1)', () => {
    const comExtra = {
      ...serieValida,
      dados: [{ data: '1999-03-01', valor: 44.22, unidade: 'x' }],
    };
    expect(() => validateSeries(comExtra)).toThrow(/C8\.1/);
  });

  it('recusa período repetido (C11) e ordem não ascendente (C12)', () => {
    expect(() =>
      validateSeries({
        ...serieValida,
        dados: [
          { data: '1999-03-01', valor: 1 },
          { data: '1999-03-15', valor: 2 },
        ],
      }),
    ).toThrow(/C11/);
    expect(() =>
      validateSeries({
        ...serieValida,
        dados: [
          { data: '1999-04-01', valor: 1 },
          { data: '1999-03-01', valor: 2 },
        ],
      }),
    ).toThrow(/C12/);
  });

  it('recusa eixo incompatível com a unidade (C4)', () => {
    expect(() => validateSeries({ ...serieValida, eixo: 'reais' })).toThrow(/C4/);
  });

  it('aceita unidade com idioma e recusa idioma fora de BCP 47 (C3.1)', () => {
    const moeda = {
      ...serieValida,
      unidade: { tipo: 'moeda', simbolo: 'R$', casas: 0, idioma: 'pt-BR' },
      eixo: 'reais',
      medida: 'nivel',
    };
    expect(validateSeries(moeda).unidade.idioma).toBe('pt-BR');
    const ruim = { ...moeda, unidade: { ...moeda.unidade, idioma: 'portugues' } };
    expect(() => validateSeries(ruim)).toThrow(/C3\.1/);
  });
});

describe('validateUnit', () => {
  it('exige simbolo não vazio e casas inteiro ≥ 0 (C3)', () => {
    expect(() => validateUnit({ tipo: 'numero', simbolo: '', casas: 0 })).toThrow(/C3/);
    expect(() => validateUnit({ tipo: 'numero', simbolo: 'x', casas: 1.5 })).toThrow(/C3/);
  });
});

/**
 * O CORPUS DE CONFORMIDADE — a fonte executável do contrato
 * (`sitio/docs/contrato-de-indicadores.md`). O validador de Python (`dados/scripts/validar.py`)
 * roda os MESMOS arquivos: é assim que os dois deixam de divergir.
 */
describe('corpus de conformidade (dados/tests/contrato)', () => {
  // A raiz vem de `raizDados()` (`DADOS_DIR` no CI), nunca de um `../../../../dados` fixo.
  const raiz = join(raizDados(), 'tests', 'contrato');
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

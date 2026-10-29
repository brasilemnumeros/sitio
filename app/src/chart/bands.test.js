import { faixasVisiveis, tomDaFaixa, posicaoNaGrade, emSegundos, criarPrimitivaDeFaixas } from './bands.js';
import { PALETA_PADRAO } from '../domain/color.js';

const M = [
  { id: 'a', inicio: '1999-01-01', fim: '2002-12-31' },
  { id: 'b', inicio: '2003-01-01', fim: '2006-12-31' },
  { id: 'c', inicio: '2007-01-01', fim: null, emCurso: true },
];

describe('faixasVisiveis', () => {
  it('devolve só as faixas que TOCAM a janela', () => {
    expect(faixasVisiveis(M, { from: '2003-06-01', to: '2007-06-01' }).map((m) => m.id))
      .toEqual(['b', 'c']);
  });

  it('a faixa que começa antes e termina dentro conta como visível', () => {
    expect(faixasVisiveis(M, { from: '2002-06-01', to: '2003-06-01' }).map((m) => m.id))
      .toEqual(['a', 'b']);
  });

  it('janela sem fim (mandato em curso) vai até o infinito', () => {
    expect(faixasVisiveis(M, { from: '2008-01-01', to: null }).map((m) => m.id)).toEqual(['c']);
  });

  it('sem janela, devolve todas — é o estado inicial', () => {
    expect(faixasVisiveis(M, { from: null, to: null })).toHaveLength(3);
  });

  it('janela que não toca ninguém devolve vazio, não tudo', () => {
    expect(faixasVisiveis(M, { from: '1990-01-01', to: '1991-01-01' })).toEqual([]);
  });

  it('o limite é INCLUSIVO nas DUAS pontas — `>=` não pode virar `>`', () => {
    // Sem este caso, trocar `>=` por `>` passa despercebido: os fixtures acima têm folga e nunca
    // tocam o limite exato. Aqui a janela começa EXATAMENTE quando `x` termina.
    const J = [
      { id: 'x', inicio: '2000-01-01', fim: '2004-12-31' },
      { id: 'y', inicio: '2005-01-01', fim: '2009-12-31' },
    ];
    expect(faixasVisiveis(J, { from: '2004-12-31', to: '2005-01-01' }).map((m) => m.id))
      .toEqual(['x', 'y']);
  });
});

describe('posicaoNaGrade', () => {
  // A faixa é CONTEXTO e não pode depender da granularidade da série: com dado anual, encaixar
  // as pontas no ponto existente jogava o início do Temer (12/05/2016) para 2017-01-01 e o fim
  // da Dilma II (31/08/2016) para 2016-01-15 — um buraco de ~1 ano que não existe no preset de
  // Juros (mensal). Medido em 2026-10-28. Por isso a posição é FRACIONÁRIA.
  const GRADE = ['1995-01-01', '1995-01-15', '1996-01-01', '1996-01-15'].map(emSegundos);

  it('data que É ponto da grade volta no índice exato', () => {
    expect(posicaoNaGrade(GRADE, '1996-01-01')).toBe(2);
  });

  it('data ENTRE pontos vira fração do intervalo — o calendário manda, não o carimbo', () => {
    const anual = ['2016-01-01', '2017-01-01'].map(emSegundos);
    // 2016 é bissexto: 12/05 é o dia 132 de 366.
    expect(posicaoNaGrade(anual, '2016-05-12')).toBeCloseTo(132 / 366, 6);
  });

  it('antes do primeiro ponto extrapola para a ESQUERDA (posição negativa)', () => {
    expect(posicaoNaGrade(GRADE, '1994-12-31')).toBeCloseTo(-1 / 14, 6);
  });

  it('depois do último ponto extrapola para a DIREITA', () => {
    expect(posicaoNaGrade(GRADE, '1996-01-22')).toBeCloseTo(3.5, 6);
  });

  it('grade de UM ponto só devolve 0 — não há intervalo para extrapolar', () => {
    expect(posicaoNaGrade([emSegundos('2000-01-01')], '2010-01-01')).toBe(0);
  });

  it('sem grade (nenhuma série na tela) devolve null', () => {
    expect(posicaoNaGrade([], '1999-01-01')).toBeNull();
  });
});

describe('tomDaFaixa', () => {
  it('alterna entre vizinhos e usa só DOIS tons (§2)', () => {
    expect(tomDaFaixa(0)).not.toBe(tomDaFaixa(1));
    expect(tomDaFaixa(0)).toBe(tomDaFaixa(2));
  });

  it('os tons são neutros — nenhuma cor de partido (§2, §7.3.4)', () => {
    // A regra é a AUSÊNCIA: o tom não pode coincidir com nenhuma cor da paleta das séries.
    expect(PALETA_PADRAO).not.toContain(tomDaFaixa(0));
    expect(PALETA_PADRAO).not.toContain(tomDaFaixa(1));
  });
});

describe('faixasPx — a geometria que o minimapa usa para o CLIQUE', () => {
  // O minimapa não sabe converter data em pixel (é a lib que sabe): ele pergunta à primitiva
  // "onde estão as faixas AGORA" e responde pelo cursor/clique. Se as duas geometrias divergirem,
  // o clique escolhe o governo da faixa VIZINHA — por isso ela sai do MESMO recálculo do desenho.
  // ⚠ `logicalToCoordinate` e `timeToCoordinate` falam unidades DIFERENTES: a posição na grade é
  // um ÍNDICE (a faixa é interpolada entre barras — ver `posicaoNaGrade`), e o índice →
  // coordenada é da lib. O falso abaixo é essa régua: 10px por índice.
  const chartFalso = (indexParaPx = (i) => i * 10) => {
    const ts = {
      timeToCoordinate: () => null,
      logicalToCoordinate: indexParaPx,
    };
    return { chart: { timeScale: () => ts }, requestUpdate: () => {} };
  };

  it('devolve x1/x2 na escala da lib, por mandato', () => {
    const base = emSegundos('2000-01-01');
    const DIA = 86400;
    // `+ 1` não é decoração: sem ele o último tempo da grade seria "expansível" e a ponta direita
    // cairia num ponto que não existe — o cálculo descarta (correctamente) e o teste mediria a
    // si mesmo. Com ele, TODA data do teste é ponto do dado e a expectativa é exata.
    const tempos = Array.from({ length: 11 }, (_, d) => base + d * DIA);
    const prim = criarPrimitivaDeFaixas(
      [
        { id: 'a', rotulo: 'A', partido: 'P', inicio: '2000-01-02', fim: '2000-01-04' },
        { id: 'b', rotulo: 'B', partido: 'P', inicio: '2000-01-05', fim: '2000-01-08' },
      ],
      { temposDoDado: () => tempos },
    );
    const { chart, requestUpdate } = chartFalso();
    prim.attached({ chart, requestUpdate });
    const f = prim.faixasPx();
    expect(f.map((x) => [x.id, x.x1, x.x2])).toEqual([
      ['a', 10, 30],
      ['b', 40, 70],
    ]);
  });

  it('sem mandato nenhum devolve lista vazia — não `undefined`', () => {
    const prim = criarPrimitivaDeFaixas([], {});
    const { chart, requestUpdate } = chartFalso({});
    prim.attached({ chart, requestUpdate });
    expect(prim.faixasPx()).toEqual([]);
  });
});

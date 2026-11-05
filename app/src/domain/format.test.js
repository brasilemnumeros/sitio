import { describe, it, expect } from 'vitest';
import {
  valorNaUnidade,
  valorCompacto,
  rotuloDaCruz,
  rotuloDaGranularidade,
  rotuloDaUnidade,
} from './format.js';

describe('valorNaUnidade', () => {
  it('usa as casas decimais e o símbolo da unidade', () => {
    expect(valorNaUnidade(44.2222, { tipo: 'percentual', simbolo: '%', casas: 2 })).toBe('44,22%');
    expect(valorNaUnidade(50337190, { tipo: 'numero', simbolo: 'hab.', casas: 0 })).toBe(
      '50.337.190 hab.',
    );
  });
  it('moeda é PREFIXO (R$ 155.000), não sufixo', () => {
    expect(valorNaUnidade(155000, { tipo: 'moeda', simbolo: 'R$', casas: 0 })).toBe(
      'R$ 155.000',
    );
  });
  it('formata em pt-BR', () => {
    expect(valorNaUnidade(-3.55, { tipo: 'percentual', simbolo: '%', casas: 2 })).toBe('-3,55%');
  });
});

describe('valorCompacto', () => {
  it('compacta a partir de um milhão, com o símbolo na posição da unidade', () => {
    // ⚠ o `Intl` compacto usa ESPAÇO NÃO SEPARÁVEL entre número e sufixo (`216\u00A0mi`) — é o
    //    comportamento certo (não quebra linha no meio do rótulo), e o teste tem de saber disso.
    expect(valorCompacto(216_000_000, { tipo: 'numero', simbolo: '', casas: 0 })).toBe('216\u00A0mi');
    expect(valorCompacto(213_421_037, { tipo: 'numero', simbolo: 'hab.', casas: 0 })).toBe(
      '213,4\u00A0mi hab.',
    );
    expect(valorCompacto(1_200_000, { tipo: 'moeda', simbolo: 'R$', casas: 0 })).toBe(
      'R$ 1,2\u00A0mi',
    );
  });

  it('abaixo de um milhão mantém o valor exato — compactar milhar não ganha largura', () => {
    expect(valorCompacto(320_000, { tipo: 'moeda', simbolo: 'R$', casas: 0 })).toBe(
      'R$ 320.000',
    );
    expect(valorCompacto(9.6222, { tipo: 'percentual', simbolo: '%', casas: 2 })).toBe('9,62%');
  });
});

describe('rotuloDaUnidade — a ficha lê o EIXO, não só o tipo', () => {
  // O eixo é a comparabilidade declarada (C4); é ele que distingue duas séries de `tipo: numero`.
  // Sem isso, IDEB e homicídios apareciam os dois como "contagem" na ficha.
  it('traduz os eixos de taxa', () => {
    expect(rotuloDaUnidade('por-mil', 'numero')).toBe('taxa por mil');
    expect(rotuloDaUnidade('por-100-mil', 'numero')).toBe('taxa por 100 mil');
  });

  it('mantém os rótulos que já existiam', () => {
    expect(rotuloDaUnidade('contagem', 'numero')).toBe('contagem');
    expect(rotuloDaUnidade('percentual', 'percentual')).toBe('percentual');
    expect(rotuloDaUnidade('reais', 'moeda')).toBe('moeda');
  });

  it('sem eixo conhecido, cai no tipo da unidade (nunca em "undefined")', () => {
    expect(rotuloDaUnidade(undefined, 'numero')).toBe('numero');
    expect(rotuloDaUnidade('desconhecido', 'percentual')).toBe('percentual');
  });
});

describe('rotuloDaGranularidade', () => {
  it('cobre as quatro granularidades do contrato, incluindo a bienal', () => {
    expect(rotuloDaGranularidade('diaria')).toBe('diária');
    expect(rotuloDaGranularidade('mensal')).toBe('mensal');
    expect(rotuloDaGranularidade('anual')).toBe('anual');
    expect(rotuloDaGranularidade('bienal')).toBe('bienal');
  });

  it('valor desconhecido volta como veio, não como "undefined"', () => {
    expect(rotuloDaGranularidade('trimestral')).toBe('trimestral');
  });
});

describe('rotuloDaCruz', () => {
  const emSegundos = (ano, mes, dia) => Date.UTC(ano, mes - 1, dia) / 1000;

  it('escreve o mês em PORTUGUÊS, no mesmo formato curto da lib', () => {
    // O padrão da lib é `dd MMM 'yy` com o mês em inglês ("01 May '13"). O formato é o mesmo;
    // o mês é que muda — é o que o produto exibe ao lado da caixa do cursor.
    expect(rotuloDaCruz(emSegundos(2013, 5, 1))).toBe("01 mai '13");
    expect(rotuloDaCruz(emSegundos(1995, 1, 1))).toBe("01 jan '95");
  });

  it('lê em UTC — fuso local deslocaria o dia', () => {
    expect(rotuloDaCruz(emSegundos(2000, 12, 31))).toBe("31 dez '00");
  });

  it('entrada inválida devolve vazio, não "NaN"', () => {
    expect(rotuloDaCruz(NaN)).toBe('');
    expect(rotuloDaCruz(undefined)).toBe('');
  });
});

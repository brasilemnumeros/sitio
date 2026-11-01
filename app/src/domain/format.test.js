import { describe, it, expect } from 'vitest';
import { valorNaUnidade, valorCompacto } from './format.js';

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

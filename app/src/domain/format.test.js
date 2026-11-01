import { describe, it, expect } from 'vitest';
import { valorNaUnidade } from './format.js';

describe('valorNaUnidade', () => {
  it('usa as casas decimais e o símbolo da unidade', () => {
    expect(valorNaUnidade(44.2222, { type: 'percentage', symbol: '%', decimals: 2 })).toBe('44,22%');
    expect(valorNaUnidade(50337190, { type: 'number', symbol: 'hab.', decimals: 0 })).toBe(
      '50.337.190 hab.',
    );
  });
  it('moeda é PREFIXO (R$ 155.000), não sufixo', () => {
    expect(valorNaUnidade(155000, { type: 'currency', symbol: 'R$', decimals: 0 })).toBe(
      'R$ 155.000',
    );
  });
  it('formata em pt-BR', () => {
    expect(valorNaUnidade(-3.55, { type: 'percentage', symbol: '%', decimals: 2 })).toBe('-3,55%');
  });
});

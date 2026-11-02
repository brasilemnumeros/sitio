import { describe, it, expect } from 'vitest';
import { EXEMPLO_IDS, exemploDisponivel } from './exemplo.js';

describe('exemploDisponivel', () => {
  it('libera o atalho quando os dois ids do exemplo estão no catálogo', () => {
    const catalogo = EXEMPLO_IDS.map((id) => ({ id }));
    expect(exemploDisponivel(catalogo)).toBe(true);
  });

  it('libera com um dos ids: o clique ainda adiciona alguma série', () => {
    expect(exemploDisponivel([{ id: EXEMPLO_IDS[0] }])).toBe(true);
  });

  it('bloqueia com catálogo vazio — o clique não teria o que adicionar', () => {
    expect(exemploDisponivel([])).toBe(false);
  });

  it('bloqueia quando o catálogo não publica nenhum dos ids do exemplo', () => {
    expect(exemploDisponivel([{ id: 'pib-total' }, { id: 'ipca-mensal' }])).toBe(false);
  });
});

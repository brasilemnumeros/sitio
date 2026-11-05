import { describe, expect, it } from 'vitest';
import { LIMIAR_FECHAMENTO, deveFecharAoArrastar } from './gesto.js';

describe('deveFecharAoArrastar', () => {
  it('só fecha quando passa do limiar de 80px', () => {
    expect(LIMIAR_FECHAMENTO).toBe(80);
    expect(deveFecharAoArrastar(80)).toBe(false);
    expect(deveFecharAoArrastar(81)).toBe(true);
    expect(deveFecharAoArrastar(-200)).toBe(false);
  });
});

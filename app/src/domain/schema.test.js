import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION } from './schema.js';

describe('contrato de schema', () => {
  it('declara a versão 1 — o único schema que este app entende (§6)', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

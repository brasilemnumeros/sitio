import { describe, it, expect, vi, afterEach } from 'vitest';
import { registrarEvento } from './analytics.js';

afterEach(() => {
  delete globalThis.window;
});

describe('registrarEvento', () => {
  it('descarta sem gtag e não cria fila', () => {
    globalThis.window = {};
    expect(registrarEvento('report_opened', { series_count: 1 })).toBe(false);
    expect(globalThis.window.dataLayer).toBeUndefined();
  });

  it('emite pelo gtag quando ele existe', () => {
    const gtag = vi.fn();
    globalThis.window = { gtag };
    expect(registrarEvento('report_opened', { series_count: 2 })).toBe(true);
    expect(gtag).toHaveBeenCalledWith('event', 'report_opened', { series_count: 2 });
  });
});

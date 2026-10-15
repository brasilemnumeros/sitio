### Tarefa 1: Amplitude e razão (`seriesSpan`, `amplitudeRatio`)

**Arquivos:**
- Criar: `sitio/app/src/domain/scales.js`
- Teste: `sitio/app/src/domain/scales.test.js`

**Interfaces:**
- Consome: o tipo `Series` de `src/data/validate.js` (fatia 01) — só lê `series.data`.
- Produz:
  - `seriesSpan(series) -> number` — `max(value) − min(value)`, sobre **todos** os
    pontos; `0` para série vazia ou de um ponto.
  - `amplitudeRatio(a, b) -> number` — `spanMaior ÷ spanMenor`; ambos `0` → `1`;
    apenas um `0` → `Infinity`.

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/domain/scales.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { seriesSpan, amplitudeRatio } from './scales.js';

/** Série de fixture: só as amplitudes importam (spec §5, anexo). */
function serie(id, min, max) {
  return { id, data: [{ date: '2000-01-01', value: min }, { date: '2001-01-01', value: max }] };
}

describe('seriesSpan', () => {
  it('mede max − min sobre a série inteira', () => {
    expect(seriesSpan(serie('x', 2.0, 44.22))).toBeCloseTo(42.22, 6);
  });

  it('é 0 numa série de um ponto só', () => {
    expect(seriesSpan({ id: 'x', data: [{ date: '2000-01-01', value: 5 }] })).toBe(0);
  });
});

describe('amplitudeRatio', () => {
  it('devolve a razão entre a maior e a menor amplitude', () => {
    // selic-meta (42,22) × igpm (39,97) = 1,056 — par mais compatível medido (§5)
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);
    expect(amplitudeRatio(selic, igpm)).toBeCloseTo(1.056, 2);
  });

  // ⚠️ Este par mede 1.192.259× — é PATOLÓGICO sob o limiar de 1.000.000 (R19). Serve para
  // travar a razão, NUNCA para exemplificar `'avisa'`.
  it('mede o par patológico populacao-total × selic-meta (§5)', () => {
    // Amplitudes do anexo, arredondadas a 2 casas: 50.337.190 ÷ 42,22 = 1.192.259,4.
    // A §5 publica **1.192.196** porque mediu sobre os valores CRUS, sem arredondar as
    // amplitudes — a diferença está na 4ª casa significativa. O teste trava o que as
    // fixtures desta suíte realmente produzem, não o número publicado.
    const pop = serie('populacao-total-anual', 154524335, 204861525);
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    expect(amplitudeRatio(pop, selic)).toBeCloseTo(1192259, 0);
  });

  it('é simétrica', () => {
    const a = serie('a', 0, 10);
    const b = serie('b', 0, 500);
    expect(amplitudeRatio(a, b)).toBeCloseTo(amplitudeRatio(b, a), 9);
  });

  it('duas séries constantes convivem (razão 1)', () => {
    expect(amplitudeRatio({ id: 'a', data: [] }, { id: 'b', data: [] })).toBe(1);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./scales.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/domain/scales.js`:

```js
/**
 * Contas de escala e comparabilidade (spec §5). Camada 3: puro, sem Svelte, sem DOM,
 * sem rede.
 */

/** @typedef {import('../data/validate.js').Series} Series */

/**
 * Amplitude da série inteira: max − min. Nunca sobre a janela visível (§5).
 * @param {Series} series
 * @returns {number}
 */
export function seriesSpan(series) {
  const values = series.data.map((p) => p.value);
  if (values.length < 2) return 0;
  return Math.max(...values) - Math.min(...values);
}

/**
 * Razão entre a maior e a menor amplitude. É a régua da comparabilidade (§5) —
 * medida por magnitude, nunca por `unit.type`.
 * @param {Series} a
 * @param {Series} b
 * @returns {number}
 */
export function amplitudeRatio(a, b) {
  const sa = seriesSpan(a);
  const sb = seriesSpan(b);
  const maior = Math.max(sa, sb);
  const menor = Math.min(sa, sb);
  if (menor === 0) return maior === 0 ? 1 : Infinity;
  return maior / menor;
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/domain/scales.js app/src/domain/scales.test.js
git commit -m "feat(domain): amplitude e razao de amplitude por magnitude"
```

---


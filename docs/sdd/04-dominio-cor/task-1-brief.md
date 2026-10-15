### Tarefa 1: OKLab ida e volta (`rgbParaOKLab`, `oklabParaRGB`)

**Arquivos:**
- Criar: `sitio/app/src/domain/color.js`
- Teste: `sitio/app/src/domain/color.test.js`

**Interfaces:**
- Consome: nada.
- Produz:
  - `hexParaRgb(hex) -> {r,g,b}` (0–255) e `rgbParaHex({r,g,b}) -> string`
  - `rgbParaOKLab({r,g,b}) -> {L,a,b}` (sRGB **não** linearizado na entrada)
  - `oklabParaRGB({L,a,b}) -> {r,g,b}` — devolve valores **possivelmente fora de [0,255]**
    para entradas fora de gamut (não faz *clamp*: preserva a informação para quem chama).
    O *clamp* acontece em `rgbParaHex`, que é o ponto de conversão para texto.
  - `deltaEOK(corA, corB) -> number` — distância euclidiana em OKLab

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/domain/color.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { hexParaRgb, rgbParaHex, rgbParaOKLab, oklabParaRGB, deltaEOK } from './color.js';

describe('hex ↔ rgb', () => {
  it('lê e escreve hex de 6 dígitos', () => {
    expect(hexParaRgb('#0e1117')).toEqual({ r: 14, g: 17, b: 23 });
    expect(rgbParaHex({ r: 14, g: 17, b: 23 })).toBe('#0e1117');
  });
});

describe('OKLab (Ottosson)', () => {
  it('ida e volta preserva a cor', () => {
    for (const hex of ['#6351ca', '#00fddc', '#d25200', '#ffd000', '#0e1117', '#ffffff']) {
      const volta = rgbParaHex(oklabParaRGB(rgbParaOKLab(hexParaRgb(hex))));
      expect(volta).toBe(hex);
    }
  });

  it('branco e preto caem onde a teoria diz', () => {
    const branco = rgbParaOKLab({ r: 255, g: 255, b: 255 });
    const preto = rgbParaOKLab({ r: 0, g: 0, b: 0 });
    expect(branco.L).toBeCloseTo(1, 2);
    expect(branco.a).toBeCloseTo(0, 3);
    expect(branco.b).toBeCloseTo(0, 3);
    expect(preto.L).toBeCloseTo(0, 5);
  });
});

describe('deltaEOK', () => {
  it('é 0 para a mesma cor e simétrico', () => {
    const a = hexParaRgb('#6351ca');
    const b = hexParaRgb('#00fddc');
    expect(deltaEOK(a, a)).toBe(0);
    expect(deltaEOK(a, b)).toBeCloseTo(deltaEOK(b, a), 12);
  });

  it('ordena distâncias como o olho espera: tons próximos < tons distantes', () => {
    const perto = deltaEOK(hexParaRgb('#6351ca'), hexParaRgb('#9d99ed'));
    const longe = deltaEOK(hexParaRgb('#6351ca'), hexParaRgb('#ffd000'));
    expect(perto).toBeLessThan(longe);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test` → FALHA — `Failed to resolve import "./color.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/domain/color.js`:

```js
/**
 * Matemática de cor (spec §1). Camada 3: puro, sem Svelte, sem DOM, sem rede.
 * OKLab conforme Björn Ottosson, "A perceptual color space for image processing" (2020).
 */

export function hexParaRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbParaHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** sRGB (0–255) → linear */
const paraLinear = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const paraSRGB = (v) => {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return s * 255;
};

export function rgbParaOKLab({ r, g, b }) {
  const R = paraLinear(r);
  const G = paraLinear(g);
  const B = paraLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function oklabParaRGB({ L, a, b }) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return {
    r: paraSRGB(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: paraSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: paraSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

/** Distância euclidiana em OKLab — a "ΔE_ok" deste projeto. */
export function deltaEOK(corA, corB) {
  const A = rgbParaOKLab(corA);
  const B = rgbParaOKLab(corB);
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test` → PASS.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/domain/color.js app/src/domain/color.test.js
git commit -m "feat(domain): OKLab ida e volta e distancia perceptual"
```

---


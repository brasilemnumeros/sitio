### Tarefa 2: Simulação dos quatro tipos de visão (`simularDaltonismo`)

**Arquivos:**
- Modificar: `sitio/app/src/domain/color.js`
- Teste: `sitio/app/src/domain/color.test.js` (acrescentar)

**Interfaces:**
- Consome: `rgbParaOKLab` (tarefa 1).
- Produz:
  - `VISOES = ['normal','protanopia','deuteranopia','tritanopia']`
  - `simularDaltonismo(rgb, visao) -> {r,g,b}` — identidade para `'normal'`

> **De onde vêm os coeficientes.** As matrizes abaixo são as de **Machado, Oliveira &
> Fernandes (2009), severidade 1.0**, aplicadas em **RGB linear**. Antes de confiar nelas,
> **confira contra a fonte** — e o teste do Passo 3, que reproduz o colapso medido na §1,
> é o que acusa se a matriz estiver errada. Coeficiente errado aqui é pior que nenhum:
> o app passaria a mentir sobre acessibilidade.

- [ ] **Passo 1: escrever os testes que falham**

Acrescentar a `color.test.js`:

```js
import { simularDaltonismo, VISOES } from './color.js';

describe('simularDaltonismo (§1)', () => {
  it('as quatro visões, e só elas', () => {
    expect(VISOES).toEqual(['normal', 'protanopia', 'deuteranopia', 'tritanopia']);
  });

  it('visão normal é identidade', () => {
    const c = hexParaRgb('#6351ca');
    expect(simularDaltonismo(c, 'normal')).toEqual(c);
  });

  it('preserva o cinza (nenhuma simulação introduz cor onde não há)', () => {
    for (const visao of VISOES) {
      const cinza = simularDaltonismo({ r: 128, g: 128, b: 128 }, visao);
      expect(cinza.r).toBeCloseTo(cinza.g, 0);
      expect(cinza.g).toBeCloseTo(cinza.b, 0);
    }
  });

  it('deuteranopia COLAPSA o par azul/roxo medido na §1 (#309aff × #9581ff)', () => {
    const normal = deltaEOK(hexParaRgb('#309aff'), hexParaRgb('#9581ff'));
    const deut = deltaEOK(
      simularDaltonismo(hexParaRgb('#309aff'), 'deuteranopia'),
      simularDaltonismo(hexParaRgb('#9581ff'), 'deuteranopia'),
    );
    // Sob deuteranopia o par praticamente cola — é o achado que motivou todo o §1.
    expect(deut).toBeLessThan(normal / 3);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test` → FALHA — `simularDaltonismo is not a function`.

- [ ] **Passo 3: implementação**

Acrescentar a `color.js`:

```js
export const VISOES = Object.freeze(['normal', 'protanopia', 'deuteranopia', 'tritanopia']);

/** Machado, Oliveira & Fernandes (2009), severidade 1.0 — em RGB LINEAR. */
const MATRIZES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/**
 * Simula como uma cor é vista sob um tipo de daltonismo (§1).
 * @param {{r:number,g:number,b:number}} rgb
 * @param {'normal'|'protanopia'|'deuteranopia'|'tritanopia'} visao
 */
export function simularDaltonismo(rgb, visao) {
  if (visao === 'normal') return { ...rgb };
  const M = MATRIZES[visao];
  if (!M) throw new Error(`visão desconhecida: ${visao}`);
  const [R, G, B] = [paraLinear(rgb.r), paraLinear(rgb.g), paraLinear(rgb.b)];
  return {
    r: paraSRGB(M[0][0] * R + M[0][1] * G + M[0][2] * B),
    g: paraSRGB(M[1][0] * R + M[1][1] * G + M[1][2] * B),
    b: paraSRGB(M[2][0] * R + M[2][1] * G + M[2][2] * B),
  };
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test` → PASS.

> **Se o teste do colapso falhar**, os coeficientes não são os do Machado et al. ou estão
> em espaço errado (RGB linear × sRGB). Conferir contra a fonte antes de seguir — não
> afrouxar o teste.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/domain/color.js app/src/domain/color.test.js
git commit -m "feat(domain): simulacao dos quatro tipos de visao"
```

---


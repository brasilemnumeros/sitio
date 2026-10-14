# Fatia 04 — Cor: paleta medida, daltonismo e aviso de colisão (§1)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a matemática de cor como **função pura** — OKLab, simulação dos quatro
tipos de visão, a separação mínima da paleta e o aviso de colisão do override pessoal.
É o "primeiro conteúdo real da camada 3" (§1).

**Arquitetura:** `src/domain/color.js` (camada 3, puro — sem Svelte, sem DOM, sem rede).
Nada aqui desenha: a fatia 05 liga o resultado ao estado das séries, a fatia 06 o usa.

**Stack:** JS puro + Vitest (node).

**Spec:** `...design.md` §1 (paleta, canal redundante, cor customizada), §10.7

## Restrições globais

- **A paleta é um envelope medido; o gosto escolhe dentro dele** (§1). Nada de cor
  hardcoded fora do envelope.
- **10 entradas fixas, sem ciclo.** O ciclo `index % 6` é a falha da paleta atual — a
  partir do 7º indicador duas séries ficam com a mesma cor (§1).
- **A garantia de daltonismo vale só para o padrão.** O app não promete separação
  naquilo que não escolheu — só informa (§1).
- **O seletor avisa, não bloqueia** (§1): bloquear é o paternalismo já rejeitado.
- **Medição válida para fundo escuro** (`#0e1117`). Tema claro exige remedição (§1).
- Domínio puro: sem `svelte`, sem `fetch`, sem `window`.

---

### Tarefa 1: OKLab ida e volta (`rgbParaOKLab`, `oklabParaRGB`)

**Arquivos:**
- Criar: `sitio/app/src/domain/color.js`
- Teste: `sitio/app/src/domain/color.test.js`

**Interfaces:**
- Consome: nada.
- Produz:
  - `hexParaRgb(hex) -> {r,g,b}` (0–255) e `rgbParaHex({r,g,b}) -> string`
  - `rgbParaOKLab({r,g,b}) -> {L,a,b}` (sRGB **não** linearizado na entrada)
  - `oklabParaRGB({L,a,b}) -> {r,g,b}` (0–255, com *clamp*)
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

### Tarefa 3: A paleta e seu envelope (`PALETA_PADRAO`, `separacaoMinima`)

**Arquivos:**
- Modificar: `sitio/app/src/domain/color.js`
- Teste: `sitio/app/src/domain/color.test.js` (acrescentar)

**Interfaces:**
- Consome: tarefas 1–2.
- Produz:
  - `PALETA_PADRAO: string[]` — exatamente **10** cores hex (§1)
  - `separacaoMinima(paleta, visao) -> number` — a **mínima** ΔE_ok entre todos os pares
  - `separacaoGlobal(paleta) -> number` — a mínima das quatro visões (o "pior caso")

> **Sobre o número — já medido.** A §1 registra a paleta otimizada com mínima **0,095**,
> sem declarar a normalização. Medido nesta sessão com a implementação da tarefa 1
> (ΔE_ok = **distância euclidiana em OKLab**, com as matrizes de Machado et al. em RGB
> linear), a §1 se reproduz **exatamente**:
>
> | visão | separação mínima medida (2026-10-14) |
> |---|---|
> | normal | 0,1112 |
> | protanopia | 0,0953 |
> | deuteranopia | **0,0950** ← o pior caso, e o número da §1 |
> | tritanopia | 0,1061 |
> | **global (pior caso)** | **0,0950** |
>
> Ou seja: **a normalização da §1 é esta**, e a implementação está certa. O par mais
> apertado em visão normal é `#9d99ed` × `#a5c4ff` (0,1112). O teste trava **não-regressão**
> com o piso medido — não igualdade com 0,095.

- [ ] **Passo 1: escrever os testes que falham**

Acrescentar a `color.test.js`:

```js
import { PALETA_PADRAO, separacaoMinima, separacaoGlobal, LIMIAR_ENVELOPE } from './color.js';

describe('PALETA_PADRAO (§1)', () => {
  it('tem exatamente 10 cores e nenhuma repetida', () => {
    expect(PALETA_PADRAO).toHaveLength(10);
    expect(new Set(PALETA_PADRAO).size).toBe(10);
  });

  it('é a paleta medida na spec, na ordem', () => {
    expect(PALETA_PADRAO).toEqual([
      '#6351ca', '#00fddc', '#d25200', '#9d99ed', '#ffd000',
      '#8d5375', '#ff8b75', '#b47699', '#a5c4ff', '#cea2ba',
    ]);
  });
});

describe('separação (§1)', () => {
  it('mede a MINIMA entre todos os 45 pares', () => {
    const s = separacaoMinima(PALETA_PADRAO, 'normal');
    // Todos os pares, sem exceção — o valor fica registrado na spec.
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(separacaoMinima(PALETA_PADRAO.slice(0, 2), 'normal'));
  });

  it('a paleta otimizada é melhor que a ingênua igualmente espaçada (§1)', () => {
    // 10 matizes de 36° em HSL — a primeira tentativa, que colapsou no daltonismo.
    const ingenua = Array.from({ length: 10 }, (_, i) => hslParaHex((i * 36) % 360, 70, 55));
    expect(separacaoGlobal(PALETA_PADRAO)).toBeGreaterThan(separacaoGlobal(ingenua));
  });

  it('TRAVA o envelope: nenhuma visão cai abaixo do piso medido', () => {
    // Medido em 2026-10-14: normal 0,1112 · protanopia 0,0953 · deuteranopia 0,0950 ·
    // tritanopia 0,1061. O piso fica logo abaixo do pior caso (deuteranopia, 0,0950).
    // É o teste que falha se alguém ajustar a paleta à mão e quebrar o daltonismo (§10.7).
    for (const visao of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) {
      expect(separacaoMinima(PALETA_PADRAO, visao)).toBeGreaterThan(LIMIAR_ENVELOPE);
    }
    expect(separacaoGlobal(PALETA_PADRAO)).toBeCloseTo(0.095, 2);
  });
});

/** Utilitário de teste: HSL → hex, só para gerar a paleta ingênua de comparação. */
function hslParaHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return rgbParaHex({ r: f(0), g: f(8), b: f(4) });
}
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test` → FALHA — `PALETA_PADRAO is not defined`.

- [ ] **Passo 3: implementação**

Acrescentar a `color.js`:

```js
/** Piso do envelope, medido em 2026-10-14: o pior caso entre as quatro visões é 0,0950
 * (deuteranopia). O piso fica logo abaixo — é o que o teste de não-regressão trava (§10.7). */
export const LIMIAR_ENVELOPE = 0.09;

/**
 * A paleta de 10 séries (spec §1) — envelope medido, SEM ciclo, exatamente 10 entradas.
 * O override pessoal (localStorage) mora fora daqui, chaveado pelo id do indicador.
 */
export const PALETA_PADRAO = Object.freeze([
  '#6351ca', '#00fddc', '#d25200', '#9d99ed', '#ffd000',
  '#8d5375', '#ff8b75', '#b47699', '#a5c4ff', '#cea2ba',
]);

/** Menor ΔE_ok entre todos os pares da paleta, sob uma visão. */
export function separacaoMinima(paleta, visao) {
  let minima = Infinity;
  for (let i = 0; i < paleta.length; i++) {
    for (let j = i + 1; j < paleta.length; j++) {
      const d = deltaEOK(
        simularDaltonismo(hexParaRgb(paleta[i]), visao),
        simularDaltonismo(hexParaRgb(paleta[j]), visao),
      );
      if (d < minima) minima = d;
    }
  }
  return minima;
}

/** O pior caso entre as quatro visões — é isto que o teste trava (§10.7). */
export function separacaoGlobal(paleta) {
  return Math.min(...VISOES.map((v) => separacaoMinima(paleta, v)));
}
```

- [ ] **Passo 4: reconferir a medição e o piso**

Rodar uma vez e **comparar com os números já medidos** (normal 0,1112 · protanopia 0,0953
· deuteranopia 0,0950 · tritanopia 0,1061 · global 0,0950):

```bash
cd sitio/app && node -e "
import('./src/domain/color.js').then(({PALETA_PADRAO, separacaoMinima, VISOES}) => {
  for (const v of VISOES) console.log(v, separacaoMinima(PALETA_PADRAO, v).toFixed(4));
  console.log('global', Math.min(...VISOES.map(v => separacaoMinima(PALETA_PADRAO, v))).toFixed(4));
});"
```

**Se divergirem**, ou a paleta foi digitada errada ou a implementação de OKLab/daltonismo
não é a da §1 — parar e reconciliar antes de seguir. Registrar a data na §1 da spec.

- [ ] **Passo 5: rodar e ver passar; commitar**

```bash
cd sitio && npm --prefix app test
git add app/src/domain/color.js app/src/domain/color.test.js docs/specs/
git commit -m "feat(domain): paleta de 10 e o teste que trava o envelope no daltonismo"
```

---

### Tarefa 4: O aviso de colisão do override pessoal (`avisoDeColisao`)

**Arquivos:**
- Modificar: `sitio/app/src/domain/color.js`
- Teste: `sitio/app/src/domain/color.test.js` (acrescentar)

**Interfaces:**
- Consome: tarefas 1–3.
- Produz:
  - `LIMIAR_COLISAO = LIMIAR_ENVELOPE` (0,09) — **a régua do aviso é o próprio envelope da
    paleta**, não um número solto: o que o app já aceita como separação mínima é o que ele
    avisa quando o usuário escolhe abaixo.
  - `avisoDeColisao(cor, outrasCores) -> {colide: boolean, distancia: number, contra: number}` —
    `distancia` é a **mínima medida** contra as outras; `contra` é o índice da que mais
    se aproxima (`-1` se não há outras).

- [ ] **Passo 1: escrever os testes que falham**

```js
import { avisoDeColisao, LIMIAR_COLISAO } from './color.js';

describe('avisoDeColisao (§1)', () => {
  it('a régua é o envelope da paleta, não um número solto', () => {
    expect(LIMIAR_COLISAO).toBe(LIMIAR_ENVELOPE);
  });

  it('avisa com a distância medida quando a cor chega perto de outra', () => {
    // Medido: dE(#6351ca, #6a58c8) = 0,0213 — bem abaixo do envelope (0,09).
    const r = avisoDeColisao('#6351ca', ['#6a58c8', '#ffd000']);
    expect(r.colide).toBe(true);
    expect(r.distancia).toBeCloseTo(0.0213, 3);
    expect(r.contra).toBe(0);
  });

  it('não avisa quando a cor é bem separada', () => {
    // Medido: dE(#00fddc, #d25200) = 0,4275 · dE(#6351ca, #9d99ed) = 0,2081
    expect(avisoDeColisao('#00fddc', ['#d25200']).colide).toBe(false);
    expect(avisoDeColisao('#6351ca', ['#9d99ed']).colide).toBe(false);
  });

  it('não avisa e não quebra quando não há outras séries', () => {
    expect(avisoDeColisao('#6351ca', [])).toEqual({ colide: false, distancia: Infinity, contra: -1 });
  });
});
```

*(importar `LIMIAR_ENVELOPE` junto no cabeçalho do teste)*

- [ ] **Passo 2: rodar e ver falhar** → FALHA — `avisoDeColisao is not a function`.

- [ ] **Passo 3: implementação**

```js
/** Abaixo disto, duas séries são "a mesma cor" para efeito de aviso (§1).
 * É o próprio envelope da paleta — a régua do que o app avisa é o que ele já aceita. */
export const LIMIAR_COLISAO = LIMIAR_ENVELOPE;

/**
 * Avisa (com a distância medida) quando a cor escolhida pelo usuário colidir com uma
 * série já selecionada — mas NÃO bloqueia (§1).
 */
export function avisoDeColisao(cor, outrasCores) {
  if (outrasCores.length === 0) return { colide: false, distancia: Infinity, contra: -1 };
  let distancia = Infinity;
  let contra = -1;
  outrasCores.forEach((outra, i) => {
    const d = deltaEOK(hexParaRgb(cor), hexParaRgb(outra));
    if (d < distancia) {
      distancia = d;
      contra = i;
    }
  });
  return { colide: distancia < LIMIAR_COLISAO, distancia, contra };
}
```

- [ ] **Passo 4: rodar e ver passar; commitar**

```bash
cd sitio && npm --prefix app test
git add app/src/domain/color.js app/src/domain/color.test.js
git commit -m "feat(domain): aviso de colisao de cor, que informa sem bloquear"
```

---

## Critérios de aceite da fatia 04

- [ ] `npm test` → verdes, com **4 visões** e a paleta de **exatamente 10** cores.
- [ ] `rgbParaOKLab`/`oklabParaRGB` fazem **ida e volta** exata nas 10 cores + fundo
      escuro + branco.
- [ ] O envelope medido bate com a §1: **global 0,0950** (normal 0,1112 · protanopia
      0,0953 · deuteranopia 0,0950 · tritanopia 0,1061), com ΔE_ok = euclidiana em OKLab.
      Se divergir, a paleta ou a implementação está errada — não o teste.
- [ ] O teste de não-regressão **falha** se alguém ajustar uma cor à mão e derrubar a
      separação no daltonismo (§10.7) — conferir trocando uma cor de propósito.
- [ ] `avisoDeColisao` **informa sem bloquear** (não existe caminho que rejeite a cor).
- [ ] Nenhuma cor de partido, em nenhuma forma (§7.3.4).
- [ ] `grep -rE "svelte|fetch|window|document" app/src/domain/color.js` → sem resultado.

## Auto-revisão

- **Cobertura da spec:** §1 inteira no que é conta — paleta de 10 sem ciclo, envelope
  medido (`separacaoMinima`/`separacaoGlobal`), simulação das quatro visões, e o aviso de
  colisão. O **canal redundante** (rótulo na ponta) não é matemática de cor: é desenho
  (fatia 06). A **persistência em `localStorage`** é store (fatia 05).
- **Ponto resolvido por medição:** a `§1` não declarava a normalização do seu 0,095.
  Medido nesta sessão, a implementação da tarefa 1 **reproduz o 0,095 exatamente** — a
  normalização é ΔE_ok = euclidiana em OKLab, e o teste trava não-regressão com o piso
  0,09. O `LIMIAR_COLISAO` **é** esse piso: a régua do aviso é o envelope do próprio app.
- **Risco declarado:** as matrizes de daltonismo vêm de uma fonte citada (Machado et al.
  2009) e o teste do colapso as confere; se estiverem erradas, o teste acusa.
- **Consistência de nomes:** `PALETA_PADRAO`, `VISOES`, `simularDaltonismo`,
  `separacaoMinima`, `separacaoGlobal`, `avisoDeColisao`, `deltaEOK`, `LIMIAR_COLISAO` —
  consumidos pela fatia 05 (stores) e 06 (chart).

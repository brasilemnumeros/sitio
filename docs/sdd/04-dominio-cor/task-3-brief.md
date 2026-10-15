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
    // Uma paleta ingênua de 10 matizes de 36° em HSL. Mede global 0,0216 — NÃO é a
    // ingênua que a §1 cita (0,0061), que é de outra construção; o teste só compara os
    // dois globais, então não é contradição.
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


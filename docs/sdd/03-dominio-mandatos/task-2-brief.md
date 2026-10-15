### Tarefa 2: Contas puras de mandato (`domain/mandates.js`)

**Arquivos:**
- Criar: `sitio/app/src/domain/mandates.js`
- Teste: `sitio/app/src/domain/mandates.test.js`

**Interfaces:**
- Consome: o tipo `Series` (fatia 01) e o schema de `federal.json` (tarefa 1).
- Produz:
  - `COBERTURA = { CALCULAVEL:'calculavel', PARCIAL:'parcial', SEM:'sem-cobertura', PONTO_UNICO:'ponto-unico' }`
  - `pontosNoMandato(series, mandato) -> Array<{date, value}>` (ordenados por data)
  - `pontosEsperados(granularity, mandato) -> number|null` — a régua da cobertura
  - `deltaNoMandato(series, mandato) -> Celula`, onde
    `Celula = { estado, delta: number|null, pontos: number, periodo: {inicio, fim}|null, motivo: string|null }`
  - `formatarPeriodo(periodo) -> string` — `"03/2004–12/2006"`
  - `ordenarMandatos(mandatos) -> Mandato[]` — cronológica por `inicio`, `emCurso` à direita

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/domain/mandates.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { COBERTURA, deltaNoMandato, formatarPeriodo, ordenarMandatos, pontosEsperados } from './mandates.js';

const LULA_I = { id: 'federal-2003-lula', rotulo: 'Lula I', inicio: '2003-01-01', fim: '2006-12-31' };
const LULA_III = { id: 'federal-2023-lula', rotulo: 'Lula III', inicio: '2023-01-01', fim: null, emCurso: true };
const FHC_II = { id: 'federal-1999-fhc', rotulo: 'FHC II', inicio: '1999-01-01', fim: '2002-12-31' };

/** Série mensal que começa em 03/2004 (MVG-R, §7.3.5). */
function mensal(de, ate) {
  const data = [];
  for (let a = +de.slice(0, 4), m = +de.slice(5, 7); a < +ate.slice(0, 4) || (a === +ate.slice(0, 4) && m <= +ate.slice(5, 7)); m === 12 ? (m = 1, a++) : m++) {
    data.push({ date: `${a}-${String(m).padStart(2, '0')}-28`, value: 42 + m });
  }
  return { id: 'mvgr-nominal', granularity: 'monthly', data };
}

describe('deltaNoMandato (§4, §7.3.5)', () => {
  it('Δ = último − primeiro valor dentro do mandato, cobertura completa', () => {
    const c = deltaNoMandato(mensal('2003-01', '2006-12'), LULA_I);
    expect(c.estado).toBe(COBERTURA.CALCULAVEL);
    expect(c.pontos).toBe(48);
    expect(c.delta).toBeCloseTo(12 - 1, 6);
    expect(c.periodo).toEqual({ inicio: '2003-01-28', fim: '2006-12-28' });
  });

  it('marca PARCIAL quando a série começa depois do início do mandato', () => {
    const c = deltaNoMandato(mensal('2004-03', '2025-07'), LULA_I);
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(c.pontos).toBe(34); // fixture sintética: 03/2004–12/2006, sem meses repetidos
    expect(formatarPeriodo(c.periodo)).toBe('03/2004–12/2006');
    expect(c.motivo).toBeNull();
  });

  it('ponto único é estado distinto, explicitamente sem Δ', () => {
    const serieAnual = { id: 'homicidios-anual', granularity: 'annual', data: [{ date: '2023-01-01', value: 30.5 }] };
    const c = deltaNoMandato(serieAnual, LULA_III);
    expect(c.estado).toBe(COBERTURA.PONTO_UNICO);
    expect(c.delta).toBeNull();
    expect(c.pontos).toBe(1);
  });

  it('sem cobertura diz POR QUÊ — a série começa em 2004-03', () => {
    const c = deltaNoMandato(mensal('2004-03', '2025-07'), FHC_II);
    expect(c.estado).toBe(COBERTURA.SEM);
    expect(c.motivo).toMatch(/começa em 2004-03/);
    expect(c.delta).toBeNull();
  });

  it('o mandato em curso corta no último dado e é parcial (§7.3.5)', () => {
    const c = deltaNoMandato(mensal('2023-01', '2025-08'), LULA_III);
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(formatarPeriodo(c.periodo)).toBe('01/2023–08/2025');
  });

  it('nunca devolve 0 para ausência de dado', () => {
    for (const c of [
      deltaNoMandato(mensal('2004-03', '2025-07'), FHC_II),
      deltaNoMandato({ id: 'x', granularity: 'annual', data: [{ date: '2023-01-01', value: 1 }] }, LULA_III),
    ]) {
      expect(c.delta).not.toBe(0);
    }
  });
});

describe('formatarPeriodo', () => {
  it('usa MM/AAAA encurtado', () => {
    expect(formatarPeriodo({ inicio: '2004-03-31', fim: '2006-12-31' })).toBe('03/2004–12/2006');
  });
});

describe('pontosEsperados — a régua da cobertura (§7.3.5)', () => {
  it('mensal conta meses inclusive nas duas pontas', () => {
    expect(pontosEsperados('monthly', LULA_I)).toBe(48);
    expect(pontosEsperados('monthly', { inicio: '2016-05-12', fim: '2018-12-31' })).toBe(32);
  });

  it('anual conta anos inclusive', () => {
    expect(pontosEsperados('annual', { inicio: '2019-01-01', fim: '2022-12-31' })).toBe(4);
    expect(pontosEsperados('annual', { inicio: '2016-05-12', fim: '2018-12-31' })).toBe(3);
  });

  it('mandato em curso não tem régua', () => {
    expect(pontosEsperados('monthly', LULA_III)).toBeNull();
  });
});

describe('ordenarMandatos (§7.3.6)', () => {
  it('ordena por início e joga o mandato em curso para a ponta direita', () => {
    const ordem = ordenarMandatos([LULA_III, FHC_II, LULA_I]).map((m) => m.rotulo);
    expect(ordem).toEqual(['FHC II', 'Lula I', 'Lula III']);
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./mandates.js"`.

- [ ] **Passo 3: implementação**

`sitio/app/src/domain/mandates.js`:

```js
/**
 * Contas de mandato (spec §4, §7.3). Camada 3: puro.
 * @typedef {import('../data/validate.js').Series} Series
 * @typedef {{id:string, rotulo:string, titular?:string, partido?:string, tipo?:string,
 *            inicio:string, fim:string|null, emCurso?:boolean,
 *            mandatoDe?:{inicio:string, fim:string}}} Mandato
 */

export const COBERTURA = Object.freeze({
  CALCULAVEL: 'calculavel',
  PARCIAL: 'parcial',
  SEM: 'sem-cobertura',
  PONTO_UNICO: 'ponto-unico',
});

const ymd = (date) => date.slice(0, 10);

/** Pontos da série dentro do mandato, ordenados por data. */
export function pontosNoMandato(series, mandato) {
  const inicio = ymd(mandato.inicio);
  const fim = mandato.fim ? ymd(mandato.fim) : '9999-12-31';
  return series.data
    .filter((p) => ymd(p.date) >= inicio && ymd(p.date) <= fim)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Quantos pontos a série DEVERIA ter dentro do mandato, na granularidade dela.
 * É a régua da cobertura (§7.3.5): "abaixo do esperado para a própria granularidade".
 * `null` para mandato em curso — não há período fechado para comparar.
 */
export function pontosEsperados(granularity, mandato) {
  if (mandato.emCurso || mandato.fim === null) return null;
  if (granularity === 'annual') {
    return Number(mandato.fim.slice(0, 4)) - Number(mandato.inicio.slice(0, 4)) + 1;
  }
  if (granularity === 'monthly') {
    const meses = (d) => Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7));
    return meses(mandato.fim) - meses(mandato.inicio) + 1;
  }
  return null; // 'daily': sem régua declarada nesta camada
}

/**
 * Δ = último − primeiro valor dentro do mandato (spec §4), com os quatro estados
 * de célula da §9.4. Cobertura parcial é marcada por QUALQUER motivo — não só o
 * mandato em curso (§7.3.5).
 *
 * A régua é `pontos < esperados` para a granularidade da série. Medido sobre os
 * dados reais: são **15 células** nos mandatos fechados — o mesmo número que a §7.3
 * publica. Comparar datas cruas marcaria 49 (todo ponto mensal cai no dia 1º, e o
 * mandato começa no meio do mês) — por isso a régua é por contagem, não por data.
 * @returns {{estado:string, delta:number|null, pontos:number,
 *            periodo:{inicio:string,fim:string}|null, motivo:string|null}}
 */
export function deltaNoMandato(series, mandato) {
  const pontos = pontosNoMandato(series, mandato);
  if (pontos.length === 0) {
    return {
      estado: COBERTURA.SEM,
      delta: null,
      pontos: 0,
      periodo: null,
      motivo: motivoDaAusencia(series, mandato),
    };
  }
  if (pontos.length === 1) {
    return { estado: COBERTURA.PONTO_UNICO, delta: null, pontos: 1, periodo: null, motivo: null };
  }
  const periodo = { inicio: pontos[0].date, fim: pontos[pontos.length - 1].date };
  const delta = pontos[pontos.length - 1].value - pontos[0].value;
  const esperados = pontosEsperados(series.granularity, mandato);
  const completa = esperados !== null && pontos.length >= esperados;
  return {
    estado: completa ? COBERTURA.CALCULAVEL : COBERTURA.PARCIAL,
    delta,
    pontos: pontos.length,
    periodo,
    motivo: null,
  };
}

function motivoDaAusencia(series, mandato) {
  if (series.data.length === 0) return 'série sem dados';
  const datas = series.data.map((p) => p.date).sort();
  const primeira = datas[0];
  const ultima = datas[datas.length - 1];
  const inicio = ymd(mandato.inicio);
  const fim = mandato.fim ? ymd(mandato.fim) : null;
  if (fim !== null && ymd(primeira) > fim) return `série começa em ${primeira.slice(0, 7)}`;
  return `série termina em ${ultima.slice(0, 7)}`;
}

/** "03/2004–12/2006" */
export function formatarPeriodo(periodo) {
  const mmaaaa = (date) => `${date.slice(5, 7)}/${date.slice(0, 4)}`;
  return `${mmaaaa(periodo.inicio)}–${mmaaaa(periodo.fim)}`;
}

/** Cronológica por `inicio`, com o mandato em curso sempre na ponta direita (§7.3.6). */
export function ordenarMandatos(mandatos) {
  return [...mandatos].sort((a, b) => {
    if (Boolean(a.emCurso) !== Boolean(b.emCurso)) return a.emCurso ? 1 : -1;
    return a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : 0;
  });
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/domain/mandates.js app/src/domain/mandates.test.js
git commit -m "feat(domain): delta por mandato com os quatro estados de celula"
```

---


# Fatia 03 — Modelo de governos e Δ por mandato (§7)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** períodos de governo como **dado versionado** em `dados/governos/` (fim das
três duplicações em código) e as contas puras que a matriz usa — Δ por mandato e os
**quatro estados de célula**.

**Arquitetura:** o dado mora em `dados/` (é **fato**, não apresentação — §7.1); as contas
moram em `src/domain/mandates.js` (camada 3, puras — §8). A exibição é a fatia 09.

**Stack:** JSON versionado + JS puro + Vitest (node).

**Spec:** `...design.md` §7 (completa), §7.3, §9.4 · **ADR:** D5 e a emenda de cor

## Restrições globais

- **Datas explícitas, nunca derivadas de regra** (§7.3.2). A posse presidencial era
  **15 de março** até 1994; o município começa em 1989; afastamentos e intervenções
  existem. Nada de "posse em 1º de janeiro, quatro anos".
- **`inicio`/`fim` guardam o exercício efetivo**, não o mandato formal (§7.3.1). O
  mandato formal vai em `mandatoDe`.
- **Sem cor de partido — nem no dado nem derivada** (§7.3.4). O dado guarda a **sigla**;
  a identificação por partido é logo + sigla (fatias 06 e 09).
- **Reeleição são dois mandatos separados**, agrupáveis por `titular` (§7.3.3).
- **Onde mora:** `dados/governos/` — apesar de ser curadoria à mão hoje, é fato (§7.1).
- **Municipal: o modelo comporta, o dado não é populado** nesta rodada (§7.1).

---

### Tarefa 1: Os arquivos de governo (repo `dados`)

**Arquivos:**
- Criar: `dados/governos/index.json`
- Criar: `dados/governos/federal.json`

**Interfaces:**
- Consome: nada.
- Produz: o índice (o que existe) e o arquivo federal, no schema da §7.2.

- [ ] **Passo 1: escrever `dados/governos/index.json`**

```json
{
  "schema": 1,
  "esferas": [
    {
      "id": "federal",
      "nome": "Federal",
      "cargo": "presidente",
      "entidades": [{ "codigo": "BR", "nome": "Brasil", "arquivo": "federal.json" }]
    },
    {
      "id": "estadual",
      "nome": "Estadual",
      "cargo": "governador",
      "entidades": []
    },
    {
      "id": "municipal",
      "nome": "Municipal",
      "cargo": "prefeito",
      "entidades": []
    }
  ]
}
```

As listas de `estadual` e `municipal` ficam **vazias por decisão** (§7.1): o modelo
comporta, o dado não é populado. Não preencher com palpite.

- [ ] **Passo 2: escrever `dados/governos/federal.json`**

```json
{
  "schema": 1,
  "esfera": "federal",
  "entidade": { "codigo": "BR", "nome": "Brasil" },
  "cargo": "presidente",
  "mandatos": [
    {
      "id": "federal-1999-fhc",
      "titular": "Fernando Henrique Cardoso",
      "rotulo": "FHC II",
      "partido": "PSDB",
      "tipo": "eleito",
      "inicio": "1999-01-01",
      "fim": "2002-12-31"
    },
    {
      "id": "federal-2003-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula I",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2003-01-01",
      "fim": "2006-12-31"
    },
    {
      "id": "federal-2007-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula II",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2007-01-01",
      "fim": "2010-12-31"
    },
    {
      "id": "federal-2011-dilma",
      "titular": "Dilma Vana Rousseff",
      "rotulo": "Dilma I",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2011-01-01",
      "fim": "2014-12-31"
    },
    {
      "id": "federal-2015-dilma",
      "titular": "Dilma Vana Rousseff",
      "rotulo": "Dilma II",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2015-01-01",
      "fim": "2016-08-31",
      "mandatoDe": { "inicio": "2015-01-01", "fim": "2018-12-31" }
    },
    {
      "id": "federal-2016-temer",
      "titular": "Michel Miguel Elias Temer Lulia",
      "rotulo": "Temer",
      "partido": "MDB",
      "tipo": "sucessor",
      "inicio": "2016-05-12",
      "fim": "2018-12-31",
      "mandatoDe": { "inicio": "2015-01-01", "fim": "2018-12-31" }
    },
    {
      "id": "federal-2019-bolsonaro",
      "titular": "Jair Messias Bolsonaro",
      "rotulo": "Bolsonaro",
      "partido": "PL",
      "tipo": "eleito",
      "inicio": "2019-01-01",
      "fim": "2022-12-31"
    },
    {
      "id": "federal-2023-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula III",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2023-01-01",
      "fim": null,
      "emCurso": true
    }
  ]
}
```

> **Decisão em aberto neste passo.** O arquivo acima começa em **FHC II (1999)** para
> reproduzir exatamente as contagens medidas na §7.3 e no anexo (104 células = 13 × 8).
> **FHC I (1995-01-01 – 1998-12-31) existe e as séries o cobrem** — incluí-lo muda as
> contagens medidas para 117 células e exige atualizar a §7.3/anexo. **Decidir antes de
> commitar** e registrar a decisão na §7.3. Os testes da tarefa 3 são escritos para
> **não** depender da contagem total, então esta decisão não bloqueia a fatia.

- [ ] **Passo 3: commitar no repo `dados`**

```bash
cd dados
git add governos/
git commit -m "feat(governos): modelo federal versionado, sem cor de partido"
```

---

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

### Tarefa 3: O teste que trava a medição da §7.3

**Arquivos:**
- Teste: `sitio/app/src/domain/mandates.medicao.test.js`

**Interfaces:**
- Consome: `deltaNoMandato`, `COBERTURA`, o `federal.json` real (tarefa 1) e as séries
  reais de `dados/`.
- Produz: a prova executável de que a medição da §7.3 (15 células parciais/sem
  cobertura; MVG-R no Lula I = 35 pontos) continua verdadeira.

> **Nota:** as séries reais ainda publicam `rate` (a migração é a fatia 11). Enquanto
> isso, este teste normaliza `{date, rate}` → `{date, value}` num adaptador local do
> próprio teste. Ele vira redundante — e o adaptador sai — quando a fatia 11 entrar.

- [ ] **Passo 1: escrever o teste de medição**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COBERTURA, deltaNoMandato, pontosEsperados } from './mandates.js';

const raiz = fileURLToPath(new URL('../../../../', import.meta.url)); // = brasilemnumeros/
const governos = JSON.parse(readFileSync(join(raiz, 'dados/governos/federal.json'), 'utf8'));
const MANDATOS = governos.mandatos.filter((m) => m.rotulo !== 'FHC I'); // 8 colunas da §7.3

const GRANULARIDADE = {
  'caged-total-mensal': 'monthly',
  'homicidios-anual': 'annual',
  'homicidios-armas-fogo-anual': 'annual',
  'proporcao-homicidios-armas-fogo-anual': 'annual',
  'igpm-acum-12m': 'monthly',
  'ipca-acum-12m': 'monthly',
  'mvgr-nominal': 'monthly',
  'mvgr-real': 'monthly',
  'pib-real-anual': 'annual',
  'populacao-total-anual': 'annual',
  'populacao-variacao-anual': 'annual',
  'selic-meta-acum-12m': 'monthly',
  'selic-over-acum-12m': 'monthly',
};

function serieReal(id) {
  for (const fam of readdirSync(join(raiz, 'dados'), { withFileTypes: true })) {
    if (!fam.isDirectory()) continue;
    const dir = join(raiz, 'dados', fam.name);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      if (f.replace(/\.json$/, '') !== id) continue;
      const bruto = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      // Adaptador temporário: as séries ainda publicam `rate` (migração = fatia 11).
      return {
        id,
        granularity: GRANULARIDADE[id],
        data: bruto.data.map((p) => ({ date: p.date, value: p.value ?? p.rate })),
      };
    }
  }
  throw new Error(`série ${id} não encontrada em dados/`);
}

const mandato = (rotulo) => MANDATOS.find((m) => m.rotulo === rotulo);

/** A matriz do anexo da spec, transcrita (medida em 2026-10-14). 0 = sem cobertura. */
const ESPERADO = {
  'caged-total-mensal': [48, 49, 48, 48, 21, 31, 48, 32],
  'homicidios-anual': [4, 4, 4, 4, 2, 2, 4, 1],
  'homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 0],
  'proporcao-homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 0],
  'igpm-acum-12m': [48, 48, 48, 48, 20, 32, 48, 31],
  'ipca-acum-12m': [48, 48, 48, 48, 20, 31, 48, 30],
  'mvgr-nominal': [0, 35, 48, 48, 21, 31, 48, 31],
  'mvgr-real': [0, 35, 48, 48, 21, 31, 48, 31],
  'pib-real-anual': [4, 5, 4, 4, 3, 2, 4, 2],
  'populacao-total-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'populacao-variacao-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'selic-meta-acum-12m': [46, 48, 48, 48, 20, 32, 48, 34],
  'selic-over-acum-12m': [48, 48, 48, 48, 20, 32, 48, 34],
};

describe('medição da §7.3 sobre os dados reais', () => {
  it('reproduz a matriz de cobertura do anexo, célula a célula', () => {
    const obtido = {};
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      obtido[id] = MANDATOS.map((m) => deltaNoMandato(s, m).pontos);
    }
    expect(obtido).toEqual(ESPERADO);
  });

  it('resume a medição: 104 células, 4 sem cobertura, 1 ponto único', () => {
    const estados = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS) estados.push(deltaNoMandato(s, m).estado);
    }
    expect(estados).toHaveLength(104);
    expect(estados.filter((e) => e === COBERTURA.SEM)).toHaveLength(4);
    expect(estados.filter((e) => e === COBERTURA.PONTO_UNICO)).toHaveLength(1);
    expect(estados.filter((e) => e !== COBERTURA.SEM && e !== COBERTURA.PONTO_UNICO)).toHaveLength(99);
  });

  it('reproduz as 15 células "abaixo do esperado" da §7.3, com o mandato fechado', () => {
    // A régua é `pontos < esperados` para a granularidade da série — a mesma que a §7.3
    // publica. Comparar datas cruas marcaria 49 células (todo ponto mensal cai no dia 1º).
    const abaixo = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS.filter((x) => !x.emCurso)) {
        const pontos = deltaNoMandato(s, m).pontos;
        if (pontos < pontosEsperados(s.granularity, m)) abaixo.push(`${id}|${m.rotulo}`);
      }
    }
    expect(abaixo).toHaveLength(15);
    expect(abaixo.filter((c) => c.endsWith('|Temer'))).toHaveLength(10);
    expect(abaixo).toContain('mvgr-nominal|Lula I');
    expect(abaixo).toContain('selic-meta-acum-12m|FHC II');
  });

  it('MVG-R no Lula I: o período real usado é 03/2004–12/2006', () => {
    const c = deltaNoMandato(serieReal('mvgr-nominal'), mandato('Lula I'));
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(c.periodo.inicio.slice(0, 7)).toBe('2004-03');
    expect(c.periodo.fim.slice(0, 7)).toBe('2006-12');
  });
});
```

> ⚠️ **Achado de qualidade de dado.** A MVG-R tem **259 pontos para 257 meses** — os meses
> **2005-10** e **2015-10** aparecem **duas vezes** cada um, e é por isso que o Lula I
> conta **35** pontos (e não 34). É **dado real, não erro do modelo** — e é o tipo de
> coisa que a fatia 11 (o notebook do `mvgr`) deve corrigir. Registrar e não "consertar"
> aqui: o modelo conta pontos, e a spec mediu 35.

- [ ] **Passo 2: rodar**

Run: `cd sitio/app && npm test`
Esperado: PASS. **Se `mvgr-nominal no Lula I` não der 35 pontos**, a medição
da spec ou o modelo de datas está errado: parar e reconciliar antes de seguir (é
exatamente o tipo de erro silencioso que esta fatia existe para pegar).

- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/domain/mandates.medicao.test.js
git commit -m "test(domain): trava a medicao de cobertura por mandato da spec"
```

---

## Critérios de aceite da fatia 03

- [ ] `dados/governos/index.json` e `federal.json` existem, no schema da §7.2, e
      **nenhum campo guarda cor**.
- [ ] `inicio`/`fim` são datas explícitas; nenhuma linha de código **deriva** data de
      regra ("1º de janeiro", "+4 anos").
- [ ] `git grep -n "GOVERNMENT_PERIODS\|Lula 3"` em `sitio/` → só os arquivos do legado
      que a fatia 10 vai apagar (nenhuma ocorrência nova).
- [ ] `npm test` → verdes, incluindo a medição real: a matriz de cobertura **reproduz o
      anexo da spec célula a célula** (13 × 8 = 104 células, 4 sem cobertura, 1 ponto
      único, 99 com Δ) e **as 15 células "abaixo do esperado"** da §7.3.
- [ ] A régua da cobertura é **por contagem de pontos contra o esperado da granularidade**
      (`pontosEsperados`), **não** por comparação de datas cruas — comparar datas marcaria
      49 células em vez de 15.
- [ ] `deltaNoMandato` **nunca** devolve `delta: 0` para ausência de dado (§9.4).
- [ ] `ordenarMandatos` põe o mandato em curso na ponta direita.
- [ ] A decisão sobre incluir **FHC I** está tomada e registrada (na §7.3 ou na spec).

## Auto-revisão

- **Cobertura da spec:** §7.1 (índice + arquivo por entidade, esferas) → tarefa 1; §7.2
  (schema) → tarefa 1; §7.3.1–3 e .6 (exercício efetivo, datas explícitas, reeleição
  separada, ordenação) → tarefas 1–2; §7.3.5 (cobertura parcial generalizada + os quatro
  estados) → tarefas 2–3; §7.3.4 (sem cor) → restrição global e critério de aceite.
- **Onde a exibição mora:** a matriz e o trilho são a fatia 09; aqui só nasce o dado e a
  regra.
- **Ponto honesto em aberto:** FHC I — declarado como decisão no Passo 2 da tarefa 1, com
  o impacto nas contagens medido; os testes foram escritos para não depender do total.
- **Consistência de nomes:** `COBERTURA`, `deltaNoMandato`, `pontosNoMandato`,
  `formatarPeriodo`, `ordenarMandatos` — consumidos como estão pela fatia 09.

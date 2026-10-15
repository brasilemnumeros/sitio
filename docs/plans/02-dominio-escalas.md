# Fatia 02 — Escalas e comparabilidade (§5)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a conta que decide se duas séries podem conviver no mesmo eixo — razão de
amplitude sobre a **série inteira**, corte em 50×, e o veredito que a ficha da modal
(fatia 08) exibe. Função pura, sem DOM, sem rede.

**Arquitetura:** `src/domain/scales.js` é camada 3 (§8) — entrada e saída, sem Svelte,
sem DOM, sem rede. É uma das "contas que erram calado": gráfico bonito com número errado
não levanta exceção, por isso é o alvo prioritário de teste (§10.7).

**Stack:** JS puro + Vitest (node).

**Spec:** `...design.md` §5 (completa), §10.7

## Restrições globais

- **A conta é sobre a série inteira, nunca sobre a janela visível** (§5) — um aviso que
  se recalcula no zoom pisca na tela e ensina o usuário a ignorá-lo.
- **Por magnitude, não por `unit.type`** (§5) — medido: `homicidios-anual` (`number`) ×
  `pib-real-anual` (`percentage`) dá razão **1,068**; `populacao-total-anual` ×
  `homicidios-anual` (ambas `number`) dá **4.853.304**. O tipo de unidade **não** é
  insumo desta função.
- **O corte é 50** e o valor exato não é crítico: qualquer limiar dentro de (21,2 · 125)
  particiona os dados de hoje de forma idêntica (§5). 50 é o meio da faixa vazia.
- Domínio puro: sem import de `svelte`, sem `fetch`, sem `window`.

---

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

### Tarefa 2: O veredito (`comparabilidade`)

**Arquivos:**
- Modificar: `sitio/app/src/domain/scales.js`
- Teste: `sitio/app/src/domain/scales.test.js` (acrescentar)

**Interfaces:**
- Consome: `amplitudeRatio` (tarefa 1).
- Produz:
  - `AMPLITUDE_LIMIT = 50`
  - `comparabilidade(novaSerie, seriesExistentes) -> Veredito`, onde
    `Veredito = { veredito: 'convive'|'avisa'|'ilegivel', ratio: number, contra: Series|null }`
    — `ratio` é o **pior caso** contra as existentes; `contra` é a série que o produziu
    (`null` quando não há existentes). `'ilegivel'` entra na tarefa 3.

- [ ] **Passo 1: escrever os testes que falham**

Acrescentar a `scales.test.js`:

```js
import { comparabilidade, AMPLITUDE_LIMIT } from './scales.js';

describe('comparabilidade (§5)', () => {
  it('o corte é 50', () => {
    expect(AMPLITUDE_LIMIT).toBe(50);
  });

  it('convive: razão ≤ 50 não gera aviso', () => {
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);          // amplitude 39,97
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);    // amplitude 42,22
    const v = comparabilidade(selic, [igpm]);
    expect(v.veredito).toBe('convive');
    expect(v.ratio).toBeCloseTo(1.056, 2);
    expect(v.contra.id).toBe('igpm-acum-12m');
  });

  it('avisa: razão entre 50 e 1.000.000 aponta a série culpada', () => {
    // MVG-R (222.000) × Selic (42,22) = 5.258× — acima do corte de 50 e bem abaixo do
    // patológico. ⚠️ NÃO use `populacao-total × selic-meta` aqui: medido, aquele par dá
    // **1.192.259×**, que cai do OUTRO lado do limiar de 1.000.000 e devolveria `'ilegivel'`
    // (R19). O par patológico tem os seus próprios testes na Tarefa 3.
    const mvgr = serie('mvgr-nominal', 42000, 264000);
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    const v = comparabilidade(selic, [mvgr]);
    expect(v.veredito).toBe('avisa');
    expect(v.ratio).toBeGreaterThan(AMPLITUDE_LIMIT);
    expect(v.contra.id).toBe('mvgr-nominal');
  });

  it('reporta o PIOR caso entre várias existentes', () => {
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);          // 39,97
    const pop = serie('populacao-total-anual', 154524335, 204861525);
    const v = comparabilidade(serie('selic-meta-acum-12m', 2.0, 44.22), [igpm, pop]);
    expect(v.contra.id).toBe('populacao-total-anual'); // 1.192.259 > 1,056
  });

  it('sem existentes, não há com o que comparar', () => {
    const v = comparabilidade(serie('x', 0, 10), []);
    expect(v.veredito).toBe('convive');
    expect(v.contra).toBeNull();
  });

  it('razão EXATAMENTE 1 ainda aponta a série comparada — `contra` só é null sem existentes', () => {
    // Duas séries de amplitude idêntica: 10×10. O contrato do typedef diz que `contra` é a
    // série que produziu a pior razão — não "null quando a razão é 1".
    const dez = serie('dez', 0, 10);
    const outraDez = serie('outra-dez', 5, 15);
    const v = comparabilidade(dez, [outraDez]);
    expect(v.ratio).toBeCloseTo(1, 9);
    expect(v.contra).not.toBeNull();
    expect(v.contra.id).toBe('outra-dez');
  });

  it('o insumo é a MAGNITUDE, não unit.type (§5)', () => {
    // homicidios (number) × pib (percentage) → 1,068 → convive apesar de tipos diferentes
    const hom = serie('homicidios-anual', 21.22, 31.59);       // 10,37
    const pib = serie('pib-real-anual', -3.55, 7.53);          // 11,08
    expect(comparabilidade(hom, [pib]).veredito).toBe('convive');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `comparabilidade is not a function`.

- [ ] **Passo 3: implementação**

Acrescentar a `scales.js`:

```js
/** O corte de comparabilidade (§5). O valor exato não é crítico: qualquer limiar em
 * (21,2 · 125) particiona os dados de hoje de forma idêntica — 50 é o meio da faixa. */
export const AMPLITUDE_LIMIT = 50;

/**
 * @typedef {Object} Veredito
 * @property {'convive'|'avisa'} veredito
 * @property {number} ratio   pior razão contra as séries já presentes
 * @property {Series|null} contra  a série que produziu a pior razão
 */

/**
 * Decide se uma série pode entrar num eixo com as que já estão lá.
 * Não encaixa em silêncio: devolve o veredito para a ficha da modal exibir (§1.1, §5).
 * @param {Series} novaSerie
 * @param {Series[]} seriesExistentes
 * @returns {Veredito}
 */
export function comparabilidade(novaSerie, seriesExistentes) {
  // `contra` é null SÓ quando não há existentes (é o que o typedef promete). Semear com
  // `ratio: 1` e comparar com `>` deixava `contra` null no caso de razão EXATAMENTE 1
  // (duas séries de amplitude idêntica) — contrato violado, e a fatia 08 leria isso como
  // "nada a comparar" num caso em que há. Por isso a primeira existente sempre entra.
  let piorRatio = 1;
  let contra = null;
  for (const existente of seriesExistentes) {
    const ratio = amplitudeRatio(novaSerie, existente);
    if (contra === null || ratio > piorRatio) {
      piorRatio = ratio;
      contra = existente;
    }
  }
  const veredito =
    piorRatio > AMPLITUDE_LIMIT_ILEGIVEL ? 'ilegivel'
    : piorRatio > AMPLITUDE_LIMIT ? 'avisa'
    : 'convive';
  return { veredito, ratio: piorRatio, contra };
}
```

- [ ] **Passo 4: rodar e ver passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/domain/scales.js app/src/domain/scales.test.js
git commit -m "feat(domain): veredito de comparabilidade com corte de 50x"
```

---

### Tarefa 3: O grau de aviso para o caso patológico — **decidido por medição**

**Contexto.** A §5 fixa **um** corte (50×, `avisa`) e descreve um segundo grau — *"nem dois
eixos salvam; a combinação não é legível, ponto"* — sem fixar o limiar. O controlador
mediu os **78 pares** reais (2026-10-14) para decidir:

| faixa da razão | pares |
|---|---|
| 1,1 – 21,2 | 38 |
| **21,2 – 125** | **0** ← a faixa vazia que justifica o corte de 50 |
| 125 – 1.000 | 4 |
| 1.000 – 10.000 | 11 |
| 10.000 – 100.000 | 7 |
| 100.000 – 1.000.000 | 4 |
| **≥ 1.000.000** | **14** |

**Ao contrário do que eu supus ao escrever este plano, NÃO existe faixa vazia acima de
125** — a região 92.267–3.759.751 é densa. Logo o corte de 1.000.000 **não é livre**: ele
particiona os dados, e a escolha é declarada, não medida.

**Decisão: `AMPLITUDE_LIMIT_ILEGIVEL = 1_000_000`.** Critério: **seis ordens de grandeza**
de diferença de amplitude. Acima disso, os 14 pares (18% do total) são todos *amplitude
absoluta de ordem de milhão ou mais* contra um percentual — e a justaposição deixa de
comparar qualquer coisa. Abaixo disso, entre 125× e 1.000.000×, o app **avisa** e oferece
**normalizar ou remover**, que é remédio real.

**Rejeitado:** o corte em **125** (o topo da faixa vazia). Marcaria **40 pares — mais da
metade dos pares do site** — como ilegíveis, e um aviso duro que dispara em metade dos
casos perde força, exatamente como a §5 argumenta contra aviso que aparece e desaparece.

**Custo se errado:** entre 125× e 1.000.000× o app oferece normalizar/remover em vez de
recusar. Reversível com uma constante.

**Arquivos:**
- Modificar: `sitio/app/src/domain/scales.js`
- Teste: `sitio/app/src/domain/scales.test.js`
- Documentar: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` §5

- [ ] **Passo 1: escrever o teste que falha**

Acrescentar a `scales.test.js` (importando `AMPLITUDE_LIMIT_ILEGIVEL` junto):

```js
describe('o caso patológico (§5, decidido por medição em 2026-10-14)', () => {
  it('o limiar é seis ordens de grandeza', () => {
    expect(AMPLITUDE_LIMIT_ILEGIVEL).toBe(1_000_000);
  });

  it('nas FRONTEIRAS vale o `>` estrito: 50 convive, 1.000.000 avisa', () => {
    const um = serie('um', 0, 1);
    expect(comparabilidade(serie('cinquenta', 0, 50), [um]).veredito).toBe('convive');
    expect(comparabilidade(serie('um-milhao', 0, 1_000_000), [um]).veredito).toBe('avisa');
  });

  it('série de amplitude ZERO é ilegível contra uma série real — a razão é indefinida', () => {
    // Uma série constante (ou de um ponto só) tem span 0. Contra uma série real a razão é
    // `Infinity`, e a comparação não significa nada — é o veredito mais forte.
    const plana = serie('plana', 5, 5);
    expect(comparabilidade(plana, [serie('real', 0, 10)]).veredito).toBe('ilegivel');
    // Duas planas convivem: as duas são retas na mesma escala.
    expect(comparabilidade(plana, [serie('plana2', 7, 7)]).veredito).toBe('convive');
  });

  it('populacao-total × populacao-variacao (20.886.801×) é ILEGÍVEL', () => {
    const pop = serie('populacao-total-anual', 154524335, 204861525);      // 50.337.190
    const var_ = serie('populacao-variacao-anual', -0.35, 2.06);           // 2,41
    expect(comparabilidade(pop, [var_]).veredito).toBe('ilegivel');
  });

  it('caged × selic-meta (657.681×) ainda AVISA — não é patológico', () => {
    const caged = serie('caged-total-mensal', 20937049, 48704360);          // 27.767.311
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);                 // 42,22
    expect(comparabilidade(caged, [selic]).veredito).toBe('avisa');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA — `AMPLITUDE_LIMIT_ILEGIVEL is not defined`.

- [ ] **Passo 3: implementar**

Acrescentar a `scales.js`:

```js
/** Acima daqui nem dois eixos salvam — a série menor vira reta colada no zero (§5).
 * Seis ordens de grandeza. Decidido por medição dos 78 pares reais em 2026-10-14: 14 pares
 * (18%) caem aqui, todos amplitude de ordem de milhão contra um percentual. NÃO é faixa
 * vazia como o corte de 50 — a região 92.267–3.759.751 é densa, então o número é declarado,
 * não livre. Ver a §5 da spec. */
export const AMPLITUDE_LIMIT_ILEGIVEL = 1_000_000;
```

E estender o veredito em `comparabilidade`, **checando o caso patológico primeiro**:

```js
  const veredito =
    pior.ratio > AMPLITUDE_LIMIT_ILEGIVEL ? 'ilegivel'
    : pior.ratio > AMPLITUDE_LIMIT ? 'avisa'
    : 'convive';
  return { veredito, ratio: pior.ratio, contra: pior.contra };
```

Atualizar o typedef de `Veredito` para `'convive'|'avisa'|'ilegivel'`.

- [ ] **Passo 4: rodar e ver passar**

- [ ] **Passo 5: registrar a decisão na §5 da spec e commitar**

```bash
cd sitio && npm --prefix app test
git add app/src/domain/scales.js app/src/domain/scales.test.js docs/specs/
git commit -m "feat(domain): limiar do caso patologico de escala, decidido por medicao"
```

---

## Critérios de aceite da fatia 02

- [ ] `npm test` → verdes, incluindo os números medidos sobre as fixtures: `1,056` convive ·
      `5.258` avisa · **`1.192.259` é `ilegivel`** (cai acima do limiar de 1.000.000) ·
      `20.886.801` é `ilegivel`. A §5 publica `1.192.196` e `20.921.102` porque mediu os
      valores **crus**; as fixtures do teste usam amplitudes arredondadas.
- [ ] **`contra` nunca é `null` havendo séries existentes** — inclusive com razão exatamente 1.
- [ ] As **fronteiras** valem o `>` estrito: 50× convive, 1.000.000× avisa.
- [ ] Série de **amplitude zero** contra série real é `ilegivel` (razão indefinida), e duas
      de amplitude zero convivem.
- [ ] `amplitudeRatio` é **simétrica** e independe de `unit.type`.
- [ ] `comparabilidade` devolve `convive` com **zero** séries existentes (não lança).
- [ ] O corte de 50 está numa constante nomeada, não hardcoded no meio da função.
- [ ] O limiar do caso patológico é **1.000.000** (seis ordens de grandeza), com a medição
      dos 78 pares registrada na §5 da spec — e com a ressalva explícita de que, ao contrário
      do corte de 50, **ele não cai em faixa vazia**, logo é número declarado.
- [ ] `grep -r "svelte\|fetch\|window" app/src/domain/scales.js` → sem resultado.

## Auto-revisão

- **Cobertura da spec:** §5 inteira — razão de amplitude (tarefa 1), corte 50 e o
  veredito que alimenta a ficha (tarefa 2), o caso patológico (tarefa 3). O "aviso
  duro" e as duas ações (normalizar / remover) **não** moram aqui: são a ficha da modal
  (fatia 08) e os stores (fatia 05).
- **Regra rejeitada preservada:** `unit.type` como critério **não** aparece — o teste
  "o insumo é a MAGNITUDE" é o que impede alguém de reintroduzi-lo.
- **Sem placeholders:** só a Tarefa 3 tem um número em aberto, e ele é apresentado como
  **decisão a medir**, com o bloqueio declarado — não como `TODO` silencioso.

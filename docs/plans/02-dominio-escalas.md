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
    `Veredito = { veredito: 'convive'|'avisa', ratio: number, contra: Series|null }` —
    `ratio` é o **pior caso** contra as existentes; `contra` é a série que o produziu
    (`null` quando não há existentes).

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

  it('avisa: razão > 50 aponta a série culpada', () => {
    const pop = serie('populacao-total-anual', 154524335, 204861525);
    const selic = serie('selic-meta-acum-12m', 2.0, 44.22);
    const v = comparabilidade(selic, [pop]);
    expect(v.veredito).toBe('avisa');
    expect(v.ratio).toBeGreaterThan(AMPLITUDE_LIMIT);
    expect(v.contra.id).toBe('populacao-total-anual');
  });

  it('reporta o PIOR caso entre várias existentes', () => {
    const igpm = serie('igpm-acum-12m', -7.97, 32.0);          // 39,97
    const pop = serie('populacao-total-anual', 154524335, 204861525);
    const v = comparabilidade(serie('selic-meta-acum-12m', 2.0, 44.22), [igpm, pop]);
    expect(v.contra.id).toBe('populacao-total-anual'); // 1.192.196 > 1,056
  });

  it('sem existentes, não há com o que comparar', () => {
    const v = comparabilidade(serie('x', 0, 10), []);
    expect(v.veredito).toBe('convive');
    expect(v.contra).toBeNull();
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
  let pior = { ratio: 1, contra: null };
  for (const existente of seriesExistentes) {
    const ratio = amplitudeRatio(novaSerie, existente);
    if (ratio > pior.ratio) pior = { ratio, contra: existente };
  }
  return {
    veredito: pior.ratio > AMPLITUDE_LIMIT ? 'avisa' : 'convive',
    ratio: pior.ratio,
    contra: pior.contra,
  };
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

### Tarefa 3 (decisão pendente): o grau de aviso para o caso patológico

**Contexto honesto.** A §5 fixa **um** corte (50×, `avisa`) e descreve um segundo grau —
*"nem dois eixos salvam; a combinação não é legível, ponto"* — usando o par
`populacao-total × populacao-variacao` (**20.921.102×**) como exemplo. **O limiar desse
segundo grau não está decidido em lugar nenhum**, e ao contrário do corte de 50 ele
**não é livre**: a faixa medida 125–20.921.102 contém **40 pares**, então qualquer
escolha fora da faixa vazia (21,2–125) particiona esses 40 de um jeito diferente.

Esta tarefa existe para **fechar a decisão com medição**, conforme a convenção do
projeto (*número medido, não estimado*), não para chutar um número no código.

**Arquivos:**
- Modificar: `sitio/app/src/domain/scales.js` (acrescentar `AMPLITUDE_LIMIT_ILEGIVEL`)
- Teste: `sitio/app/src/domain/scales.test.js`
- Documentar: a decisão vai para `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` §5

- [ ] **Passo 1: medir os 78 pares reais**

Escrever um script temporário (não commitado) que lê os 13 JSONs reais de `dados/`,
calcula a razão de amplitude de todos os 78 pares e imprime a distribuição ordenada.
Registrar a medição com a data no corpo da decisão.

Run: `cd sitio/app && node ../../scratch/medir-pares.mjs` (script descartável)
Esperado: a lista ordenada das razões, confirmando o vazio em (21,2 · 125) e a
distribuição acima de 125.

- [ ] **Passo 2: decidir o limiar e registrar**

Com a distribuição em mão, escolher o limiar do segundo grau e **escrever o porquê em
uma frase** na §5 da spec, junto com o número medido e a data. Critério: o limiar deve
cair num ponto onde a separação faça sentido para o produto (a série menor já não é
legível), e o motivo deve ser auditável.

- [ ] **Passo 3: implementar com o número decidido**

Acrescentar a `scales.js` — substituindo `<LIMIAR>` pelo número medido no Passo 2:

```js
/** Acima daqui nem dois eixos salvam — a série menor vira reta colada no zero (§5).
 * Medido sobre os 78 pares reais em <data> — registro na §5 da spec. */
export const AMPLITUDE_LIMIT_ILEGIVEL = 1000;
```

*(`1000` acima é ilustrativo — trocar pelo número do Passo 2, medido, não copiado.)*

E estender `Veredito.veredito` para `'convive'|'avisa'|'ilegivel'`, com o teste do par
`populacao-total × populacao-variacao` (20.921.102) exigindo `'ilegivel'`.

- [ ] **Passo 4: rodar e ver passar; commitar**

```bash
cd sitio && npm --prefix app test
git add app/src/domain/scales.js app/src/domain/scales.test.js docs/specs/
git commit -m "feat(domain): decide por medicao o limiar do caso patologico de escala"
```

> **Bloqueio declarado:** este passo **não é opcional e não pode ser chutado**. Se o
> limiar não for medido e registrado, o veredito `ilegivel` fica de fora e a §5 fica
> meio-implementada. Alternativa legítima: adiar `ilegivel` para uma iteração futura e
> registrar isso na spec — mas a decisão precisa estar escrita.

---

## Critérios de aceite da fatia 02

- [ ] `npm test` → verdes, incluindo os dois números medidos sobre as fixtures (`1,056`
      convive; `1.192.259` avisa — a §5 publica `1.192.196` porque mediu valores crus).
- [ ] `amplitudeRatio` é **simétrica** e independe de `unit.type`.
- [ ] `comparabilidade` devolve `convive` com **zero** séries existentes (não lança).
- [ ] O corte de 50 está numa constante nomeada, não hardcoded no meio da função.
- [ ] O limiar do caso patológico está **medido e registrado** na §5 da spec (ou a spec
      diz explicitamente que `ilegivel` fica para depois).
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

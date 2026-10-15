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


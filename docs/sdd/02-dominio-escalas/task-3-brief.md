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

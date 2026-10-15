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
    `distancia` é a **mínima medida contra as outras, no pior caso entre as quatro visões**
    (R25: `separacaoGlobal([cor, outra])`, não `deltaEOK` cru); `contra` é o índice da que mais
    se aproxima (`-1` se não há outras).

- [ ] **Passo 1: escrever os testes que falham**

```js
import { avisoDeColisao, LIMIAR_COLISAO } from './color.js';

describe('avisoDeColisao (§1, R25)', () => {
  it('a régua é o envelope da paleta, não um número solto', () => {
    expect(LIMIAR_COLISAO).toBe(LIMIAR_ENVELOPE);
  });

  it('mede o PIOR CASO entre as quatro visões — e avisa onde a visão normal não avisaria', () => {
    // O par que a §1 cita como o colapso do daltonismo: dista 0,1114 em visão normal
    // (ACIMA do limiar) e colapsa para 0,0067 sob deuteranopia. É o teste que impede a
    // régua de voltar a medir só visão normal.
    const r = avisoDeColisao('#309aff', ['#9581ff']);
    expect(r.colide).toBe(true);
    expect(r.distancia).toBeCloseTo(0.0067, 3);
    expect(r.contra).toBe(0);
  });

  it('avisa quando a cor chega perto de outra, mesmo em visão normal', () => {
    // Medido: pior caso de (#6351ca, #6a58c8) = 0,0208
    const r = avisoDeColisao('#6351ca', ['#6a58c8', '#ffd000']);
    expect(r.colide).toBe(true);
    expect(r.distancia).toBeCloseTo(0.0208, 3);
    expect(r.contra).toBe(0);
  });

  it('não avisa quando a cor é bem separada em TODAS as visões', () => {
    // Medido: pior caso de (#00fddc, #d25200) = 0,3041 · de (#9d99ed, #6351ca) = 0,2049
    expect(avisoDeColisao('#00fddc', ['#d25200']).colide).toBe(false);
    expect(avisoDeColisao('#9d99ed', ['#6351ca']).colide).toBe(false);
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
 *
 * **R25 — a distância é o PIOR CASO entre as quatro visões, não a distância em visão
 * normal.** O limiar é o envelope da paleta, que é um pior-caso; comparar uma distância
 * de visão normal contra ele é comparar duas medidas diferentes. Medido (2026-10-14):
 * o par que a §1 cita como o colapso do daltonismo (`#309aff` × `#9581ff`) dista
 * **0,1114** em visão normal — acima do limiar, então a régua antiga **não avisava** —
 * e **0,0067** sob deuteranopia. O aviso ficava cego exatamente no risco que o envelope
 * existe para pegar.
 */
export function avisoDeColisao(cor, outrasCores) {
  if (outrasCores.length === 0) return { colide: false, distancia: Infinity, contra: -1 };
  let distancia = Infinity;
  let contra = -1;
  outrasCores.forEach((outra, i) => {
    const d = separacaoGlobal([cor, outra]);   // pior caso entre as quatro visões
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
- [ ] `avisoDeColisao` mede o **pior caso entre as quatro visões** (R25): o par `#309aff` ×
      `#9581ff`, que dista 0,1114 em visão normal e colapsa para 0,0067 sob deuteranopia,
      **é sinalizado** — com a régua de visão normal ele passava em silêncio.
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

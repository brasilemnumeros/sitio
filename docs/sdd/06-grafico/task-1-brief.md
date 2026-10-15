### Tarefa 1: A conversão pura (`chart/points.js`) — e a dependência

**Arquivos:**
- Criar: `sitio/app/src/chart/points.js`
- Teste: `sitio/app/src/chart/points.test.js`

**Interfaces:**
- Consome: nada (pura).
- Produz:
  - `paraPontosDaBiblioteca(data) -> {time, value}[]` — de `{date, value}` (a forma canônica,
    `validate.js`) para o tempo da lib, em **segundos UNIX UTC**, **ordenado por tempo**.
  - `paraISO(segundos) -> 'YYYY-MM-DD'` — o caminho de volta, para o callback da janela.

> 🔴 **Por que esta tarefa existe separada (correção de pré-voo, 2026-10-14).** A versão anterior
> deste plano punha a conversão **dentro** do `adapter.js` e o teste importava de lá. Só que o
> adapter importa `lightweight-charts` **e** `./bands.js` — e o `bands.js` só nasce na Tarefa 2.
> Resultado: a Tarefa 1 **não passaria no próprio teste** (módulo inexistente). Além disso, a
> conversão é a **única parte do gráfico testável sem DOM** (§10.7) — ela merece viver sozinha,
> sem arrastar a biblioteca para o teste.

- [ ] **Passo 0: a dependência**

`lightweight-charts` **não estava** no `app/package.json` (ela só é necessária de verdade a
partir da Tarefa 3, mas instalar aqui evita surpresa). É dependência de **runtime**:

```bash
cd sitio/app && NODE_ENV=development npm install lightweight-charts@^5.2.0
```

⚠️ **`NODE_ENV=development` é obrigatório** nesta máquina (R11). Conferido no pré-voo: resolve
para **5.2.1**, e `createChart`/`LineSeries`/`LineStyle`/`ISeriesPrimitive` existem nessa versão.

- [ ] **Passo 1: escrever os testes que falham**

`sitio/app/src/chart/points.test.js`:

```js
import { paraPontosDaBiblioteca, paraISO } from './points.js';

describe('paraPontosDaBiblioteca', () => {
  it('converte {date, value} para o tempo da lib (segundos UNIX UTC)', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-03-01', value: 42 },
      { date: '2004-04-01', value: 43 },
    ]);
    expect(pontos).toEqual([
      { time: 1078099200, value: 42 },
      { time: 1080777600, value: 43 },
    ]);
  });

  it('ordena por tempo — a lib exige série ordenada', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-04-01', value: 43 },
      { date: '2004-03-01', value: 42 },
    ]);
    expect(pontos.map((p) => p.value)).toEqual([42, 43]);
  });

  it('corta a data em 10 caracteres — o dado é diário, não horário', () => {
    // O caminho publicado já teve data com hora; sem o corte, o fuso desloca o ponto de dia.
    const [p] = paraPontosDaBiblioteca([{ date: '2004-03-01T23:00:00-03:00', value: 1 }]);
    expect(p.time).toBe(1078099200);
  });

  it('série vazia devolve lista vazia, não quebra', () => {
    expect(paraPontosDaBiblioteca([])).toEqual([]);
  });
});

describe('paraISO', () => {
  it('volta de segundos UNIX para YYYY-MM-DD', () => {
    expect(paraISO(1078099200)).toBe('2004-03-01');
  });
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA (`Cannot find module './points.js'`).

- [ ] **Passo 3: implementar**

`sitio/app/src/chart/points.js`:

```js
/** Pura: {date,value} -> {time,value} no formato da lib, ordenado por tempo.
 * O tempo da lib é em SEGUNDOS UNIX UTC. O corte em 10 caracteres não é cosmético: o dado
 * já veio com hora em algum arquivo, e sem ele o fuso desloca o ponto de dia. */
export function paraPontosDaBiblioteca(data) {
  return data
    .map(({ date, value }) => ({
      time: Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000),
      value,
    }))
    .sort((a, b) => a.time - b.time);
}

/** O caminho de volta, para o callback da janela visível (§8.1). */
export function paraISO(segundos) {
  return new Date(segundos * 1000).toISOString().slice(0, 10);
}
```

- [ ] **Passo 4: rodar e ver passar.**

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/chart/points.js app/src/chart/points.test.js app/package.json app/package-lock.json
git commit -m "feat(chart): conversao pura para o formato da lib, testada sem DOM"
```

---


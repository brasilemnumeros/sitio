### Tarefa 6: Deduplicar na conversão (`points.js`) — o achado que só apareceu na tela

**Arquivos:**
- Modificar: `sitio/app/src/chart/points.js` e `points.test.js`

> 🔴 **Medido em 2026-10-15, e a primeira medição estava ERRADA pela metade.** Eu havia provado
> que a lib *aceita* `time` repetido e escrevi isso no critério de aceite ("a sonda provou que não
> lança"). O implementador da T5 achou o contrário. Os dois estavam certos — **de builds
> diferentes**:

| build | duplicata adjacente | duplicata espalhada |
|---|---|---|
| **produção** (`standalone.production.mjs`) | ✅ aceita | ✅ aceita |
| **desenvolvimento** (`standalone.development.mjs`) | 🔴 **lança** | 🔴 **lança** |

> A mensagem é `Assertion failed: data must be asc ordered by time, index=N, time=X, prev time=X`.
> **A asserção é removida no build de produção.** Ou seja, o pior dos mundos:
>
> - **Em produção**, o dado errado passa e desenha um **segmento vertical** — silencioso.
> - **Em desenvolvimento**, lança — e a exceção **aborta o laço** de `definirSeries`, então
>   **as séries seguintes nunca desenham**. Foi exatamente isso que fez o achado A da T4
>   ("o gráfico ficou preso na 1ª série") ser tão difícil de diagnosticar.
>
> **E o dado real tem duplicata em 4 dos 13 arquivos**: `caged/caged-total-mensal.json`
> (`1995-10`, `2005-10`, `2015-10`), `mvgr/mvgr-nominal.json` e `mvgr/mvgr-real.json`
> (`2005-10`, `2015-10`), `pib/pib-real-anual.json` (`2005-01`, `2015-01`).
>
> **Portanto isto NÃO é problema só de dado, para a fatia 11.** A conversão é a fronteira: um
> lugar, e todo consumidor se beneficia. A fatia 11 decide o que fazer com os **arquivos**; aqui
> garantimos que o app **não quebra nem mente** com o que já está publicado.

- [ ] **Passo 1: o teste que falha**

```js
it('deduplica o mesmo mês — a lib LANÇA em desenvolvimento com tempo repetido', () => {
  // Medido: o build de DEV tem asserção (`data must be asc ordered by time`) que o de PROD não
  // tem. E a exceção aborta o laço de quem chama — as séries seguintes nunca desenham.
  const pontos = paraPontosDaBiblioteca([
    { date: '2005-01-01', value: 3.2 },
    { date: '2005-01-01', value: 3.1 },   // repetida
    { date: '2005-02-01', value: 3.4 },
  ]);
  expect(pontos).toHaveLength(2);
  // Fica a ÚLTIMA leitura do mês: numa república, a posterior é a revisão.
  expect(pontos[0].value).toBe(3.1);
});

it('duplicata ESPALHADA também cai — não é só a vizinha', () => {
  const pontos = paraPontosDaBiblioteca([
    { date: '2005-01-01', value: 1 },
    { date: '2010-01-01', value: 2 },
    { date: '2005-01-01', value: 9 },     // repetida, fora de ordem
  ]);
  expect(pontos.map((p) => p.value)).toEqual([9, 2]);
});
```

- [ ] **Passo 2: rodar e ver falhar** → FALHA (hoje devolve 3 e 3).

- [ ] **Passo 3: implementar**

```js
export function paraPontosDaBiblioteca(data) {
  const porTempo = new Map();
  for (const { date, value } of data) {
    porTempo.set(Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000), value);
  }
  // O Map já resolve as duas coisas de uma vez: o mesmo `time` SOBRESCREVE (fica a última
  // leitura — numa república, a posterior é a revisão), e a iteração de um Map é por ordem de
  // inserção, então o `.sort` continua garantindo a ordem crescente que a lib exige em DEV.
  return [...porTempo].map(([time, value]) => ({ time, value })).sort((a, b) => a.time - b.time);
}
```

- [ ] **Passo 4: rodar e ver passar.** Os testes antigos (ordem, corte de 10 caracteres, série
      vazia, `paraISO`) têm de continuar verdes.

- [ ] **Passo 5: commitar**

```bash
cd sitio && git add app/src/chart/points.js app/src/chart/points.test.js
git commit -m "fix(chart): deduplica o mesmo mes na conversao (a lib lanca em dev e mente em prod)"
```

---

## Critérios de aceite da fatia 06

- [x] A **§12.2 está fechada** na spec (2026-10-14): a colisão dos rótulos foi **medida com 10 séries**
      (tabela de 4 cenários), e a decisão é legenda externa + rótulo no crosshair, **sem** `title`
      na ponta. A **fatia 07** precisa da legenda externa.
- [ ] **A conversão pura está testada sem DOM** (`points.test.js`): segundos UNIX UTC, ordem
      por tempo, corte da data em 10 caracteres, e série vazia devolvendo lista vazia.
- [ ] 🔴 **Datas duplicadas: `paraPontosDaBiblioteca` DEDUPLICA** (Tarefa 6). A primeira medição
      deste critério estava **errada pela metade** — ver a correção medida abaixo. Quatro das 13
      séries publicadas têm leitura repetida no mesmo mês, e isso **quebra em desenvolvimento**.
- [ ] **Nenhuma série recebe `title`** (§12.2) e `lastValueVisible` segue ligado — conferido no
      código do adapter, não por impressão.
- [ ] `grep -rn "lightweight-charts" app/src` → só em `app/src/chart/` (§8, regra 1).
- [ ] `grep -rn "chart/adapter" app/src/components` → só `Chart.svelte` (§8, regra 2).
- [ ] **Clique na faixa não move o viewport** — conferido ao vivo, não por inspeção.
- [ ] Faixas **sem nenhuma cor de partido**; rótulo com `governo · SIGLA` (§2).
- [ ] Hachura no mandato em curso, **cortando no último dado** e não na data de hoje.
- [ ] Arrastar/scroll dão zoom; **duplo-clique também** (a T4 mediu que não dava); o minimapa
      mantém a referência do todo.
- [ ] **O eixo duplo funciona** (§5, Tarefa 5): as séries vão para o lado que o `axesStore`
      mandou, **os dois eixos aparecem**, e as séries de % ficam **legíveis** na captura — não
      esmagadas no fundo. Medido: sem isto, 9 de 10 séries ficam ilegíveis.
- [ ] **A janela inicial é o intervalo COMPLETO**, não o padrão da lib (a T4 mediu que vinha
      2007–2024). As faixas e o eixo têm de concordar sobre o domínio.
- [ ] `grep -rn "window\." app/src/chart app/src/components/Chart.svelte` → sem resultado.
- [ ] Testes puros (`paraPontosDaBiblioteca`, `paraISO`, `faixasVisiveis`, `tomDaFaixa`) passam
      em node, sem DOM.

## Auto-revisão

- **Cobertura da spec:** §2 (clique seleciona, zoom separado, minimapa, faixas sem cor,
  hachura) → tarefas 1–4; §8/§8.1 (só `chart/` importa a lib, só `Chart.svelte` fala com
  o adapter, store → adapter) → tarefas 1 e 4; §7.3.5 (hachura cortando no último dado)
  → tarefa 2; §3 (o trilho é seletor **desacoplado** do eixo — não é régua) fica para a
  fatia 09.
- **Portão respeitado:** a tarefa 0 fecha a §12.2 **antes** de qualquer código de produção.
  Os **logos dos partidos** (§12.3) entram na fatia 09 (trilho e ficha), não aqui — o
  gráfico não os comporta (§2: ~27 px em 515).
- **Placeholder declarado:** o interior dos métodos do adapter é **esqueleto comentado**
  por natureza — a API da lib **deve** ser lida nos typings da versão instalada antes de
  codar. Os timestamps do teste (`1078099200`, `1080777600`) foram conferidos por cálculo.
- **Consistência de nomes:** `criarAdapter`, `paraPontosDaBiblioteca`, `criarPrimitivaDeFaixas`,
  `faixasVisiveis`, `tomDaFaixa`, `criarNavigator` — consumidos por `Chart.svelte` (aqui) e
  pela fatia 07.

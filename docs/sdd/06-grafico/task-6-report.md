# Tarefa 6 — Deduplicar na conversão (`points.js`)

**Status:** ✅ concluída. **Commit:** `00eaab1` — `fix(chart): deduplica o mesmo mes na conversao (a lib lanca em dev e mente em prod)` (branch `feat/camada-de-graficos`).
**Suíte final:** `Test Files 15 passed (15)` / `Tests 118 passed (118)`.

## O problema (medido, 2026-10-15)

A lib `lightweight-charts` reage de formas opostas ao mesmo dado, conforme o build:

| build | tempo repetido |
|---|---|
| produção (`standalone.production.mjs`) | ✅ aceita — e desenha um **segmento vertical**, em silêncio |
| desenvolvimento (`standalone.development.mjs`) | 🔴 **lança** `data must be asc ordered by time` |

A asserção existe **só** no build de dev. Pior dos mundos: em produção o gráfico mente (segmento
vertical), em desenvolvimento lança — e a exceção **aborta o laço** de `definirSeries`, então as
séries seguintes nunca desenham. Foi essa a causa-raiz do "gráfico preso na 1ª série" (achado A da T4).

Quatro das 13 séries publicadas têm duas leituras no mesmo mês: `caged/caged-total-mensal.json`
(`1995-10`, `2005-10`, `2015-10`), `mvgr/mvgr-nominal.json` e `mvgr/mvgr-real.json` (`2005-10`,
`2015-10`), `pib/pib-real-anual.json` (`2005-01`, `2015-01`).

A conversão é a fronteira certa: um só lugar, todo consumidor se beneficia. A fatia 11 decide o
destino dos **arquivos**; aqui garantimos que o app não quebra nem mente com o que já está publicado.

## TDD — evidência RED → GREEN

### RED (2 testes novos, antes de tocar em `points.js`)

`NODE_ENV=development npm test`:

```
 FAIL  src/chart/points.test.js > paraPontosDaBiblioteca > deduplica o mesmo mês — a lib LANÇA em desenvolvimento com tempo repetido
      41|     expect(pontos).toHaveLength(2);
       |                    ^
      AssertionError: expected [ {…}, {…}, {…} ] to have a length of 2 but got 3

 FAIL  src/chart/points.test.js > paraPontosDaBiblioteca > duplicata ESPALHADA também cai — não é só a vizinha
      AssertionError: expected [ 1, 9, 2 ] to deeply equal [ 9, 2 ]
      52|     expect(pontos.map((p) => p.value)).toEqual([9, 2]);

 Test Files  1 failed | 14 passed (15)
      Tests  2 failed | 116 passed (118)
```

RED nas **linhas certas**: 41 (`toHaveLength`) e 52 (`toEqual`) — exatamente as asserções sob teste.
Não houve RED em asserção anterior, o que confirma que o caminho foi exercido. A suíte pré-existente
(ordem por tempo, corte em 10 caracteres, série vazia, `paraISO`) já estava verde antes e continuou.

### GREEN (após implementar)

`NODE_ENV=development npm test`:

```
 Test Files  15 passed (15)
      Tests  118 passed (118)
   Duration  1.64s
```

Os 118 são os 116 anteriores + 2 novos. Os testes antigos seguem verdes (nenhuma regressão).

## Implementação

`app/src/chart/points.js` — `paraPontosDaBiblioteca` passa por um `Map` indexado por `time`:

```js
export function paraPontosDaBiblioteca(data) {
  const porTempo = new Map();
  for (const { date, value } of data) {
    porTempo.set(Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000), value);
  }
  // O Map já resolve as duas coisas de uma vez: o mesmo `time` SOBRESCREVE (fica a última
  // leitura — numa república, a posterior é a revisão), e a iteração de um Map é por ordem de
  // inserção, então o `.sort` continua garantindo a ordem crescente que a lib exige em DEV.
  return [...porTempo]
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time);
}
```

O `Map` resolve as duas propriedades de uma vez: **sobrescreve** o `time` repetido (fica a última
leitura — numa república, a posterior é a revisão) e, como a iteração de um `Map` é por ordem de
inserção, o `.sort` final continua entregando a ordem crescente que a lib exige em DEV.

`paraISO` não foi tocada. O corte em 10 caracteres foi preservado dentro do laço.

## Desvio do brief

Nenhum. Nada em `bands.js`, `adapter.js`, `navigator.js`, stores, arquivos de dado, `sitio/docs/`
ou Jekyll foi tocado. `git add` só de `app/src/chart/points.js` e `app/src/chart/points.test.js`
(2 files changed, 31 insertions, 5 deletions).

## Arquivos

- Modificado: `sitio/app/src/chart/points.js`
- Modificado: `sitio/app/src/chart/points.test.js`
- Este relatório: `sitio/.superpowers/sdd/06-grafico/task-6-report.md`

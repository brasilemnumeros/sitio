# Tarefa 2 — Faixas de governo (`chart/bands.js`)

**Fatia 06 · branch `feat/camada-de-graficos` · commit `79b6510`**

> `feat(chart): faixas de governo como primitiva de pane, sem cor de partido`

## Status: CONCLUÍDA

Arquivos criados (únicos no commit):
- `sitio/app/src/chart/bands.js` (111 linhas)
- `sitio/app/src/chart/bands.test.js` (45 linhas)

`git add` só dos dois arquivos — nada mais foi tocado.

## O que foi entregue

- `faixasVisiveis(mandatos, {from, to})` — pura, testada.
- `tomDaFaixa(indice)` + `TONS_DE_FAIXA` — pura, testada.
- `criarPrimitivaDeFaixas(mandatos, {aoClicar, ultimoDadoPorSerie})` — primitiva de **pane**
  (`paneViews`/`updateAllViews`/`attached`/`detached`/`hitTest`), **sem teste de unidade**
  (a lib exige canvas; `vite.config.js` roda em `node` sem DOM — §10.7).

## Evidência TDD

### RED (antes de existir `bands.js`)

```
RUN  v5.0.4 /Users/lucas/Workspace/brasilemnumeros/sitio/app
❯ src/chart/bands.test.js (0 test)
Failed Suites 1
FAIL  src/chart/bands.test.js [ src/chart/bands.test.js ]
Error: Cannot find module './bands.js' imported from .../src/chart/bands.test.js
 Test Files  1 failed | 14 passed (15)
      Tests  108 passed (108)
```

**Ressalva honesta:** este RED é *module-not-found*, não uma falha de asserção — é o RED
natural de um módulo novo (nada existe ainda). Para provar que as **asserções** mordem,
rodei duas sabotagens sobre a implementação já verde, cada uma no ponto exato que um teste
deve pegar:

**Sabotagem A — troca sobreposição por contenção** em `faixasVisiveis`
(`m.inicio <= ate && fim >= de` → `m.inicio >= de && fim <= ate`):

```
Tests  3 failed | 4 passed (7)
× devolve só as faixas que TOCAM a janela        expected [] to deeply equal [ 'b', 'c' ]
× a faixa que começa antes e termina dentro ...   expected [] to deeply equal [ 'a', 'b' ]
× janela sem fim (mandato em curso) ...           expected [] to deeply equal [ 'c' ]
```

**Sabotagem B — tom neutro vira cor da paleta** (`TONS_DE_FAIXA[1] = '#6351ca'`):

```
Tests  1 failed | 6 passed (7)
× os tons são neutros — nenhuma cor de partido (§2, §7.3.4)
  expected [ '#6351ca', '#00fddc', …(8) ] to not include '#6351ca'
```

Arquivo restaurado a partir de cópia e reconferido verde antes do commit.

### GREEN

```
Test Files  15 passed (15)
      Tests  115 passed (115)
```

(108 → 115: os 7 testes novos da Tarefa 2.)

## Verificação da primitiva contra os typings instalados

Conferido em `node_modules/lightweight-charts/dist/typings.d.ts` (não de memória):

| item | typings | brief | ok |
|---|---|---|---|
| anexo | `IPaneApi.attachPrimitive(p: IPanePrimitive)` L2055 | pane, não série | ✓ |
| forma | `IPanePrimitiveBase` = `{updateAllViews?, paneViews?, attached?, detached?, hitTest?}` L2135-2174 | idem | ✓ |
| `paneViews` | `(): readonly IPanePrimitivePaneView[]` L2148 | retorna `[view]` | ✓ |
| view | `{zOrder?(): PrimitivePaneViewZOrder, renderer(): IPrimitivePaneRenderer\|null}` L2178-2191 | idem | ✓ |
| renderer | `draw(target: CanvasRenderingTarget2D, utils?)` L2300 | idem | ✓ |
| `attached` | `PaneAttachedParameter = {chart, requestUpdate}` L3470-3479 | `{chart, requestUpdate}` | ✓ |
| `useBitmapCoordinateSpace` | método do `CanvasRenderingTarget2D` (import de `fancy-canvas`, L3) | chamado **no `target`**, nada importado de `fancy-canvas` | ✓ |

## Achados — coisas do brief que parecem erradas ou ambíguas

Esta tarefa não tem teste que pegue a primitiva, então o brief é a barreira. As ressalvas
abaixo vêm da leitura dos typings instalados:

1. **Import morto em `bands.js`.** O Passo 3 do brief abre com
   `import { PALETA_PADRAO } from '../domain/color.js';` — mas `PALETA_PADRAO` **nunca é
   usado** em `bands.js` (só no teste). Transcrevi verbatim, mas é um import sem uso que
   deveria sair. O lint não reclama, então não quebra nada — mas é ruído. **Não removi por
   conta própria** (regra: transcrever, não "melhorar"); fica para o revisor decidir.

2. **`hitTest` devolve `PrimitiveHoveredItem` sem o campo obrigatório `zOrder`.**
   Os typings (L3847, L3851) marcam `externalId: string` **e** `zOrder: PrimitivePaneViewZOrder`
   como **obrigatórios** (não opcionais). O brief retorna
   `{ externalId, cursorStyle, hitTestPriority }` — sem `zOrder`. Em JS puro não há
   type-check, então roda; mas um TS/`checkJs` flagraria. O valor coerente seria
   `zOrder: 'bottom'`. **Achado a confirmar visualmente na Tarefa 4** — se o cursor/click
   se comportar estranho, este é o primeiro suspeito.

3. **Interface declarada ≠ interface implementada: `COBERTURA` não é usado.** O cabeçalho
   da Tarefa 2 diz *"Consome: `COBERTURA` (fatia 03) para saber onde a hachura corta"*, mas
   o código não importa `COBERTURA` — o corte da hachura vem do callback
   `ultimoDadoPorSerie?.(m)`. As duas coisas descrevem o mesmo requisito (§7.3.5) por
   caminhos diferentes. Não é bug, mas o "Consome:" está desatualizado em relação ao código.

4. **`paneViews()` devolve um array novo a cada chamada.** O typings (L2145-2146) avisa
   explicitamente: *"the library uses internal caches based on references to arrays… should
   try to return the same array if nothing changed."* O brief faz `return [view]` dentro do
   método, criando um array novo a cada chamada → invalida o cache da lib. Impacto provável:
   custo de redesenho, não incorreção. Um `const views = [view]` fora e `return views`
   resolve. **Não mudei** — é desvio de estrutura, e a regra diz para não improvisar. Vale
   confirmar na Tarefa 4 (perfil/comportamento sob pan).

5. **Limite `>=`/`<=` da sobreposição não é exercido pelos testes.** Nenhum dos 5 casos tem
   `fim === from` nem `inicio === to` exatamente — testei a sabotagem `>=` → `>` e ela **não
   é pega**. Ou seja: uma faixa que encosta na janela só na fronteira exata não está coberta.
   Não inventei teste novo (o brief define os testes), mas fica registrado como lacuna.

## Fora de escopo / não feito

- Sem teste de unidade para a primitiva (por desenho — §10.7).
- Não toquei `sitio/docs/`, o site Jekyll, deps, nem `progress.md`.
- Verificação visual fica para a Tarefa 4.

---

# Rodada de correção 1/5

Os cinco achados acima foram conferidos pelo controlador nos typings e **todos procedem**.
As correções abaixo vêm do brief atualizado (transcritas, não improvisadas).

## Correções aplicadas

1. **Import morto — removido.** `import { PALETA_PADRAO } from '../domain/color.js'` saiu de
   `bands.js`. Ela continua **só** no teste, que precisa dela para o caso de neutralidade.
2. **`zOrder` obrigatório em `hitTest`.** O retorno passou a
   `{ externalId: f.id, zOrder: 'bottom', cursorStyle: 'pointer', hitTestPriority: 0 }`.
   Typings L3847/3851 marcam `externalId` **e** `zOrder` como obrigatórios em
   `PrimitiveHoveredItem`.
3. **`paneViews()` com referência estável.** O array virou `const VISOES = [view]`, criado
   **uma vez** e devolvido sempre — a lib cacheia por referência (L2145-46). Era custo de
   redesenho, não incorreção.
4. **Cabeçalho "Consome" — correção do brief.** O brief foi corrigido para dizer a verdade:
   consome **nada de store nem de `domain/`** — o último dado vem do callback
   `ultimoDadoPorSerie` (mesmo requisito §7.3.5, caminho diferente). Não havia referência a
   `COBERTURA` no código; nada a alterar em `bands.js`.
5. **Lacuna no limite — teste novo.** Adicionado o caso em que a janela começa **exatamente**
   quando `x` termina e termina exatamente quando `y` começa:
   `faixasVisiveis(J, { from: '2004-12-31', to: '2005-01-01' })` → `['x', 'y']`.

Não toquei na **lógica** de `faixasVisiveis`, nas cores/tons, no desenho além dos itens 2 e 3,
em `sitio/docs/`, no site Jekyll, nem em deps.

## Evidência — suíte verde (116 testes)

```
Test Files  15 passed (15)
      Tests  116 passed (116)
```

(115 → 116: o teste de limite novo.)

## Evidência — o teste novo MORDE (sabotagem `>=` → `>`)

Sabotagem no ponto exato: `(m.fim ?? '9999-12-31') >= de` → `>` em `faixasVisiveis`:

```
❯ src/chart/bands.test.js (8 tests | 1 failed)
   × o limite é INCLUSIVO nas DUAS pontas — `>=` não pode virar `>`

 FAIL  src/chart/bands.test.js > faixasVisiveis > o limite é INCLUSIVO nas DUAS pontas — `>=` não pode virar `>`
AssertionError: expected [ 'y' ] to deeply equal [ 'x', 'y' ]
❯ src/chart/bands.test.js:41:8

 Test Files  1 failed | 14 passed (15)
      Tests  1 failed | 115 passed (116)
```

RED **na asserção sob teste** (linha 41), não numa asserção anterior — o caminho é exercido.
**Revertido** e reconferido verde (o bloco "116 passed" acima é a corrida pós-reversão).

## Rodada de correção 2/5

**Achado (re-revisão):** o rótulo da faixa (`fillText('Lula III · PT', …)`) era desenhado **sem
clip**. O código só checava `if (largura > 70 * r)`, mas 70px é limiar fixo — um rótulo longo
como `FHC II · PSDB` numa faixa de ~75px **vazava para a faixa vizinha**, e o usuário lia o
governo errado.

**Correção (uma linha de bloco, transcrita do brief):** acrescentado `context.beginPath()` +
`context.rect(x1, 0, largura, bitmapSize.height)` + `context.clip()` **antes** do `fillText`.

**Localização:** dentro do mesmo `context.save()/restore()` que já envolvia o rótulo
(`if (largura > 70 * r) { context.save(); … context.clip(); context.fillText(…); context.restore(); }`).

**Independência da hachura:** o `clip` ficou **dentro** do `save()/restore()` do rótulo e **não**
afeta a hachura — a hachura (`if (f.emCurso)`) tem o seu próprio `save()/restore()` com o seu
próprio `clip`, separado e anterior no laço. Nada mais mudou: `faixasVisiveis`, os tons, a
hachura e o `hitTest` ficaram intactos.

**Testes:** `cd sitio/app && NODE_ENV=development npm test` → **116 passed (15 files)**. Esta
correção não tem teste de unidade (o `vite.config.js` roda em `node`, sem DOM — §10.7); a
conferência real é visual, na Tarefa 4.

# Fatia 04 — Domínio de cor (`src/domain/color.js`) — relatório

**Data:** 2026-10-14 · **Repo:** `sitio/` · **Branch:** `feat/camada-de-graficos` · **Commit:** `3cb3e33`
**Arquivos:** `app/src/domain/color.js` (novo, 5460 B) · `app/src/domain/color.test.js` (novo, 6072 B)
**Status:** ✅ concluída — todos os critérios de aceite verificados.

---

## 1. O que foi entregue

Um único arquivo puro, construído em quatro passos (tarefas 1→4 dos briefs):

| passo | exporta | fonte |
|---|---|---|
| 1 | `hexParaRgb`, `rgbParaHex`, `rgbParaOKLab`, `oklabParaRGB`, `deltaEOK` | OKLab / Ottosson (2020) |
| 2 | `VISOES`, `simularDaltonismo` | Machado, Oliveira & Fernandes (2009), severidade 1.0, em **RGB linear** |
| 3 | `PALETA_PADRAO` (10 fixas), `separacaoMinima`, `separacaoGlobal`, `LIMIAR_ENVELOPE` (0,09) | spec §1 |
| 4 | `LIMIAR_COLISAO` (= `LIMIAR_ENVELOPE`), `avisoDeColisao` | spec §1 (avisa, não bloqueia) |

Domínio puro: sem `svelte`, sem `fetch`, sem `window`, sem `document`. Nenhum import.
Comentários em português; identificadores de domínio em português (`PALETA_PADRAO`,
`simularDaltonismo`, `separacaoMinima`, `avisoDeColisao`) — R24.

## 2. A medição reproduz a §1 exatamente

Envelope medido com esta implementação (`ΔE_ok` = euclidiana em OKLab, matrizes em RGB
linear), conferido contra a tabela do brief da tarefa 3 e da §1 da spec:

| visão | medido agora | §1 / controlador |
|---|---|---|
| normal | 0,1112 | 0,1112 |
| protanopia | 0,0953 | 0,0953 |
| **deuteranopia** | **0,0950** | **0,0950** ← pior caso |
| tritanopia | 0,1061 | 0,1061 |
| **global** | **0,0950** | **0,0950** |

**Bate na 4ª casa.** Não houve afrouxamento de teste nem ajuste de matriz: os números
saíram de peça, e o pior caso `0,0950` é a própria garantia publicada na §1. Nenhuma
matriz foi digitada de memória — as três vêm do brief, que cita Machado et al. (2009).

## 3. TDD — evidência RED → GREEN

**RED** (`NODE_ENV=development npm test`, com `color.test.js` presente e `color.js` ausente):

```
FAIL  src/domain/color.test.js [ src/domain/color.test.js ]
Error: Cannot find module './color.js' imported from .../color.test.js
 Test Files  1 failed | 7 passed (8)
      Tests  57 passed (57)        ← as 19 asserções deste arquivo nem rodaram
```

**GREEN** (após a implementação):

```
 Test Files  8 passed (8)
      Tests  76 passed (76)
```

As 8 suítes (7 preexistentes + `color.test.js`) passam juntas — sem regressão nas fatias
01–03. Comando exato: `cd sitio/app && NODE_ENV=development npm test`.

## 4. Critérios de aceite da fatia — conferidos um a um

- ✅ **`npm test` verde, 4 visões, paleta de exatamente 10** — 76/76.
- ✅ **Ida e volta exata** em OKLab: além das 6 cores do brief, acrescentei a asserção
  sobre **as 10 cores da `PALETA_PADRAO`** (critério de aceite explícito), mais `#0e1117`
  e `#ffffff`. Todas voltam idênticas — `rgbParaHex(oklabParaRGB(rgbParaOKLab(c))) === c`.
- ✅ **Envelope medido = §1** (tabela acima), global **0,0950**.
- ✅ **O teste de não-regressão realmente morde.** Quebra deliberada: troquei `#00fddc`
  por `#3ac9e0` (uma "curadoria à mão" plausível) — a separação global cai a **0,0442**
  (protanopia 0,0442 · deuteranopia 0,0515), **abaixo do piso 0,09**, e o teste
  `TRAVA o envelope` falharia. O arquivo entregue tem a paleta original, não a quebrada.
- ✅ **`avisoDeColisao` informa sem bloquear** — o retorno é `{colide, distancia, contra}`;
  não existe ramo que rejeite/`throw` para uma cor escolhida. Só avisa.
- ✅ **Nenhuma cor de partido** — a paleta é de séries; nenhuma cor institucional (§7.3.4).
- ✅ **Domínio puro** — `grep -rEn "svelte|fetch|window|document" src/domain/color.js`
  → **sem resultado** (exit 1).

Números medidos nos testes (confere com o controlador): `dE(#6351ca,#6a58c8) = 0,0213` ·
`dE(#00fddc,#d25200) = 0,4275` · `dE(#6351ca,#9d99ed) = 0,2081` ·
`dE(#309aff,#9581ff)` normal 0,1114 → **deuteranopia 0,0067** (o colapso da §1).

## 5. Desvios e observações (nenhum bloqueia)

1. **Commits: um só, não quatro.** Os briefs mostram um commit por tarefa (`feat(domain):
   OKLab…`, `…quatro tipos de visao`, `…paleta de 10…`, `…aviso de colisao…`). Como o alvo
   é **um arquivo construído em quatro passos dentro da mesma sessão**, entreguei um único
   commit `3cb3e33` cobrindo os quatro. Reconstruir quatro commits exigiria versionar
   estados intermediários do arquivo — não vale o risco por um ganho cosmético de histórico.
   Se o ledger exigir os quatro, dá para fatiar; não fiz por conta própria.
2. **Sem edição da spec.** O brief da tarefa 3 lista `docs/specs/` no `git add` e manda
   "registrar a data na §1" **no caso de divergência**. Não houve divergência — a §1 já
   traz "Medido em 2026-10-14" e o 0,095 —, então **não toquei na spec** (ela segue
   "aguardando revisão do usuário", conforme AGENTS.md). Registro a checagem aqui.
3. **Nota sobre a paleta ingênua.** O teste `a paleta otimizada é melhor que a ingênua`
   usa 10 matizes de 36° em HSL/70/55, cujo global mede **0,0216** — bem abaixo do 0,095
   da `PALETA_PADRAO` (o teste passa folgado). A §1 cita **0,0061** para uma ingênua sob
   deuteranopia, que é uma paleta gerada de outro jeito; o brief não fixa esse número, e o
   teste do brief só compara os dois globais. **Não é contradição** — registro a diferença
   de construção para quem for reler a §1.
4. **AGENTS.md não atualizado por mim.** A tabela "Trabalho em andamento" ainda diz
   "nenhuma fatia foi implementada". É o ledger do controlador (`progress.md`); não
   escrevi nele nem no AGENTS.md para não invadir escopo alheio — fica o sinal.

## 6. Reproduzir

```bash
cd /Users/lucas/Workspace/brasilemnumeros/sitio/app
NODE_ENV=development npm test          # 8 arquivos, 76 testes, verdes

# Envelope medido:
node -e "import('./src/domain/color.js').then(({PALETA_PADRAO,separacaoMinima,VISOES})=>{
  for (const v of VISOES) console.log(v, separacaoMinima(PALETA_PADRAO,v).toFixed(4));
  console.log('global', Math.min(...VISOES.map(v=>separacaoMinima(PALETA_PADRAO,v))).toFixed(4));
});"
```

**Nada ficou pendente.** A fatia 05 (stores / `localStorage`) e a 06 (canal redundante no
desenho) consomem estes nomes — a lista exportada bate com a prevista na auto-revisão do
brief.

---

## 7. Rodada de correção 1/5

**Data:** 2026-10-14 · **Commit:** `5a5a769` · **Branch:** `feat/camada-de-graficos`

Correção do R25 (revisão §1). O que mudou:

- **`app/src/domain/color.js` — `avisoDeColisao` (linha 160).** Passou a medir
  `separacaoGlobal([cor, outra])` — o **pior caso entre as quatro visões** — em vez de
  `deltaEOK` em visão normal. O limiar (`LIMIAR_COLISAO = LIMIAR_ENVELOPE`) é um
  pior-caso, então a régua antiga comparava duas medidas diferentes. O par `#309aff` ×
  `#9581ff` mede **0,1114** em visão normal (acima do limiar, a régua antiga **não
  avisava**) e **0,0067** sob deuteranopia — o aviso ficava cego exatamente no risco que
  o envelope existe para pegar.
- **`app/src/domain/color.js:46`** — prosa de `oklabParaRGB` corrigida (documenta que
  não faz *clamp*; o *clamp* acontece em `rgbParaHex`).
- **`app/src/domain/color.test.js`** — testes novos do aviso com os valores medidos
  (0,0067 deuteranopia; 0,0208/0,3041/0,2049 no pior caso) e um comentário ajustado no
  teste da paleta ingênua: ela mede global **0,0216**, não os 0,0061 que a §1 cita (que é
  de outra construção); o teste só compara os dois globais, logo não é contradição.

**Comando e saída:**

```
cd /Users/lucas/Workspace/brasilemnumeros/sitio/app && NODE_ENV=development npm test
 Test Files  8 passed (8)
      Tests  77 passed (77)
```

Verde — 8 arquivos, 77 testes (era 76 antes do teste novo do R25). Commit de `5a5a769`
toca apenas `app/src/domain/color.js` e `app/src/domain/color.test.js` (2 files changed,
34 insertions, 9 deletions).

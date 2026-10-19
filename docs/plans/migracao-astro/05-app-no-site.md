# Fatia 05 — O app dentro do site

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** a `/` do site inclui o app (o artefato já construído), o **catálogo** e as séries são
servidos em dev pelo **mesmo** middleware (extraído, não copiado), e o **canário** do Tailwind passa
a guardar o CSS do `dist/` do Astro.

**Arquitetura:** o app é construído por Vite em `app/` e sai em `assets/js/app/app.js` (nome fixo). O
site só **inclui** esse artefato por `<div id="app">` + `<script>`. O middleware de dado local vira um
módulo único (`app/vite-plugins/dados-locais.js`) usado pelos **dois** configs — `app/vite.config.js`
e `astro.config.mjs`.

**Stack:** Vite 8 (o do app) · `@tailwindcss/vite` no Astro · o middleware existente.

**Spec:** §5 (D2, D7, D9) · **ADR:** 0002 (decisões 2, 7).

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **🔴 O token do canário não pode aparecer em texto varrido pelo Tailwind** (inclusive `docs/`).
  Escrevê-lo literalmente numa doc cria um segundo produtor e **cega** o canário. Este plano **não**
  escreve o token; ele é montado por partes, como o script já faz.
- **`__BASE_DADOS__` e o plugin NÃO saem de `app/vite.config.js`.** Levá-los para o
  `astro.config.mjs` quebra os testes de `stores/mandate.js` com `ReferenceError` — e o fetch de
  governos **engole** o erro (`catch { store.set(inicial) }`), então o sintoma seria **trilho vazio,
  sem erro**.
- **A suíte do app fica intacta**: nenhum teste existente pode precisar de mudança nesta fatia.
- **Ordem do build: app primeiro, site depois.**

## 🔴 Medições e rulings do controlador (2026-10-18) — leia antes de codar

1. **O `outDir` do app NÃO cai no `dist/`.** Hoje é `../assets/js/app` (ou seja, `sitio/assets/js/app`),
   e o `astro build` só publica o que está em `publicDir` (`public/`). Sem mudar o `outDir` para
   **`../public/assets/js/app`**, os arquivos existem no disco e **não** no `dist/` — falha silenciosa
   clássica. Junto: o `.gitignore` do `sitio/` tem `assets/js/app/` (agora inócuo) e precisa de
   `public/assets/js/app/`.
2. **O app emite DOIS arquivos, não um:** `app.js` (≈438 KB) **e `app.css`** (≈926 B). O `app.css` é o
   CSS **escopado** dos componentes Svelte (`.amostra`, o swatch do seletor de cor; `.hachurada`, as
   células listradas). O `testar-publico.sh` do plano confere só o `app.js` — confira **os dois**.
3. **🔴 Decisão do usuário (2026-10-18): a `/` PASSA a carregar o `app.css`.** Medido: o `/` publicado
   carrega **só** o `main.dist.css`, e o `grep` por `svelte-`, `amostra`, `hachurada` no CSS ao vivo dá
   **0** — ou seja, **esses estilos estão quebrados em produção hoje**. O `<link>` do `app.css` entra
   (com o `?v=` do `VERSAO`). Isto é uma **correção deliberada**, como as seis da fatia 04.
4. **O `main.dist.css` e o ramo de CSS do middleware FICAM** — isto **supersede** o Passo 2 do T2
   abaixo ("o ramo do `main.dist.css` é removido"). Motivo medido: o dev server **do app**
   (`app/index.html:14`) linka `../assets/css/main.dist.css`, e é ele que serve os **12 E2E** do app.
   Remover o arquivo/ramo apaga o Tailwind do app em dev — e a suíte do app não pode mudar nesta
   fatia. O módulo compartilhado recebe o CSS como **opcional**: só o app o passa.
5. **⚠️ O script `css` do `sitio/package.json` está quebrado desde a fatia 00:**
   `-i ./assets/css/main.css`, mas esse arquivo virou `src/styles/main.css`. O `main.dist.css` em
   disco é de antes. Corrija o caminho de entrada para `./src/styles/main.css` (a saída continua
   `./assets/css/main.dist.css`, que é onde o dev do app linka).
6. **O módulo compartilhado precisa receber os caminhos, não adivinhá-los.** Ele vive em
   `app/vite-plugins/dados-locais.js`: `../indicators.json` de lá seria `sitio/app/indicators.json`
   (errado). Assinatura: **`dadosLocais({ dadosDir, catalogo, css? })`**, e **cada config resolve os
   seus** a partir do próprio `import.meta.url`:
   - app: `dadosDir` = `../../dados/`, `catalogo` = `../indicators.json`, `css` = `../assets/css/main.dist.css`;
   - Astro: `dadosDir` = `../dados/` (a partir de `sitio/`), `catalogo` = `./indicators.json`, **sem `css`**.
   Um caminho errado **não falha**: nunca casa e o dev server responde HTML. Só o `Content-Type` pega.
7. **O `__BASE_DADOS__` continua só no `app/vite.config.js`** (restrição acima) e **não** entra no
   `astro.config.mjs`: o site só **inclui** o `app.js` já construído, e nele o valor de produção já
   está **inline**.
8. **`index.astro`** deve carregar o `app.css` **antes** do `app.js` e ambos com o selo
   `?v=${VERSAO}` de `src/versao.js` (uma avaliação por build — medido: `VERSAO = Date.now()`), no
   padrão do `index.html` do Jekyll: `<div id="app"></div>` + `<script type="module" …>`.
9. **O dev do SITE precisa do artefato do app já construído** (ele é servido de `public/`). Ponha o
   build do app + o `preparar-publico` no `dev` também, senão a `/` em dev fica vazia — em silêncio.
10. **`sitio/indicators.json` continua sendo a fonte** do catálogo e é copiado (gitignored) para
    `public/indicators.json`; **a cópia publicada mantém o `datafile` do Pages** — a reescrita para
    `/dados/` é só do middleware, em dev.

---

### Tarefa 1: o artefato e o catálogo na raiz do `dist/`

**Arquivos:**

- Modificar: `app/vite.config.js` (outDir — se necessário)
- Criar: `scripts/preparar-publico.sh` (copia o artefato e o `indicators.json` para `public/`)
- Modificar: `astro.config.mjs` (se necessário)
- Modificar: `src/pages/index.astro` (o `<script>` do app)

**Interfaces:**

- Consome: `app/vite.config.js` → `../public/assets/js/app/{app.js,app.css}` (nomes fixos, após a correção
  do `outDir`).
- Produz: `dist/assets/js/app/app.js`, `dist/assets/js/app/app.css` e `dist/indicators.json`, na raiz do
  `dist/`.

- [ ] **Passo 1: escrever o teste que falha**

`scripts/testar-publico.sh` — confere **os três** (o app emite CSS além do JS; medido):

```bash
#!/usr/bin/env bash
set -euo pipefail
falha=0
# O app emite app.js E app.css (o CSS escopado dos componentes Svelte). Faltar o CSS
# é a falha SILENCIOSA que o site publica hoje — ver a medição 3 acima.
for f in dist/indicators.json dist/assets/js/app/app.js dist/assets/js/app/app.css; do
  [ -f "$f" ] || { echo "publico: falta $f" >&2; falha=1; }
done
[ "$falha" -eq 0 ] || exit 1
echo "publico ok"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `NODE_ENV=development npm run build && bash scripts/testar-publico.sh`
Expected: FAIL — nenhum dos três está no `dist/` (o `outDir` atual não cai no `publicDir`).

- [ ] **Passo 3: decidir o mecanismo e implementar**

Duas saídas; escolher **uma** e registrar no `progress.md`:
(a) `public/indicators.json` é um **symlink/cópia** do `sitio/indicators.json`, e o **`outDir` do app
passa a ser `../public/assets/js/app`** (com o `.gitignore` acompanhando), de modo que o `astro build`
já encontre os dois artefatos; ou
(b) `scripts/preparar-publico.sh` copia os dois para `public/` (gitignored) antes do `astro build`.

**Seja qual for:** corrija o **`outDir`** do `app/vite.config.js` para `../public/assets/js/app` — sem
isso o artefato nunca chega ao `dist/` (medição 1) — e o `.gitignore` (`assets/js/app/` → `public/assets/js/app/`).

**A cópia publicada mantém o `datafile` do Pages** — a reescrita para `/dados/` é **só em dev**.

- [ ] **Passo 4: rodar e ver passar**

Run: `NODE_ENV=development bash scripts/preparar-publico.sh && npm run build && bash scripts/testar-publico.sh`
Expected: `publico ok`.

- [ ] **Passo 5: incluir o app na `/`**

`src/pages/index.astro` usa `Base.astro` com `shell: 'app'`, `<div id="app">`, o `<link>` do
**`app.css`** (medição 3 — o site nunca o carregou) e o `<script type="module" src=...>` do `app.js`,
ambos com o selo `?v=${VERSAO}` (medição 8). O CSS vem **antes** do JS.

- [ ] **Passo 6: commit**

```bash
git add app/vite.config.js scripts/preparar-publico.sh scripts/testar-publico.sh astro.config.mjs src/pages/index.astro
git commit -m "feat(astro): app e catálogo na raiz do dist, e a / incluindo o app"
```

---

### Tarefa 2: o middleware de dado local — uma implementação, dois servidores

**Arquivos:**

- Criar: `app/vite-plugins/dados-locais.js`
- Modificar: `app/vite.config.js` (passa a importar o módulo extraído)
- Modificar: `astro.config.mjs` (usa o mesmo módulo)
- Test: `app/src/data/integracao.test.js` (existente — **não** mudar; serve de guarda)

**Interfaces:**

- Produz: `export function dadosLocais({ dadosDir, catalogo, css }): Plugin` — serve
  `/indicators.json` (com o `datafile` reescrito) e `/dados/**` do repo local, **404 em voz alta**
  quando não existe. O `css` é **opcional**: só o app o passa (medição 4 — o ramo do `main.dist.css`
  **fica**, porque o dev server do app o linka).
- Consome: os caminhos **passados pelo chamador** (medição 6) — o módulo **não** os adivinha.

- [ ] **Passo 1: rodar a suíte antes de mexer (linha de base)**

Run: `cd app && NODE_ENV=development npm test`
Expected: **126 testes verdes** — este é o número que não pode mudar.

- [ ] **Passo 2: extrair o middleware, sem mudar o comportamento**

Mover a função `servirArquivosDoSite()` para `app/vite-plugins/dados-locais.js`, renomeada para
`dadosLocais()`, e fazê-la receber os caminhos (`{ dadosDir, catalogo, css }`). `app/vite.config.js`
passa a importá-la e a **resolver os três caminhos** a partir do próprio `import.meta.url`
(`../../dados/`, `../indicators.json`, `../assets/css/main.dist.css`).

🔴 **O ramo do `main.dist.css` NÃO é removido** (supersede a redação original deste passo). O dev
server do app linka esse arquivo (`app/index.html:14`) e é ele que serve os **12 E2E** — removê-lo
apaga o Tailwind do app em dev. O ramo vira **opcional** (só quando o chamador passa `css`). Ver a
medição 4.

- [ ] **Passo 3: usar o mesmo módulo no `astro.config.mjs`**

Em `vite.plugins`, além do `tailwindcss()`, incluir
`dadosLocais({ dadosDir: <sitio>/../dados, catalogo: <sitio>/indicators.json })` — **sem `css`** — com
os caminhos resolvidos a partir de `sitio/`. **O caminho não pode ser o default do app**: `'../../dados/'`
relativo ao módulo (que vive em `app/vite-plugins/`) seria `sitio/dados/`, **errado**. Um caminho
errado não falha: só **nunca casa**, e o dev server responde HTML (passa pelo `Content-Type`).

- [ ] **Passo 4: rodar a suíte de novo**

Run: `cd app && NODE_ENV=development npm test`
Expected: **126 verdes**, o mesmo número (nenhum teste tocado).

- [ ] **Passo 5: verificar no `astro dev` que o dado local chega**

Run: `NODE_ENV=development npm run dev &` e então
`curl -sI http://localhost:4321/indicators.json | head -1` e
`curl -sI http://localhost:4321/dados/selic/selic.json | head -1`
Expected: `200` com `Content-Type: application/json` (não `text/html` — isto é o teste do §10.7).

- [ ] **Passo 6: commit**

```bash
git add app/vite-plugins/dados-locais.js app/vite.config.js astro.config.mjs
git commit -m "refactor(dev): middleware de dado local único, usado pelo app e pelo Astro"
```

---

### Tarefa 3: o canário repontado e o build que falha em voz alta

**Arquivos:**

- Modificar: `scripts/checar-canario.sh` (alvo novo)
- Criar: `scripts/verificar-css-do-app.sh` (opcional, se o canário precisar de um pré-passo)
- Modificar: `package.json` (script do build que encadeia app → site → canário)

**Interfaces:**

- Consome: o CSS emitido em `dist/assets/*.css` (nome com hash).
- Produz: um comando que **falha** (exit 1) se o CSS do `dist/` não contiver o token do canário —
  a única forma de a varredura perdida virar barulhenta.

- [ ] **Passo 1: repontar o canário para o `dist/`**

`CSS` deixa de ser `assets/css/main.dist.css` e passa a ser o conjunto **`dist/assets/*.css`**
(glob — o Astro pode emitir mais de um; procure o token em **todos**). **Não escrever o token no
arquivo** — a montagem por partes do script atual permanece.

- [ ] **Passo 2: o teste do próprio canário — sabotar de propósito**

Com o build verde, **remover temporariamente** a classe do `app/src/App.svelte`, rebuildar e rodar o
canário.
Run: `NODE_ENV=development npm run build && bash scripts/checar-canario.sh`
Expected: **FAIL (exit 1)**. Depois restaurar a classe. Uma sabotagem que **passa** significa que o
canário está guardando o caminho errado — e um canário que não falha é decorativo.

- [ ] **Passo 3: encadear no script de build**

`package.json` (raiz de `sitio/`): o `build` **chama o `astro build` diretamente** e depois as
verificações — **nunca** `npm run build` dentro do próprio `build` (recursão). Ordem:

```
build = app build → preparar-publico → astro build → canário → testar-{urls,feed,sitemap,publico,meta}
```

Falha em qualquer um **falha o build**. O **`dev` também encadeia o app + o `preparar-publico`**
(medição 9): a `/` em dev é servida de `public/` e, sem o artefato, sai **vazia em silêncio**.

> 🔴 **Corrija também o script `css`** (medição 5): ele aponta para `./assets/css/main.css`, que
> **não existe** desde a fatia 00 (o arquivo virou `src/styles/main.css`). Entrada correta:
> `./src/styles/main.css`; saída inalterada (`./assets/css/main.dist.css`, o que o dev do app linka).

> **Dependência de ordem (varredura de conflitos):** este passo encadeia scripts que nascem nas
> fatias 01 (`testar-meta.sh`), 02 (`testar-urls.sh`) e 04 (`testar-feed.sh`, `testar-sitemap.sh`).
> A **04 precisa estar fechada** antes desta tarefa; o plano põe 05 depois de 04 por isso.

- [ ] **Passo 4: rodar o build completo**

Run: `NODE_ENV=development npm run build`
Expected: todas as verificações `ok`, `canário OK`.

- [ ] **Passo 5: commit**

```bash
git add scripts/checar-canario.sh package.json
git commit -m "feat(build): canário repontado ao CSS do Astro e build que falha em voz alta"
```

## Critérios de aceite (fatia 05)

- [ ] `dist/indicators.json`, `dist/assets/js/app/app.js` **e** `dist/assets/js/app/app.css` existem.
- [ ] A `/` do `dist/` carrega o **`app.css`** (o `<link>` com `?v=`) — a correção deliberada da
      medição 3; conferir que `.amostra`/`.hachurada` aparecem no CSS publicado.
- [ ] A suíte do app tem **126 verdes**, com **zero** teste alterado (`git diff --stat app/src/**/*.test.js` vazio).
- [ ] `curl -I` de `/indicators.json` e `/dados/selic/selic.json` no `astro dev` devolve
      `application/json` — **não** `text/html`.
- [ ] O canário fica **verde** no build normal e **vermelho** quando a classe é removida do app.
- [ ] O token do canário **não** aparece em nenhum arquivo que o Tailwind varra
      (`grep -rn` pelo token em `docs/` e `src/` = 0 fora do próprio script, montado por partes).
- [ ] **O tema da `/`** está resolvido — **decidido em 2026-10-18: escura fixa, sem alternador** (a
      opção (a) do §8; `shell: 'app'` já é o mecanismo).

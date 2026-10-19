# Fatia 07 — Deploy, remoção do Jekyll e documentação

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** o CI passa a construir o Astro (não o Jekyll); o Jekyll **sai** do repositório; o
`AGENTS.md` e a ADR perdem o que virou história; e o critério de aceite "uma stack" é verificado.

**Arquitetura:** o workflow perde `jekyll-build-pages` e passa a rodar `npm ci` (app) → `npm run
build` (raiz de `sitio/`, que já encadeia app → site → verificações) → `upload-pages-artifact` com o
`dist/`. Nada é publicado por esta fatia: o **push é decisão do usuário**.

**Stack:** GitHub Actions (`actions/configure-pages`, `actions/upload-pages-artifact`,
`actions/deploy-pages`) · Astro.

**Spec:** §5 (D1, D10) · **ADR:** 0002 (decisões 1, 9, 10).

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm local.
- **🔴 `.gitignore` lista `.github`** (`AGENTS.md`), e o workflow já está *tracked*. Alterá-lo é
  `git add` normal (o arquivo existe); criar **novo** arquivo sob `.github/` exige `git add -f`.
- **Deploy é CI-only.** Não publicar à mão. **O push continua segurado** até o aval do usuário.

## 🔴 Medições e rulings do controlador (2026-10-18) — leia antes de codar

1. **O workflow mora em `sitio/.github/workflows/github-pages.yml`** (repo `sitio`, não a raiz) e
   **já está tracked**, apesar de `sitio/.gitignore:11` listar `.github` — logo `git add` normal
   funciona (só arquivo **novo** sob `.github/` precisa de `-f`).
2. **O workflow de hoje já é HÍBRIDO, não é o Jekyll puro.** Ele já roda: os testes do app, o build
   do app, o **Tailwind CLI**, o **canário**, o checkout do repo `dados`, o Playwright e o **E2E** —
   e só depois o `jekyll-build-pages`. O que muda é **menos** do que parece:
   (a) sai o `jekyll-build-pages`, entra `npm run build` (site) e o `upload-pages-artifact` com
   `path: sitio/dist`;
   (b) **o passo do Tailwind CLI tem de FICAR** — o dev server do app linka `main.dist.css` e é ele
   que serve o **E2E** (decisão da fatia 05). Ele **não** é trabalho morto;
   (c) esse passo usa `-i ./assets/css/main.css`, **caminho morto** desde a fatia 00: a entrada é
   `src/styles/main.css`;
   (d) **o canário sai do lugar**: ele agora confere `dist/assets/*.css` (saída do Astro), então
   roda **depois** do build do site — o mais simples é **remover o passo avulso** (ele já está dentro
   do `verificar` do `npm run build`).
3. **`sitio/package-lock.json` EXISTE** (167 KB, atualizado em 2026-10-18) → `npm ci` funciona. O
   `cache-dependency-path` já aponta para os dois locks (`package-lock.json` e
   `app/package-lock.json`) — **não** há Gemfile nele.
4. **`git rm` de `assets/css/main.dist.css` vai FALHAR:** ele está no `.gitignore` (gerado) e **não
   é tracked**. E ele **continua necessário** (o dev do app e o E2E o usam) — **não** remova a linha
   do `.gitignore`. A lista de remoção do T2 tem de ser corrigida (ver o Passo 2).
5. **`_posts/` está VAZIA** e o git não rastreia diretório vazio — não há o que remover (a fatia
   03/T1 já fez o `git mv`). `data/` **não existe**; `assets/` não tem arquivo tracked.
6. **`docs/` nunca é publicado pelo Astro** — o `astro build` copia **só** o `publicDir` (`public/`),
   não varre a raiz como o Jekyll. O trap (ADR/spec publicados como arquivo cru) fica **fechado por
   construção**; ainda assim **asserte** `test ! -e dist/docs`.
7. **🔴 `AGENTS.md` está no repo RAIZ, não no `sitio`.** O `git add AGENTS.md docs/...` do passo do
   T3 é **inválido**: mistura dois repos. O `AGENTS.md` é um commit **no repo raiz**; os `docs/` do
   `sitio` são outro commit **no repo `sitio`**.
8. **`sitio/.prettierrc` ainda carrega `@shopify/prettier-plugin-liquid` e os overrides de
   `liquid-html`** (achado da fatia 00). Com o Liquid fora, isso é história: remover o plugin de
   `devDependencies` e os overrides é limpeza legítima desta fatia (minor — não bloqueia).
9. **O checkout do repo `dados` no CI usa `ref: ${{ github.ref_name }}`.** Numa branch de feature o
   repo `dados` **não tem** essa branch → o passo do E2E falha. Hoje isso não morde (o push está
   segurado e o `dados` vai a `main` numa decisão à parte), mas **registre** — é o tipo de coisa que
   só aparece no primeiro push.
10. **Não apagar nada do Jekyll antes de o build do Astro passar** com o contrato de URL fechado
    (fatias 02–04): a remoção é o **último** passo, e o `git rm` tem de vir depois de um
    `npm run build` verde.

---

### Tarefa 1: o workflow

**Arquivos:**

- Modificar: `.github/workflows/github-pages.yml`
- Test: o próprio job (dry-run local do comando de build)

**Interfaces:**

- Consome: `sitio/package.json` (`build`) e `sitio/app/package.json`.
- Produz: um job que constrói `dist/` e o publica via `upload-pages-artifact`.

- [ ] **Passo 1: reproduzir o build localmente, na ordem do CI**

Run: `cd app && NODE_ENV=development npm ci && cd .. && NODE_ENV=development npm ci && NODE_ENV=development npm run build`
Expected: todas as verificações `ok` (URL, feed, sitemap, público, meta, canário).

> **Ponto de atenção:** o `sitio/package.json` **não tem** um lock próprio hoje? Conferir:
> o CI precisa de `npm ci`, que exige `package-lock.json`. Se não houver, gerar e **commitar** (é o
> que torna o build reprodutível).

- [ ] **Passo 2: editar o workflow**

O workflow **já** roda app-testes, app-build, Tailwind CLI, canário, `dados`, Playwright e E2E
(medição 2). As mudanças são cirúrgicas:

1. **Remover** o passo `Build (Jekyll)` (`actions/jekyll-build-pages@v1`).
2. **Corrigir** o passo do Tailwind CLI: `-i ./src/styles/main.css` (o `./assets/css/main.css` é
   **morto**). **Não** remova o passo — o E2E depende dele (medição 2b).
3. **Remover** o passo avulso do canário — ele agora confere `dist/assets/*.css` e já roda dentro do
   `verificar` do `npm run build` (medição 2d).
4. **Acrescentar**, depois do E2E: `npm run build` (o `build` da raiz de `sitio/`, que encadeia
   app → site → canário → `testar-*`).
5. **`upload-pages-artifact` com `path: sitio/dist`** (hoje sem `path`, herdando o default do Jekyll).

O `cache-dependency-path` **já** está certo (medição 3) — não invente `gemfile.lock`.

- [ ] **Passo 3: validar a sintaxe do YAML**

Run: `npx -y js-yaml .github/workflows/github-pages.yml > /dev/null && echo "yaml ok"`
Expected: `yaml ok`.

- [ ] **Passo 4: conferir que nenhuma referência ao Jekyll sobrou no workflow**

Run: `grep -in 'jekyll\|ruby\|gemfile\|bundler' .github/workflows/github-pages.yml`
Expected: **nenhuma** linha.

- [ ] **Passo 5: commit**

```bash
git add .github/workflows/github-pages.yml package-lock.json
git commit -m "ci: build do Astro no lugar do jekyll-build-pages"
```

---

### Tarefa 2: remover o Jekyll

**Arquivos:**

- Apagar (com `git rm`): `Gemfile`, `Gemfile.lock`, `_config.yml`, `_layouts/`, `_includes/`,
  `404.html`, `blog.html`, `categorias/`, `links.html`, `index.html`, `sobre.md`, `termos-de-uso.md`,
  `politica-de-privacidade.md`
- Modificar: `.gitignore` (tirar o que era do Jekyll, manter o que o Astro publica)
- **Não** entra na lista: `indicators.json` (é a **fonte** do catálogo do app — a cópia publicada é
  `public/indicators.json`, feita por `preparar-publico.sh`).

> **Ruling (varredura de conflitos, 2026-10-18):** `_posts/` **não** entra na lista. A fatia 03/T1 já
> o moveu para `src/content/posts/` com `git mv`; a pasta está **vazia** e o git não rastreia
> diretório vazio — não há o que remover (medição 5).
> **Não** apague `assets/css/main.css`: ele foi movido para `src/styles/` na fatia 00 e é fonte viva.
> 🔴 **Não** tente remover `assets/css/main.dist.css` (medição 4): é **gerado**, não é tracked, e
> **continua necessário** para o dev do app e para o E2E. A linha do `.gitignore` **fica**.
> `data/` não existe e `assets/` não tem arquivo tracked (medição 5).

**Interfaces:**

- Consome: as fatias 02–04 fechadas (as páginas já saem do Astro).
- Produz: um repo sem Ruby e sem Liquid.

- [ ] **Passo 1: conferir que cada arquivo a apagar já tem equivalente no Astro**

Para cada página, `test -f dist/<nome>.html`. **Só apagar o que já existe no `dist/`.**

- [ ] **Passo 2: apagar**

Use `git rm` (não `rm`) para que a remoção fique no histórico com o rastro correto.

- [ ] **Passo 3: limpar o `.gitignore`**

Remover o que era do Jekyll e não existe mais: `_site`, `.sass-cache`, `.jekyll-cache`,
`.jekyll-metadata`, `vendor`. **Manter**: `dist/`, `.astro/`, `node_modules`,
`assets/css/main.dist.css` (gerado e **ainda usado** — medição 4), `public/assets/js/app/`,
`public/indicators.json`, os artefatos do Playwright. `data/*` pode sair (`data/` não existe) —
confira antes com `ls data/`.

- [ ] **Passo 4: build do zero**

Run: `rm -rf dist node_modules app/node_modules && cd app && NODE_ENV=development npm ci && cd .. && NODE_ENV=development npm ci && NODE_ENV=development npm run build`
Expected: build verde **sem o Jekyll no disco**.

- [ ] **Passo 5: commit**

```bash
git add -A
git commit -m "chore: remove o Jekyll — o site passa a ser só Astro"
```

---

### Tarefa 3: documentação e o critério "uma stack"

**Arquivos:**

- Modificar: **`AGENTS.md` (raiz do repo — repo SEPARADO)** — a seção "O site Jekyll" vira história
- Modificar: `sitio/docs/adr/0002-migracao-do-site-para-astro.md` (estado: implementado)
- Modificar: `sitio/docs/plans/README.md` (a migração fecha; aponta para o novo diretório)
- Criar: `sitio/docs/plans/migracao-astro/progress.md`-equivalente? **Não** — o ledger é
  `.superpowers/sdd/` e é **ignorado pelo git** (convenção)

> 🔴 **Dois repos, dois commits** (medição 7). `AGENTS.md` vive na raiz, que é um repo **próprio**;
> `sitio/docs/**` vive no repo `sitio`. Um `git add AGENTS.md sitio/docs/...` **falha** (os caminhos
> não existem no mesmo índice). Faça dois commits: um no `sitio` (ADR + `docs/plans/README.md`) e um
> na raiz (`AGENTS.md`).

**Interfaces:**

- Produz: um repo cuja única stack é Node.

- [ ] **Passo 1: reescrever a seção do Jekyll no `AGENTS.md`**

Trocar "O site Jekyll" pela descrição do Astro (build, dev, onde mora o conteúdo, o contrato de
URL). Remover as seções que só existiam por causa do Ruby. **A tabela "Onde o trabalho está"**
precisa refletir o estado novo.

- [ ] **Passo 2: verificar o critério "uma stack" (spec §10.6)**

Run: `grep -rin 'jekyll\|liquid\|bundler\|ruby' --include='*.yml' --include='*.json' --include='*.js' --include='*.mjs' --include='*.astro' --include='Gemfile*' . | grep -v node_modules | grep -v '/docs/'`
Expected: **nenhuma** linha viva (docs e planos podem citar história).

- [ ] **Passo 3: verificar que `docs/` continua excluído do build**

Run: `test ! -e dist/docs && echo "docs fora do build ok"`
Expected: `docs fora do build ok` — o trap do `AGENTS.md` (publicar ADR/spec como arquivo cru)
**não** pode voltar. Se o Astro copiar `docs/`, movê-lo para fora da raiz ou configurar.

- [ ] **Passo 4: rodar a verificação final inteira (spec §10)**

Run: `NODE_ENV=development npm run build && bash scripts/testar-urls.sh && bash scripts/testar-feed.sh && bash scripts/testar-sitemap.sh && bash scripts/testar-publico.sh && bash scripts/testar-meta.sh && bash scripts/checar-canario.sh && (cd app && NODE_ENV=development npm test && NODE_ENV=development npm run test:e2e)`
Expected: tudo verde; **126 + novos** unitários e os E2E no mesmo estado.

- [ ] **Passo 5: commit — DOIS repos, DOIS commits**

```bash
# 1) no repo `sitio`:
git add docs/plans/README.md docs/adr/0002-migracao-do-site-para-astro.md
git commit -m "docs: ADR e índice dos planos refletem o site em Astro"

# 2) no repo RAIZ (o AGENTS.md mora lá):
cd .. && git add AGENTS.md
git commit -m "docs: AGENTS.md descreve o site em Astro; o Jekyll vira história"
```

**Onde está o `AGENTS.md`:** `/Users/lucas/Workspace/brasilemnumeros/AGENTS.md` (raiz). Se você
rodar `git add AGENTS.md` de dentro de `sitio/`, ele **não** existe nesse repo.

## Critérios de aceite (fatia 07)

- [ ] O workflow **não** menciona jekyll/ruby/gemfile/bundler e constrói `sitio/dist`.
- [ ] O workflow **mantém** o passo do Tailwind CLI (com a entrada `src/styles/main.css`) **antes** do
      E2E, e o canário roda **depois** do build do site (dentro do `verificar`).
- [ ] `Gemfile`, `Gemfile.lock`, `_config.yml`, `_layouts/`, `_includes/` **não existem**.
- [ ] `NODE_ENV=development npm ci && npm run build` roda do zero, sem o Jekyll no disco.
- [ ] `grep` por jekyll/liquid/bundler/ruby só encontra história (docs/planos).
- [ ] `dist/docs` **não** existe (o trap continua fechado).
- [ ] A verificação final da spec §10 passa inteira.
- [ ] **Nada foi enviado** — o push continua sendo a decisão do usuário.

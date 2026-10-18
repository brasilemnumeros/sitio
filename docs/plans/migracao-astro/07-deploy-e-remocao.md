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
- **Não apagar nada do Jekyll antes de o build do Astro passar** com o contrato de URL fechado
  (fatias 02–04). A remoção é o **último** passo.

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

Substituir o job do `jekyll-build-pages` por: `setup-node` (node 26) → `npm ci` (app) → `npm ci`
(raiz) → `npm run build` → `upload-pages-artifact` com `path: sitio/dist`. Remover o
`cache-dependency-path` do `Gemfile`.

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

- Apagar: `Gemfile`, `Gemfile.lock`, `_config.yml`, `_layouts/`, `_includes/`, `_posts/` (já movido),
  `blog.html`, `categorias/`, `links.html`, `index.html`, `sobre.md`, `termos-de-uso.md`,
  `politica-de-privacidade.md`, `assets/css/main.dist.css`
- Modificar: `.gitignore` (remover o que era do Jekyll, manter o que o Astro publica)

**Interfaces:**

- Consome: as fatias 02–04 fechadas (as páginas já saem do Astro).
- Produz: um repo sem Ruby e sem Liquid.

- [ ] **Passo 1: conferir que cada arquivo a apagar já tem equivalente no Astro**

Para cada página, `test -f dist/<nome>.html`. **Só apagar o que já existe no `dist/`.**

- [ ] **Passo 2: apagar**

Use `git rm` (não `rm`) para que a remoção fique no histórico com o rastro correto.

- [ ] **Passo 3: limpar o `.gitignore`**

Remover entradas do Jekyll (`_site/`, `.jekyll-cache/`, `assets/css/main.dist.css`); garantir que
`dist/`, `.astro/`, `public/assets/js/app/` e `public/indicators.json` estão ignorados.

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

- Modificar: `AGENTS.md` (raiz do repo) — a seção "O site Jekyll" vira história
- Modificar: `sitio/docs/adr/0002-migracao-do-site-para-astro.md` (estado: implementado)
- Modificar: `sitio/docs/plans/README.md` (a migração fecha; aponta para o novo diretório)
- Criar: `sitio/docs/plans/migracao-astro/progress.md`-equivalente? **Não** — o ledger é
  `.superpowers/sdd/` e é **ignorado pelo git** (convenção)

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

- [ ] **Passo 5: commit**

```bash
git add AGENTS.md docs/plans/README.md docs/adr/0002-migracao-do-site-para-astro.md
git commit -m "docs: AGENTS.md e ADR refletem o site em Astro; uma stack"
```

## Critérios de aceite (fatia 07)

- [ ] O workflow **não** menciona jekyll/ruby/gemfile/bundler e constrói `sitio/dist`.
- [ ] `Gemfile`, `Gemfile.lock`, `_config.yml`, `_layouts/`, `_includes/` **não existem**.
- [ ] `NODE_ENV=development npm ci && npm run build` roda do zero, sem o Jekyll no disco.
- [ ] `grep` por jekyll/liquid/bundler/ruby só encontra história (docs/planos).
- [ ] `dist/docs` **não** existe (o trap continua fechado).
- [ ] A verificação final da spec §10 passa inteira.
- [ ] **Nada foi enviado** — o push continua sendo a decisão do usuário.

# Fatia 00 — Esqueleto do Astro e o build

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** um projeto Astro 7 que constrói e serve o site, **em paralelo ao Jekyll** (que continua
sendo a fonte de comparação), com Tailwind compilado dentro do build e o formato de saída que
preserva o contrato de URL.

**Arquitetura:** Astro é o gerador único. O conteúdo vivo fica em `src/`; o que precisa sair verbatim
na raiz do `dist/` (imagens, `CNAME`, `.nojekyll`, `indicators.json`, o artefato do app) fica em
`public/`. O Jekyll ainda existe nesta fatia — ela não o remove.

**Stack:** Astro 7.4.0 (`engines`: `node >=22.22.0` — a máquina tem 26.11.1) · `@tailwindcss/vite`
4.3.3 (`peer: vite ^5.2||^6||^7||^8`) · Vite 8.3.4.

**Spec:** `docs/specs/2026-10-18-migracao-astro-design.md` §3, §4, §5 (D3, D7) · **ADR:** 0002.

## Restrições desta fatia

- **`NODE_ENV=development`** em todo comando npm.
- **`build.format: 'file'`** + **`trailingSlash: 'never'`**: o default do Astro é `'directory'`, que
  mudaria as URLs. Isto é configuração explícita, não preferência.
- **Não tocar no Jekyll** nesta fatia. `_config.yml`, `_layouts/`, `_posts/` ficam onde estão.
- **Conferir a API do Astro contra `node_modules/astro/dist/@types/` antes de codar** — nunca contra
  este plano (`AGENTS.md`).

---

### Tarefa 1: O projeto Astro que constrói e serve

**Arquivos:**

- Criar: `astro.config.mjs`
- Modificar: `package.json` (raiz de `sitio/`) — dependências e scripts
- Criar: `src/pages/index.astro` (placeholder do shell; o conteúdo real é a fatia 02)
- Criar: `.gitignore` — acrescentar `dist/`, `.astro/`

**Interfaces:**

- Produz: `npm run build` (em `sitio/`) gera `dist/`; `npm run dev` sobe o dev server do Astro.
- Produz: `astro.config.mjs` exporta `defineConfig({ site, outDir, build, trailingSlash, vite })`.

- [ ] **Passo 1: escrever o teste de fumaça do build**

`scripts/testar-build-astro.sh` (que a fatia 07 aproveita no CI):

```bash
#!/usr/bin/env bash
set -euo pipefail
NODE_ENV=development npm run build
test -f dist/index.html || { echo "build: falta dist/index.html" >&2; exit 1; }
echo "build astro ok"
```

- [ ] **Passo 2: rodar e ver falhar**

Run: `NODE_ENV=development bash scripts/testar-build-astro.sh`
Expected: FAIL — `astro.config.mjs` e o projeto não existem ainda.

- [ ] **Passo 3: criar o projeto e a config**

Instalar `astro@7.4.0`, `@tailwindcss/vite@4.3.3`, `@astrojs/rss@4.0.19`,
`@astrojs/sitemap@3.7.4`. `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.brasilemnumeros.ong.br',
  outDir: 'dist',
  publicDir: 'public',
  build: { format: 'file' },
  trailingSlash: 'never',
  vite: { plugins: [tailwindcss()] },
});
```

`src/pages/index.astro` mínimo com `<html lang="pt-BR" class="dark">` e o `<div id="app">`.

- [ ] **Passo 4: rodar e ver passar**

Run: `NODE_ENV=development bash scripts/testar-build-astro.sh`
Expected: `build astro ok` e `dist/index.html` existente.

- [ ] **Passo 5: conferir o formato de saída (contrato de URL)**

Run: `test -f dist/index.html && echo "file format ok"`
Expected: `file format ok` — se saísse `dist/index/index.html`, o `build.format` estaria errado.

- [ ] **Passo 6: commit**

```bash
git add astro.config.mjs package.json package-lock.json src/pages/index.astro .gitignore scripts/testar-build-astro.sh
git commit -m "feat(astro): projeto Astro com build.format file e Tailwind via Vite"
```

---

### Tarefa 2: Tailwind dentro do build, e o `public/` que sai verbatim

**Arquivos:**

- Modificar: `src/pages/index.astro` (importar o CSS)
- Criar: `public/CNAME` (conteúdo: `www.brasilemnumeros.ong.br`)
- Criar: `public/.nojekyll` (vazio)
- Modificar: `astro.config.mjs` (se necessário)

**Interfaces:**

- Consome: o CSS existente `assets/css/main.css`.
- Produz: `dist/assets/*.css` com as classes do site **e** as de `app/src` (o scan é verificado na
  fatia 05 pelo canário; aqui só se prova que o Tailwind roda).

- [ ] **Passo 1: importar o CSS no layout**

Criar `src/layouts/Base.astro` (nasce aqui, cresce na fatia 01) que faz
`import '../assets/css/main.css';` no frontmatter.

- [ ] **Passo 2: buildar e conferir que o CSS saiu**

Run: `NODE_ENV=development npm run build && ls dist/assets/*.css`
Expected: um ou mais `.css` em `dist/assets/`. Se não houver, o `@tailwindcss/vite` não rodou.

- [ ] **Passo 3: conferir que o CSS não está vazio**

Run: `grep -c "dark:" dist/assets/*.css`
Expected: > 0 (o site usa `dark:`; se for 0, o Tailwind não varreu o conteúdo).

- [ ] **Passo 4: commit**

```bash
git add src/layouts/Base.astro public/CNAME public/.nojekyll
git commit -m "feat(astro): Tailwind no build e public/ servido verbatim"
```

## Critérios de aceite (fatia 00)

- [ ] `NODE_ENV=development npm run build` gera `dist/index.html` **na raiz** (não em `dist/index/`).
- [ ] O CSS do Tailwind sai em `dist/assets/` e contém `dark:`.
- [ ] `public/CNAME` e `public/.nojekyll` aparecem na raiz do `dist/`.
- [ ] O Jekyll **ainda funciona** (`_config.yml`, `_layouts/`, `_posts/` intactos).
- [ ] `astro.config.mjs` declara `build.format:'file'` e `trailingSlash:'never'`.

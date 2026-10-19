# Planos de implementação — Migração do site para Astro

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).

**Objetivo:** o site deixa de ser construído por Jekyll/Ruby e passa a ser construído por **Astro 7
(Node)**; o app Svelte que já existe é incluído como **artefato** (fronteira preservada); o contrato
de URL publicado é mantido; e **nada é publicado sem aval do usuário**.

**Arquitetura:** um projeto Astro em `sitio/` gera `dist/` (gitignored), publicado pelo Actions. O
app continua um projeto Vite próprio em `sitio/app/` com a suíte intacta; o site **consome** o
artefato `assets/js/app/app.js` por `<div id="app">` + `<script>`. O dado local é servido por um
**módulo de middleware único** usado pelos dois servidores de dev.

**Stack:** Astro 7.4 + `@tailwindcss/vite` 4.3 + `@astrojs/rss` 4.0 + `@astrojs/sitemap` 3.7 ·
Vite 8 (o do app) · GitHub Actions.

**Spec:** `sitio/docs/specs/2026-10-18-migracao-astro-design.md` · **ADR:** `0002-migracao-do-site-para-astro.md`.
Todo plano **argumenta a partir da spec**; quem executa lê os dois.

---

## Restrições globais

- **`NODE_ENV=development` em TODO comando npm desta máquina** (`AGENTS.md`): sem isso o
  `npm ci`/`npm test` não instala nem acha as devDependencies, e o vitest some.
- **Deploy é CI-only.** Não publicar à mão. **Push é decisão do usuário** (2026-10-18): nada é
  enviado até o aval.
- **O contrato de URL é não-negociável** (spec §4): as 13 URLs medidas respondem 200; `/feed.xml` e
  `/sitemap.xml` mantêm o path.
- **A fronteira do app fica de pé** (spec D2): o app mantém `app/vite.config.js`, o shell
  `app/index.html` e a saída fixa. **`@astrojs/svelte` não entra.** Lógica de série/escala/cor/eixo
  **não** vai para template do site.
- **`__BASE_DADOS__` e o plugin de dado local ficam em `app/vite.config.js`** (spec D9): movê-los
  quebra `vitest` e o trilho de mandatos viria **vazio, sem erro**.
- **O canário do Tailwind sobrevive** (spec D7): o Tailwind **do site** precisa varrer `app/src`; o
  script passa a guardar o CSS do `dist/` do Astro e **falha** se a varredura sumir.
- **Tema:** o app é **escuro, só** (§1 da spec antiga). As páginas do site mantêm o alternador.
- **Comentários e strings de UI em português.**
- **Sem framework novo além do Astro:** o Vite que ele traz por dentro é o mesmo do app.

## Review Focus

As cinco classes de entrada/falha que a spec implica e que nenhum teste do plano exercita por
padrão — a mais provável primeiro. Cada uma ganha o teste na tarefa dona do código.

1. **Query string com id inexistente ou repetido** em `?indicators=` — o app deve **ignorar** o id
   desconhecido e **deduplicar**, não quebrar nem carregar duas vezes (tarefa 06/T2).
2. **`?indicators=` com mais de 10 ids** — o app deve parar em `LIMITE_SERIES` (10) com o mesmo
   `motivoDoLimite()`, não estourar a paleta (tarefa 06/T2).
3. **Post com `categories:` vazio ou com uma categoria ausente do `_config.yml`** — a URL gerada não
   pode virar `/posts//2025/...` nem 404 (tarefa 03/T1).
4. **`indicators.json` ausente do `dist/`** — o app daria `SchemaError` em produção; o build deve
   **falhar** se o catálogo ou o artefato não pousaram (tarefa 05/T3).
5. **Feed/sitemap com zero posts** (coleção vazia) — XML ainda válido, sem `<item>` quebrado
   (tarefa 04/T2).

---

## As fatias

| # | arquivo | unidade de trabalho | entrega | depende de |
|---|---|---|---|---|
| 00 | `00-esqueleto-e-build.md` | Projeto Astro | `src/`, `astro.config.mjs`, Tailwind via Vite, `build.format:'file'`, `dist/` | — |
| 01 | `01-casca-do-site.md` | Casca (§4, §6) | layout base, nav, footer, tooltip, meta tags (D6), cookie+analytics (D8) | 00 |
| 02 | `02-paginas-e-listagem.md` | Páginas (§6) | `links`, `sobre`, `termos`, `privacidade`, `blog`, `categorias/*`, `404` | 01 |
| 03 | `03-posts-e-permalinks.md` | Posts (§4) | coleção de conteúdo, 10 posts, URL padrão do Jekyll | 01 |
| 04 | `04-feed-e-sitemap.md` | Feed/sitemap (D5) | `/feed.xml` e `/sitemap.xml` nos mesmos paths | 03 |
| 05 | `05-app-no-site.md` | App no site (D2, D7, D9) | artefato + `indicators.json` no `dist/`, middleware único, canário repontado | 02 |
| 06 | `06-permalink-do-app.md` | Permalink (D4, D13) | `?indicators=` lido e escrito no app + testes | 05 (paralela ao site) |
| 07 | `07-deploy-e-remocao.md` | Deploy e limpeza (D1, D10) | workflow, remoção do Jekyll, `AGENTS.md`/ADR | 04, 05, 06 |

### Ordem e paralelismo

```
00 ── 01 ── 03 (T1: a coleção) ── 02 ── 05 ── 07
                     │                    ↗
                     └── 04 ─────────────┘
06 (independente do site) ────────────────────↗   ← 06 pode correr em paralelo a 01–05
```

**Ordem de execução, com o porquê de cada salto:**

1. `00 → 01` — o layout base é consumido por tudo.
2. **`03/T1` antes de `02`** — a listagem do `blog` e as contagens das categorias (02/T2) consomem
   `getCollection('posts')`. Sem a coleção, a 02 só conseguiria entregar páginas vazias.
3. `02` antes de `05` — a `/` é uma página do conjunto.
4. **`04` antes de `05/T3`** — o encadeamento do build chama `testar-feed.sh` e `testar-sitemap.sh`,
   que nascem na 04.
5. `06` toca **só** `sitio/app/` — é o único trabalho que não depende do Astro.

> **Nota da varredura de conflitos (2026-10-18):** o grafo da primeira redação punha 02 e 03 como
> irmãs, mas a 02 consome a coleção da 03. Corrigido aqui; a 02 também carrega a nota.

---

## Portão de prontidão (antes de escrever código)

| item aberto (spec §8) | estado | toca a fatia | resolução |
|---|---|---|---|
| Tema da `/` | **RESOLVIDO 2026-10-18** | 02/05 | `/` escura fixa sem alternador (opção (a)); preserva a paleta das 10 séries |
| Conteúdo do `/feed.xml` (itens, resumo × completo) | **RESOLVIDO 2026-10-18** | 04 | medido: o publicado é **Atom**; o `@astrojs/rss` emite **RSS 2.0**. Aceito. `description` = HTML integral com URLs absolutizadas |
| `git mv` dos 10 posts | **decidido: `git mv`** | 03 | preserva o histórico (`git log --follow` tem de funcionar) |
| Cloudflare Pages | **não avaliado** | — | fora; só volta como decisão do usuário |
| `blog_categories` / `tailwind.config.js` | mortos | 07 | **não portar** |
| **Permalink do app** | **decidido: entra antes de publicar** | 06 | — |
| Decisões de produto (2026-10-18) | **RESOLVIDO** | 04 | `og:locale`→`pt_BR`; mês em português; 404 traduzido; `target`/`rel` corrigidos; `/` carrega o `app.css`. Detalhe no §8.1 do desenho |

**Gate atual:** `PASS` — o tema da `/` foi decidido (2026-10-18) e **nada** bloqueia fatia nenhuma.

---

## Critérios de aceite da migração (spec §10)

1. **Contrato de URL**: as 13 URLs da spec §4 respondem 200.
2. **HTML comparado**: `diff` antes × depois nas páginas do §4 — toda diferença explicada.
3. **Suíte do app intacta**: 126 unitários + 12 E2E verdes, **sem alteração forçada**. (Testes novos
   da fatia 06 não contam.)
4. **Feed e sitemap válidos**, mesmos N posts; `/sitemap.xml` lista as URLs novas.
5. **Consentimento** verificado no navegador (GA4 só após o aceite), zero aviso de a11y.
6. **Uma stack**: `rg -i "jekyll|liquid|bundler"` só encontra história (docs). Sem `Gemfile`, sem
   Ruby no workflow, sem `_config.yml`.
7. **A máquina constrói**: `npm ci && npm run build` do zero, sem instalar nada além do Node.
8. **O app continua estilizado**: o canário passa contra o CSS do `dist/` e falha quando sabotado.
9. **O permalink funciona** pelo caminho do produto: `/?indicators=<ids>` restaura as séries.

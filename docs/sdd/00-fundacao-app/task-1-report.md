### Relatório da fatia 00 (implementador) — 2026-10-14

**Estado: CONCLUÍDA.** As três tarefas foram implementadas em ordem (1 → 2 → 3) e todos
os critérios de aceite da fatia passaram por comando real.

**Base de commit:** partiu de `8f40ace` (limpo). Dois commits no branch
`feat/camada-de-graficos`:
- `5f5998a` — `feat(app): projeto Vite+Svelte autocontido com build de saida fixa` (T1)
- `7a7a50e` — `feat(app): shell Svelte e a constante de versao do schema` (T2)

**R1 aplicado.** Ignorei o guarda ambíguo `cd sitio/app 2>/dev/null || mkdir -p …` do
brief e rodei `mkdir -p sitio/app` a partir da raiz do projeto. Sem diretório aninhado.

#### Arquivos criados/modificados
- `sitio/app/package.json` — ESM, `private`, scripts `dev`/`build`/`test`/`test:watch`.
- `sitio/app/package-lock.json` — commitado.
- `sitio/app/vite.config.js` — `outDir: ../assets/js/app`, nomes fixos, `test.environment: node`.
- `sitio/app/index.html` — shell de dev.
- `sitio/app/src/main.js`, `src/App.svelte`, `src/domain/schema.js`, `src/domain/schema.test.js`.
- `sitio/.gitignore` — acrescidas `assets/js/app/` e `app/.vite` (não ignora `app/src/`).

#### Versões resolvidas (por `npm install`, não fixadas à mão)
`vite@^8.3.4`, `@sveltejs/vite-plugin-svelte@^7.3.1`, `svelte@^5.57.2`, `vitest@^5.0.4`.

#### Evidência dos critérios de aceite (comandos reais)

| critério | comando | resultado |
|---|---|---|
| 1 teste passa | `npm ci && npm test` | ✅ `Test Files 1 passed (1)` / `Tests 1 passed (1)` |
| build de nome fixo | `npm run build` | ✅ `app.js` (25,42 kB) e `app.css` (62,22 kB), **sem hash** |
| dev serve o shell | `npm run dev` + navegador | ✅ renderiza `<h1>` e `schema v1 · esqueleto em construção` (lido do DOM) |
| artefato ignorado | `git status --porcelain assets/js/app/` | ✅ vazio |
| `src/` versionado | `git check-ignore app/src/main.js` | ✅ sem saída, `exit=1` |
| `package.json` separado | inspeção | ✅ deps de `sitio/` intactas (`sitio/package-lock.json` restaurado após o `npm install` local) |
| sem `window` para estado | `grep -rn window app/src/` | ✅ nenhuma ocorrência |

#### TDD da T2 (RED → GREEN)
- RED: `npm test` falhou com `Cannot find module './schema.js'` (esperado pelo brief).
- GREEN: após criar `src/domain/schema.js` com `export const SCHEMA_VERSION = 1`, a suíte
  ficou verde. `SCHEMA_VERSION === 1` é o único identificador exportado para a fatia 01.

#### Observações e desvios (nada bloqueante)

1. **`NODE_ENV=production` no ambiente desta máquina.** O shell do Hermes exporta
   `NODE_ENV=production`, e o npm daqui tem `omit=dev` — logo `npm install`/`npm ci`
   *sem* `--include=dev` instalam **zero** devDependencies (`up to date, audited 1 package`)
   e deixam `node_modules` vazio. Rodei tudo com `NODE_ENV=development npm … --include=dev`.
   Isso é quirk do ambiente local, **não** do projeto: no CI (Node 24, `NODE_ENV` não setado)
   `npm ci && npm test` funciona como no brief. Vale registrar para quem rodar a fatia aqui.
2. **`npm run build` também emite `index.html`** em `assets/js/app/` (comportamento padrão
   do Vite, que copia o `index.html` de entrada para o `outDir`). O brief lista apenas
   `app.js`/`app.css` como esperado, mas não os exige exclusivos. O `index.html` extra fica
   dentro de `assets/js/app/`, que é gitignored, então não é commitado; e o wiring de CI é
   fatia 10. Deixei o `vite.config.js` exatamente como o brief — se o revisor quiser só os
   dois artefatos, o ajuste é desabilitar a cópia do HTML (não fiz para não desviar do brief).
3. **`fsevents` sem install script.** O npm daqui avisa que o install script de
   `fsevents@2.3.3` não foi aprovado (`allowScripts`). O `vite dev` subiu e serviu normalmente
   mesmo assim — sem impacto observado.
4. **Arquivos alheios modificados no working tree.** `docs/plans/02-`, `03-` e `08-` aparecem
   como `M` no `git status`, com mtime de ~20:16, **durante** esta sessão e **não** por mim
   (não toquei em nenhum). São de outro processo/sessão. **Não** os commitei nem reverti.

#### Pendências fora do escopo desta fatia
- A tabela de documentos em vigor do `AGENTS.md` (raiz, repo separado) ainda diz "nenhuma
  fatia foi implementada". Não a atualizei — mora no repo raiz, fora do alvo `sitio/app/`
  desta fatia. Fica como recomendação para a revisão.

---

### Rodada de correção 1/5 (verificação, commit e prova) — 2026-10-14

**Estado: CONCLUÍDA.** As duas mudanças de código já estavam na árvore (execução anterior
interrompida por timeout antes de commitar). Esta rodada **verificou, não refez**, rodou os
critérios por comando real, provou a exclusão do Jekyll e commitou.

**Commit:** `5de10ff` — `fix(app): exclui app/ do Jekyll e faz o build do Vite entrar pelo JS`
(base `fe1de75`). Um commit, **apenas** `_config.yml` e `app/vite.config.js`.

#### O que mudou (as duas mudanças)

`git diff` confirmou exatamente estas duas alterações, nada mais:

1. `sitio/_config.yml` — `- app/` acrescentado ao `exclude:` do Jekyll (após `docs/`).
2. `sitio/app/vite.config.js` — `import { fileURLToPath } from 'node:url'` e
   `input: fileURLToPath(new URL('./src/main.js', import.meta.url))` dentro de
   `build.rollupOptions`; mantém `entryFileNames: 'app.js'`, `assetFileNames: 'app.[ext]'`
   e `inlineDynamicImports: true`.

#### Evidência (comandos reais, `NODE_ENV=development` em tudo)

| critério | comando | resultado |
|---|---|---|
| suíte verde | `NODE_ENV=development npm test` | ✅ `Test Files 1 passed (1)` / `Tests 1 passed (1)` (309 ms) |
| build só `app.js` | `rm -rf ../assets/js/app && NODE_ENV=development npm run build` | ✅ `../assets/js/app/app.js 33.13 kB` — único artefato |
| saída do build | `ls -la ../assets/js/app/` | ✅ só `app.js` (33138 bytes) — **sem `app.css`** (R13) |
| dev serve o shell | `NODE_ENV=development npm run dev` + `curl localhost:5173/` | ✅ `HTTP 200`, HTML do shell; `/src/main.js` → `HTTP 200` |

Build produziu **apenas `app.js`**: confirma a R13 (o app não emite CSS próprio; a
estilização vem do `main.dist.css` carregado pelo layout). O `app.css` que aparecia antes
era o Vite empacotando o `<link rel="stylesheet">` do `index.html` de dev.

#### Prova da exclusão do Jekyll (caminho 2)

O render completo **não roda nesta máquina** por motivo pré-existente e alheio — as duas
mensagens de erro exatas, **nenhuma mencionando `app/`** ou qualquer arquivo que tocamos:

- `bundle exec jekyll build` (canônico do AGENTS.md) →
  `Could not find 'bundler' (2.7.1) required by your .../Gemfile.lock. (Gem::GemNotFoundException)` — o Ruby 2.6 do sistema não tem o bundler fixado no lockfile.
- `~/.gem/ruby/2.6.0/bin/jekyll build` (jekyll 4.2.2 do PATH) →
  `Could not find 'em-websocket' (~> 0.5) ... (Gem::MissingSpecError)` — dependência de runtime
  do metagem `jekyll` ausente; `require 'jekyll'` falha na ativação.

Como o build não é executável, a prova foi feita com o **código real do Jekyll** —
`Jekyll::EntryFilter`, a classe que aplica o `exclude:` — carregada direto do gem (sem ativar
o metagem, que falha pelo motivo acima):

```
exclude (de _config.yml): ["Gemfile", "Gemfile.lock", "node_modules/", "CNAME",
                          "package.json", "package-lock.json", "docs/", "app/"]
app/ presente?           true

app/index.html                    -> excluído do build? SIM
app/package.json                  -> SIM
app/vite.config.js                -> SIM
app/src/main.js                   -> SIM
app/node_modules/svelte/package.json -> SIM
assets/js/app/app.js              -> NAO
index.html                        -> NAO
_layouts/default.html             -> NAO
indicators.json                   -> NAO
```

Leitura: tudo sob `app/` é excluído do build; os arquivos do site **e** o artefato
publicado `assets/js/app/app.js` seguem incluídos. Prova por comportamento da própria
`EntryFilter`, não por inspeção textual do YAML.

#### Regras respeitadas
- Não tentei restaurar `app.css` nem mexi em CSS/`build.lib` (R13).
- Não insisti no render do Jekyll além das duas tentativas de capture do erro.
- Commitei **só** os dois arquivos (`git add _config.yml app/vite.config.js`), nunca
  `-A`/`-a`. Os Minor adiados (`.vite` no `.gitignore`, newline final, `defineConfig`,
  aviso de deprecação do `inlineDynamicImports`) permanecem intocados.




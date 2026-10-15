# SDD ledger — plan: docs/plans/00-fundacao-app.md

Spec: `sitio/docs/specs/2026-10-14-camada-de-graficos-design.md` (§8, §10.1, §10.4, §10.7)
Repo: `sitio` · Branch: `feat/camada-de-graficos` · Base ao iniciar: `8f40ace`

## Pré-voo — scan de conflitos (2026-10-14)

| par | o que um produz × o outro consome | achado |
|---|---|---|
| T1 × T2 | T1 cria a raiz do projeto (`package.json`, `vite.config.js`, `index.html`, `.gitignore`); T2 cria `src/main.js`, `src/App.svelte`, `src/domain/schema.js` | ok — ordem obrigatória T1→T2; `index.html` referencia `/src/main.js`, que só existe depois de T2 |
| T1 × T3 | T3 verifica o que T1/T2 produziram | ok — T3 é verificação pura, sem arquivo novo |
| T1 consigo | `vite.config.js` (test.include `src/**/*.test.js`) × T2 (teste em `src/domain/schema.test.js`) | ok — o glob casa |
| T1 consigo | `.gitignore` ignora `assets/js/app/` e `app/.vite`; passo 5 confere que `app/src/main.js` **não** é ignorado | ok — `git check-ignore` funciona em caminho ainda inexistente |
| T1 consigo | passo 1 (`cd sitio/app 2>/dev/null \|\| mkdir -p sitio/app && cd sitio/app`) | **DEFEITO** — o `cd` relativo depende do cwd; rodando de dentro de `sitio/` cria `sitio/sitio/app`. Ver ruling R1 |
| T2 consigo | `App.svelte` importa `./domain/schema.js`, que T2 cria | ok |
| T3 consigo | `npm run build` espera saída em `../assets/js/app/` | ok — `outDir` de T1 |
| 00 × 01 | T2 produz `SCHEMA_VERSION`; a fatia 01 (`validateSeries`) consome | ok — mesmo identificador nos dois planos |
| 00 × 10 | a classe-canário `bg-[#0e1117]` entra em `App.svelte` **na fatia 10**, não aqui | ok — sem colisão |

## Rulings

- **R1 — cwd explícito.** O passo 1 da Tarefa 1 tem um `cd` condicional ambíguo. Ruling: o
  executor trabalha a partir de `/Users/lucas/Workspace/brasilemnumeros` (raiz do projeto)
  e cria `sitio/app/` com `mkdir -p sitio/app`. O guarda `cd ... || mkdir ...` do brief é
  ignorado. Custo se errado: um diretório aninhado criado por engano — trivial de desfazer.
- **R2 — batching das tarefas 1–3.** As três tarefas da fatia 00 são um único scaffold
  (criar projeto → shell → provar o build), com **uma** superfície de revisão. Ruling:
  **um** dispatch de implementador para as três, e **uma** revisão sobre o diff inteiro.
  Custo se errado: uma revisão grande demais para um scaffold pequeno — nenhum.
- **R3 — modelo não é fixável.** A skill exige escolher o modelo explicitamente por
  dispatch; o `delegate_task` desta harness **não expõe** parâmetro de modelo. Ruling:
  dispatch sem pin de modelo, e o fato fica registrado aqui. Custo se errado: custo/latência
  acima do ótimo — não afeta a correção.
- **R4 — `scripts/task-brief` não reconhecia "Tarefa".** O script só casava cabeçalhos
  `Task N`; os planos (em português) usam `Tarefa N`. Ruling: corrigi o script do plugin
  para casar `Task|Tarefa` (e dei `chmod +x` nos três scripts, que estavam sem permissão de
  execução). Custo se errado: nenhum — a mudança é aditiva e o padrão em inglês continua
  funcionando.

## Progresso

- `Task 1-3: dispatched` (base `8f40ace`, um dispatch para as três — ruling R2; agente
  `sa-0-1328cd65`).
- `Task 1-3: report received` — DONE. Commits `5f5998a` (T1) e `7a7a50e` (T2). T3 é
  verificação (sem commit). Relatório em `task-1-report.md`.
- `Task 1-3: review dispatched` (pacote `review-8f40ace..7a7a50e.diff`, 2 commits, só o app;
  agente `sa-0-af90e6cc`).
- `Task 1-3: achados do implementador registrados` — ver R11 e R12 abaixo.
- `Task 1-3: review returned` — **Spec ✅ · Task quality: Approved.** 0 Critical, 1 Important
  (o `app/` fora do `exclude:` do Jekyll), 6 Minor.
  - ⚠️ item do revisor ("não consigo verificar do diff que `npm ci && npm test` fica verde e
    que o build emite `app.js`/`app.css`"): **resolvido pelo controlador** — a saída crua dos
    dois comandos foi capturada nesta sessão (notificação de processo em background:
    `Test Files 1 passed (1)` / `Tests 1 passed (1)`), e o pacote de revisão mostra o
    `outDir`/nomes fixos na config. Não é lacuna real.
- `Task 1-3: minor (deferred):` regra `.vite` morta no `.gitignore` (o cache do Vite vive em
  `node_modules/.vite`) · `.gitignore` sem newline final · `defineConfig` de `vite` em vez de
  `vitest/config` no bloco `test` · `assetFileNames: 'app.[ext]'` colide se um segundo asset
  da mesma extensão aparecer · tabela do `AGENTS.md` dizendo "nenhuma fatia implementada"
  (atualizar no merge da fatia).
- `Task 1-3: fix round 1/5 dispatched` — achados: (1) Important do revisor (`app/` no
  `exclude:` do Jekyll); (2) R12 (entrada de build no JS, para não emitir `index.html`).
  Implementador novo (agente `sa-0-1dc59521`), carregando os briefs + `task-1-report.md`.
  Minors deliberadamente fora da rodada.
- `Task 1-3: fix round 1 INTERROMPIDO por timeout` (900s, agente `sa-0-1dc59521`). O
  trabalho de código **está na árvore** (`_config.yml`, `app/vite.config.js`), mas **sem
  commit e sem relatório**. Causa da queima: tentar fazer o `bundle exec jekyll build`
  renderizar até o fim numa máquina cujo Jekyll é instalado à mão (fato #10) e que tem um
  erro de Liquid pré-existente e alheio.
- `Task 1-3: fix round 1 re-dispatched (conclusão)` — dispatch enxuto: verificar, rodar,
  commitar SÓ os dois arquivos, relatar; com ordem explícita de **não** insistir no render
  do Jekyll e de aceitar a prova por leitura de configuração. Agente `sa-0-666659bc`.
- `Task 1-3: minor (deferred):` aviso de deprecação do Vite 8 — `inlineDynamicImports` deve
  virar `codeSplitting: false`. Deliberadamente fora da rodada (é prescrição do plano, e
  trocar API em rodada de correção é scope creep).
- `Task 1-3: fix round 1/5 (2 addressed, 0 open; commit 5de10ff)` — commit toca **exatamente**
  `_config.yml` + `app/vite.config.js` (conferido por `git show --name-only`); árvore limpa.
  Evidência: `npm test` 1/1 verde; `npm run build` emite **só `app.js`** (33,13 kB);
  `npm run dev` responde 200 em `/` e em `/src/main.js`.
  Prova da exclusão do Jekyll: o render **não roda nesta máquina** por causa pré-existente e
  alheia — `Could not find 'bundler' (2.7.1)` (Ruby 2.6 do sistema) e, pelo jekyll do
  `~/.gem`, `Could not find 'em-websocket' (~> 0.5)`. Nenhum dos dois erros menciona `app/`.
  O implementador provou carregando o **`Jekyll::EntryFilter` real** do gem com um stub de
  logger: todo caminho sob `app/` → excluído; `assets/js/app/app.js`, `index.html`,
  `_layouts/default.html`, `indicators.json` → não excluídos.
- `Task 1-3: re-review dispatched` (escopada: `review-fe1de75..5de10ff.diff`, 1 commit;
  agente `sa-0-2afe6a9d`).
- `Task 1-3: re-review returned` — **Achado 1 ADDRESSED · Achado 2 ADDRESSED · nenhuma
  quebra nova.** O re-revisor reproduziu o build de forma independente (só `app.js`,
  33138 bytes) e reconferiu a exclusão com o `Jekyll::EntryFilter` do `jekyll-4.2.2`,
  confirmando que `assets/js/app/app.js` **não** é capturado pelo padrão `app/`.
- `Task 1-3: complete (commits 8f40ace..5de10ff, review clean)` — 0 achados abertos.
  Minor adiados: 6 (na revisão do revisor) + 1 (deprecação do Vite).
  **Rulings: R1, R2, R3, R4, R10, R11, R12, R13.**

## Fim da fatia 00 — próximo passo: fatia 01 (`01-contrato-de-dados.md`)

## Rulings

- **R10 — o dispatch precisa nomear o arquivo de relatório.** Esqueci de dar o caminho do
  relatório no primeiro dispatch; o implementador escolheu `progress.md` — **o ledger** — e
  anexou o relatório nele (o conteúdo do ledger sobreviveu; separei em `task-1-report.md`).
  Ruling: todo dispatch daqui em diante nomeia `<workspace>/task-N-report.md`
  explicitamente. **Custo se errado:** o ledger é sobrescrito e o controle perde o mapa de
  recuperação pós-compactação — foi por um fio.
- **R11 — o ambiente local instala zero devDeps.** Esta máquina tem `NODE_ENV=production` e
  `npm omit=dev` no ambiente, então `npm install`/`npm ci` puros **não instalam** Vite,
  Svelte nem Vitest. O implementador contornou com
  `NODE_ENV=development npm ci --include=dev`. Ruling: **todo** comando `npm ci`/`npm
  install` desta máquina (local, e em qualquer dispatch futuro) precisa do
  `NODE_ENV=development … --include=dev` explícito. O CI (GitHub Actions, Node 24) **não**
  sofre disso — a fatia 10 mantém o `npm ci` limpo. **Custo se errado:** um subagente
  futuro roda `npm test` e não encontra o binário — falha ruidosa, não silenciosa.
- **R12 — `vite build` emite `index.html` no `outDir`.** O build padrão do Vite (modo
  aplicação, entrada HTML) copia `index.html` para `assets/js/app/`. O plano exigia
  "exatamente os nomes `app.js` e `app.css`". **A consequência não é cosmética:** o
  `outDir` é gitignored, mas o **Jekyll lê a árvore de trabalho, não o git** — então
  `assets/js/app/index.html` seria publicado em
  `www.brasilemnumeros.ong.br/assets/js/app/index.html` (um shell de dev órfão no ar).
  Ruling: corrigir apontando a entrada de build para o JS (`build.rollupOptions.input`),
  mantendo o `index.html` só como entrada do `vite dev`. **Custo se errado:** um arquivo
  inerte publicado num caminho profundo — pequeno, mas é vazamento de artefato de
  desenvolvimento, e o projeto tem a regra de não publicar fonte (`docs/`, `app/`).
- **R13 — o app não emite CSS próprio.** Efeito colateral do R12, medido: com a entrada de
  build no JS, o `vite build` emite **só `app.js`** e o `app.css` desaparece. Investigado:
  o `app.css` **nunca foi um CSS do app** — era o Vite empacotando o `<link
  rel="stylesheet">` do `index.html` de dev, que aponta para o `main.dist.css` do site (62
  kB, exatamente o mesmo arquivo). Manter os dois carregaria o mesmo CSS duas vezes. Ruling:
  o app é estilizado pelo **`main.dist.css`** (Tailwind sobre o site inteiro, que já varre
  `app/src` — é precisamente por isso que a §10.3 exige que `app/src` não seja ignorado, e
  por isso existe a classe-canário), já carregado pelo `_layouts/default.html`. Planos 00 e
  10 corrigidos; **é desvio declarado da §10.1**, que lista `app.css` como saída, e a spec
  precisa ser corrigida. **Custo se errado:** se o app realmente precisasse de CSS próprio
  (por exemplo para virar repo separado), faltaria o bundling de estilo — hoje não precisa,
  porque não há um único `import` de CSS no app.


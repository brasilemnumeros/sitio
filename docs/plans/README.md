# Planos de implementação — Camada de gráficos

Planos **fatiados por unidade de trabalho**. Um arquivo por fatia, cada um com os
critérios de aceite explícitos. Não existe plano monolítico — a decisão de método está
registrada no `AGENTS.md` (por que não adotamos o BMAD).

**Documentos que mandam:** a spec de design
(`sitio/docs/specs/2026-10-14-camada-de-graficos-design.md`) e a ADR 0001
(`sitio/docs/adr/0001-camada-de-graficos-como-app-isolado.md`). Todo plano **argumenta a
partir da spec** — quem executa lê os dois. Onde este índice resumir e a spec detalhar,
vale a spec.

**Repositórios envolvidos:** `sitio/` (o app e o build) e `dados/` (o contrato das
séries e os governos). A raiz também é repo — guarda este diretório e o `AGENTS.md`.

---

## Como usar

1. Uma fatia por vez, na ordem de dependência abaixo.
2. **Antes de implementar**, rodar o portão de prontidão.
3. Ao fechar uma fatia, conferir os **critérios de aceite** — não o "pronto" de quem
   implementou. Rodar build e testes de verdade.
4. Ao concluir, atualizar a tabela "Trabalho em andamento" do `AGENTS.md`.

## Portão de prontidão (antes de escrever qualquer código)

PASS / CONCERNS / FAIL sobre os itens abertos da spec (§12). **Nenhum bloqueia o
plano** — a spec fechou o desenho sem item bloqueante — mas cada um precisa de decisão
explícita **antes da fatia que o toca**.

| item aberto (§12) | estado | toca a fatia | resolução necessária |
|---|---|---|---|
| Modal de busca no celular | **não desenhado** | 08 | decidir o lay-out mobile antes de fechar a 08 |
| Sobreposição dos rótulos na ponta das linhas | **a verificar** | 06 | medir o comportamento da lib com 10 séries; é o que sustenta o canal redundante de cor |
| Logos dos partidos (assets + **uso de marca**) | não resolvido | 06/09 | a questão de marca **não é decisão técnica** — decisão do usuário |
| Duração visível no trilho (barrinha) | não decidido | 09 | decidir se entra; se sim, é refinamento da 09 |
| Leitura por espectro político | **descartada** | — | só volta como modo explícito do usuário, com fonte citada |

**Gate atual:** `CONCERNS` — os quatro primeiros são pendências de desenho, não de
plano. A fatia 06 não deve começar sem a medição dos rótulos; a 08 não deve começar sem
o desenho mobile.

---

## As fatias

| # | arquivo | unidade de trabalho | entrega | depende de |
|---|---|---|---|---|
| 00 | `00-fundacao-app.md` | Fundação do app | projeto Vite + Svelte + Vitest autocontido em `sitio/app/`, build com nome fixo | — |
| 01 | `01-contrato-de-dados.md` | Contrato de série (§6) | `data/`: schema canônico, validação que falha em voz alta, cache, catálogo | 00 |
| 02 | `02-dominio-escalas.md` | Escalas (§5) | `domain/scales`: razão de amplitude, corte 50×, sugestão de eixo | 01 |
| 03 | `03-dominio-mandatos.md` | Governos (§7) | `dados/governos/federal.json` + `domain/mandates`: Δ por mandato, 4 estados de célula | 01 |
| 04 | `04-dominio-cor.md` | Cor (§1) | `domain/color`: OKLab, simulação de daltonismo, envelope da paleta, aviso de colisão | 00 |
| 05 | `05-stores.md` | Estado (§8) | `stores/`: series · mandate · axes · viewport · catalog | 01,02,03,04 |
| 06 | `06-grafico-adapter-faixas-minimapa.md` | Gráfico (§2, §8.1) | `chart/`: adapter, faixas de governo (`ISeriesPrimitive`), minimapa | 05 |
| 07 | `07-shell-chips-filtros.md` | Casca da página (§1) | `components`: App · SeriesChips · TimeFilters | 06 |
| 08 | `08-modal-de-busca.md` | Busca (§1.1) | `components/SearchModal`: cascata de três colunas, teclado, ficha com aviso de escala | 07 |
| 09 | `09-trilho-e-painel-de-comparacao.md` | Mandatos na UI (§3, §4) | `components`: MandateRail · ComparisonPanel | 06,07 |
| 10 | `10-build-ci-e-a-virada.md` | Integração e virada (§10) | CI com canário, `/` vira o shell, remoção do legado, NOTICE + atribuição | 09 |
| 11 | `11-migracao-do-repo-dados.md` | Contrato no repo `dados` (§6) | notebooks publicam `value`; convivência de chaves; retirada de `rate` | — (coordena com 10) |

### Ordem e paralelismo

```
00 ─┬─ 01 ─┬─ 02 ─┐
    │      ├─ 03 ─┼─ 05 ── 06 ─┬─ 07 ─┬─ 08
    └─ 04 ────────┘            │      └─ 09 ── 10
                                └──────────────┘
11 (repo dados) corre em paralelo; a ORDEM de deploy dela com a 10 é o que evita
   minutos de gráfico quebrado (§6). Ver "Ordem de deploy" abaixo.
```

### Ordem de deploy entre os repos (§6)

Não há fase de convivência entre páginas. O que resta é a ordem dos pushes:

1. `dados/` publica `{"date","rate","value"}` (fatia 11) — a página antiga continua lendo
   `rate`, o app novo lê `value`.
2. `sitio/` publica o app (fatia 10) — `/` vira o shell.
3. `dados/` retira `rate` num commit posterior (fatia 11).

---

## Onde cada estado da spec §9 é entregue

Nenhum vazio silencioso. Os estados não formam uma fatia própria — nascem junto com a
superfície que os exibe:

| estado | entregue em |
|---|---|
| esqueleto de carregamento (forma do conteúdo, progresso **por série**) | 07 |
| erro por série = degradação parcial; erro total; `schema` desconhecido | 01 (o erro) + 07 (a superfície) |
| estado inicial com atalho de exemplo ("Selic × IPCA") | 07 |
| 10 séries: botão desabilitado com o motivo (**paleta**, não layout); nada removido | 08 |
| estados de célula da matriz (Δ · parcial · sem cobertura · ponto único) | 03 (a regra) + 09 (a exibição) |
| aviso de escala incompatível na ficha | 02 (a regra) + 08 (a ficha) |

---

## Achados que os planos mediram (não estavam na spec)

Três coisas apareceram ao escrever o plano, todas **medidas**, e ficam registradas aqui
para não se perderem:

1. **A MVG-R tem meses duplicados.** `mvgr-nominal` e `mvgr-real` têm **259 pontos para
   257 meses** — **2005-10** e **2015-10** aparecem duas vezes cada. É por isso que o
   Lula I conta **35** pontos (e não 34). Corrigir muda números que a spec já publicou
   (35 → 34; a matriz da §7.3 muda em duas células) — a fatia 11 corrige **e** atualiza a
   spec.
2. **`sitio/app/` e `sitio/scripts/` precisam entrar no `exclude:` do `_config.yml`.**
   É o **mesmo trap do `docs/`** já documentado no `AGENTS.md`: o Jekyll copia arquivo sem
   front matter verbatim, e o fonte do app seria publicado em `/app/...`. A fatia 10
   trata.
3. **A medição da §7.3 se reproduz exatamente.** A matriz de cobertura do anexo
   (13 × 8 = 104 células, 4 sem cobertura, 1 ponto único) foi recomputada sobre os dados
   reais e bate **célula a célula** — o que permitiu transformá-la em teste de aceite
   (fatia 03) em vez de prosa.

### Propriedade do metadado — consequência para o `indicators.json`

A §6 atribui **unidade, granularidade e fonte ao `dados/`** e proíbe repetir metadado nos
dois lados. Consequência que os planos assumem: o `indicators.json` **perde `unit` e
`source`** (fatia 11) e o app lê ambos da **série carregada** (fatias 05 e 08). A string
humana de granularidade ("Acumulado 12 meses") **não** é o enum da série (`monthly`) —
fica, renomeada para `granularityLabel`, porque não é duplicata.

3. **O app não emite CSS próprio.** O `app.css` que a §10.1 menciona é o `main.dist.css`
   do site re-empacotado pelo Vite ao seguir o `<link>` do `index.html` de dev — não um CSS
   do app. Com a entrada de build no JS, o build emite **só `app.js`**. Quem estiliza o app
   é o `main.dist.css` (Tailwind sobre o site inteiro, que já varre `app/src` — é
   exatamente por isso que a §10.3 exige que `app/src` não seja ignorado, e por isso existe
   a classe-canário). O `_layouts/default.html` já o carrega. **Registrado como desvio da
   §10.1**, que lista `app.css` como saída — ver o adendo abaixo.

## Desvios da spec registrados por medição

- **§10.1 (saída do build).** A §10.1 diz "saída com nome fixo: `app.js` e `app.css`". Medido:
  o app **não tem CSS próprio** — o `app.css` era o Vite empacotando o `<link>` do
  `index.html` de dev, que aponta para o `main.dist.css` do site. Manter os dois significaria
  carregar o mesmo CSS duas vezes. **Decisão: o build emite só `app.js`,** e o estilo vem do
  `main.dist.css` já carregado pelo `_layouts/default.html`. A `§10.1` precisa ser corrigida
  na spec.

## Convenções que todos os planos assumem

- **Idioma:** comentários e strings de UI em **português**. Nos identificadores: **infra e
  utilidade em inglês** (`seriesSpan`, `amplitudeRatio`, `loadSeries`, `validateCatalog`) e
  **vocabulário de domínio em português** (`comparabilidade`, `deltaNoMandato`,
  `pontosEsperados`, `faixasVisiveis`). Ruling **R24**: a redação anterior — "nomes de código
  em inglês" — era larga demais para um produto cujo domínio é político-econômico brasileiro;
  `mandato`, `titular` e `cobertura` não têm equivalente inglês que não seja pior. O revisor da
  fatia 03 flagrou a divergência, corretamente, e é isto que resolve.
- **Camadas (§8):** a dependência desce. `components/` → `stores/` → `domain/` →
  `chart/` + `data/` → estático. **Só `chart/` importa a Lightweight Charts.** Só
  `Chart.svelte` fala com `chart/adapter`. `domain/` é puro (sem Svelte, sem DOM, sem
  rede) e é onde mora o alvo prioritário de teste.
- **Nada em `window`.** O que hoje é global vira store nomeado (§8, regra 4).
- **Testes: Vitest**, unidade em `domain/` e `data/`. Sem teste de componente e sem
  navegador por ora (§10.7). O critério é *toda regra que decide algo tem um teste*, não
  porcentagem.
- **Commits:** um commit por passo marcado, na convenção do repositório
  (`feat:`/`fix:`/`test:`/`docs:`). `sitio/` e `dados/` commitam **separadamente** — são
  repos distintos.
- **Sem legado:** nada da camada atual convive. A remoção dos arquivos antigos é a
  fatia 10, mas nenhuma fatia nova depende deles.
- **Custo zero é invariante:** nenhuma fatia introduz serviço pago, chave de API ou
  host pago.

## Fora de escopo (não planejar nestas fatias)

- Automação do pipeline de dados (Actions no lugar dos notebooks Colab) — a fatia 11
  mexe nos notebooks **manuais**, não na automação deles.
- Dados municipais (~5.570 entidades) — o modelo comporta, o dado não é populado (§7.1).
- Normalização base 100 como padrão — só como ação explícita do usuário (§5).
- Qualquer correção dos achados fora da camada de gráficos (`404.html` com layout
  inexistente, `tailwind.config.js` morto, `jekyll-analytics` no Gemfile) — registrados
  na ADR, não pertencem a este plano.

# Analytics GA4 — eventos, consentimento revogável e atribuição de compartilhamento

- **Data:** 2026-11-01
- **Status:** desenho aprovado (aguardando plano de implementação)
- **Origem:** revisão de GA do site feita em 2026-11-01 (o relatório apontou 3 eventos no site
  inteiro, nenhum da lista de prioridade do `AGENTS.md`, e a conversão do produto sem medição)

## 1. Intenção

O site mede hoje: `page_view`, `theme_changed`, `audio_play`, `audio_pause`. Nada disso responde
a uma decisão de produto. A conversão declarada do produto é **compartilhar o gráfico** — e ela
não gera evento nenhum.

Este desenho entrega três coisas juntas, porque separá-las deixaria a pior pela metade:

1. **Consentimento que se sustenta**: o banner hoje não é operável por teclado, não pode ser
   revogado depois de decidido, e o texto promete "funcionalidade" onde a política descreve
   analytics.
2. **Eventos que respondem a decisão**: os cinco itens de prioridade do `AGENTS.md` mais a
   entrada no gráfico, que é o que separa "abriu a home" de "abriu o gráfico de alguém".
3. **Prova**: o `testar-analytics.mjs` passa a provar o gate inteiro (nenhum request, nenhuma
   fila, nenhum evento) e o disparo de cada evento — inclusive o único que faltava: nenhum
   evento enfileirado antes do consentimento.

## 2. Objetivos

- Quinze eventos (a superfície inteira do app + os três do site), com os nomes e parâmetros do
  `AGENTS.md`.
- Link copiado sai com `utm_source=share&utm_medium=referral`, para o compartilhamento
  ser **atribuído** e não só contado.
- Banner com `<button>` de verdade, texto que descreve cookies analíticos, e um caminho de
  **revogação** que existe de fato.
- Cookie de decisão de 31 → **180 dias**, `SameSite=Lax` e `Secure` sob HTTPS.
- `testar-analytics.mjs` cobre: sem consentimento, recusado, com DNT, consentido, e um clique de
  cada família de evento.

## 3. Não-objetivos

- Configuração do Admin do GA4 (retenção, enhanced measurement, key events, channel group) —
  vira checklist no fim deste documento, executado por uma pessoa no console.
- GTM: continua proibido (`AGENTS.md`), eventos por `gtag('event', ...)`.
- UTM em qualquer link além do copiado pelo app.
- Enviar o termo digitado na busca (proibido por PII/dado sensível).
- Dashboard, relatório, ou qualquer mudança de copy fora do banner.

## 4. Anti-objetivos (o que faria isto falhar mesmo "funcionando")

- Qualquer requisição a `googletagmanager.com` antes do consentimento.
- Qualquer evento enfileirado (`dataLayer`) antes do consentimento.
- Redeclarar a guarda de consentimento em cada página: o evento nasce num módulo, não no layout.
- Fazer o teste passar escondendo erro (a regra do E2E vale aqui: falha em voz alta).
- Medir o app em `astro dev` (o gate é de PROD; em dev não existe gtag — e o teste não pode
  depender disso).

## 5. Restrições que moldam a solução

- **ADR 0001 (D1)**: o app tem build próprio; o site não autora Svelte. O app é buildado sempre
  com `NODE_ENV=production` — inclusive no `npm run dev` do site — então um módulo compartilhado
  resolveria `import.meta.env` de formas diferentes nos dois lados. Daí **dois módulos**, cada um
  dono do seu bundle, com a mesma regra escrita duas vezes.
- **Ordem de build**: `app` → `preparar-publico` → Astro. O app não pode importar de `src/`.
- **Escopo do `?v=${VERSAO}` e do canário**: só o que está em `public/assets/js/` e em `app/src/`
  é alcançado pelos guardas.
- **Nomenclatura (`AGENTS.md`)**: `object_action`, minúsculo, snake_case, inglês; sem nome
  reservado do GA4; `event_category`/`event_label` proibidos; sem PII.
- **Limite do GA4**: nome de parâmetro ≤ 40 caracteres, valor ≤ **100**. Um `series_ids` com 10
  ids passa disso — o valor é cortado em fronteira de vírgula e `total_series` continua exato.
- **Borda do app**: `componentes → stores → domínio → fronteira/dados → estático`. Evento não é
  camada; o que for puro (montar o link compartilhável) vai para `domain/`.

## 6. Abordagens consideradas

| | Como | Custo |
|---|---|---|
| **A (escolhida)** | Um módulo de eventos por lado: `public/assets/js/analytics-eventos.js` (site) e `app/src/analytics.js` (app), com o mesmo contrato mínimo `enviar(nome, params)` que descarta sem `window.gtag`. | Repetir ~10 linhas de guarda em dois arquivos. |
| B | Delegação inline em `Base.astro`, `Home.astro`, `Post.astro` e no `SeriesDrawer`. | A guarda vira quatro cópias e o próximo evento copia o padrão errado. |
| C | O app dispara `CustomEvent` e um único listener do site traduz para `gtag`. | Contrato por string entre dois bundles com deploys independentes; quebra em silêncio. |

A escolha de A é por previsibilidade de ambiente e de build (o app é sempre build de produção, o
site não), não por uma proibição formal da ADR — ela não proíbe; ela isola.

## 7. As peças

### 7.1 Módulo do site — `public/assets/js/analytics-eventos.js`

Arquivo novo, servido como `<script defer>` com `?v=${VERSAO}` em `Base.astro` (todas as páginas)
e em `Home.astro` (a `/`, que não usa `Base`). Segue a convenção dos scripts do site
(`theme-switcher.js`, `feedback-button.js`).

API interna (não exporta nada — é script de página):

- `enviar(nome, params)` — `if (typeof window.gtag !== 'function') return;` depois
  `gtag('event', nome, params)`. **Sem fila.**
- Delegação única em `document`, `click`:
  - `outbound_link_clicked` — `a[href]` cujo `origin` difere do da página. `link_url` =
    `origin + pathname` (query e hash caem: podem carregar token), `link_domain`, `link_text`
    (texto colapsado, ≤ 100), `location`.
  - `nav_link_clicked` — **todo** link interno (mesma origem), sem lista de exceções: a
    prioridade 2 do `AGENTS.md` inclui categorias e "últimas publicações", que são conteúdo, não
    navegação. Uma lista de onde vale medir envelhece; `location` responde "onde estava o link".
  - `location` resolve por `closest()`: `nav` → `nav`; `footer` → `footer`; `[data-analytics-location]`
    → o valor do atributo (`links` na página `/links`, `feedback` no `#feedback-btn`, `post` no
    corpo do post); senão `content`.
  - Os dois são mutuamente exclusivos (mesma origem × origem diferente).
- `post_read` — só quando existe `[data-analytics-post]` no documento. O `Post.astro` emite
  `data-analytics-post={slug}`, em que `slug` é o **último segmento da URL publicada sem `.html`**
  (o mesmo `urlDoPost` que gera o canonical — duas derivações divergiriam), e não o `post.id` com
  o prefixo de data: o valor precisa casar com o `page_location` e com os links do site. `scroll`
  com `requestAnimationFrame`, calcula
  `(scrollY + innerHeight) / scrollHeight`, dispara `50` e `90` **uma vez cada** por carga.
  Página que não rola (altura ≤ viewport) **não** dispara: sem rolagem não houve leitura.

### 7.2 Módulo do app

- `app/src/domain/share.js` (puro, testável): `linkDeCompartilhamento(href)` devolve a URL com
  `utm_source=share&utm_medium=referral` preservando `series` e as demais chaves. Nunca muta a URL
  da página. (`referral` é o `medium` honesto — a visita chegou por indicação — e o `source`
  `share` a separa dos referrals orgânicos; o channel group do §10.1 usa essa regra.)
- `app/src/analytics.js`: `enviar(nome, params)` com a mesma guarda. **Os pontos de chamada
  ficam nas ações das stores**, não nos componentes: a store é o único caminho pelo qual o estado
  muda, então instrumentar ali cobre busca, legenda, gaveta e permalink sem duplicar (princípio
  do plano de 2026-10-17, que continua certo). `origin` chega por parâmetro.
  - `stores/series.js` → `series_added`, `series_removed`, `series_failed`, `axis_changed`,
    `share` não mora aqui (é ação de UI, não de estado).
  - `stores/mandate.js` → `mandate_selected`.
  - `stores/viewport.js` → `time_window_selected`.
  - `SeriesDrawer.svelte` → `share_clicked` (a única exceção, porque o copiar é gesto de UI e só
    ele sabe que o `writeText` deu certo) e o link copiado passa a vir de `linkDeCompartilhamento`.
  - `permalink-init.js` → `chart_viewed`, **uma vez**, depois de restaurar: `origin` = `permalink`
    se a query tinha `series`, senão `preset`; `empty` quando nenhum id resolveu.
  - `SearchModal.svelte` → `search_performed` ao fechar, se houve termo digitado: `results`
    (matches do último termo **não vazio**, em snapshot — campo limpo no fechamento não pode
    virar `results: 0`) e `series_added` (`1`/`0`). **Sem o termo digitado** (`AGENTS.md`).
  - `Tour.svelte` → `tour_step`; `BottomDrawer.svelte` → `comparison_opened`.

### 7.3 Eventos (contrato final)

Inventário da UI feito em 2026-11-01 (Playwright no app com dado local, desktop + Pixel 7,
gavetas e busca abertas) — a primeira versão deste desenho cobria **metade** da superfície. A
tabela abaixo é a união do plano de 2026-10-17 (nomes traduzidos) com os eventos do site.

| Evento | Onde | Parâmetros | Gatilho |
|---|---|---|---|
| `page_view` | automático | — | carga da página |
| `chart_viewed` | app | `origin` (`permalink`/`preset`/`empty`), `series_ids`, `total_series` | estado restaurado, uma vez |
| `series_added` | app | `series_id`, `origin` (`search`/`example`/`permalink`/`preset`/`user`) | série entra no gráfico |
| `series_removed` | app | `series_id` | série sai (legenda, chip ou gaveta) |
| `series_failed` | app | `series_id`, `reason` (`http`/`schema`/`parse`) | série não carrega |
| `mandate_selected` | app | `mandate_id` (`null` ao limpar) | chip ou faixa do minimapa |
| `time_window_selected` | app | `window` (`1y`/`5y`/`10y`/`all`) | preset de tempo |
| `axis_changed` | app | `series_id`, `axis` (`left`/`right`) | "dir." na gaveta |
| `search_performed` | app | `results`, `series_added` (`1`/`0`) | fecha a busca tendo digitado |
| `share_clicked` | app | `method` (`copy_link`), `series_ids`, `total_series` | copiar o link deu certo |
| `comparison_opened` | app | — | abre a matriz por mandato |
| `tour_step` | app | `step`, `total` | avança no tour |
| `outbound_link_clicked` | site | `link_url`, `link_domain`, `link_text`, `location` | clique em link de outra origem |
| `nav_link_clicked` | site | `link_url`, `link_text`, `location` | clique em link interno |
| `post_read` | site | `post_slug`, `percent_scrolled` (`50`/`90`) | rolagem do post, 1× cada |

`series_ids` é a lista unida por vírgula, cortada em fronteira de vírgula para caber em 100
caracteres; `total_series` não é truncado. `audio_play`/`audio_pause`/`theme_changed` ficam como
estão (não custam nada e já estão no histórico do GA4).

**Três decisões de nome, contra o plano de 2026-10-17:**

- **Tudo em inglês** (`AGENTS.md` vence a decisão de 2026-10-17, que era em português). O
  documento antigo fica marcado como superado — dois planos de tagueamento discordando é
  exatamente o defeito que o repo já registrou três vezes.
- **`share_clicked`, não `share`.** `share` é evento recomendado do GA4 e daria relatório pronto,
  mas `AGENTS.md` proíbe nome reservado; o custo é perder o relatório nativo e marcar
  `share_clicked` como key event no Admin.
- **`search_performed` sem `search_term`.** O plano de 2026-10-17 mandava enviar o termo; o
  `AGENTS.md` proíbe texto digitado. Vale o `AGENTS.md`.


### 7.4 Consentimento (P0)

- `CookieConsent.astro`: os **dois** controles de decisão (`#cookie-notice-accept`,
  `#cookie-notice-reject`) viram `<button type="button">` — mesmos `id`s, o `testar-analytics.mjs`
  e o CSS não mudam. O terceiro ("Mais informações") **continua um `<a href>`**: é navegação de
  verdade e precisa de clique do meio, abrir em nova aba e `href` para leitor de tela. O teste
  passa a afirmar "dois botões + um link". Texto: cookies **analíticos**, carregados só após o
  "Aprovar" e nunca com Do Not Track.
- Revogação: `<button data-cookie-reset>` ligado por delegação no próprio `CookieConsent.astro`
  (o dono do cookie continua sendo um só). Colocado no `Footer.astro` ("Preferências de
  cookies") e na página da política, com `id="cookies"` como âncora. O clique **expira o cookie
  de decisão e os cookies do Google** (`_ga`, `_ga_*`, `_gid`, `_gat*`) e recarrega — a faixa
  volta. Apagar só a decisão deixaria o identificador de 2 anos no navegador de quem revogou.
  - **A `/` não ganha link novo**: `Home.astro` não carrega rodapé por decisão de produto, e a
    barra inferior de 36px já tem o "Termos". O caminho desde a home é Termos → rodapé →
    Política. Custo aceito e registrado; mudar a `/` é decisão visual à parte.
- Prazos: 180 dias, `SameSite=Lax`, `Secure` quando `https:`.
- `politica-de-privacidade.md:51` passa a descrever o caminho real de revogação (o texto atual
  promete "recusando os cookies na faixa exibida", e a faixa não volta).

#### O tour cobria a faixa (achado e corrigido em 2026-11-01)

Medido na home: o overlay do `driver.js` tem `z-index: 10000` e a faixa `z-50` — com o tour
aberto, `elementFromPoint` no centro do "Aprovar" devolvia o `path` do overlay, ou seja, **os dois
botões de consentimento ficavam inalcançáveis** na primeira visita (a faixa aparecia escurecida,
o que parece "banner que não abre"). Com o tour fechado, o clique chegava.

Decisão: **consentimento primeiro, onboarding depois.** `deveMostrarTour` ganhou
`consentimentoPendente` (a faixa está na tela) e o app não auto-inicia o tour enquanto ela existir;
o botão "Ver o tour" do trilho continua funcionando. Consequência que exigiu uma peça a mais: o
"Aprovar" recarrega a página e, no reload, o `?series=` do preset já está na URL — e o app contava
isso como "veio de link compartilhado", suprimindo o tour para sempre. Por isso o
`permalink-init` grava `sessionStorage['series-do-app']` ao escrever o preset, e o `main.js` só
considera "link compartilhado" quando o marcador não existe. Link aberto em aba nova não herda o
marcador (o `sessionStorage` é por aba), então o visitante de link compartilhado continua sem
tour — que é a regra original.

Texto do banner (2026-11-01, a pedido): "Usamos cookies analíticos do Google, só depois do seu
“Aprovar”. Nada vai para o Google antes disso." A frase anterior ("para melhorar a funcionalidade
do site") descrevia outra intenção. **O "Do Not Track" saiu da faixa**: é configuração do
navegador, não um controle do site — citar um sinal que não tem botão faz o visitante procurar o
botão. A regra continua valendo e continua escrita na política.

Rótulos com `whitespace-nowrap`: sem isso, quando o texto quebra em duas linhas (768–900px) o
"Mais informações" também quebrava, e os três botões esticavam na altura dele — medido em
2026-11-01 (`faixa` de 80px com rótulos de duas linhas). Agora o texto quebra e os botões não.
Medidas depois do conserto: 60px de altura em ≥1024, 72px em 768–900, 116px no celular; nenhum
transbordo horizontal em 375px.


### 7.5 Ver o fluxo em dev (`ANALYTICS_LOCAL=1`)

Em `astro dev` o gate de produção não renderizava **nem a faixa**: o consentimento só era
visível através de um build completo, e é por isso que ele nunca foi olhado (nem testado) em
dev. Os dois gates foram separados (2026-11-01):

```js
const analyticsAtivo = import.meta.env.PROD && Boolean(GA4_ID);
const consentimentoVisivel = analyticsAtivo || process.env.ANALYTICS_LOCAL === '1';
```

| Situação | Faixa | `gtag.js` |
|---|---|---|
| produção | sim | sim, só após o "Aprovar" |
| `ANALYTICS_LOCAL=1 npm run dev` | sim | **não** — nada sai para o Google |
| `npm run dev` sem o flag | não | não |

Consequência desejada: em dev dá para aprovar, ver o cookie, recarregar e ver a faixa sumir —
com **zero** requisição a terceiro. E, como `window.gtag` não existe, os módulos de evento
descartam: é a guarda deles funcionando, observável sem rede.

Para resetar a decisão em dev: `document.cookie = 'cookie-notice-dismissed=; path=/; max-age=0'`
(ou o botão de "Preferências de cookies" do §7.4, quando existir).

### 7.6 Posição do script

`<Analytics />` sai do fim do `<body>` e vai para o `<head>` nos dois layouts (GA4 recomenda;
hoje o `page_view` sai ~500 bytes antes do `</body>`). Os dois gates continuam os mesmos do §7.5 —
mudar de lugar não muda o que é renderizado.

### 7.7 Testes

**`scripts/testar-analytics.mjs`** (Playwright contra `dist/`, porta efêmera). Dois modos de
observação, porque as provas são diferentes:

- **Gate** (sem consentimento, recusado, DNT, consentido): rede de verdade, contando requisições a
  `googletagmanager` — é o que prova que nada sai antes do "Aprovar".
- **Eventos**: `window.gtag` substituído por um espião via `addInitScript` e
  `page.route('**/googletagmanager.com/**', abort)`. Assim a asserção é "o módulo chamou
  `gtag('event', …)` com estes parâmetros", e o teste **não manda hits reais para a propriedade de
  produção**.

| Cenário | Prova |
|---|---|
| sem consentimento (`/`) | 0 request a `googletagmanager`; `window.gtag === undefined`; `window.dataLayer === undefined`; faixa visível; `#cookie-notice-accept`/`-reject` são `<button>` e o "Mais informações" continua `<a href>` |
| `cookie-notice-dismissed=rejected` | 0 request |
| DNT ligado + cookie `true` | 0 request |
| consentido (`/`) | ≥ 1 request; `dataLayer` tem `config` |
| consentido (`/`, clique no copiar) | `share_clicked` no espião; o texto entregue ao clipboard tem `utm_source=share` (stub de `navigator.clipboard.writeText`) |
| consentido (post) | `post_read` com 50 e com 90 após rolar até o fim |
| consentido (`/links`, clique no GitHub) | `outbound_link_clicked` com `link_domain=github.com` e `location=links` |
| consentido (`/blog.html`, clique em nav) | `nav_link_clicked` |
| revogação (rodapé) | some `cookie-notice-dismissed` **e** os `_ga*`; a faixa volta |

**`verificar` e Actions (decidido em 2026-11-01):** `test:analytics` entra na cadeia do
`npm run verificar` (roda depois do `astro build`, então `dist/` existe) — e o workflow roda
`npm run build`, logo o deploy **para** se o gate quebrar. É o único guarda do repo que hoje não
rodava em lugar nenhum automático.

**Vitest (app)**: `domain/share.js` (UTM preservando `series` e query existente; sem mutar a
entrada), `analytics.enviar` (descarta sem `gtag`, envia com `gtag`, sem fila), `permalink-init`
(`chart_viewed` com `origin` correto e **uma** emissão) e os eventos de store
(`series_added/removed/failed`, `mandate_selected`, `time_window_selected`, `axis_changed`) com
`gtag` injetado — o padrão que a suíte já usa.

**Sabotagem obrigatória** (regra do projeto): removida a guarda `typeof gtag`, o cenário
"sem consentimento" tem de ficar vermelho; removido o `utm_source`, o teste do clipboard tem de
ficar vermelho. Registrar a saída dos dois.

## 8. Decisões que são minhas (o construtor pode ajustar)

- 180 dias de cookie (em vez de 31): 31 dias criam um degrau mensal na série de usuários.
- `link_url` sem query/hash: um link de saída pode carregar token na query.
- `post_read` só com rolagem real: página curta não "lê" 100% por existir.
- `search_performed` no fechamento (1 por busca) em vez de por tecla.
- `location` com seis valores (`nav`, `footer`, `links`, `feedback`, `post`, `content`).
- `chart_viewed` (não `chart_series_changed`): é leitura de estado, não mudança.
- `nav_link_clicked` cobre **todo** link interno (não só `nav`/`footer`): a prioridade 2 do
  `AGENTS.md` inclui categorias e "últimas publicações", e `location` já diz onde o link estava.
- `post_slug` é o último segmento da URL (sem `.html`), não o `id` do arquivo com a data: casa
  com `page_location` e com os links publicados.
- "Mais informações" continua `<a href>`; só os dois controles de decisão viram `<button>`.
- Os cenários de evento usam `gtag` espião e rede bloqueada; só os de gate usam a rede real.
- Booleano vai como `1`/`0` (`series_added`): dimensão customizada do GA4 é texto e `1`/`0`
  também serve como métrica.
- Evento nasce na **store**, não no componente (exceto `share_clicked`): a store é o único caminho
  de mudança de estado, então um call site cobre busca, legenda, chip e gaveta.
- `series_failed` leva `reason` fechado (`http`/`schema`/`parse`), não a mensagem do erro: a
  mensagem é livre e viraria dimensão de cardinalidade infinita. (Este evento teria avisado os
  dois 404 do repo `dados` vistos no `dist/` em 2026-11-01.)
- `tour_step` (e não `tour_started`/`tour_completed`): um evento só diz onde as pessoas param.

## 9. Riscos

- **Mover o `<Analytics />` para o `<head>`** mexe na cadeia `verificar` (`testar-home`,
  `testar-meta`, `testar-atribuicao`). Mitigação: rodar o `verificar` inteiro, não só o analytics.
- **O `testar-analytics.mjs` passa a rodar em todo build e no Actions** — inclusive no de
  documentação. O gate agora usa rede real no CI: se `googletagmanager.com` estiver bloqueado, o
  deploy para por um motivo que não é o código. O relatório da falha tem de deixar isso óbvio
  (mensagem citando a URL).
- **O `testar-analytics.mjs` passa a depender do app montar** (o botão de compartilhar). O
  catálogo é embutido, então não depende de rede; as séries sim, mas o botão do trilho não
  depende delas. Se o botão não estiver visível, o teste **falha** (não pula).
- **Dois produtores de evento** (site e app) podem divergir. Mitigação: comentário cruzado nos
  dois arquivos + o teste de cada lado; a tabela do §7.3 vira a seção do `AGENTS.md`.
- **`dist/` desatualizado** é o modo de falha clássico deste repo. O teste roda contra `dist/`;
  o plano tem de exigir `npm run build` antes (e restaurar o artefato de dev depois, se houver
  servidor aberto).
- **Enhanced measurement** já mede `scroll` em 90% por conta própria; `post_read` existe para
  trazer o slug. Se os dois aparecerem, o relatório confunde — resolver no Admin (§10.5), não
  duplicando no código.

## 10. Checklist do Admin do GA4 (pessoa, não código)

1. Criar um **channel group** "Compartilhamento" com a regra `source = share` (senão o tráfego
   cai em Referral como qualquer outro).
2. Registrar como **dimensão customizada de evento** (escopo: evento) só os parâmetros de
   cardinalidade baixa: `origin`, `method`, `location`, `link_domain`, `post_slug`, `axis`,
   `window`, `mandate_id`, `reason`. **Não** registrar `series_ids`, `series_id`, `link_url` nem
   `link_text` — cardinalidade alta. `percent_scrolled` já é parâmetro do GA4; filtrar por nome
   de evento em vez de criar dimensão.
3. Marcar como **key event** só `share_clicked`.
4. Conferir retenção de dados (14 meses é o padrão) e o filtro de tráfego interno.
5. Conferir que o enhanced measurement não duplica o que passamos a medir (5.1: scroll).

## 11. O que fica para o plano

Ordem sugerida: P0 de consentimento (7.4) → módulo do site (7.1) → app (7.2) → testes (7.7) →
`verificar`/workflow (7.7, último parágrafo) → `AGENTS.md` (tabela de eventos + texto da seção de
analytics) → 7.6 por último, porque é o que toca os guardas do build.

Fora do código, e dependendo de uma pessoa: §10 (Admin) e a atualização de
`docs/produto/contexto-de-produto.md` se ele voltar a citar analytics.


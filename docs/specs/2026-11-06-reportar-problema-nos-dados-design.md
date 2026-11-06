# Reportar problema nos dados → issue no GitHub, já preenchida

**Data:** 2026-11-06 · **Tamanho:** projeto pequeno · **Emenda:** §1 do desenho do terminal
(`docs/specs/2026-10-14-camada-de-graficos-design.md`) — o trilho ganha uma ação; e a página
`/correcoes.html` (que já promete o canal).

## O problema

O site promete um canal de correção que, na prática, não existe:

- A página `/correcoes.html` manda abrir uma issue em **`github.com/brasilemnumeros`** — o perfil
  da organização, que não tem "nova issue". O link não leva a lugar nenhum útil.
- O botão "💬 Quer comentar algo?" (`Base.astro`) vai para **Discussions**, não para issue, e
  **não existe na home**, porque `Home.astro` não usa o `Base`.
- O repositório `dados` tem 3 issues abertas, todas de backlog do mantenedor. Nenhuma de
  visitante — o canal nunca foi usado.

E o relato, quando chega, chega pobre: "o IPCA está errado" não é acionável. O que permite
confirmar em minutos é o conjunto que a própria `/correcoes` já descreve — qual indicador, qual
período, qual valor aparece, qual era o esperado e o link da fonte.

O app é o único lugar onde esse contexto **já está na tela**: séries, janela visível, mandato e
permalink. É de lá que o relato deve nascer, e é por isso que o caminho "copiar o link e descrever
tudo à mão no GitHub" não resolve.

## O que foi descartado

- **Relay serverless (Cloudflare Worker) abrindo a issue por API.** Resolveria o atrito de conta,
  mas cria backend, token como secret, anti-spam e um componente para manter — contra o invariante
  de site estático/custo zero (ADR 0001). O atrito de conta foi aceito explicitamente pelo usuário
  em 2026-11-06.
- **Só um issue form em YAML no `dados`.** O formulário do GitHub é melhor para quem chega pelo
  GitHub, e pior para quem está no gráfico: `?body=` não preenche campo de form. Estrutura e
  contexto não cabem no mesmo link. O form entra como complemento do arquivo para quem chega
  sozinho; o app usa `body=`.
- **Botão de reportar na linha da legenda do gráfico.** A linha tem 13px e já carrega olho e "×";
  um terceiro ícone encolhe o alvo de toque e repete o defeito que o usuário reprovou em
  2026-11-01 ("linhas muito pequenas e próximas"). O trilho tem alvo de 34–44px e existe nos dois
  layouts.
- **Entrada pela ficha (busca).** A ficha descreve um indicador que **ainda não está no gráfico**;
  quem reporta está olhando um número. Além disso a ficha vive dentro da modal de busca, e abrir
  um diálogo por cima dela criaria uma terceira camada de `Esc` sem necessidade. Fica para depois.
- **Checkbox obrigatório "li a metodologia".** Vira pedagogia forçada e a pessoa marca sem ler.
  O aviso informa e dá o caminho; não bloqueia.

## A decisão

Uma ação no **trilho do app** (bandeira de traço, âmbar) abre um **diálogo** com o contexto já
preenchido; o botão final é um link para `issues/new` do repositório **`dados`** com `title`,
`body` e `labels` codificados. **Nada é enviado pelo site**: quem cria a issue é a pessoa, na conta
dela. Zero backend, zero token, zero dependência nova.

### 1. O ponto de entrada

No trilho, **depois de "Tela cheia" e antes do "Ver o tour"** — a mesma coluna dos outros controles.

- Ícone: bandeira de traço (Lucide `flag`), 16px, `stroke-width: 2`, âmbar (`text-amber-400`)
  quando habilitada. **Sem emoji** — os outros ícones do trilho são de traço, e o emoji vermelho
  foi reprovado pelo usuário em 2026-11-06.
- **Sempre presente e desabilitada sem série que carregou** — a mesma língua do "limpar filtros": o lugar é
  estável e o estado se lê (§9.1). Balão de hover: `Reportar problema nos dados` quando
  habilitada, `Nenhuma série no gráfico` quando não.
- `aria-label` = o texto do balão; `data-testid="botao-reportar"`.
- **O tour de primeira visita menciona a bandeira**: o passo "Controles do gráfico" já lista os
  ícones do trilho em ordem, e ganha o item "bandeira — reporta um problema nos dados". Não vira um
  8º passo: o alvo do tour é o trilho inteiro, e um balão apontado para um ícone de 34px dentro
  dele não se lê no celular (o tour nem roda abaixo de 1024px).

### 2. O diálogo

`app/src/components/DialogoRelatar.svelte`, montado em `App.svelte` (irmão das gavetas, nunca
dentro do trilho), com `aberto`/`aoFechar`. O estado `relatoAberto` mora na `App`, como o das
gavetas.

- **`<dialog>` nativo com `showModal()`.** Dá camada superior (acima de qualquer `z-index`,
  inclusive o overlay do `driver.js`), foco preso, `Esc` e devolução do foco ao trilho de graça.
  Não entra na cadeia manual de `Esc` da `App` — a `App` só passa a ignorar o `Esc` quando
  `relatoAberto` for `true`, como já faz com `buscaAberta` e `tourAberto`.
- Desktop: 470px, centrado, `max-h-[min(85dvh,720px)]` com **miolo rolável + rodapé fixo** (a
  lição da ficha, 2026-11-06). Celular: folha encostada embaixo (`inset: auto 0 0 0`), largura
  total, `max-h-[85dvh]`.
- Estado **reiniciado a cada abertura** (nada é reaproveitado de um relato anterior).

Campos, nesta ordem:

| Campo | Origem / default | Obrigatório |
|---|---|---|
| Aviso de metodologia | estático + catálogo | — |
| Série | séries com `status: 'ok'`; uma → ela; várias → `<select>` já na primeira | sim |
| Período | **vazio**, placeholder `ex.: mai/2026 ou 2019–2025` | não |
| O que está errado? | vazio, textarea 3 linhas | **sim** |
| Valor que aparece | vazio | não |
| Valor esperado | vazio | não |
| Link da fonte oficial | vazio, rótulo **"Opcional, mas ajuda"** | não |

O período **não é adivinhado**: o app não sabe qual ponto a pessoa está olhando, e chutar um mês
produziria issue errada. A janela visível vai como contexto no rodapé do corpo, não no campo.

**Que séries contam**: só as que carregaram (`status: 'ok'`). Série escondida pelo olho continua
valendo — ela está no gráfico e no permalink, só não está desenhada. Série com `status: 'erro'` ou
`carregando'` **não** entra no seletor: não há valor para confrontar, e o erro de carga já tem
mensagem própria na tela. (Reportar "esta série não carrega" é um relato legítimo, mas é outro
fluxo — fica para a v2.)

Com várias séries o seletor **já vem na primeira** (a mesma do topo da legenda), nunca vazio: o
único portão é o texto. O campo e o título da issue nomeiam a série, e o corpo é revisado no GitHub
antes de virar issue.

Rodapé: `Destino: brasilemnumeros/dados` à esquerda; `Cancelar` e `Abrir issue no GitHub ↗` à
direita.

**A ação só habilita com "O que está errado" preenchido.** É um `<a>` com `href` calculado
(`undefined` quando vazio), `aria-disabled`, `tabindex="-1"` e guarda no `click`. Sem o relato, o
link não leva a lugar nenhum — não se cria issue vazia.

### 3. O aviso de metodologia

Fica no topo do miolo, antes dos campos — é o que a pessoa precisa saber **antes** de acusar um
erro. Texto (usar literalmente):

> Alguns indicadores **combinam fontes ou usam cálculo próprio** — o número aqui pode não ser o
> valor bruto publicado por um órgão. Antes de reportar, confira o método: o resumo está na ficha
> do indicador e a memória de cálculo, no notebook que gera a série.

Abaixo do texto, dois afordâncias:

- **"Ver o resumo"** — expande, no próprio diálogo, a `descricao` do catálogo (o mesmo texto que a
  ficha mostra), com `aria-expanded`. Não navega: abrir a ficha sairia do fluxo de relato.
- **"Ver o notebook ↗"** — `urlNotebook` do catálogo, nova aba. Mesmo rótulo da ficha
  ("Ver o notebook que gera estes dados") para o vocabulário não divergir. O `urlNotebook` é
  obrigatório e validado (K9), então o link existe para qualquer indicador do catálogo; se o
  registro não estiver carregado, a linha do notebook simplesmente não aparece (sem link morto).

Estilo: caixa `#0d1117`, borda `#21262d`, barra âmbar de 2px à esquerda, texto 11,5px. É aviso,
não erro — nada de vermelho.

### 4. A URL da issue

Função **pura** em `app/src/domain/relato.js` (testável sem DOM), chamada pelo componente:

```js
montarRelato({
  id, nome, periodo, texto, valorVisto, valorEsperado, fonte,
  ids,          // TODAS as séries 'ok' do gráfico, na ordem da store
  urlBase,      // location.origin + location.pathname, lido pelo componente
  janela,       // { de, ate } em ISO, ou null
  mandato,      // rótulo do mandato em cena, ou null
  data,         // AAAA-MM-DD de hoje
})
// → { titulo, corpo, url }
```

A função **não lê `location`** — origem e lista de ids entram como parâmetro. É o que a torna
testável como a tabela de testes exige.

- Repositório: `https://github.com/brasilemnumeros/dados/issues/new`.
- `labels=erro-de-dado` (a label precisa existir no repo `dados`; label inexistente é ignorada).
- **Não** passar `template=` junto com `body=`: o template carregaria o formulário por cima do
  corpo. O template existe para quem chega direto no GitHub; o link do app manda o corpo pronto.
- Título: `` `${nome}: ${periodo ? 'valor de ' + periodo + ' parece errado' : 'possível erro no dado'}` ``,
  truncado em 120 caracteres.
- Corpo (markdown, cabeçalhos `###`; linhas vazias entre blocos):

```md
### Indicador
`<id>` — <nome>

### Período
<período ou "não informado">

### O que está errado
<texto>

### Valores
- Aparece no site: <valorVisto ou "não informado">
- Esperado: <valorEsperado ou "não informado">

### Fonte oficial
<fonte ou "não informada">

### Como reproduzir
<urlBase>?series=<todas as séries 'ok', na ordem da store>
janela visível: <AAAA-MM a AAAA-MM, ou "não informada"> · mandato: <rótulo ou "nenhum">

---
Enviado pelo formulário do site · <AAAA-MM-DD>
```

- **Permalink canônico**: `<urlBase>?series=` + os ids de **todas as séries do gráfico**, não só a
  reportada — o problema pode ser de composição entre linhas, e o link tem que reabrir a mesma
  imagem. Montado com `escreverSearch(ids, '')` (`permalink.js`), que já remove `series` vazio e a
  chave antiga. `location.href` não serve: carrega `utm_*` e outros parâmetros de campanha que
  sujam a issue.
- **Janela**: imprime as datas, sempre. Não existe rótulo "tudo": o eco do adapter
  (`fitContent`) grava `{from, to}` reais, então `from == null` não distingue "tudo" de "nada", e a
  heurística de duração de `filtros.js` erra na borda. Data ausente vira "não informada".
- **Sem PII e sem fingerprint**: nada de user-agent, idioma, tela, cookies, referrer. Só ids de
  série, janela, mandato e a data.
- Texto livre truncado em 2000 caracteres; `encodeURIComponent` em tudo; a URL fica bem abaixo do
  limite prático do GitHub (~8 KB).
- Valores entram com o sufixo que a pessoa digitou (%, R$, índice): o campo é texto, não número.

### 5. O repositório `dados`

O usuário autorizou (2026-11-06) **commit direto na `main` do `dados`**, sem PR:

- `.github/ISSUE_TEMPLATE/erro-de-dado.md` — markdown (não YAML form), com os mesmos campos e
  `labels: erro-de-dado`.
- Label `erro-de-dado` criada à mão, uma vez, pelo mantenedor (a API não cria label por código
  daqui).

### 6. O site

- `/correcoes.html`: o link para `github.com/brasilemnumeros` passa a apontar para
  `https://github.com/brasilemnumeros/dados/issues/new?labels=erro-de-dado` com o esqueleto do
  corpo, e o texto ganha uma linha dizendo que **no gráfico o trilho já abre a issue preenchida**.
- O botão "💬 Quer comentar algo?" (Discussions) **fica como está**: ele cobre "comentário", não
  "erro de dado", e mexer nele é outra fatia.

### 7. Geometria e camadas

- O trilho não muda de largura (44px / 40px).
- O diálogo não desloca o gráfico: é camada superior, como a busca. Fechado, não existe no DOM
  útil (o `<dialog>` sem `open` já fica fora da árvore de acessibilidade).
- O tour (`driver.js`, `z-index: 10000`) não conflita: camada superior ganha de `z-index`, e o
  overlay do tour impede abrir o trilho durante o tour. O consentimento já é tratado antes do
  tour (2026-11-01); a bandeira não muda essa ordem.

### 8. Analytics

A fatia instrumenta dois eventos, no padrão `object_action` do AGENTS.md:

| Evento | Gatilho | Parâmetros |
|---|---|---|
| `report_opened` | o diálogo abre | `series_count` |
| `report_issue_opened` | clique em "Abrir issue" com o link habilitado | `series_id`, `series_count`, `has_period`, `has_source` |

- Emissão por `app/src/analytics.js` → `registrarEvento(nome, parametros)`, que faz
  `window.gtag('event', …)` **só** quando `typeof window.gtag === 'function'` e devolve `false`
  sem fazer mais nada. Não existe fila: antes do consentimento, o evento é **descartado** — o
  `Analytics.astro` só cria o `dataLayer`/`gtag` depois do "Aprovar".
- **Nunca** o texto livre, o período digitado, a fonte digitada ou qualquer dado do navegador. O
  `series_id` é público (está na URL) e não identifica pessoa.
- "Ver o resumo" e o link do notebook não têm evento próprio: clique em link externo é
  `outbound_link_clicked`, que é genérico e ainda não existe no site (fora desta fatia).
- O gate continua coberto por `scripts/testar-analytics.mjs`, ampliado para provar que, **sem
  consentimento**, `window.gtag` e `window.dataLayer` nem existem depois de a home carregar.
## Testes

| Alvo | O que prova |
|---|---|
| `app/src/domain/relato.test.js` (novo) | URL do repo e da label; corpo com todos os blocos; acentos/`&`/`#`/`%` codificados; período vazio → "não informado"; permalink com todas as séries e sem `utm_*`; truncamento do texto; título com e sem período; nenhum campo do navegador no corpo |
| `app/e2e/relatorio.spec.js` (novo) | botão desabilitado sem série e habilitado com série; abre o diálogo; 1 série vem selecionada; ação desabilitada sem texto e habilitada com texto; `href` contém `brasilemnumeros/dados/issues/new`, `labels=erro-de-dado` e o id da série; `Esc` fecha e devolve o foco ao trilho; no Pixel 7 o diálogo cabe sem transbordo; nenhum `console.error` |
| `app/src/analytics.test.js` (novo) | `registrarEvento` descarta sem `gtag` (nada enfileirado) e chama `gtag('event', …)` com os parâmetros quando ele existe |
| `scripts/testar-analytics.mjs` (ampliado) | sem consentimento, `window.gtag` e `window.dataLayer` não existem depois de a home carregar; com consentimento, existem |

`npm run build`, `cd app && npm test`, `cd app && npm run test:e2e` e `npm run test:analytics`
seguem obrigatórios antes de dizer pronto (AGENTS.md).

## Riscos e verificações

1. **`?body=` + `?template=`** — confirmar na prática que não combinar; se o GitHub passar a
   mesclar, o template pode ser útil. Verificar com uma URL real antes de publicar.
2. **Label inexistente** — confirmar que `labels=` desconhecida é ignorada (não deve quebrar a
   abertura da issue).
3. **Limite de tamanho do `body=`** — medir a URL com 2000 caracteres de relato; se passar do
   limite do GitHub, reduzir o truncamento.
4. **Foco no celular** — `<dialog>` + teclado virtual pode empurrar o rodapé; validar na folha.

## Decisões tomadas no check do desenho (2026-11-06)

- **A função pura não lê `location`**: `urlBase` e `ids` entram por parâmetro. O permalink leva
  **todas** as séries `ok`, não só a reportada.
- **Só série `ok`** conta para habilitar o botão e para o seletor. Escondida vale; em erro/carregando
  não.
- **O seletor nunca nasce vazio**: vem na primeira série. O único portão do link é o texto.
- **Janela é sempre data**, nunca "tudo" — o eco do adapter grava `{from, to}` reais.

## O que fica para o builder

- O seletor de série: `<select>` nativo ou chips — critério é alvo de toque no celular.
- Altura exata do diálogo no desktop e quantas linhas a `descricao` mostra antes de rolar.
- Se o "Ver o resumo" expande dentro do aviso ou vira seção própria.
- Nomes dos `data-testid` além do `botao-reportar`.

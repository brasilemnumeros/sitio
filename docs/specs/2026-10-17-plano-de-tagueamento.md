# Plano de tagueamento — GA4

- **Data:** 2026-10-17
- **Status:** proposta — **não implementado** (decisão de escopo do usuário: só o plano)
- **Ferramenta:** GA4 `G-N4CFQ7CL1S` via `gtag` (sem GTM)
- **Público primário:** jornalista / criador de conteúdo (ver `docs/produto/contexto-de-produto.md`)
- **Contexto no repo:** o app novo é o `/` desde a virada (10/T3–T4, 2026-10-17)

---

## 1. Como o GA4 é carregado (já em vigor)

`sitio/_includes/analytics.html`, incluído por `_layouts/default.html` quando
`jekyll.environment == 'production'` **e** `site.google_analytics` existe:

- o script `gtag/js` é **injetado por JS só depois do consentimento** (cookie
  `cookie-notice-dismissed=true`) e com **Do Not Track** desligado — sem consentir, **nenhuma
  requisição ao Google** acontece;
- Consent Mode com `analytics_storage: granted` e os três sinais de anúncio `denied`.

Consequência para o app: **o `gtag` global só existe após o consentimento.** Todo call site
precisa de guarda (ver §6).

---

## 2. Estado atual (medido em 2026-10-17)

| Onde | O que já dispara |
|---|---|
| Site Jekyll (blog, sobre, categorias, links…) | `page_view` automático |
| App (`/`, Svelte) | **nada** |
| Legado removido na virada | `indicator_selected` morreu com o `multiselect.html` |
| Ainda vivo | `theme_changed` (só nas páginas do blog) · `audio_play` / `audio_pause` (1 post) |

O app não tem roteador, então **o `page_view` no carregamento está correto** — não há navegação
de rota a instrumentar.

---

## 3. Conversão (o que define sucesso)

**Conversão: `share`** (evento recomendado do GA4), com `method: 'copy_link'` — "copiar o link do
gráfico".

🔴 **Bloqueio de produto:** o app **não tem deep-link nem "copiar link"** hoje (zero ocorrências de
`URLSearchParams` / `pushState` / `clipboard`). A spec planeja ("um link compartilhado reproduz a
**visão dos dados**", §1 e §6 da spec de design), mas **nenhuma fatia implementa**.

Ou seja: **a conversão não pode ser medida enquanto o permalink não existir.** Para o público
primário (jornalista), essa é a ação de maior valor — e é a que falta. A recomendação é
implementar o permalink antes de instrumentar a conversão, e só então marcar `share` como
conversão no Admin do GA4.

---

## 4. Eventos

Nomes de **eventos próprios em português** (decisão de 2026-10-17). Exceção: eventos
**recomendados pelo GA4** mantêm o nome canônico em inglês, porque só assim entram nos relatórios
padrão do GA4 — estão marcados com *(GA4)*.

| Evento | Descrição | Propriedades | Dispara em |
|---|---|---|---|
| `busca_aberta` | abre a modal de busca | `origem` (`shell`/`vazio`) | App.svelte / EstadoInicial |
| `view_search_results` *(GA4)* | a busca mostrou resultado | `search_term` | SearchModal (com debounce, 1× por termo) |
| `serie_adicionada` | adiciona um indicador ao gráfico | `id_indicador`, `nome_indicador`, `origem` (`busca`/`exemplo`) | `stores/series.js` → `adicionarSerie` |
| `exemplo_usado` | atalho "Selic × IPCA" | — | App.svelte → `pedirExemplo` |
| `serie_removida` | remove um indicador | `id_indicador` | `stores/series.js` → `removerSerie` |
| `serie_com_erro` | a série não carregou | `id_indicador`, `motivo` | `stores/series.js` (catch de add/retry) |
| `mandato_selecionado` | clique no trilho de mandatos | `id_mandato` | `stores/mandate.js` / MandateRail |
| `janela_alterada` | troca a janela de tempo | `janela` (`1a`/`5a`/`10a`/`30a`/`tudo`) | `stores/viewport.js` / TimeFilters |
| `eixo_alterado` | move a série de eixo | `id_indicador`, `eixo` (`left`/`right`) | `stores/axes.js` / SeriesLegend |
| `cor_alterada` | cor custom de uma série | `id_indicador` | `stores/series.js` → `definirCor` |
| `share` *(GA4)* | **conversão** — copia o link do gráfico | `method: 'copy_link'`, `content_type: 'grafico'`, `item_id` | *(pré-requisito, ver §3)* |

### Por que estes

Cada um decide algo: `serie_adicionada` (quais indicadores importam → guia o pipeline `dados`),
`serie_com_erro` (detecta dado publicado quebrado), `mandato_selecionado` (o diferencial "quem fez
o quê" é usado?), `share` (a conversão do jornalista).

### O que NÃO instrumentar

Hover, scroll, tempo na página, eventos de clique genéricos (`button_clicked`), e qualquer coisa
sem decisão associada. Volume não é qualidade.

---

## 5. Propriedades padrão

- Nomes em `snake_case` minúsculo; contexto na propriedade, não no nome do evento.
- `id_indicador` sempre o `id` do `indicators.json` (estável), nunca o nome.
- **Sem PII** — nada de e-mail, nome ou identificador de usuário.
- Não duplicar propriedades que o GA4 já coleta (`page_location`, `page_referrer`).

---

## 6. Implementação (quando for a hora)

Um helper único, **`app/src/analytics.js`**, com `registrar(evento, props = {})` que:

1. **no-op silencioso** se `typeof window.gtag !== 'function'` (sem consentimento) — mesma guarda
   dos eventos antigos do site;
2. chama `window.gtag('event', evento, props)`.

Pontos de chamada: preferencialmente nas **ações das stores** (`adicionarSerie`, `removerSerie`,
`definirCor`, `mandato_selecionado`…), que são o **único** caminho pelo qual a UI muda de estado —
instrumentar ali cobre todos os botões sem duplicar. `origem`/`search_term` vêm por parâmetro.

Teste: o helper e os call sites são testáveis sem navegador (o `gtag` é injetável), no mesmo padrão
da suíte existente (126 testes). **Não** confiar em captura de tela para provar que o evento
disparou — a prova é o `dataLayer`/DebugView.

---

## 7. Validação

- [ ] Cada evento dispara no gatilho certo e **uma vez só** (sem duplicar).
- [ ] `id_indicador` bate com o `indicators.json`.
- [ ] Nada dispara sem consentimento (testar com o cookie ausente e com DNT ligado).
- [ ] Sem PII nos parâmetros.
- [ ] `share` marcado como conversão **no Admin do GA4** (ação manual, fora do código).
- [ ] Conferir em DebugView com um caso real (adicionar Selic × IPCA, trocar mandato, copiar link).

---

## 8. UTMs (quando houver divulgação)

O projeto não roda anúncios, mas UTMs importam se houver outreach (newsletter, criador, podcast).
Padrão: tudo minúsculo, separador hífen, um `utm_source` por parceiro, `utm_medium` nomeando o
tipo de acordo (`newsletter`/`creator`/`podcast`). **Nunca** PII em UTM.

---

## 9. Pendências

- 🔴 **Permalink / "copiar link"** — pré-requisito da conversão; feature que não existe. Decidir em
  qual fatia entra.
- ⚠ **`theme_changed`** — hoje só dispara nas páginas do blog (o app é escuro, sem toggle). Valor
  quase nulo; avaliar retirar.
- Decidir se o plano vira ADR (a decisão "conversão = compartilhar" é de produto, não só de
  tagueamento).

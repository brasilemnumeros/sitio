# AGENTS.md — Brasil em Números (site)

Instruções para agentes de código neste repositório. Valem junto com os skills
instalados (ex.: `analytics-tracking`, `ga4-event-tracking`); em caso de conflito,
**este arquivo ganha**.

## Analytics (GA4)

### Estado atual (não presumir outro)

- GA4 `G-N4CFQ7CL1S` via **gtag.js direto**, inline em
  `src/components/Analytics.astro`. **Não existe GTM e não se cria container.**
- O script do Google só é inserido **depois** do consentimento LGPD
  (`cookie-notice-dismissed=true`) e **nunca** com Do-Not-Track ligado. Antes
  disso, zero requisição a terceiro.
- Consent Mode: `ad_storage`, `ad_user_data`, `ad_personalization` sempre
  `denied`; `analytics_storage: granted` apenas porque o script já nasce pós-consentimento.
- `src/config.js` (`GA4_ID`) é a única fonte do ID. Não duplicar o valor.
- Gate coberto por `scripts/testar-analytics.mjs` (`npm run test:analytics`),
  que roda contra `dist/` de produção com Playwright.

### Regras ao instrumentar eventos

1. **Sem GTM.** Nada de `GoogleTagManager`, `dataLayer` de container, tag/trigger/
   variable. Eventos vão por `gtag('event', ...)`.
2. **Nada dispara antes do consentimento.** Não enfileirar eventos em
   `window.dataLayer` antes do "Aprovar": o `Analytics.astro` só cria o `dataLayer`
   depois do gate. Instrumentação deve verificar `typeof gtag === 'function'` e,
   se não existir, **descartar** o evento (não guardar para depois).
3. **Delegação de eventos.** O site tem SPA Svelte (`app/`) e conteúdo renderizado
   no cliente. Listeners presos a elementos no `DOMContentLoaded` não pegam
   conteúdo dinâmico — usar delegação a partir de `document`.
4. **Nomenclatura:** `object_action`, minúsculo, snake_case, em inglês
   (`outbound_link_clicked`, `nav_link_clicked`, `post_read_50`). Contexto vai em
   parâmetros, não no nome. Não usar nomes reservados do GA4 (`click`, `scroll`,
   `view_search_results`, `purchase`, etc.) nem `event_category`/`event_label`
   (são parâmetros de Universal Analytics; o GA4 os ignora como métrica).
5. **Sem PII.** Nunca enviar e-mail, nome, telefone, texto digitado, URL com query
   de busca interna ou parâmetro que identifique pessoa.
6. **Parâmetros enxutos**, com nomes estáveis: `link_url`, `link_domain`,
   `link_text`, `location` (`nav`, `footer`, `links`, `post`), `category`,
   `post_slug`, `percent_scrolled`.
7. **Conversões:** marcar no Admin do GA4 só o que responde a uma decisão
   (ex.: clique em link externo de parceiro). Não marcar pageview.

### Ordem de prioridade para o site

1. Links externos de saída (página `/links`, GitHub, parceiros) — `outbound_link_clicked`.
2. Navegação interna: nav, categorias, "últimas publicações" — `nav_link_clicked`.
3. Leitura de post: 50%/90% de scroll por slug — `post_read`.
4. Compartilhamento/CTA quando existirem — `share_clicked`, `cta_clicked`.
5. Busca interna (se houver) — `search_performed` (sem o termo digitado).

### Validação obrigatória (evidência, não afirmação)

- `npm run build` e depois `npm run test:analytics`.
- Ampliar `scripts/testar-analytics.mjs` quando adicionar evento: cenário
  **sem consentimento** deve provar que nenhuma requisição a
  `googletagmanager.com` acontece e que nenhum evento é enfileirado.
- DebugView só depois do consentimento; documentar o que foi observado.

### Arquivos de referência

- `src/components/Analytics.astro` — carregamento e Consent Mode.
- `src/components/CookieConsent.astro` — grava o cookie de decisão.
- `src/config.js` — `GA4_ID`.
- `scripts/testar-analytics.mjs` — teste do gate.

## Convenções do projeto

- Comentários e textos de interface em **português**; nomes de código em inglês
  quando seguem a API (eventos GA4, props).
- O build encadeia `app/` (Svelte/Vite) → `preparar-publico` → Astro → `verificar`.
  Não pular etapas ao validar.
- Não commitar `dist/`, `node_modules/` nem credenciais.

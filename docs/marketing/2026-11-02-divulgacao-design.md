# Divulgação do Brasil em Números — desenho

- **Data:** 2026-11-02
- **Status:** aprovado (2026-11-02)
- **Contexto de produto:** `.agents/product-marketing.md` (v4)
- **Escopo:** primeiro ciclo de 3 meses, canal Instagram

## 1. Intenção

O projeto existe para o **cidadão/eleitor** entender o Brasil com dado, sem jargão e
sem narrativa pronta. Hoje a divulgação depende da página pessoal do mantenedor e o
alcance é pequeno e pontual. O objetivo deste desenho é criar uma **rotina de
divulgação sustentável** — de preferência uma sessão por mês — que leve o gráfico até
o cidadão e use jornalistas/criadores como amplificadores.

## 2. Objetivos (3 meses)

1. **Publicar com constância:** ~13 posts/mês (3 por semana), total ≈ 39.
2. **Ser usado:** pelo menos 100 sessões vindas do Instagram no período, medidas por
   UTM no link da bio.
3. **Ser compartilhado:** salvar+compartilhar ≥ 5% do alcance dos posts (o algoritmo
   do Instagram valoriza isso mais que curtida).
4. **Aprender o gancho:** identificar, até o fim do mês 2, os 2 formatos com melhor
   salvamento/compartilhamento e cortar o resto.

Metas de trabalho, não promessas: o resultado depende do algoritmo e do tema. O que
está sob controle é a cadência e a qualidade do dado.

## 3. Não-objetivos

- TikTok, YouTube, LinkedIn como canais próprios neste ciclo.
- Anúncios pagos, compra de seguidores, parcerias pagas.
- Automação não oficial de postagem (risco de banimento).
- Produção de vídeo com rosto/fala do mantenedor.
- Crescer a marca pessoal do mantenedor.

## 4. Anti-objetivos

Falha mesmo se os números subirem:

- postar gancho partidário ou sugerir causalidade entre mandato e indicador;
- publicar número sem fonte visível;
- virar perfil de opinião política em vez de dado;
- cadência que só se sustenta com > 4h/mês do mantenedor.

## 5. Restrições

- **Custo zero.** Ferramentas: Meta Business Suite (agendamento), Instagram Insights,
  GA4 existente, CapCut/Canva gratuitos, OpenCode + skills instaladas.
- **Tempo:** 2–3h em uma sessão mensal + ~10 min/semana (comentários) + 15 min/mês
  (leitura de métricas).
- **Sem design dedicado:** a identidade visual é o próprio gráfico do site.
- **Voz apartidária** do contexto de produto — inclusive no texto da legenda.

## 6. Caminhos considerados

| Caminho | O que é | Trade-off |
|---|---|---|
| **A. Fábrica mensal (escolhido)** | Uma sessão/mês gera o mês inteiro; agendamento gratuito | 2–3h concentradas; exige disciplina de 1 dia |
| B. Automação diária no repo | Script publica "gráfico do dia" via API oficial | Setup de 1–2 dias; perfil robotizado; variedade baixa |
| C. Só amplificação | Não usar perfil próprio; empacotar para terceiros | Pouco esforço, mas sem audiência própria e refém de terceiros |

**Escolha: A**, com os táticos de C encaixados como camada opcional (jornalista como
amplificador). B fica para depois de sabermos qual formato funciona.

## 7. Como funciona

### 7.1 Pilares (3)

| Pilar | Peso | O que é | Exemplo de gancho |
|---|---|---|---|
| **Olha o dado** | 40% | Um indicador, um recorte, o gráfico | "A Selic está alta? Compare com 2015." |
| **Como ler** | 35% | Educação: o que o indicador mede e como não se enganar | "Correlação não é causalidade — veja no gráfico." |
| **Quem fez o quê** | 25% | Faixas de governo e comparação por mandato, sem juízo | "O que mudou entre 1995 e hoje — sem torcida." |

### 7.2 Formatos e cadência

- **2 carrosséis/semana** (1080×1350): gráfico + 3–5 slides de leitura + slide final
  "confira você mesmo" com a fonte.
- **1 Reel/semana** (20–40s): gravação de tela do app (sem rosto, sem voz; texto na
  tela e áudio nativo do Instagram).
- **Stories:** reaproveitamento dos posts, 2–3/semana, opcional.
- **Dias:** terça, quinta e sábado; horários 12h e 19h (testar e ajustar).

### 7.3 A peça visual (template fixo)

- **Formato:** 1080×1350, fundo escuro do próprio app.
- **Slide 1 (gráfico):** frame completo do app — barras, gráfico e faixas de governo —
  capturado num viewport de 1080×1350. A moldura é a identidade; não recortar só o plot.
- **Slides 2–5 (texto):** fundo escuro, uma ideia por slide, tipografia grande, uma cor
  de destaque do site. Saem de um HTML único capturado em lote.
- **Rodapé fixo em todo slide:** `brasilemnumeros.ong.br · fonte: <órgão>`.
- **Slide final:** "Confira você mesmo" + URL + crédito do Lightweight Charts em corpo
  pequeno (a atribuição legal vive no site; o crédito na peça é barato e elimina dúvida).
- **Mês 1:** captura manual (modo responsivo do navegador). **Mês 2+:** script Playwright
  que recebe a lista de permalinks e cospe os 13 PNGs — o repositório já tem Playwright.

### 7.4 Sessão mensal (2–3h)

1. **Pauta (20 min):** 13 assuntos a partir do catálogo + calendário de divulgações
   (IPCA, Copom, PNAD etc.), com apoio das skills `content-strategy` e `social`.
   **Antes de pautar, conferir o último ponto de cada série**: a imagem e a legenda
   mostram a data do último dado disponível. Nunca escrever "saiu hoje" se a série do
   site ainda não foi atualizada — é a objeção "será que atualizam?" acontecendo ao vivo.
2. **Texto (50 min):** legendas, ganchos, roteiros de Reel e hashtags em lote.
3. **Gráficos (40 min):** capturar o estado de cada gráfico via permalink (mesmo
   estado, mesma fonte) e montar os carrosséis.
4. **Agendamento (30 min):** Meta Business Suite, tudo de uma vez.

Buffer: manter 2 semanas de posts prontos para não quebrar a cadência em mês ruim.

### 7.5 Primeira configuração (uma vez, ~40 min)

- **Perfil:** `@brasilemnumeros.ong` (será criado; hoje não existe). Casa com o domínio
  e parece oficial. `@brasilemnumeros` está ocupado e `_oficial` não entra. O nome
  exibido é sempre **"Brasil em Números"**.
- **Conta profissional:** se ainda for pessoal, converter para **empresa** (grátis,
  reversível): no app, menu do perfil → Configurações e privacidade → Tipo de conta e
  ferramentas. É o que libera Insights e agendamento.
- **Página do Facebook "Brasil em Números"** vinculada ao perfil profissional:
  pré-requisito do agendamento gratuito no Meta Business Suite. Existe só para isso,
  não precisa publicar nada nela.
- **Link da bio:** `https://www.brasilemnumeros.ong.br/?utm_source=instagram&utm_medium=social`.
- **Bio:** curta, impessoal, com a promessa apartidária.
- Destaques: "O que é", "Como usar", "Fonte e método".
- Primeiros 9 posts = grade de lançamento, produzidos na primeira sessão.

### 7.6 Voz: impessoal, sem bastidores pessoais

- O perfil fala como **o projeto**, nunca como "eu". Sem histórias do mantenedor, sem
  rotina pessoal, sem rosto.
- IA pode apoiar pauta, texto e imagem. **Voz falada não entra no mês 1** (nem humana
  nem sintética): Reels com texto na tela e áudio nativo do Instagram. Se o formato pedir
  narração, testa-se TTS gratuita no mês 2.
- "Bastidor" permitido é o **do método**: como o dado é coletado, de onde vem a fonte,
  por que o gráfico mostra faixas de governo. Nunca o bastidor da pessoa.

### 7.7 Amplificador (opcional, 20 min/mês)

Uma mensagem curta para 3 jornalistas/criadores com um gráfico pronto do mês e o link
do permalink. Skill `public-relations`. Sem insistência e sem lista comprada.

## 8. Medição

- **GA4:** sessões com `utm_source=instagram` (aquisição padrão, sem código novo).
  UTM fixo na bio no mês 1: mede o canal, não o post. Atribuição por post exigiria um
  link-in-bio com um link por publicação — fica para o mês 2, se houver sinal.
- **Instagram Insights:** alcance, salvamentos, compartilhamentos, seguidores.
- **Stories:** sem sticker de link abaixo de 10 mil seguidores; servem para retenção,
  não para tráfego.
- **Revisão mensal (15 min):** 3 números acima + decisão de cortar/manter.
- **Lacuna conhecida:** `share_clicked` (copiar link dentro do app) está desenhado em
  `docs/specs/2026-11-01-analytics-eventos-design.md`, mas ainda não implementado.
  Não bloqueia este ciclo; se implementado, vira o melhor sinal de uso.

### 8.1 Regra de corte (decidida antes de olhar o resultado)

- A unidade de teste é o **pilar**, não o post isolado. Com 13 posts/mês, cada pilar tem
  ~5 posts/mês; nada se decide com 2 posts.
- **Não julgar antes de 8 semanas** (~26 posts). Nessa altura, cada pilar tem ~10 posts.
- Métrica: **taxa de salvamento + compartilhamento por alcance** (não curtida).
- Pilar com taxa abaixo de **50% da mediana dos três**, com pelo menos 8 posts, cai para
  1 post/mês; o espaço vai para o pilar líder. Formato (carrossel × Reel) só é comparado
  por alcance, porque a cadência é fixa.

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Mês sem sessão → cadência morre | Buffer de 2 semanas + dia fixo no calendário |
| Monotonia / fadiga de formato | Rotação dos 3 pilares + revisão mensal |
| Post ser lido como posição política | Disclaimer fixo na legenda e no último slide; nunca causalidade |
| Alcance baixo no início | Não julgar antes de 8 semanas; olhar salvamento/compartilhamento, não curtida |
| Dependência de uma pessoa | Tudo documentado em `docs/marketing/` para outra pessoa assumir |

## 10. Decisões tomadas pelo desenho

- Instagram como único canal próprio nos 3 primeiros meses; **sem cross-post** em
  página pessoal ou LinkedIn.
- Só gráficos do produto como imagem; sem banco de imagens nem ilustração de IA.
- Peça = frame completo do app (1080×1350) + slides de texto de um template único.
- Legenda curta em português, primeira linha = pergunta ou dado.
- Fonte sempre visível na imagem e link na bio.
- **Voz impessoal**: o perfil fala como o projeto; sem rosto, sem voz, sem bastidores
  pessoais. IA apoia texto e imagem.
- UTM fixo na bio no mês 1; atribuição por post só no mês 2, se houver sinal.
- Página do Facebook existe apenas para habilitar o agendamento gratuito.
- Frescor acima de oportunidade: a data do último dado aparece sempre; nunca "saiu
  hoje" se a série do site não foi atualizada.
- A regra de corte vale antes de ver o resultado (8 semanas, pilar como unidade).

## 11. Respostas do mantenedor (2026-11-02)

1. Perfil: `@brasilemnumeros.ong` — será criado (não existe hoje). Conta nova nasce
   pessoal e é convertida para profissional já na criação.
2. Página do Facebook: **sim**, criar para destravar o agendamento.
3. Sessão mensal: **primeiro sábado do mês**, de manhã (9h–12h).
4. Cross-post: **não**.
5. Voz: **não**; conteúdo impessoal, mantenedor nos bastidores; IA permitida.

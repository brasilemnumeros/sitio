# Product Marketing Context

**Document version:** v3
**Last updated:** 2026-10-28

> Nota: rascunho V1 gerado a partir do próprio repositório (sobre.md, \_config.yml,
> indicators.json, posts, termos-de-uso, privacidade e a spec da camada de gráficos).
> Campos marcados **⚠ a confirmar** são inferência, não fato lido no código. Corrija
> ou apague o que estiver errado.

## Product Overview
**One-liner:** Dados públicos brasileiros, organizados e visualizados, para todo cidadão entender e auditar o Brasil.

**What it does:** Reúne indicadores econômicos e sociais do Brasil (Selic, IPCA, IGP-M, PIB, mercado imobiliário, emprego formal, população, homicídios) em gráficos interativos com um recorte de ~30 anos. Sobrepõe as faixas dos governos ao fundo da série e oferece um painel de comparação por mandato — para responder "quem fez o quê" com dado, não com narrativa. A home abre como **terminal de análise**: o gráfico ocupa o viewport e os controles (busca, séries, cores, eixos, mandatos e comparação) vivem em barras e gavetas, com um preset do dia e um link que reproduz o estado. Toda a metodologia, da coleta ao gráfico, é pública em notebooks Jupyter no GitHub.

**Product category:** Dados públicos / jornalismo de dados / civic tech. A "prateleira" onde o usuário procura: "dados do Brasil", "gráficos de indicadores brasileiros", "séries históricas", "comparar governos".

**Product type:** Plataforma web aberta e gratuita (site **Astro 7** + app **Svelte 5** com build próprio). Projeto de código aberto, independente e apartidário.

**Business model:** Sem modelo comercial. Site livre, sem login, sem anúncios e sem cadastro. **Mantido com recursos próprios, sem patrocínio** — projeto aberto e independente (domínio `.ong.br`). Nenhuma monetização; única dependência de terceiro é o Google Analytics (uso apenas estatístico).

## Target Audience
**Target companies:** — (B2C / bem público; não há segmento empresarial definido).

**Decision-makers:** — (público direto, sem compra envolvida).

**Público prioritário (foco atual): jornalista / criador de conteúdo.** É quem mais se beneficia do que o produto tem de único — fonte citável, link compartilhável e gráfico pronto para reusar. As demais personas são secundárias até segunda ordem.

**Primary use case:** Entender e citar o comportamento de um indicador brasileiro ao longo do tempo, com contexto de quais governos estavam no poder — sem precisar garimpar fontes primárias dispersas nem confiar em gráfico sem procedência.

**Jobs to be done:**
- "Quero mostrar/explicar um dado do Brasil de forma visual e confiável" (professor, jornalista, criador de conteúdo).
- "Quero comparar dois indicadores — ou dois períodos de governo — em um mesmo gráfico" (analista, estudante, curioso engajado).
- "Quero auditar de onde veio esse número antes de acreditar nele" (cético, pesquisador).

**Use cases:**
- Jornalista embute/cita o gráfico em matéria com link e fonte.
- Professor usa o gráfico em aula (Selic × IPCA, homicídios).
- Cidadão checa "o que aconteceu com X no governo Y".
- Estudante/pesquisador reproduz a metodologia a partir dos notebooks.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| **Jornalista / criador de conteúdo (primário)** | Fonte citável e rápida de reusar | Reunir série, checar fonte e montar gráfico consome tempo | Gráfico pronto + fonte clara + link compartilhável |
| Cidadão engajado | Entender a economia e a política sem jargão | Dados espalhados, difíceis de comparar, mídia polarizada | Um lugar só, visual e neutro, com contexto histórico |
| Professor / educador | Material didático atual e confiável | Encontrar dado acessível e explicado para não-especialistas | Indicador visual com texto explicativo que acompanha |
| Analista / pesquisador | Auditabilidade e método | Não confiar em número sem procedência | Metodologia aberta em notebooks, reproduzível no GitHub |

## Problems & Pain Points
**Core problem:** A informação pública existe, mas está **dispersa, complexa e em fontes primárias** (BCB, IBGE, órgãos de segurança) que pouca gente consegue ou sabe interpretar. Quem tenta entender o Brasil hoje depende de gráficos de terceiros, muitas vezes sem fonte ou com enquadramento enviesado.

**Why alternatives fall short:**
- Portais oficiais (IBGE, BCB, IPEADATA): dado bruto, planilhas e tabelas — sem visual nem contexto de período de governo.
- Mídia: gráfico pronto, mas sem transparência de método e sujeito a enquadramento editorial.
- Gráficos de redes sociais: visual, mas sem fonte verificável — desinformação fácil.

**What it costs them:** Tempo gasto coletando e limpando dado; risco de citar número errado ou desatualizado; dificuldade de provar uma afirmação com dado; exposição a desinformação.

**Emotional tension:** Desconfiança ("de onde saiu esse número?"), confusão diante do volume de dado público, e receio de parecer enviesado ao citar um dado.

## Competitive Landscape
**Direct:** IBGE / Banco Central / IPEADATA — **são ao mesmo tempo fonte e concorrente.** O dado autoritativo nasce lá (fonte), mas é também o que o usuário usaria se não viesse aqui (alternativa): cru, técnico, em tabelas/planilhas, sem camada visual nem contexto de governo. Falls short porque jogam o trabalho todo — limpar, visualizar e contextualizar — para o usuário.

**Secondary:** Cobertura de dados em jornal (G1, Folha, Nexo…) e data-journalism — visual e acessível, mas pontual, presa a uma pauta e sem metodologia aberta para auditar/reusar.

**Indirect:** Gráficos e tabelas em redes sociais, prints e "achismos" numéricos — acessíveis e virais, porém sem fonte, sem método e sem correção.

> Referência de categoria (não concorrente direto no Brasil): **Our World in Data** — o padrão de "dado público explicado e citável" que aspiramos no recorte brasileiro.

## Differentiation
**Key differentiators:**
- **Método 100% aberto e auditável** — coleta e tratamento em notebooks Jupyter públicos; o usuário pode reproduzir e corrigir.
- **Contexto de governo no gráfico** — faixas de mandato ao fundo e painel de comparação indicador × mandato: responde "quem fez o quê".
- **Aberto e apartidário por declaração** — não dá respostas prontas, oferece ferramentas para fazer melhores perguntas.
- **Recorte longo (~30 anos)** — permite ver ciclos, não só o ponto atual.
- **Sem fricção** — sem login, sem cadastro, sem anúncio.

**How we do it differently:** Não publicamos opinião sobre o gráfico; publicamos o gráfico e a fonte, com o contexto dos governos visível, deixando a interpretação para quem lê.

**Why that's better:** Dá ao usuário o dado *e* a condição de verificar; transforma "confie em mim" em "confira você mesmo".

**Why customers choose us:** Porque querem um número que possam citar com link e fonte, e um gráfico que não tenta convencê-los de uma conclusão.

## Objections
| Objection | Response |
|-----------|----------|
| "Os dados são confiáveis?" | Fontes públicas reconhecidas (IBGE, BCB, órgãos de segurança); metodologia aberta no GitHub, reproduzível. Termos avisam que as fontes podem ser revisadas e o site não se responsabiliza por imprecisões. |
| "Isso não é enviesado/político?" | Projeto apartidário, sem opinião embutida; as faixas de governo são contexto, não juízo — os Termos dizem explicitamente que correlação com mandato "não implica juízo de valor ou causalidade direta". |
| "Posso usar em aula / na matéria?" | Sim para uso pessoal, educativo e não comercial, desde que citada a fonte com link (Termos §4). |
| "Vocês coletam meus dados?" | Não há cadastro/login; só Google Analytics anonimizado, para estatística. |

**Anti-persona:** Quem procura recomendações de investimento ou aconselhamento financeiro/político; quem quer uma conclusão editorial pronta em vez de dado para interpretar; quem busca dado intradiário/em tempo real de mercado.

## Switching Dynamics
**Push:** Cansaço de garimpar planilha oficial e de desconfiar de gráfico sem fonte; tempo perdido montando a visualização.

**Pull:** Gráfico pronto, bonito e citável, com fonte e método abertos; comparação por governo que outros não oferecem.

**Habit:** Uso de planilhas/portais oficiais já conhecidos; hábito de pegar o gráfico do jornal da manhã.

**Anxiety:** "Será que atualizam?"; "e se o dado estiver errado e eu citar?"; "usar isso vai me fazer parecer que tenho lado?".

## Customer Language
**How they describe the problem:**
- ⚠ **Ainda não há falas reais coletadas.** Nenhum comentário, e-mail ou feedback registrado até 2026-10-17. Este é o ponto mais fraco do documento — priorizar captura.
- Enquanto isso, a única frase disponível é a da própria copy do projeto: *"números complexos e dispersos"*; *"fazer as melhores perguntas"*.

**How they describe us:**
- ⚠ Ainda não há falas reais coletadas.
- Linguagem que o projeto já reivindica: *"plataforma de dados aberta e auditável"*, *"apartidário"*, *"democratizar o acesso à informação pública"*.

**Words to use:** dados públicos; aberto; auditável; transparente; apartidário; independente; fonte; metodologia; comparar; contexto; cidadão; fazer melhores perguntas.

**Words to avoid:** "verdade"; "prova que"; "o melhor governo"; qualquer verbo causal ligando mandato a indicador; tom de aconselhamento financeiro; "nós descobrimos" (o dado é público, não nosso).

**Glossary:**
| Term | Meaning |
|------|---------|
| Indicador | Série de dados sobre um fenômeno (Selic, IPCA, homicídios…) |
| Grupo | Categoria de indicadores (Política Monetária, Inflação, Segurança Pública…) |
| Mandato / governo | Faixa de governo sobreposta ao fundo do gráfico para dar contexto |
| Trilho de mandatos | Seletor de mandato que controla o recorte do gráfico |
| Painel de comparação | Matriz indicador × mandato |
| datafile | URL pública do JSON de cada série (hospedado em brasilemnumeros.github.io/dados) |

## Brand Voice
| Attribute | Means | Doesn't mean | Example line |
|-----------|-------|--------------|--------------|
| Didático | Explica o conceito antes do número | Infantilizar ou encher de jargão | "Pense na Selic como a taxa de juros base da economia brasileira." |
| Transparente | Mostra a fonte e o método; admite limites | Prometer infalibilidade | "Todo o nosso processo... está disponível em nosso repositório público." |
| Cuidadoso com causalidade | Trata correlação como correlação | Frieza ou não posicionamento sobre o método | "atribuí-la a uma única política federal ou mandato é uma simplificação." |
| Apartidário | Oferece o dado e o contexto de todos os governos | Falsa equivalência nem timidez diante do dado | "não é dar respostas prontas, mas ferramentas para fazer as melhores perguntas." |
| Direto e visual | Frase curta, foco no gráfico | Secura técnica de relatório | "Hoje nasce o **Brasil em Números**!" |

**Tone by context:**
- Support: ⚠ a confirmar (sem canal declarado; suporte via GitHub).
- Launch: entusiasmado e claro — "Hoje nasce o Brasil em Números!", "Chegou o IGP-M".
- Errors: ⚠ a confirmar.
- Sales: não se aplica (sem venda).
- Social: ⚠ a confirmar (há share de posts e página de links).

**Terms we own:** "Brasil em Números"; "apartidário"; "auditável"; "fazer as melhores perguntas".

**Never use (and why):** linguagem de campanha política; promessa de certeza ("a verdade sobre"); tom de recomendação de investimento — os Termos invalidariam e quebrariam a neutralidade.

## Proof Points
**Metrics:**
- ~30 anos de recorte temporal (definido nos Termos).
- 13 indicadores em 7 grupos (indicators.json, 2026-10-17).
- Metodologia pública em notebooks Jupyter.

**Customers:** — (sem clientes; público aberto).

**Testimonials:** ⚠ a confirmar — nenhum registrado no repositório.

**Value themes:**
| Theme | Proof |
|-------|-------|
| Transparência | Notebooks Jupyter no GitHub; método documentado nos Termos §3. |
| Neutralidade | Declaração de apartidário (sobre.md); disclaimer de causalidade (Termos §5.4). |
| Contexto histórico | Faixas de governo + painel de comparação por mandato. |
| Acesso livre | Sem login/cadastro/anúncio; uso educativo permitido com citação. |

## Goals
**Business goal:** — (sem meta comercial declarada; missão é democratizar acesso a dado público).
**Conversion action:** **compartilhar o gráfico** (copiar o link) — decidido em 2026-10-17, alinhado ao público primário (jornalista). ✅ **Implementado:** o app tem o botão **Permalink** na barra superior, que copia a URL do estado atual (`?series=…`), então a conversão passou a ser mensurável. Plano de tagueamento: `sitio/docs/specs/2026-10-17-plano-de-tagueamento.md`.
**Current metrics:** Google Analytics G-N4CFQ7CL1S ativo. Números atuais ⚠ a confirmar.

## Paid Ads (optional)
Não se aplica — o projeto não roda anúncios pagos.

## Learnings
*Decisões e lições testadas. Mais recentes no topo. Manter cerca de 20 entradas ativas.*
| Date | Learning | Evidence | Applies to | Status |
|------|----------|----------|------------|--------|
| 2026-10-17 | Contexto criado; ainda sem dados de campanha/copy testada. | — | todos | watch |

## Changelog
*Mais recentes no topo. Uma linha por revisão: o que mudou e por quê.*
- v3 (2026-10-28) — Atualizado o estado técnico: site Astro 7 (Jekyll saiu), app Svelte 5 com build próprio, home como terminal de análise; permalink implementado, então a conversão deixou de estar bloqueada.
- v2 (2026-10-17) — Definida a conversão: compartilhar o gráfico (copiar link); registrado o bloqueio de que o permalink ainda não existe no app. Origem: plano de tagueamento.
- v1 (2026-10-17) — Contexto inicial, rascunhado a partir do repositório e revisado com o usuário (público prioritário: jornalista/criador; portais oficiais como fonte e concorrente; financiamento próprio sem patrocínio; sem falas de usuário ainda).

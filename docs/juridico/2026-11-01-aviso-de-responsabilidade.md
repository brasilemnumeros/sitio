# Aviso de responsabilidade e correção de erros — o que foi feito

**Data:** 2026-11-01 · **Origem:** revisão de riscos jurídicos pedida pelo dono do projeto, com foco
em **não ser responsabilizado por um dado equivocado publicado**. Levantamento feito por subagente
sobre o código publicado; a implementação é desta rodada.

> Isto é registro técnico do que o site passou a dizer. **Não é parecer jurídico.** As cláusulas de
> isenção, limitação de responsabilidade e o eventual enquadramento no CDC precisam de advogado
> (civil e de consumo); o bloco de LGPD, de especialista em proteção de dados.

## Os três achados que mudaram o desenho

1. **As isenções existiam, mas o visitante do gráfico nunca as via.** A `/` não usa o rodapé do site
   e não tinha nenhum link para os Termos — `grep` no HTML publicado dava **zero** ocorrências de
   "Termos" ou "responsabilidade". Cláusula que o usuário do produto principal nunca vê é a defesa
   mais fraca que existe.
2. **A cláusula de precisão se contradizia.** O 3.1 dizia que os dados vêm de fontes "consideradas
   confiáveis" (soa como endosso) e o 5.2 dizia que não havia garantia de infalibilidade.
3. **O risco maior não é o erro — é a inércia.** O único canal era abrir discussão no GitHub, sem
   prazo e sem registro. É o que sustenta a tese de negligência, que nenhum aviso cobre.

Também: "Brasil em Números" **é** o nome de uma publicação anual oficial do IBGE (volume 33 em
2025) — daí o aviso de não-vinculação; e o `LICENSE` estava com placeholders (`[year] [fullname]`).

## O que passou a existir

| Superfície | O que diz | Arquivo |
|---|---|---|
| Barra inferior do gráfico | "Dados públicos · Termos" (no celular só "Termos"), com `title` explicando que os dados são reproduzidos de fontes públicas, sujeitos a revisão e sem garantia de exatidão | `app/src/components/BottomDrawer.svelte` |
| Ficha do indicador | "Reproduzido de fonte pública; pode ter sido revisado na origem depois da extração. Confira no órgão produtor antes de usar…" | `app/src/components/Ficha.svelte` |
| Rodapé de todas as páginas do site (menos a `/`) | Aviso de 3 linhas: fontes públicas, sujeitos a revisão, podem conter erro, não é aconselhamento; links para Termos e "Corrigir um erro" | `src/components/Footer.astro` |
| Todo post | Nota fixa: análise informativa, números podem ser revisados na origem, não é recomendação de investimento/compra/venda, orientação jurídica ou posição eleitoral | `src/layouts/Post.astro` |
| `/correcoes.html` (nova) | Como apontar um erro, o que acontece depois, **prazos-alvo** (5 dias úteis para responder, 15 para publicar a correção) e histórico público de erratas | `src/pages/correcoes.md` |
| Termos 3.1 | Dados **reproduzidos** de IBGE, BCB, Ipea, FGV, MTE; "não os auditamos na origem e não os endossamos"; saiu "consideradas confiáveis" | `src/pages/termos-de-uso.md` |
| Termos 3.2 | Documentação "em evolução"; vale a fonte primária quando o processo de uma série não estiver descrito (antes prometia notebooks que não existem) | idem |
| Termos 3.3 / 5.3 | Apontamento de erro com prazo e registro público; a isenção **não cobre** recusar corrigir erro confirmado | idem |
| Termos 5.1 | "não constituem aconselhamento financeiro, de investimento, jurídico, médico, político, eleitoral…" | idem |
| Termos 5.2 | Isenção de garantia explícita: exatidão, integridade, atualidade e adequação; fontes revisadas sem aviso; confira na fonte primária | idem |
| Sobre | Nome não é a publicação do IBGE; não há vínculo/patrocínio/endosso; licenças (MIT no código, CC BY 4.0 nos textos, dados dos produtores) | `src/pages/sobre.md` |
| Privacidade | Transferência internacional (LGPD art. 33), base legal (consentimento, art. 7º I), revogação, encarregado; saiu "IP anonimizado" | `src/pages/politica-de-privacidade.md` |
| LICENSE | MIT preenchido (2025, Brasil em Números) | `LICENSE` |

**Conteúdo editorial ajustado** (promessa de verdade e linguagem de decisão):
`precos-imoveis…` ("revela a verdade por trás" → "ajuda a ler o que está por trás"; "lições claras
para quem… comprar, vender" → "leituras possíveis… não é recomendação"), `pib-anual` ("o indicador
que realmente nos diz a verdade" → "mostra o crescimento sem o efeito da inflação"),
`hoje-nasce…` ("investir em renda fixa… mais atraente" → "a renda fixa tende a ficar
comparativamente mais atrativa"), `luzes-sombras…` ("O Início da Escalada" → "a alta dos
homicídios"; "As Causas Reais (Segundo Especialistas)" → "Causas apontadas na literatura").

## Guardas (falha em voz alta)

`scripts/testar-publico.sh` agora reprova o build se: a home perder o link para os Termos, `/sobre`
perder o mesmo link, o rodapé perder "Corrigir um erro", ou faltar `dist/correcoes.html`.
`scripts/testar-sitemap.sh` subiu de 19 para **20** URLs (a nova página) — o número fixo é o alarme
de "página publicada que não entrou no sitemap". `scripts/testar-urls.sh` inclui `correcoes.html`.

## O que ainda falta (e não é código)

1. **Advogado** para revisar as cláusulas 5.2/5.3 e o enquadramento no CDC (site gratuito, com
   remuneração indireta, pode ser lido como relação de consumo).
2. **Página de metodologia**: o 3.2 agora é honesto, mas a promessa forte continua sem página.
3. **Proveniência por série**: código da série no órgão, link para o dado original e data de
   extração. Hoje a ficha mostra só o nome do órgão; a data exigiria campo novo no repo `dados`.
4. **E-mail ou formulário** de contato: hoje o canal é só GitHub.

## O que aviso nenhum resolve

Dolo; culpa grave (erro apontado e não corrigido — a página de errata existe para isso); promessa
explícita de exatidão (por isso as frases de "verdade" saíram); opinião apresentada como fato
(por isso as "lições" viraram "leituras"); e uso indevido de marca de terceiro (hoje não há logo de
órgão nem de partido no site).

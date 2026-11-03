# Link para o notebook na ficha do indicador

**Data:** 2026-11-03 · **Tamanho:** mudança pequena (dois repositórios + contrato do catálogo)

## O problema

A ficha de um indicador, na busca, mostra unidade, granularidade, medida, período, pontos e
fonte — mas não leva ao **método**. A promessa do produto é metodologia aberta em notebooks
Jupyter públicos (`dados/indicadores/<familia>/<Nome>.ipynb`), e hoje o único caminho até ela é
sair do site e procurar no GitHub. Quem quer conferir um número não tem por onde começar.

Além disso, os notebooks perderam o selo **Open in Colab** nas reescritas de célula de abertura
durante a migração (`0a7b390` em diante): 7 dos 8 tinham o selo, e ele apontava para o layout
antigo, sem `indicadores/`. O IPCA nunca teve. Restaurar é possível: o histórico preserva a
célula com o metadado `id: view-in-github`.

## Objetivo

1. Cada entrada do catálogo declara a URL do notebook que gera aquela série, e a ficha exibe um
   link para ela.
2. Todo notebook volta a ter o selo "Open in Colab", com a URL do caminho atual.

## Não-objetivos

- Não muda a série (`C1…C15`), o `?series=`, presets, busca, grupos nem o gráfico.
- Não cria um evento de analytics nesta fatia. O app não tem delegação de link externo hoje;
  instrumentar `outbound_link_clicked` é trabalho separado.
- Não executa notebook nem versiona outputs. O selo é só uma célula de markdown.
- Não muda `versao` do catálogo: campo novo é compatível para quem lê o catálogo antigo; o
  sentido inverso é resolvido pela ordem de publicação (abaixo).
- Não duplica o link no arquivo da série. O pedido é explícito: o link vem do catálogo.

## Abordagem escolhida (A)

**URL completa no catálogo**, uma por entrada:

```json
{
  "id": "ipca-acum-12m",
  "urlNotebook": "https://github.com/brasilemnumeros/dados/blob/main/indicadores/ipca/IPCA.ipynb"
}
```

Alternativa descartada: guardar `familia/arquivo.ipynb` e montar a URL no app. Ela manteria a
regra "caminho, nunca URL" do `arquivo`, mas colocaria o host no app e faria o link deixar de
vir inteiro do catálogo — contra o pedido.

Com a URL completa, o app só renderiza, e os dois validadores ainda conseguem conferir que o
arquivo existe: o `K9` compara a URL com o prefixo canônico
`https://github.com/brasilemnumeros/dados/blob/main/indicadores/` e testa o `.ipynb` no disco.
Um typo reprova o PR.

## Catálogo (`dados`)

- Campo **obrigatório** `urlNotebook`, string `https://`, em cada uma das 12 entradas.
- Hoje são 12 indicadores para 8 notebooks: séries da mesma família repetem a URL
  (`selic` ×2, `mvgr` ×2, `populacao` ×2, `homicidios` ×3).
- `populacao/População.ipynb` usa percent-encoding na URL (`Popula%C3%A7%C3%A3o.ipynb`); o
  validador decodifica antes de conferir o disco.

### K9 — regra nova em `validar.py`

Reprova quando:

- `urlNotebook` ausente, não-string ou vazia;
- não começa no prefixo canônico do repo `dados` (branch `main`, pasta `indicadores/`);
- o caminho restante não é exatamente `<familia>/<arquivo>.ipynb` ou não existe no disco.

`validar.py` e `validateCatalog` precisam concordar com o documento; a regra entra em
`docs/contrato-de-indicadores.md` (tabela de chaves + `K9` + regra de corte + compatibilidade) e
em `dados/AGENTS.md`.

## App (`sitio`)

### `validateCatalog`

- Exige `urlNotebook` string não vazia, começando em `https://`.
- Preserva o campo na entrada validada (o spread já preserva; o teste fixa o contrato).
- Violação vira `status: 'error'` com a mensagem crua, como as demais regras — nunca lista vazia.

### `Ficha.svelte`

- Link **"Ver o notebook que gera estes dados ↗"**, logo abaixo da `descricao`, antes do bloco
  de metadados. Fica visível mesmo se a série falhar ao carregar — é justamente o caminho para
  auditar o que falhou.
- `target="_blank"` + `rel="noopener noreferrer"`; texto acessível informa que abre em nova aba.
- Sem mudança de layout nas medidas: é uma linha de texto, não um bloco novo.
- O `urlNotebook` não depende do fetch da série: renderiza com o que veio do catálogo.

## Selo do Colab (`dados`)

Primeira célula de markdown dos 8 notebooks, com o metadado original:

```json
{
  "cell_type": "markdown",
  "metadata": { "id": "view-in-github", "colab_type": "text" },
  "source": [
    "<a href=\"https://colab.research.google.com/github/brasilemnumeros/dados/blob/main/indicadores/<familia>/<arquivo>.ipynb\" target=\"_parent\"><img src=\"https://colab.research.google.com/assets/colab-badge.svg\" alt=\"Open In Colab\"/></a>"
  ]
}
```

O script de inserção preserva a formatação do arquivo (`indent=1`, UTF-8, sem `ensure_ascii`) para
o diff mostrar só a célula nova. Nenhuma outra célula é tocada.

Novo teste em `dados/tests/test_notebooks.py`: todo `indicadores/*/*.ipynb` tem a primeira célula
com o selo e a URL aponta para o próprio arquivo. É a guarda que faltou para a remoção passar
despercebida.

## Ordem de publicação

1. **`dados` primeiro** — catálogo com `urlNotebook` + selos + `K9` + testes. O app antigo ignora
   o campo novo e continua funcionando.
2. **`sitio` depois** — validador, ficha, testes e contrato. O app novo exige o campo; publicar
   antes do catálogo derrubaria a lista de todo mundo (falha em voz alta, mas desnecessária).

## Validação

| Camada | O que prova |
|---|---|
| `dados`: `validar.py` + `pytest` | `K9` (URL canônica + arquivo no disco) e selo em todos os notebooks |
| `sitio`: `catalog.test.js` | aceita, exige e recusa `urlNotebook` inválido |
| `sitio`: `integracao.test.js` | cada `urlNotebook` do catálogo publicado aponta para um `.ipynb` existente |
| `sitio`: `busca.spec.js` | a ficha mostra o link com `href` do GitHub e `target="_blank"` |
| `npm run build` + `npm test` + `test:e2e` + `test:analytics` | cadeia completa antes de "pronto" |

## Riscos e decisões assumidas

- **Host e branch repetidos em 12 entradas.** Só mudam se o repo `dados` mudar de lugar ou de
  branch padrão — nesse caso, o `K9` reprova até a atualização, em vez de publicar links mortos.
- **Link externo pode cair sem afetar o gráfico.** O `urlNotebook` não é buscado pelo app; a
  ficha continua funcionando.
- **GitHub, não Colab, na ficha.** O GitHub mostra o código e o histórico; o Colab fica a um
  clique, dentro do notebook. O texto do link não promete execução.
- **Notebook sem selo não quebra o app.** A guarda do selo vive no CI do `dados`; o app só
  conhece a URL do catálogo.

## Decisões do construtor (para conferir na leitura)

1. Campo chamado `urlNotebook`, espelhando `urlFonte` da série.
2. Link fica no topo da ficha, abaixo da descrição, para sobreviver a erro de carregamento.
3. Texto "estes dados", não "esta série": um notebook publica mais de uma série.
4. `K9` exige o prefixo canônico (não só `https://`) para pegar typo de caminho.
5. Selo do Colab entra também no IPCA, que nunca teve, para os 8 ficarem iguais.

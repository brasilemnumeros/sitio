# Contrato dos arquivos de indicadores

**Versão:** 1 (única) · **Vigente desde:** 2026-11-01
**Consumidor:** app da home (`sitio/app/src/data/validate.js` para a série, `catalog.js` para o catálogo)
**Produtor:** repo `dados` — os notebooks escrevem as séries e `dados/scripts/validar.py` confere; o catálogo (`indicadores/catalogo.json`) é editado à mão, no mesmo PR

Este documento é a **fonte de verdade** do formato dos arquivos de série (`C1…C15`) e do
catálogo (`K1…K8`). Cada regra de rejeição tem um código, citado nos validadores e nos testes
que a executam; as de aceitação (`C13`/`C14`) têm caso válido ou permissão explícita. Quando a
prosa e o código divergirem, **este documento vale** — e a divergência é defeito a corrigir no
mesmo commit, não interpretação.

**Chaves e valores são em português.** O arquivo é lido e publicado nessa forma, sem camada de
tradução: `unidade`, `granularidade`, `fonte`, `dados`, `data`, `valor`.

Não confundir com o **catálogo** (`dados/indicadores/catalogo.json`): o catálogo é
apresentação (`nome`, `grupo`, `descricao`, `escala`, `arquivo`), também em português, e mora
ao lado das séries no repo `dados` — ver "Catálogo × série". O arquivo da série descreve **o
dado**; unidade, granularidade e fonte não se repetem no catálogo.

## Onde o arquivo mora

```
dados/indicadores/<familia>/<id>.json
```

- `<familia>` é a família editorial (`selic`, `ipca`, `igp-m`, `pib`, `mvgr`, `caged`,
  `populacao`, `homicidios`) — o catálogo guarda `familia/arquivo.json` em `arquivo`.
- `<id>` é o identificador público, usado em `?series=`, nos presets e no catálogo.

## Forma

```json
{
  "versao": 1,
  "id": "ipca-acum-12m",
  "unidade": { "tipo": "percentual", "simbolo": "%", "casas": 2 },
  "eixo": "percentual",
  "medida": "acumulado-12m",
  "granularidade": "mensal",
  "fonte": "IBGE",
  "urlFonte": "https://sidra.ibge.gov.br/tabela/1737",
  "dados": [
    { "data": "1995-01-01", "valor": 631.54 },
    { "data": "1995-02-01", "valor": 426.83 }
  ]
}
```

## Regras

### Identidade e versão

- **C1 — raiz.** O arquivo é um objeto JSON. `versao` é o inteiro `1`. Versão desconhecida é
  erro, nunca tentativa de leitura parcial.
- **C2 — id.** `id` é texto, casa com `^[a-z0-9-]+$` e é **igual ao nome do arquivo** sem
  `.json`. Mudar o id é mudar a URL pública (`?series=<id>`), não renomear arquivo.

### Unidade

- **C3 — unidade.** Objeto com exatamente `tipo`, `simbolo`, `casas`.
  - `tipo` ∈ `percentual` | `numero` | `moeda`.
  - `simbolo` é texto não vazio. `''` é erro: a unidade tem de aparecer na tela.
  - `casas` é inteiro ≥ 0 (quantas casas o produto exibe/arredonda).
- **C3.1 — idioma.** Opcional; quando presente, é uma tag de idioma no formato `xx` ou `xx-XX`
  (subconjunto de BCP 47; ex.: `pt-BR`). Existe para formatação de moeda/número; não altera o
  valor.

**Nota — inteiros em JSON.** `versao` e `casas` são inteiros. Como JSON tem um único tipo
numérico, `1.0` e `2.0` são aceitos e valem como `1` e `2`; valor com parte fracionária
diferente de zero reprova. O `validar.py` e o `validate.js` fazem a mesma coisa — é o que
`test_aceita_casas_float_integral` e `test_aceita_versao_float_integral` provam no `dados`.

### Significado do número

- **C4 — eixo (comparabilidade DECLARADA).** `eixo` diz em que escala o valor vive. Duas séries
  **só podem dividir o mesmo eixo y** se tiverem o mesmo `eixo`. É declaração, não inferência
  por magnitude (ADR 0001, D7).

  | `eixo` | `unidade.tipo` obrigatório | exemplo |
  |---|---|---|
  | `percentual` | `percentual` | Selic, IPCA, PIB |
  | `reais` | `moeda` | MVG-R |
  | `contagem` | `numero` | CAGED, população |
  | `por-100-mil` | `numero` | homicídios |

- **C5 — medida.** `medida` diz **o que o número é**:

  | `medida` | significado |
  |---|---|
  | `nivel` | valor no período (taxa, preço, razão por 100 mil) |
  | `acumulado-12m` | variação acumulada nos 12 meses até a data |
  | `variacao-anual` | variação em relação ao ano/período anterior |
  | `estoque` | total num instante (empregos, habitantes) |
  | `participacao` | parte de um todo, em % |

  `granularidade` diz **de quanto em quanto tempo** há ponto; `medida` diz **o que o ponto
  significa**. "Acumulado 12 meses" é medida, não granularidade.

### Periodicidade

- **C6 — granularidade.** ∈ `diaria` | `mensal` | `anual`. É o espaçamento das datas, não o
  intervalo de publicação.

### Proveniência

- **C7 — fonte.** Texto não vazio, o nome da instituição/fonte (`IBGE`, `Banco Central do
  Brasil`).
- **C7.1 — urlFonte.** Opcional; URL `https://` do recorte exato (tabela, série SGS). Quando
  existir, é o caminho para auditar o número.

### Pontos

- **C8 — dados.** Lista **não vazia**. Cada item tem exatamente `data` e `valor`.
- **C8.1 — sem campos extras.** Campo desconhecido na raiz, no ponto ou na unidade é erro. Na
  unidade, só `tipo`, `simbolo`, `casas` e o opcional `idioma` são aceitos (C3).
- **C9 — data.** Texto `YYYY-MM-DD`, dígitos ASCII, data de calendário válida.
  - A convenção de dia é **uma por série**; C15 fixa o primeiro dia do período para mensal
    e anual. Mudar o dia gera diff falso em toda a série.
  - A data é o **início** do período de referência.
- **C10 — valor.** Número finito (`int` ou `float`, nunca booleano, nunca `null`, nunca texto).
- **C11 — um ponto por período.** Não há dois pontos no mesmo período, onde período é `data`
  (diaria), `AAAA-MM` (mensal) ou `AAAA` (anual).
- **C12 — ordem.** Datas **estritamente ascendentes**. Consumidores podem assumir isso e fazer
  busca binária; produtor que publicar fora de ordem reprova.

### Lacunas

- **C13 — ausência é ausência.** Período sem dado **não aparece** na lista. Não existe `null`,
  não existe zero de preenchimento, não existe interpolação. Quem plota liga os pontos
  vizinhos e não inventa valor no meio.

### Período

- **C14 — período em aberto.** A última data pode ser um período ainda não encerrado. O
  contrato não exige período fechado nem exige que a série vá até "hoje"; **consumidor nenhum
  extrapola** além da última data.

### Início do período

- **C15 — início do período.** A data é o primeiro dia do período de referência:
  - `mensal`: dia `01`, em qualquer mês (`AAAA-MM-01`);
  - `anual`: `01-01` (`AAAA-01-01`);
  - `diaria`: a data do próprio dia, sem restrição além de C9.

  É a consequência executável da convenção de dia de C9: série mensal e anual têm sempre o
  mesmo dia; na diária, o dia é o próprio dado.

## Catálogo × série

São **dois** arquivos com donos diferentes: o catálogo diz **como o indicador aparece**; a
série diz **o que o número é**. O app lê os dois do mesmo host — o catálogo em
`${__BASE_DADOS__}/catalogo.json`, a série no caminho que a entrada declara.

### Onde mora

```
dados/indicadores/catalogo.json
```

Irmão das pastas de família, **não** dentro delas: `validar.py` trata `indicadores/*/*.json`
como série, e `indicadores/catalogo.json` não casa com esse padrão. O endereço canônico é
`https://brasilemnumeros.github.io/dados/indicadores/catalogo.json` — ele só responde depois que
a migração do repo `dados` (o layout com `indicadores/`) for publicada no Pages. Em dev o
middleware `app/vite-plugins/dados-locais.js` serve `/dados/indicadores/catalogo.json` do repo
irmão. Não há cópia no `sitio` nem no bundle do app: o catálogo que o produto usa é o que está
publicado.

### Forma

```json
{
  "versao": 1,
  "grupos": {
    "monetario": { "nome": "🏦 Política Monetária" },
    "inflacao": { "nome": "📈 Inflação" }
  },
  "indicadores": [
    {
      "id": "ipca-acum-12m",
      "nome": "IPCA (%)",
      "grupo": "inflacao",
      "escala": "percentual",
      "descricao": "Variação acumulada do Índice de Preços ao Consumidor Amplo (IPCA) em 12 meses",
      "arquivo": "ipca/ipca-acum-12m.json"
    }
  ]
}
```

| chave | onde | o que é |
|---|---|---|
| `versao` | raiz | inteiro `1` (K6) |
| `grupos` | raiz | mapa `id` → `{ "nome" }`; a ordem de declaração é a ordem de navegação da busca |
| `indicadores` | raiz | lista das entradas |
| `id` | entrada | chave pública (`?series=`); igual ao nome do arquivo e ao `id` da série (K3) |
| `nome` | entrada | rótulo da lista, da legenda e da ficha, exibido antes do dado (não vazio — K7) |
| `grupo` | entrada | `id` de um grupo de `grupos` (K5) |
| `escala` | entrada | `percentual` \| `moeda` \| `numero`; o distintivo da lista, derivado de `unidade.tipo` da série (K4) |
| `descricao` | entrada | uma frase sobre o dado, no topo da ficha antes de carregar (não vazia — K7) |
| `arquivo` | entrada | caminho `familia/arquivo.json` dentro de `indicadores/`, existente no disco e único (K1, K8) |

### Regra de corte

**O que a tela mostra antes de o dado chegar mora no catálogo; o que descreve o número mora na
série.** Descrevem o número: `unidade` (tipo, símbolo, casas, idioma), `eixo`, `medida`,
`granularidade`, `fonte`, `urlFonte` e `dados`. Nenhum campo novo entra nos dois.

A única duplicata estrutural é `escala` ↔ `unidade.tipo`: o catálogo repete a **classe** para
pintar o distintivo sem baixar as séries, e por isso ela é **conferida**, não deduzida (K4).

### K1…K8 — o catálogo contra o disco

`python3 scripts/validar.py` sem argumentos confere as séries (`C1…C15`) **e** o catálogo. Com
caminhos avulsos o catálogo fica de fora: conferir a raiz a partir de um recorte produziria K2
falso.

| regra | reprova quando |
|---|---|
| **K1** | `catalogo.json` ausente, ilegível, sem objeto na raiz ou sem a lista `indicadores`; entrada com `arquivo` fora do formato `familia/arquivo.json`, inexistente, ilegível ou sem objeto na raiz |
| **K2** | uma série de `indicadores/*/*.json` não tem entrada no catálogo |
| **K3** | a entrada não é objeto; `id` diverge do nome do arquivo ou do `id` da série |
| **K4** | `escala` diverge de `unidade.tipo` da série |
| **K5** | `grupos` ausente ou não é objeto; `grupo` da entrada não existe nele |
| **K6** | `versao` não é o inteiro `1` — versão desconhecida reprova antes de interpretar o resto |
| **K7** | `nome` ou `descricao` ausente, não-string ou vazia — o `validateCatalog` rejeita o catálogo inteiro sem `nome` |
| **K8** | `id` ou `arquivo` repetido entre entradas — no navegador a chave duplicada derruba a busca |

O `validar.py` confere o conteúdo de `nome`/`descricao` (K7): sem isso, uma entrada sem `nome`
passava no CI do `dados` e só reprovava no `validateCatalog` do app, tirando a lista do ar para
todo mundo. `id` e `arquivo` são chaves de índice no runtime — repetidos, o `{#each}` da busca
lança `each_key_duplicate`; por isso são conferidos aqui também (K8), e não só no app.

O mesmo par roda no hook `.githooks/pre-commit` (em quem o instalou) e no CI
(`.github/workflows/validar.yml`, em todo pull request e no push para `main`). No `sitio`,
`validateCatalog` (`app/src/data/catalog.js`) é o porteiro do **runtime**: exige `versao: 1`,
`id` e `nome` não vazios, `grupo` existente, `arquivo` casando o formato, `escala` na lista e
nem `id` nem `arquivo` repetidos.
Violação vira `status: 'error'` com a mensagem crua na tela — nunca lista vazia. O teste
`app/src/data/integracao.test.js` repete a conferência cruzada contra o disco antes do deploy.

### Compatibilidade

O catálogo é lido em runtime pelo app **que está no ar**, a partir de outro repositório: mudar
`versao` (ou a forma de um campo que o app antigo lê) exige **deploy coordenado do `sitio`**.
Versão que o app não declara é erro na tela, não leitura parcial — publicar o catálogo novo
antes do sitio derruba a lista de quem está navegando. Mudar só `nome`, `descricao` ou `grupo`,
ou acrescentar indicador, não exige deploy: aparece no próximo acesso, em até ~10 min (cache do
Pages). Renomear `id` **não** é mudança de apresentação: quebra link `?series=` e os ids que o
`sitio` conhece (presets, exemplo, posts), e o teste de integração de lá reprova.

## Conformidade

Os dois conjuntos de regras são provados por **mecanismos diferentes**:

- **Séries (`C1…C15`) — corpus:** `dados/tests/contrato/` — casos de arquivo + veredito
  esperado. As regras de rejeição (`C1…C12` e `C15`) têm um caso inválido com o código no
  nome; `C13` tem um caso **válido** com lacuna (`canonica-com-lacuna.json`), porque lacuna é
  ausência de ponto, não erro; `C14` é permissão (a última data pode ser período aberto) e não
  tem caso inválido — o que se prova é que nenhum validador exige período fechado. É a fonte
  executável: `validar.py` (Python) e `validate.test.js` (JS) têm de concordar com **todos** os
  casos.
- **Catálogo (`K1…K8`) — fixtures de diretório:** `dados/tests/test_validar.py` monta uma raiz
  temporária (`tmp_path`) com o catálogo e a série que ele deveria descrever, estraga uma peça
  por teste e cobra o código da regra. **Não há caso `K` no corpus**, e um arquivo de corpus não
  serviria: `validar.py` com caminhos avulsos não confere o catálogo (conferir a raiz a partir de
  um recorte produziria K2 falso) — o catálogo só é validado na raiz, sem argumentos.
- **Dado real:** todos os arquivos de série de `dados/indicadores/` passam em `python3 scripts/validar.py`
  e em `npm --prefix app test` (o teste de integração lê o repo `dados`).
- **Catálogo × série:** `validar.py` confere o catálogo contra o disco com `K1…K8` (seção
  "Catálogo × série"), e o teste de integração do `sitio` repete a conferência cruzada — o
  catálogo não duplica unidade nem medida.

## Versão

- Existe **uma** versão do formato da série: `versao: 1`. Não há convivência entre versões — o
  projeto não carrega compatibilidade retroativa (decisão de 2026-11-01). O catálogo tem a
  `versao` própria (`1`, K6), independente da série; ver "Compatibilidade".
- Mudança de forma ou de semântica **migra todas as séries publicadas** no mesmo conjunto de commits, com
  os dois validadores, o corpus e este documento. Se um dia houver uma geração nova do
  formato, ela substitui a atual: `versao: 2` só existe se `1` deixar de existir.
- O app entende a `versao` que declara em `validate.js` (`SCHEMA_VERSION`); arquivo com outro
  valor é `SchemaError` em voz alta — não é leitura parcial.

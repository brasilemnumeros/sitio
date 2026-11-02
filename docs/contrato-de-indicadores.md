# Contrato dos arquivos de indicadores

**Versão:** 1 (única) · **Vigente desde:** 2026-11-01
**Consumidor:** app da home (`sitio/app/src/data/validate.js`)
**Produtor:** repo `dados` (notebooks + `dados/scripts/validar.py`)

Este documento é a **fonte de verdade** do formato dos arquivos de série. Cada regra tem um
código (`C1`, `C2`…) citado nos dois validadores e no corpus de conformidade. Quando a prosa e
o código divergirem, **este documento vale** — e a divergência é defeito a corrigir no mesmo
commit, não interpretação.

**Chaves e valores são em português.** O arquivo é lido e publicado nessa forma, sem camada de
tradução: `unidade`, `granularidade`, `fonte`, `dados`, `data`, `valor`.

Não confundir com o **catálogo** (`sitio/app/src/data/indicadores.json`): o catálogo é
apresentação (`nome`, `grupo`, `descricao`, `escala`, `arquivo`) e também está em português. O
arquivo da série descreve **o dado**; unidade, granularidade e fonte não se repetem no catálogo.

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
- **C3.1 — idioma.** Opcional; quando presente, é uma tag BCP 47 (`pt-BR`). Existe para
  formatação de moeda/número; não altera o valor.

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
- **C8.1 — sem campos extras.** Campo desconhecido no ponto ou na raiz (fora de `idioma`) é
  erro.
- **C9 — data.** Texto `YYYY-MM-DD`, dígitos ASCII, data de calendário válida.
  - A convenção de dia é **uma por série** (hoje: dia 01 em todas) e não muda sem revisão de
    dados: mudar o dia gera diff falso em toda a série.
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

## Conformidade

- **Corpus:** `dados/tests/contrato/` — pares de arquivo + veredito esperado (válido/inválido,
  com o código da regra violada). É a fonte executável: `validar.py` (Python) e
  `validate.test.js` (JS) têm de concordar com **todos** os casos.
- **Dado real:** os 13 arquivos de `dados/indicadores/` passam em `python3 scripts/validar.py`
  e em `npm --prefix app test` (o teste de integração lê o repo `dados`).
- **Catálogo × série:** o teste de integração confere que `escala` do catálogo é
  `unidade.tipo` da série — o catálogo não duplica unidade nem medida.

## Versão

- Existe **uma** versão do formato: `versao: 1`. Não há convivência entre versões — o projeto
  não carrega compatibilidade retroativa (decisão de 2026-11-01).
- Mudança de forma ou de semântica **migra os 13 arquivos** no mesmo conjunto de commits, com
  os dois validadores, o corpus e este documento. Se um dia houver uma geração nova do
  formato, ela substitui a atual: `versao: 2` só existe se `1` deixar de existir.
- O app entende a `versao` que declara em `validate.js` (`SCHEMA_VERSION`); arquivo com outro
  valor é `SchemaError` em voz alta — não é leitura parcial.

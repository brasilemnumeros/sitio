### Tarefa 1: Os arquivos de governo (repo `dados`)

**Arquivos:**
- Criar: `dados/governos/index.json`
- Criar: `dados/governos/federal.json`

**Interfaces:**
- Consome: nada.
- Produz: o índice (o que existe) e o arquivo federal, no schema da §7.2.

- [ ] **Passo 1: escrever `dados/governos/index.json`**

```json
{
  "schema": 1,
  "esferas": [
    {
      "id": "federal",
      "nome": "Federal",
      "cargo": "presidente",
      "entidades": [{ "codigo": "BR", "nome": "Brasil", "arquivo": "federal.json" }]
    },
    {
      "id": "estadual",
      "nome": "Estadual",
      "cargo": "governador",
      "entidades": []
    },
    {
      "id": "municipal",
      "nome": "Municipal",
      "cargo": "prefeito",
      "entidades": []
    }
  ]
}
```

As listas de `estadual` e `municipal` ficam **vazias por decisão** (§7.1): o modelo
comporta, o dado não é populado. Não preencher com palpite.

- [ ] **Passo 2: escrever `dados/governos/federal.json`**

```json
{
  "schema": 1,
  "esfera": "federal",
  "entidade": { "codigo": "BR", "nome": "Brasil" },
  "cargo": "presidente",
  "mandatos": [
    {
      "id": "federal-1995-fhc",
      "titular": "Fernando Henrique Cardoso",
      "rotulo": "FHC I",
      "partido": "PSDB",
      "tipo": "eleito",
      "inicio": "1995-01-01",
      "fim": "1998-12-31"
    },
    {
      "id": "federal-1999-fhc",
      "titular": "Fernando Henrique Cardoso",
      "rotulo": "FHC II",
      "partido": "PSDB",
      "tipo": "eleito",
      "inicio": "1999-01-01",
      "fim": "2002-12-31"
    },
    {
      "id": "federal-2003-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula I",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2003-01-01",
      "fim": "2006-12-31"
    },
    {
      "id": "federal-2007-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula II",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2007-01-01",
      "fim": "2010-12-31"
    },
    {
      "id": "federal-2011-dilma",
      "titular": "Dilma Vana Rousseff",
      "rotulo": "Dilma I",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2011-01-01",
      "fim": "2014-12-31"
    },
    {
      "id": "federal-2015-dilma",
      "titular": "Dilma Vana Rousseff",
      "rotulo": "Dilma II",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2015-01-01",
      "fim": "2016-08-31",
      "mandatoDe": { "inicio": "2015-01-01", "fim": "2018-12-31" }
    },
    {
      "id": "federal-2016-temer",
      "titular": "Michel Miguel Elias Temer Lulia",
      "rotulo": "Temer",
      "partido": "MDB",
      "tipo": "sucessor",
      "inicio": "2016-05-12",
      "fim": "2018-12-31",
      "mandatoDe": { "inicio": "2015-01-01", "fim": "2018-12-31" }
    },
    {
      "id": "federal-2019-bolsonaro",
      "titular": "Jair Messias Bolsonaro",
      "rotulo": "Bolsonaro",
      "partido": "PL",
      "tipo": "eleito",
      "inicio": "2019-01-01",
      "fim": "2022-12-31"
    },
    {
      "id": "federal-2023-lula",
      "titular": "Luiz Inácio Lula da Silva",
      "rotulo": "Lula III",
      "partido": "PT",
      "tipo": "eleito",
      "inicio": "2023-01-01",
      "fim": null,
      "emCurso": true
    }
  ]
}
```

> **Decisão (R22): FHC I entra.** O arquivo começa em **FHC I (1995-01-01 – 1998-12-31)**,
> porque o modelo é **fato** — quem governou quando — e começar em FHC II fingiria que FHC I
> não existiu, num produto cuja promessa é identificar os governos ao longo da série. As
> séries o cobrem parcialmente: `caged`, `pib`, `populacao`, `homicidios` começam em
> 1995-01; `selic-over`, `ipca` e `proporcao-homicidios` em 1995-12; `selic-meta` só em
> 1999-03 (por isso ele não tem célula em FHC I nem em FHC II completo).
>
> **Consequência nas contagens medidas:** a matriz passa de **104 para 117 células** (13 × 9),
> e a §7.3/anexo precisa registrar isso. **A medição de 8 colunas continua válida** — é uma
> medição do que foi medido, não uma afirmação sobre o que existe. O teste da tarefa 3
> **filtra FHC I** para continuar travando exatamente os números publicados, e é por isso que
> ele não depende desta decisão.
>
> **Rejeitado:** começar em FHC II para não mexer nas contagens. Otimiza o documento à custa
> do dado — e o `AGENTS.md` é explícito que alternativa rejeitada também se registra.

- [ ] **Passo 3: commitar no repo `dados`**

```bash
cd dados
git add governos/
git commit -m "feat(governos): modelo federal versionado, sem cor de partido"
```

---


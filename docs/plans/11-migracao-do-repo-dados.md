# Fatia 11 — Migração do contrato no repo `dados` (§6, D7)

> **Para quem executa:** sub-skill obrigatória: `superpowers:subagent-driven-development`
> ou `superpowers:executing-plans`. Passos em caixa (`- [ ]`).
>
> ⚠️ **Este plano mexe no repo `dados/`, não no `sitio/`.** Commits e pushes são
> **separados** (os três repos são independentes).

**Objetivo:** os notebooks passam a publicar o **schema canônico de série** — um nome de
campo só (`value`), unidade e granularidade explícitas, `id` no arquivo — e a **ordem de
deploy** entre os repos deixa de poder derrubar o gráfico em produção.

**Arquitetura:** o `dados/` é a fonte dos valores, da unidade, da granularidade e da fonte
(§6). O `sitio/indicators.json` fica só com **curadoria de apresentação** — agrupamento,
`chartType`, título do eixo, cores, escape hatch de comparabilidade.

**Stack:** notebooks Colab (execução **manual** — a automação está fora de escopo) + JSON.

**Spec:** `...design.md` §6 (completa) · **ADR:** D7

## Restrições globais

- **`value` substitui `rate`** (§6). "rate" é nome errado para contagem de população — foi
  assim que o campo divergiu: hoje `homicidios/` e `populacao/` usam `value`, os outros
  seis usam `rate`.
- **`schema: 1`** existe para o app **recusar em voz alta** (§6).
- **`id` no arquivo** permite o app conferir se o dado que chegou é o que ele pediu (§6).
- **`indicatorName` sai** — é texto livre que nenhum consumidor lê (§6).
- **Nada de metadado repetido nos dois lados** (§6): unidade, granularidade e fonte **saem**
  do `indicators.json` quando os notebooks passarem a publicá-las.
- **Ordem de deploy obrigatória** (§6): publicar `value` **junto** de `rate` → o app entra
  → retirar `rate`. A publicação única (`value` só) foi **rejeitada**: depende de sorte,
  não de processo.
- **Custo zero** (D6): sem serviço pago, sem chave de API.
- 🔴 **Datas duplicadas nas séries publicadas — medido em 2026-10-14, e é conserto desta
  fatia.** Quatro dos 13 arquivos têm **duas leituras no mesmo mês**:

  | arquivo | datas duplicadas |
  |---|---|
  | `caged/caged-total-mensal.json` | `1995-10-01`, `2005-10-01`, `2015-10-01` |
  | `mvgr/mvgr-nominal.json` | `2005-10-01`, `2015-10-01` |
  | `mvgr/mvgr-real.json` | `2005-10-01`, `2015-10-01` |
  | `pib/pib-real-anual.json` | `2005-01-01`, `2015-01-01` |

  **Não quebra o app** — medido no navegador com a lightweight-charts 5.2.1
  (`~/.hermes/cache/scratch/probe-datas/`): ela **aceita** `time` repetido, guarda todos os
  pontos e desenha. Mas desenha um **segmento vertical** no mesmo x, e o dado está errado: são
  duas leituras para o mesmo mês. **Decidir e consertar aqui** — provavelmente a média, ou o
  descarte da segunda leitura, com o critério escrito. Não deixar passar para a fase 3 sem
  decisão: é exatamente o tipo de coisa que sobrevive por anos porque "o gráfico funciona".
- **O risco real está nos notebooks**, não no site — é lá que mora a regressão silenciosa
  nos dados (§6).

---

### Tarefa 1: Os notebooks publicam o schema canônico (fase da convivência)

> **Nota medida (2026-10-19):** esta tarefa **não** foi executada como escrita — nenhum notebook
> ganhou célula canônica. A canonicalização foi feita por um **script único**,
> `dados/converter-schema-canonico.py` (commit `dbc0035`), que lê o JSON legado do notebook e
> regrava no schema canônico. O resultado (os 13 JSONs publicados) está correto e é o que a T2
> valida; o que muda é o **caminho**. O pipeline é: notebook → JSON legado → converter → JSON
> canônico.

**Arquivos:**
- Modificar: os 8 notebooks em `dados/` (`selic/`, `ipca/`, `igp-m/`, `pib/`, `mvgr/`,
  `caged/`, `populacao/`, `homicidios/`)

**Interfaces:**
- Consome: a API pública já usada (SGS/BCB, IBGE, IPEAdata).
- Produz: 13 JSONs no formato:

```json
{
  "schema": 1,
  "id": "selic-meta-acum-12m",
  "unit": { "type": "percentage", "symbol": "%", "decimals": 2 },
  "granularity": "monthly",
  "source": "Banco Central do Brasil",
  "data": [ { "date": "1999-03-31", "value": 44.22 } ]
}
```

- [ ] **Passo 1: acrescentar a célula de publicação canônica a cada notebook**

Acrescentar ao final de cada notebook uma célula que **transforma o que já foi computado** —
sem tocar no cálculo dos valores:

```python
# --- Publicação canônica (spec §6, emenda D7) ---
import json

SAIDA = {
    "schema": 1,
    "id": "selic-meta-acum-12m",                       # == nome do arquivo, sem .json
    "unit": {"type": "percentage", "symbol": "%", "decimals": 2},
    "granularity": "monthly",                          # daily | monthly | annual
    "source": "Banco Central do Brasil",
}

def publicar(dados, caminho):
    """dados: lista de (data_iso, valor). Durante a transição, publica rate E value."""
    pontos = sorted(
        [{"date": d, "rate": v, "value": v} for d, v in dados],   # convivência (§6)
        key=lambda p: p["date"],
    )
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump({**SAIDA, "data": pontos}, f, ensure_ascii=False, indent=2)
    print(f"{caminho}: {len(pontos)} pontos")

publicar(serie, "selic-meta-acum-12m.json")
```

Ajustar `id`, `unit` (tipo, símbolo, casas), `granularity` e `source` por família — os
valores estão na tabela abaixo, transcritos do anexo medido da spec.

- [ ] **Passo 2: a tabela de metadados por arquivo**

| id | type | symbol | decimals | granularity | source |
|---|---|---|---|---|---|
| `selic-meta-acum-12m` | percentage | `%` | 2 | monthly | Banco Central do Brasil |
| `selic-over-acum-12m` | percentage | `%` | 2 | monthly | Banco Central do Brasil |
| `ipca-acum-12m` | percentage | `%` | 2 | monthly | IBGE |
| `igpm-acum-12m` | percentage | `%` | 2 | monthly | FGV |
| `pib-real-anual` | percentage | `%` | 2 | annual | IBGE |
| `mvgr-nominal` | currency | `R$` | 2 | monthly | IPEAdata |
| `mvgr-real` | currency | `R$` | 2 | monthly | IPEAdata |
| `caged-total-mensal` | number | `vínculos` | 0 | monthly | Ministério do Trabalho |
| `populacao-total-anual` | number | `hab.` | 0 | annual | IBGE |
| `populacao-variacao-anual` | percentage | `%` | 2 | annual | IBGE |
| `homicidios-anual` | number | `por 100 mil` | 2 | annual | IPEA/Atlas da Violência |
| `homicidios-armas-fogo-anual` | number | `por 100 mil` | 2 | annual | IPEA/Atlas da Violência |
| `proporcao-homicidios-armas-fogo-anual` | percentage | `%` | 2 | annual | IPEA/Atlas da Violência |

> **Conferir `source` contra o que o site já declara** (`indicators.json` tem um campo
> `source` por indicador). Onde divergir, **decidir qual está certo** e registrar — não
> copiar um por cima do outro em silêncio.

- [ ] **Passo 3: corrigir os meses duplicados da MVG-R**

**Achado medido (2026-10-14):** `mvgr-nominal` e `mvgr-real` têm **259 pontos para 257
meses** — **2005-10** e **2015-10** aparecem **duas vezes** cada. É dado, não erro do
modelo. Na célula `publicar`, o `sorted` não resolve duplicata: acrescentar a checagem:

```python
def publicar(dados, caminho):
    meses = {}
    for d, v in dados:
        if d[:7] in meses:
            print(f"AVISO: mês repetido {d[:7]} em {caminho} — mantendo o último valor")
        meses[d[:7]] = (d, v)
    pontos = sorted(({"date": d, "rate": v, "value": v} for d, v in meses.values()),
                    key=lambda p: p["date"])
    ...
```

> ⚠️ **Isto muda números medidos na spec.** A MVG-R no Lula I passa de **35 pontos** para
> **34**, e a matriz da §7.3/anexo muda em duas células. **Depois de republicar, reexecutar
> a medição** (fatia 03, `mandates.medicao.test.js`) e **atualizar a spec** com os números
> novos e a data. Número medido, não estimado — inclusive quando muda.

- [ ] **Passo 4: reexecutar os notebooks e conferir a forma**

Run (após reexecutar no Colab e commitar os JSONs):
```bash
cd dados
python3 - <<'PY'
import json, glob
for f in sorted(glob.glob('*/*.json')):
    d = json.load(open(f))
    faltando = [k for k in ('schema','id','unit','granularity','source','data') if k not in d]
    chaves = sorted({k for p in d['data'] for k in p})
    print(f"{f:55s} schema={d.get('schema')} id={d.get('id')} chaves={chaves} faltando={faltando}")
PY
```

**Esperado:** `schema=1`, `id` igual ao nome do arquivo, `chaves=['date','rate','value']`,
`faltando=[]` nos 13 arquivos.

- [ ] **Passo 5: commitar e publicar (FASE 1 da ordem de deploy)**

```bash
cd dados
git add . && git commit -m "feat(dados): publica o schema canonico de serie, com value junto de rate"
git push origin main
```

**Este push é o passo 1 da ordem de deploy** (§6). Só depois dele o `sitio` pode publicar
o app.

---

### Tarefa 2: O teste de integração contra os 13 arquivos reais

**Arquivos:**
- Criar: `sitio/app/src/data/integracao.test.js`

**Interfaces:**
- Consome: `validateSeries` (fatia 01) e os 13 arquivos reais em `dados/`.
- Produz: a prova de que o contrato publicado **é** o contrato que o app valida. É o teste
  que a fatia 01 adiou (lá, as séries ainda publicavam `rate`).

- [ ] **Passo 1: escrever o teste**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSeries } from './validate.js';

const raiz = fileURLToPath(new URL('../../../../dados', import.meta.url));

function arquivosDeSerie() {
  const out = [];
  for (const fam of readdirSync(raiz, { withFileTypes: true })) {
    if (!fam.isDirectory()) continue;
    for (const f of readdirSync(join(raiz, fam.name)).filter((n) => n.endsWith('.json'))) {
      out.push({ familia: fam.name, arquivo: f, caminho: join(raiz, fam.name, f) });
    }
  }
  return out;
}

describe('o contrato publicado em dados/ é o que o app valida (§6)', () => {
  it('os 13 arquivos passam em validateSeries, com id == nome do arquivo', () => {
    const arquivos = arquivosDeSerie();
    expect(arquivos).toHaveLength(13);
    for (const { arquivo, caminho } of arquivos) {
      const id = arquivo.replace(/\.json$/, '');
      const serie = validateSeries(JSON.parse(readFileSync(caminho, 'utf8')), { expectedId: id });
      expect(serie.data.length).toBeGreaterThan(0);
    }
  });

  it('nenhuma série tem mês repetido (o defeito da MVG-R, corrigido)', () => {
    for (const { arquivo, caminho } of arquivosDeSerie()) {
      const bruto = JSON.parse(readFileSync(caminho, 'utf8'));
      const meses = bruto.data.map((p) => p.date.slice(0, 7));
      expect(new Set(meses).size, `${arquivo} tem mês repetido`).toBe(meses.length);
    }
  });
});
```

- [ ] **Passo 2: rodar**

Run: `cd sitio/app && npm test`
**Esperado:** verde. Vermelho aqui significa que o `dados` publicado e o contrato do app
divergiram — **não** afrouxar o teste.

- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/data/integracao.test.js
git commit -m "test(data): valida os 13 arquivos reais contra o contrato canonico"
```

---

### Tarefa 3: Tirar o metadado duplicado do `indicators.json` (§6)

> 🔴 **SUPERSEDIDA (2026-10-19) — NÃO EXECUTAR.** A `unit` **fica** no `indicators.json`. A **§12.1**
> é emenda posterior à §6 e é a autoridade: o **distintivo de escala tem de renderizar ANTES de a
> série carregar**, e para isso o app lê a unidade do próprio registry (medido: os 13 registros têm
> `unit`, e é o que a fatia 05 usa). Remover a `unit` apagaria o distintivo **em silêncio**.
> O `comparabilidade` também **não** entra à mão: a **§5** diz que ele é **função pura dos dados**,
> não campo curado (spec, l.276). O `granularity` do registry é rótulo de exibição
> ("Acumulado 12 meses"), **não** o enum da série (`monthly`) — não é duplicata, e o rename para
> `granularityLabel` fica **fora** (churn sem ganho).
>
> Registrado no ledger do plano: `.superpowers/sdd/11-migracao-do-repo-dados/progress.md`.

**Arquivos:**
- Modificar: `sitio/indicators.json`

**Interfaces:**
- Consome: os notebooks já publicando `unit`/`granularity`/`source` (tarefa 1).
- Produz: o registro só com **curadoria de apresentação**.

- [ ] **Passo 1: remover `unit` de cada indicador**

O app lê a unidade da **série carregada** (fatias 05 e 08 já fazem isso). Remover `unit`
dos 13 registros. `source` e a string humana de `granularity` **também são candidatos** —
mas decidir com cuidado:

- `source` **sai** (§6 atribui fonte ao `dados/`), e o app a exibe a partir da série.
- `granularity` no `indicators.json` é uma string de exibição ("Acumulado 12 meses"), que
  **não** é o enum da série (`monthly`). Não é a mesma informação — **manter**, mas
  renomear para `granularityLabel` para não parecer duplicata.
- `description` é curadoria editorial do site — **mantém**.
- `yAxisTitle` é apresentação — **mantém**.
- `comparabilidade` (o escape hatch da §6) — **acrescentar vazio** se ainda não existir.

- [ ] **Passo 2: rodar o teste que valida o catálogo real**

Run: `cd sitio/app && npm test`
**Esperado:** verde — a fatia 01 foi escrita para aceitar `unit` ausente.

- [ ] **Passo 3: commitar**

```bash
cd sitio && git add indicators.json
git commit -m "refactor(registry): tira o metadado de serie do indicators.json, que agora so faz curadoria"
```

---

### Tarefa 4: A retirada de `rate` (FASE 3 da ordem de deploy)

> 🔴 **Correção medida em 2026-10-19:** os notebooks **não** têm célula de publicação canônica
> (`grep 'schema'` nos 7 `*.ipynb` = **0**). Eles seguem escrevendo o shape **legado**
> (`indicatorName` + `rate`), e quem canonicaliza é o script único
> **`dados/converter-schema-canonico.py`** (commit `dbc0035` do repo `dados`). O alvo desta tarefa é
> a função `_dedupe` dele — não um notebook.
>
> **A pré-condição do Passo 0 foi dispensada pelo usuário em 2026-10-19** (nada será enviado). A
> consequência fica registrada: no push, `dados` (só `value`) tem de sair **antes** de `sitio`, e a
> página ANTIGA — que lê `rate` — quebra na janela entre os dois.

- [ ] **Passo 1: o converter publica só `value`**

```python
# dados/converter-schema-canonico.py, _dedupe (~l.109)
# de:
({"date": d, "rate": v, "value": v} for d, v in meses.values())
# para:
({"date": d, "value": v} for d, v in meses.values())
```

⚠️ **`_valor()` NÃO muda** (l.94-96): é ele que lê o `rate` do JSON legado que o notebook escreve.
Atualizar o docstring do módulo ("Fase da convivência") e documentar o pipeline.

- [ ] **Passo 2: republicar os 13 arquivos e conferir**

```bash
cd dados
python3 converter-schema-canonico.py
grep -c '"rate"' */*.json      # tem de dar 0 em TODOS os 13
```

Nenhum **valor** muda; a contagem de pontos por arquivo é a mesma.

- [ ] **Passo 3: confirmar que nada regrediu**

Run: `cd sitio/app && NODE_ENV=development npm test` — o teste de integração (tarefa 2) continua
verde, agora com um campo só.

- [ ] **Passo 4: commitar** (no repo `dados`; **sem `git push`**)

```bash
cd dados
git add converter-schema-canonico.py */*.json
git commit -m "refactor(dados): retira rate; o contrato publicado fica so com value"
```

---

## Critérios de aceite da fatia 11

- [ ] Os **13 arquivos** têm `schema: 1`, `id` igual ao nome do arquivo, `unit`,
      `granularity`, `source` e `data` — verificado por script, não por inspeção.
- [ ] **Nenhum arquivo tem mês repetido** (a MVG-R foi corrigida) e a spec foi atualizada
      com os números novos e a data.
- [ ] `grep -rn "indicatorName" dados/` → **sem resultado** (§6).
- [ ] O teste de integração do `sitio` valida os 13 arquivos reais e passa.
- [ ] O `indicators.json` **não tem mais `unit` nem `source`**; tem `comparabilidade`
      disponível como escape hatch (§6).
- [ ] A ordem de deploy foi respeitada: `value` publicado **antes** do app entrar, e `rate`
      retirado **depois**.
- [ ] Nenhuma mudança de **valor** nos dados além da deduplicação — a migração é de
      **forma**, e qualquer diferença numérica é bug.

## Auto-revisão

- **Cobertura da spec:** §6 (schema canônico, `value`, `schema: 1`, `id`, `indicatorName`
  fora) → tarefa 1; §6 (propriedade dos campos, sem duplicação) → tarefa 3; §6 (transição
  por convivência de chaves e ordem de deploy) → tarefas 1 e 4; §6 (risco nos notebooks)
  → a tarefa 1 é onde ele é atacado.
- **Fora de escopo, declarado:** **automatizar** o pipeline (Actions em vez de notebooks
  Colab manuais) — a ADR deixa isso explicitamente fora. Este plano mexe nos notebooks
  **manuais**.
- **Achado medido que este plano propaga:** os meses duplicados da MVG-R — que **mudam
  números que a spec já publicou** (35 → 34 pontos no Lula I). Corrigir e **atualizar a
  spec** é parte do critério de aceite, não um efeito colateral.
- **Consistência de nomes:** os `id` da tabela da tarefa 2 são exatamente os que o
  `indicators.json` usa e os que as fatias 02–03 usam como fixture — um id divergente
  quebra o teste de integração, que é o ponto.

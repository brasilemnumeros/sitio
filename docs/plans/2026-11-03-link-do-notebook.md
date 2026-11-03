# Link para o notebook na ficha — plano de implementação

> **Para quem executa:** siga as tarefas na ordem. Cada tarefa termina com teste verde. O
> desenho aprovado está em `docs/specs/2026-11-03-link-do-notebook-design.md`.

**Objetivo:** a ficha de cada indicador leva ao notebook que gera a série, e o catálogo é a
fonte do endereço; os notebooks recuperam o selo "Open in Colab".

**Arquitetura:** `urlNotebook` obrigatório no catálogo (`dados`), conferido por `K9` no
`validar.py` e por `validateCatalog` no app. A ficha renderiza o link sem depender do fetch da
série. Os selos do Colab são a primeira célula de markdown de cada notebook.

**Stack:** Python 3.12 + pytest (`dados`), Svelte 5 + Vitest + Playwright (`sitio`).

**Spec:** `docs/specs/2026-11-03-link-do-notebook-design.md`

## Restrições globais

- Chaves em português; `urlNotebook` é a única chave nova.
- `versao` do catálogo continua `1`.
- Nada de fallback silencioso: campo ausente/inválido vira erro em voz alta.
- Não executar notebook; só inserir célula de markdown.
- A árvore dos dois repos tem trabalho não commitado do usuário (C15, `marcadores.js`). **Não
  commitar** nesta execução; ao final, listar os arquivos tocados para ele separar.

## Review Focus

- URL com acento (`População.ipynb`): precisa funcionar percent-encoded no selo, no catálogo e
  na conferência contra o disco (`unquote`).
- Catálogo antigo (sem `urlNotebook`) servido a um app novo: deve falhar em voz alta, não
  esconder o link.
- `http://` ou caminho fora de `indicadores/`: deve reprovar no `K9` e no `validateCatalog`.
- Indicador cuja série falha ao carregar: o link do notebook continua visível.
- Tipo errado (`urlNotebook` número/objeto): mensagem nomeia o campo, sem `TypeError`.

---

### Task 1: `K9` no validador do `dados`

**Arquivos:**
- Modificar: `dados/scripts/validar.py` (constantes no topo + `validar_catalogo`)
- Testar: `dados/tests/test_validar.py`

**Interfaces:**
- Produz: `PREFIXO_NOTEBOOK = "https://github.com/brasilemnumeros/dados/blob/main/indicadores/"`
  e `REGRA_NOTEBOOK` (regex `[a-z0-9-]+/[^/]+\.ipynb`); `validar_catalogo` passa a emitir `K9`.

- [ ] **Step 1: escrever os testes que falham** em `tests/test_validar.py`

Adicionar `catalogo_url_notebook: object = "https://github.com/brasilemnumeros/dados/blob/main/indicadores/ipca/IPCA.ipynb"`
a `montar_raiz`, incluir a chave em `entrada`, e os testes:

```python
def test_catalogo_sem_url_notebook(tmp_path):
    montar_raiz(tmp_path, catalogo_url_notebook=None)
    assert any(e.startswith("K9") and "urlNotebook" in e for e in validar_catalogo(tmp_path))


def test_catalogo_url_notebook_nao_https(tmp_path):
    montar_raiz(tmp_path, catalogo_url_notebook="http://github.com/x/IPCA.ipynb")
    assert any(e.startswith("K9") for e in validar_catalogo(tmp_path))


def test_catalogo_url_notebook_inexistente(tmp_path):
    montar_raiz(tmp_path, catalogo_url_notebook=(
        "https://github.com/brasilemnumeros/dados/blob/main/indicadores/ipca/Nao.ipynb"
    ))
    assert any(e.startswith("K9") and "não existe" in e for e in validar_catalogo(tmp_path))


def test_catalogo_url_notebook_percent_encoded(tmp_path):
    pasta = tmp_path / "indicadores" / "populacao"
    pasta.mkdir(parents=True)
    (pasta / "População.ipynb").write_text("{}", encoding="utf-8")
    montar_raiz(tmp_path, catalogo_url_notebook=(
        "https://github.com/brasilemnumeros/dados/blob/main/indicadores/populacao/"
        "Popula%C3%A7%C3%A3o.ipynb"
    ))
    erros = validar_catalogo(tmp_path)
    assert not any(e.startswith("K9") for e in erros), erros
```

- [ ] **Step 2: rodar e ver falhar**

`cd dados && python3 -m pytest tests/test_validar.py -q`
Esperado: falhas em `K9` (hoje não existe).

- [ ] **Step 3: implementar**

Importar `unquote` de `urllib.parse`; constantes no topo. Em `validar_catalogo`, logo após a
conferência de `arquivo` (antes de checar o disco da série), validar `urlNotebook`:

```python
url_notebook = entrada.get("urlNotebook")
if not isinstance(url_notebook, str) or not url_notebook.startswith(PREFIXO_NOTEBOOK):
    erros.append(
        f"K9: catalogo.json: entrada {rotulo!r}: urlNotebook precisa começar em "
        f"{PREFIXO_NOTEBOOK!r}"
    )
else:
    bruto = url_notebook[len(PREFIXO_NOTEBOOK):]
    relativo = unquote(bruto)
    if not REGRA_NOTEBOOK.fullmatch(bruto) or not REGRA_NOTEBOOK.fullmatch(relativo):
        erros.append(
            f"K9: catalogo.json: entrada {rotulo!r}: urlNotebook {url_notebook!r} "
            "não termina em <familia>/<arquivo>.ipynb"
        )
    elif not (pasta / relativo).is_file():
        erros.append(
            f"K9: catalogo.json: entrada {rotulo!r}: notebook {relativo!r} não existe"
        )
```

Atualizar o docstring de `validar_catalogo` para `K1…K9`.

- [ ] **Step 4: rodar e ver passar**

`cd dados && python3 -m pytest tests/test_validar.py -q`

---

### Task 2: catálogo com `urlNotebook` + selos do Colab

**Arquivos:**
- Modificar: `dados/indicadores/catalogo.json` (12 entradas)
- Modificar: `dados/indicadores/*/*.ipynb` (8 arquivos, primeira célula)
- Criar: `dados/tests/test_notebooks.py`
- Modificar: `dados/AGENTS.md` (seção do catálogo + selo)

**Interfaces:**
- Produz: cada entrada do catálogo com `urlNotebook` canônico; cada notebook com a célula
  `{"cell_type":"markdown","metadata":{"id":"view-in-github","colab_type":"text"},...}`.

- [ ] **Step 1: teste do selo (falha primeiro)** em `tests/test_notebooks.py`

```python
import json
from pathlib import Path
from urllib.parse import quote

RAIZ = Path(__file__).resolve().parents[1] / "indicadores"
PREFIXO = "https://colab.research.google.com/github/brasilemnumeros/dados/blob/main/indicadores/"


def test_todo_notebook_tem_selo_do_colab():
    notebooks = sorted(RAIZ.glob("*/*.ipynb"))
    assert notebooks, "nenhum notebook encontrado"
    for caminho in notebooks:
        nb = json.loads(caminho.read_text(encoding="utf-8"))
        primeira = nb["cells"][0]
        fonte = "".join(primeira.get("source", []))
        relativo = caminho.relative_to(RAIZ).as_posix()
        esperado = PREFIXO + quote(relativo)
        assert primeira["cell_type"] == "markdown", caminho
        assert primeira.get("metadata", {}).get("id") == "view-in-github", caminho
        assert esperado in fonte, f"{caminho}: selo aponta para {fonte!r}"
        assert "colab-badge.svg" in fonte, caminho
```

- [ ] **Step 2: rodar e ver falhar**

`cd dados && python3 -m pytest tests/test_notebooks.py -q`

- [ ] **Step 3: inserir os selos** com um script avulso (não versionado), preservando o formato:
  `json.dumps(nb, indent=1, ensure_ascii=False) + "\n"` reproduz o arquivo atual byte a byte.
  A célula é a do desenho, com `href` = `PREFIXO + quote(relativo)`.

- [ ] **Step 4: preencher `urlNotebook`** nas 12 entradas conforme o mapa família → notebook:

| família | notebook | entradas |
|---|---|---|
| `selic` | `selic/Selic.ipynb` | `selic-meta`, `selic-over-acum-12m` |
| `ipca` | `ipca/IPCA.ipynb` | `ipca-acum-12m` |
| `igp-m` | `igp-m/IGP-M.ipynb` | `igpm-acum-12m` |
| `pib` | `pib/PIB.ipynb` | `pib-real-anual` |
| `mvgr` | `mvgr/MVG-R.ipynb` | `mvgr-nominal`, `mvgr-real` |
| `caged` | `caged/CAGED.ipynb` | `caged-total-mensal` |
| `populacao` | `populacao/População.ipynb` | `populacao-total-anual`, `populacao-variacao-anual` |
| `homicidios` | `homicidios/Homicidios.ipynb` | `homicidios-anual`, `homicidios-armas-fogo-anual`, `proporcao-homicidios-armas-fogo-anual` |

URL: `https://github.com/brasilemnumeros/dados/blob/main/indicadores/<caminho>` (com
percent-encoding em `População`).

- [ ] **Step 5: validar o repo inteiro**

`cd dados && python3 scripts/validar.py && python3 -m pytest -q`

---

### Task 3: `validateCatalog` exige `urlNotebook`

**Arquivos:**
- Modificar: `sitio/app/src/data/catalog.js` (typedef + validação)
- Testar: `sitio/app/src/data/catalog.test.js`

**Interfaces:**
- Produz: entrada validada com `urlNotebook` string `https://` preservada.

- [ ] **Step 1: teste (falha primeiro)**

No fixture `catalogoMinimo.indicadores[0]`, adicionar
`urlNotebook: 'https://github.com/brasilemnumeros/dados/blob/main/indicadores/selic/Selic.ipynb'`,
atualizar o `toEqual` e acrescentar:

```js
it('exige urlNotebook https', () => {
  const sem = { ...catalogoMinimo, indicadores: [{ ...catalogoMinimo.indicadores[0] }] };
  delete sem.indicadores[0].urlNotebook;
  expect(() => validateCatalog(sem)).toThrow(/urlNotebook/);

  const http = {
    ...catalogoMinimo,
    indicadores: [{ ...catalogoMinimo.indicadores[0], urlNotebook: 'http://x/Selic.ipynb' }],
  };
  expect(() => validateCatalog(http)).toThrow(/urlNotebook/);
});
```

- [ ] **Step 2: rodar e ver falhar**

`cd sitio/app && NODE_ENV=development npm test -- catalog.test.js`

- [ ] **Step 3: implementar** em `validateCatalog`, depois de `descricao`/antes de devolver:

```js
if (typeof ind.urlNotebook !== 'string' || !/^https:\/\/\S+$/.test(ind.urlNotebook)) {
  throw new SchemaError(
    `${where} (${ind.id}): urlNotebook deve ser uma URL https, veio ${JSON.stringify(ind.urlNotebook)}`
  );
}
```

Adicionar `@property {string} urlNotebook` ao typedef `CatalogEntry`.

- [ ] **Step 4: rodar e ver passar**

`cd sitio/app && NODE_ENV=development npm test -- catalog.test.js`

---

### Task 4: integração confere o notebook no disco

**Arquivos:**
- Modificar: `sitio/app/src/data/integracao.test.js`

- [ ] **Step 1: teste (falha primeiro)**

```js
const PREFIXO_NOTEBOOK =
  'https://github.com/brasilemnumeros/dados/blob/main/indicadores/';

it('todo urlNotebook aponta para notebook existente em dados/indicadores', () => {
  for (const ind of catalogo().indicadores) {
    expect(ind.urlNotebook?.startsWith(PREFIXO_NOTEBOOK), ind.id).toBe(true);
    const relativo = decodeURIComponent(ind.urlNotebook.slice(PREFIXO_NOTEBOOK.length));
    expect(existsSync(join(RAIZ_SERIES, relativo)), `${ind.id}: ${relativo}`).toBe(true);
  }
});
```

Importar `existsSync`.

- [ ] **Step 2: rodar e ver falhar** (antes do catálogo da Task 2 estar no disco)
- [ ] **Step 3: rodar de novo depois da Task 2** e ver passar:

`cd sitio/app && NODE_ENV=development npm test -- integracao.test.js`

---

### Task 5: link na ficha + E2E

**Arquivos:**
- Modificar: `sitio/app/src/components/Ficha.svelte`
- Modificar: `sitio/app/e2e/busca.spec.js`

**Interfaces:**
- Consome: `indicador.urlNotebook` (Task 3).

- [ ] **Step 1: E2E (falha primeiro)** no primeiro teste de `busca.spec.js`, depois de
  `await expect(ficha).toContainText(/IPCA/)`:

```js
const notebook = ficha.getByRole('link', { name: /Ver o notebook que gera estes dados/ });
await expect(notebook).toHaveAttribute(
  'href',
  'https://github.com/brasilemnumeros/dados/blob/main/indicadores/ipca/IPCA.ipynb'
);
await expect(notebook).toHaveAttribute('target', '_blank');
```

- [ ] **Step 2: implementar** em `Ficha.svelte`, logo após `{#if indicador.descricao}…{/if}`:

```svelte
<a
  href={indicador.urlNotebook}
  target="_blank"
  rel="noopener noreferrer"
  class="mt-2 inline-block text-xs text-sky-700 underline hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
>
  Ver o notebook que gera estes dados <span aria-hidden="true">↗</span><span class="sr-only"> (abre em nova aba)</span>
</a>
```

- [ ] **Step 3: regenerar o CSS do dev/E2E**

`cd sitio && npm run css`

- [ ] **Step 4: rodar o E2E da busca**

`cd sitio/app && NODE_ENV=development npm run test:e2e -- busca.spec.js`
Antes, conferir que a porta 5173 está livre (ou usar o servidor que já está no ar).

---

### Task 6: contrato, AGENTS e cadeia completa

**Arquivos:**
- Modificar: `sitio/docs/contrato-de-indicadores.md` (forma, tabela de chaves, `K9`, regra de
  corte, compatibilidade)
- Modificar: `sitio/AGENTS.md` (menção ao link na ficha e ao campo)
- Modificar: `dados/AGENTS.md` (feito na Task 2)

- [ ] **Step 1: atualizar o contrato** — `urlNotebook` na forma e na tabela; linha `K9`; nota de
  que a URL é a exceção de proveniência no catálogo; ordem de publicação (catálogo antes do app).
- [ ] **Step 2: atualizar `AGENTS.md`** do `sitio` na seção do app (link da ficha).
- [ ] **Step 3: rodar a cadeia completa**

```bash
cd datos && python3 scripts/validar.py && python3 -m pytest -q
cd sitio/app && NODE_ENV=development npm test
cd sitio && npm run css
cd sitio/app && NODE_ENV=development npm run test:e2e
cd sitio && npm run build
cd sitio && npm run test:analytics
```

- [ ] **Step 4: reportar** a saída de cada comando e a lista de arquivos tocados (sem commit).

## Autoconferência do plano

- Cobertura do desenho: catálogo (Tasks 1–2), app (3), integração (4), ficha (5), selos (2),
  docs/ordem (6). Sem lacuna.
- Tipos: `urlNotebook` é string em todas as camadas; `PREFIXO_NOTEBOOK` idêntico em Python, JS
  e selo.
- Review Focus: acento (K9 + teste percent-encoded), catálogo antigo (validação obrigatória),
  `http://` (K9 + unit), série com erro (link fora do bloco `ok`), tipo errado (K9/validador).

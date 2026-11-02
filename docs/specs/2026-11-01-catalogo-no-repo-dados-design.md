# Catálogo de indicadores mora no repo `dados`; o sitio busca em runtime

**Data:** 2026-11-01 · **Tamanho:** projeto · **Emenda:** contrato de indicadores (§"Catálogo ×
série") + o mapa de dados do `sitio/AGENTS.md`.

## O problema

Hoje a informação de um indicador está partida em dois repositórios:

- **`dados/indicadores/<familia>/<id>.json`** diz o que o número é: `unidade`, `eixo`, `medida`,
  `granularidade`, `fonte`, `urlFonte`, `dados`.
- **`sitio/app/src/data/indicadores.json`** diz como ele aparece: `nome`, `grupo`, `escala`,
  `descricao`, `arquivo`.

Consequências medidas:

1. **Indicador novo custa edição nos dois repos.** Hoje são 4 arquivos: a série, a entrada do
   catálogo e os `toHaveLength(13)` de `integracao.test.js` e `catalog.test.js`.
2. **Um campo duplicado pode divergir:** `escala` (catálogo) × `unidade.tipo` (série). Já
   divergiu em 8 de 13 registros antes de 2026-11-01; hoje há um teste só para isso.
3. **Uma reexecução de notebook não pode carregar curadoria:** os notebooks do `dados` escrevem
   o arquivo inteiro do zero, então `nome`/`descricao` nunca podem morar lá sem ser
   hardcoded em 8 Colab notebooks.

**Objetivo:** publicar um indicador no repo `dados` e ele aparecer no site — sem editar o
sitio, sem rebuild e sem deploy do sitio.

## A decisão

**O catálogo passa a morar no repo `dados` (`indicadores/catalogo.json`) e o app o busca em
runtime**, do mesmo origin de onde já busca as séries. Nada de catálogo embutido no bundle.

Isso resolve os dois incômodos de uma vez: há **um** lugar para editar (o `dados`), no mesmo
commit da série, e a duplicata `escala` fica sob guarda automática em vez de depender de
alguém lembrar.

**Custo assumido:** o boot ganha uma ida à rede (~1 request de ~2 KB) antes de resolver o
preset do dia. Em troca, indicador publicado aparece no próximo acesso, sem deploy.

## O que fica no catálogo e o que fica na série

A linha de corte é **o que a tela precisa mostrar ANTES de baixar o dado**. O resto é da série.

| Campo | Onde | Por quê |
|---|---|---|
| `id` | catálogo **e** série | Chave pública (`?series=`). O contrato C2 garante `id` == nome do arquivo, então o par não pode divergir. |
| `nome` | catálogo | Curadoria editorial ("Taxa Selic Meta (%)"). É o rótulo da lista, da legenda e da ficha **antes** do dado chegar. |
| `grupo` | catálogo | Navegação da busca. Um indicador pertence a um grupo; o grupo não é propriedade do número. |
| `escala` | catálogo | Distintivo da lista (§12.1), exibido **antes** do dado. Classe derivada de `unidade.tipo` — por isso é conferida, não deduzida. |
| `descricao` | catálogo | Uma frase sobre o dado, mostrada no topo da ficha antes de carregar. Sai do sitio, onde mora hoje. |
| `arquivo` | catálogo | `familia/arquivo.json`. Host estático não lista diretório: o caminho tem de ser declarado. Conferido contra o disco. |
| `unidade` (tipo, símbolo, casas, idioma) | série | Formatação do valor. Só é usada **depois** do dado; é o dono único do `tipo` (o `escala` do catálogo é cópia declarada, com guarda). |
| `eixo`, `medida` | série | Comparabilidade e significado do número (C4, C5). Nada na lista depende disso. |
| `granularidade`, `fonte`, `urlFonte` | série | Proveniência e régua de cobertura; a ficha já os lê da série sob demanda. |
| `dados` | série | O dado. |

**Regra de bolso:** se a lista, o distintivo ou o cabeçalho da ficha precisam do valor antes de
o dado chegar, mora no catálogo; se descreve o número, mora na série. Nenhum campo novo entra
nos dois — a única duplicata estrutural é `escala` ↔ `unidade.tipo`, e ela reprova o commit
quando diverge (ver Validação).

Também mora no catálogo o mapa **`grupos`** (`id` → `nome` com emoji). A ordem de declaração é
a ordem de navegação: hoje é isso que a busca usa (`Object.entries(grupos)`), e continua sendo.
Assim, um grupo novo também não exige edição no sitio.

## Forma do arquivo

`dados/indicadores/catalogo.json` — irmão das pastas de família, na profundidade que o
`validar.py` **não** varre como série (`indicadores/*/*.json`):

```json
{
  "versao": 1,
  "grupos": {
    "monetario": { "nome": "🏦 Política Monetária" },
    "inflacao": { "nome": "📈 Inflação" }
  },
  "indicadores": [
    {
      "id": "selic-meta",
      "nome": "Taxa Selic Meta (%)",
      "grupo": "monetario",
      "escala": "percentual",
      "descricao": "Taxa básica de juros da economia brasileira definida pelo Banco Central, acumulada nos últimos 12 meses",
      "arquivo": "selic/selic-meta.json"
    }
  ]
}
```

Igual ao catálogo atual, sem mudança de chave: a migração é mover o arquivo e o dono.

URL publicada: `https://brasilemnumeros.github.io/dados/indicadores/catalogo.json`. O app a
monta como `${__BASE_DADOS__}/catalogo.json` — a mesma base que já resolve as séries, em dev
(`/dados/indicadores`) e em produção.

## Fluxo de adicionar um indicador

| | Antes | Depois |
|---|---|---|
| 1 | `dados`: notebook + `<id>.json` | `dados`: notebook + `<id>.json` |
| 2 | `dados`: commit (hook valida a série) | `dados`: entrada em `catalogo.json` (6 linhas) |
| 3 | `sitio`: entrada em `indicadores.json` (6 campos) | `dados`: **PR** — CI roda contrato + conferência cruzada |
| 4 | `sitio`: dois `toHaveLength(13)` | merge → Pages publica |
| 5 | `sitio`: build + deploy | — (aparece no próximo acesso, em até ~10 min) |

Renomear, reescrever a descrição ou mudar de grupo: **uma linha do catálogo**, sem tocar em
dado e sem regerar notebook — que é o que hoje não existe.

## CI do repo `dados` (novo)

O `dados` não tem CI hoje (só o hook local, que não roda em PR de quem não instalou). Como
indicador novo entra por **pull request**, o gate precisa rodar no GitHub:

`.github/workflows/validar.yml` — `on: [pull_request, push: main]`, Python na versão do
`requirements.txt`, e dois passos: `python3 scripts/validar.py` e `python3 -m pytest -q`. É o
mesmo par que o hook roda; a diferença é que agora ele vale para o PR e para o merge, sem
depender de configuração local. O hook **fica** (feedback rápido em quem commita).

Branch protection (exigir o check verde para mergear) é configuração do GitHub, não código —
fica fora do repositório e é passo de aceite.

## Validação (quatro camadas, todas em voz alta)

1. **`dados/scripts/validar.py`** — o contrato da série não muda (C1…C14). Ganha a conferência
   cruzada do catálogo, rodando no hook de pre-commit **e no CI do PR**:
   - todo `arquivo` do catálogo existe no disco; toda série do disco tem entrada;
   - `id` da entrada == `id` da série == nome do arquivo (C2);
   - `escala` == `unidade.tipo` da série;
   - `grupo` existe em `grupos`; `nome` e `descricao` não vazios; `versao` == 1.
2. **`app/src/data/catalog.js` (runtime)** — `validateCatalog` continua sendo o porteiro: forma,
   `versao`, `grupo` existente, `arquivo` casando `familia/arquivo.json`. Violação → `status:
   'error'` com a mensagem crua na tela. **Sem fallback**: catálogo quebrado não vira lista vazia.
3. **`app/src/data/integracao.test.js`** — lê `../dados` do disco e repete a conferência
   cruzada, então o build/teste do sitio reprova antes do deploy se o catálogo publicado
   estiver inconsistente com as séries. **Hoje esse teste não roda no CI:** ele resolve a raiz
   como `../../../../dados` a partir de `app/src/data/`, que localmente cai no repo irmão por
   sorte e no Actions cai em `<workspace>/dados` — enquanto o checkout do `dados` fica em
   `<workspace>/<repo>/dados`. Passa a resolver por `DADOS_DIR` (a convenção que o E2E já usa),
   e o workflow passa a variável.
4. **Ids que o sitio conhece** — `PRESETS` (11 ids em 6 presets), `EXEMPLO_IDS` em `App.svelte` e
   os `?series=` dos posts publicados são conferidos contra o catálogo no mesmo teste de
   integração. Sem isso, renomear um id no `dados` deixa de reprovar o build do sitio (o
   catálogo embutido era essa guarda) e a falha vira silenciosa: preset com uma curva a menos,
   botão de exemplo inerte, link de post sem série.

Os `toHaveLength(13)` saem: a contagem passa a vir do próprio catálogo.

## Carregamento no app

- `carregarCatalogo()` vira `async` de verdade (a assinatura já é aguardada pelo
  `iniciarPermalink`), com `status: 'idle' | 'loading' | 'ready' | 'error'`.
- **Enquanto carrega:** a lista da busca mostra **spinner** (`animate-spin`, `role="status"`,
  `aria-busy`) no lugar das linhas — a lista não tem forma para esqueleto, o tamanho é
  desconhecido. A área do gráfico mantém o `Esqueleto.svelte` que já existe (forma do conteúdo);
  não se cria um segundo idioma de carregamento para o mesmo momento.
- **`EstadoInicial` só existe com o catálogo `ready`.** Hoje a home decide pelo
  `itens.length === 0`, e com fetch isso significaria piscar o convite "comece por um exemplo" —
  com o botão inerte, porque ele resolve ids num catálogo que ainda não chegou. Enquanto
  `idle`/`loading`, a área do gráfico mostra o esqueleto.
- **Se falhar:** a busca mostra o erro cru (HTTP, rede, `SchemaError`) e não mostra lista vazia;
  a área do gráfico mostra o mesmo erro com **"tentar de novo"** (refaz só o catálogo), em vez de
  um convite que não funciona. O permalink do usuário não é reescrito (já implementado em
  `permalink-init.js`).
- O preset do dia e o `?series=` continuam resolvidos contra o catálogo carregado — nenhuma
  mudança de semântica, só de origem.

## Pré-requisitos fora do código (medidos em 2026-11-01)

Este desenho **não cria** a dependência do `dados` em produção — as séries já vêm de lá —, mas a
promessa "publicou, apareceu" só vale se o host existir. O estado real hoje:

- `https://brasilemnumeros.github.io/dados/indicadores/ipca/ipca-acum-12m.json` → **404**. O
  remote `main` do `dados` está no layout **anterior** à migração (`selic/` na raiz,
  `converter-schema-canonico.py`, `governos/`): a migração não foi publicada.
- O site no ar (`www.brasilemnumeros.ong.br`) ainda é a página **Jekyll/petite-vue**; o app
  Astro nunca subiu — o workflow de deploy falhou em todas as execuções, na etapa "Testes do app".
- Ou seja: **nada do app novo está em produção**. Decidido em 2026-11-01: publicar o `dados`
  (push do `main` + Pages) e destravar o deploy do sitio **fazem parte do aceite** desta fatia —
  não são passos de código deste repositório, mas são pré-requisito do "pronto". O CI novo do
  `dados` é o que permite publicar por PR com rede de segurança.

**Caching:** o GitHub Pages responde com `cache-control: max-age=600`, então "aparece no próximo
acesso" significa **em até ~10 minutos**, não no segundo seguinte. Fica o **cache padrão**
(decidido em 2026-11-01): o arquivo é buscado uma vez por carregamento de página, não por
indicador; `cache: 'no-store'` transformaria os 2 KB em custo por visita sem ganho perceptível.
Se os 10 minutos incomodarem depois, a troca é uma linha — `cache: 'no-cache'`.

## O que sai

- `sitio/app/src/data/indicadores.json` (arquivo e import).
- `catalogoEmbutido()` em `app/src/data/catalog.js`.
- Os `toHaveLength(13)` de `integracao.test.js` e `catalog.test.js`.
- O parágrafo do `dados-locais.js` que diz que o catálogo não passa por ali.

## O que muda

- `dados/indicadores/catalogo.json` (novo), `dados/AGENTS.md`, `dados/scripts/validar.py`,
  `dados/tests/test_validar.py` (+ corpus de catálogo, se os casos couberem lá) e
  `dados/.github/workflows/validar.yml` (novo: contrato + catálogo em PR e em `main`).
- `sitio/app/src/data/catalog.js` (fetch + validação), `app/src/stores/catalog.js` (assíncrono,
  estados), `app/src/App.svelte` (estados vazio/carregando/erro do catálogo),
  `app/src/components/SearchModal.svelte` (spinner e erro), `app/vite.config.js` (base do
  catálogo), `app/src/data/*.test.js`, `app/src/data/integracao.test.js` (`DADOS_DIR` + ids do
  sitio), `app/e2e/busca.spec.js` (spinner + erro) e `.github/workflows/github-pages.yml`
  (`DADOS_DIR` no passo de testes).
- `sitio/docs/contrato-de-indicadores.md` (seção do catálogo), `sitio/AGENTS.md` (mapa de dados e
  as três menções a "catálogo embutido"), `sitio/scripts/preparar-publico.sh` (comentário).

## Não-objetivos

- Não muda o contrato da série, o `?series=`, os presets, os grupos na tela nem a busca.
- **Sem cache em `localStorage` nesta fatia.** Cópia local traria indicador removido de volta à
  lista; mede-se o custo real do request antes de considerar.
- Não move os **governos** (seguem embutidos, decisão de 2026-11-01).

## Riscos assumidos

- **Boot +1 ida à rede.** Aceito pelo usuário; spinner cobre o intervalo.
- **O catálogo publicado tem de continuar compatível com o app no ar.** Um `versao` novo quebra
  app antigo em produção (hoje o erro apareceria na CI/rede de segurança do build). Mudar a
  versão passa a exigir deploy coordenado do sitio — registrar isso no contrato.
- **O `dados` vira dependência de runtime do site.** Já é, para toda série; a novidade é que o
  site fica sem lista se o `dados` cair, não só sem gráfico.
- **Renomear um `id` deixa de reprovar o build do sitio.** Aceito explicitamente em 2026-11-01:
  a guarda passa a ser o teste de integração (camada 4), que roda no CI do sitio — **depois** do
  merge no `dados`, não antes. Em troca, um indicador novo entra por PR no `dados` com contrato e
  catálogo verificados no CI, sem tocar no sitio.

## Decisões do construtor (para conferir na leitura)

1. `escala` continua escrito à mão no catálogo, com guarda automática. A alternativa (deduzir de
   `unidade.tipo` na hora) exigiria baixar as 13 séries para pintar o distintivo.
2. `grupos` vai junto no `catalogo.json` — é o que faz "grupo novo" também não tocar no sitio.
3. O arquivo mora em `indicadores/catalogo.json`, não na raiz do `dados`, para viajar no mesmo
   diretório publicado das séries.
4. A conferência cruzada do `dados` fica no `validar.py` (que o hook roda e o CI do PR roda), e
   não num script novo que alguém esqueça de chamar.
5. `EstadoInicial` espera o catálogo `ready`; carregando é esqueleto, erro é erro com "tentar de
   novo" — nenhum dos dois vira convite inerte.
6. O `iniciarPermalink` e o `?series=` não mudam de semântica: id desconhecido continua ignorado.
7. Cache padrão (10 min do Pages) em vez de `no-store`; a promessa é "no próximo acesso, em até
   ~10 min".
8. O CI do `dados` roda `validar.py` + `pytest` em `pull_request` e em `push: main` — o hook local
   continua como feedback rápido, não como gate único.

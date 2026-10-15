### Tarefa 3: O teste que trava a medição da §7.3

**Arquivos:**
- Teste: `sitio/app/src/domain/mandates.medicao.test.js`

**Interfaces:**
- Consome: `deltaNoMandato`, `COBERTURA`, o `federal.json` real (tarefa 1) e as séries
  reais de `dados/`.
- Produz: a prova executável de que a medição da §7.3 (15 células parciais/sem
  cobertura; MVG-R no Lula I = 35 pontos) continua verdadeira.

> **Nota:** as séries reais ainda publicam `rate` (a migração é a fatia 11). Enquanto
> isso, este teste normaliza `{date, rate}` → `{date, value}` num adaptador local do
> próprio teste. Ele vira redundante — e o adaptador sai — quando a fatia 11 entrar.

- [ ] **Passo 1: escrever o teste de medição**

```js
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COBERTURA, deltaNoMandato, pontosEsperados } from './mandates.js';

const raiz = fileURLToPath(new URL('../../../../', import.meta.url)); // = brasilemnumeros/
const governos = JSON.parse(readFileSync(join(raiz, 'dados/governos/federal.json'), 'utf8'));
const MANDATOS = governos.mandatos.filter((m) => m.rotulo !== 'FHC I'); // 8 colunas da §7.3

const GRANULARIDADE = {
  'caged-total-mensal': 'monthly',
  'homicidios-anual': 'annual',
  'homicidios-armas-fogo-anual': 'annual',
  'proporcao-homicidios-armas-fogo-anual': 'annual',
  'igpm-acum-12m': 'monthly',
  'ipca-acum-12m': 'monthly',
  'mvgr-nominal': 'monthly',
  'mvgr-real': 'monthly',
  'pib-real-anual': 'annual',
  'populacao-total-anual': 'annual',
  'populacao-variacao-anual': 'annual',
  'selic-meta-acum-12m': 'monthly',
  'selic-over-acum-12m': 'monthly',
};

function serieReal(id) {
  for (const fam of readdirSync(join(raiz, 'dados'), { withFileTypes: true })) {
    if (!fam.isDirectory()) continue;
    const dir = join(raiz, 'dados', fam.name);
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
      if (f.replace(/\.json$/, '') !== id) continue;
      const bruto = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      // Adaptador temporário: as séries ainda publicam `rate` (migração = fatia 11).
      return {
        id,
        granularity: GRANULARIDADE[id],
        data: bruto.data.map((p) => ({ date: p.date, value: p.value ?? p.rate })),
      };
    }
  }
  throw new Error(`série ${id} não encontrada em dados/`);
}

const mandato = (rotulo) => MANDATOS.find((m) => m.rotulo === rotulo);

/** A matriz do anexo da spec, transcrita (medida em 2026-10-14). 0 = sem cobertura. */
const ESPERADO = {
  'caged-total-mensal': [48, 49, 48, 48, 21, 31, 48, 32],
  'homicidios-anual': [4, 4, 4, 4, 2, 2, 4, 1],
  'homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 0],
  'proporcao-homicidios-armas-fogo-anual': [4, 4, 4, 4, 2, 2, 4, 0],
  'igpm-acum-12m': [48, 48, 48, 48, 20, 32, 48, 31],
  'ipca-acum-12m': [48, 48, 48, 48, 20, 31, 48, 30],
  'mvgr-nominal': [0, 35, 48, 48, 21, 31, 48, 31],
  'mvgr-real': [0, 35, 48, 48, 21, 31, 48, 31],
  'pib-real-anual': [4, 5, 4, 4, 3, 2, 4, 2],
  'populacao-total-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'populacao-variacao-anual': [4, 4, 4, 4, 2, 2, 4, 2],
  'selic-meta-acum-12m': [46, 48, 48, 48, 20, 32, 48, 34],
  'selic-over-acum-12m': [48, 48, 48, 48, 20, 32, 48, 34],
};

describe('medição da §7.3 sobre os dados reais', () => {
  it('reproduz a matriz de cobertura do anexo, célula a célula', () => {
    const obtido = {};
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      obtido[id] = MANDATOS.map((m) => deltaNoMandato(s, m).pontos);
    }
    expect(obtido).toEqual(ESPERADO);
  });

  it('resume a medição: 104 células, 4 sem cobertura, 1 ponto único', () => {
    const estados = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS) estados.push(deltaNoMandato(s, m).estado);
    }
    expect(estados).toHaveLength(104);
    expect(estados.filter((e) => e === COBERTURA.SEM)).toHaveLength(4);
    expect(estados.filter((e) => e === COBERTURA.PONTO_UNICO)).toHaveLength(1);
    expect(estados.filter((e) => e !== COBERTURA.SEM && e !== COBERTURA.PONTO_UNICO)).toHaveLength(99);
  });

  it('reproduz as 15 células "abaixo do esperado" da §7.3, com o mandato fechado', () => {
    // A régua é `pontos < esperados` para a granularidade da série — a mesma que a §7.3
    // publica. Comparar datas cruas marcaria 49 células (todo ponto mensal cai no dia 1º).
    const abaixo = [];
    for (const id of Object.keys(ESPERADO)) {
      const s = serieReal(id);
      for (const m of MANDATOS.filter((x) => !x.emCurso)) {
        const pontos = deltaNoMandato(s, m).pontos;
        if (pontos < pontosEsperados(s.granularity, m)) abaixo.push(`${id}|${m.rotulo}`);
      }
    }
    expect(abaixo).toHaveLength(15);
    expect(abaixo.filter((c) => c.endsWith('|Temer'))).toHaveLength(10);
    expect(abaixo).toContain('mvgr-nominal|Lula I');
    expect(abaixo).toContain('selic-meta-acum-12m|FHC II');
  });

  it('MVG-R no Lula I: o período real usado é 03/2004–12/2006', () => {
    const c = deltaNoMandato(serieReal('mvgr-nominal'), mandato('Lula I'));
    expect(c.estado).toBe(COBERTURA.PARCIAL);
    expect(c.periodo.inicio.slice(0, 7)).toBe('2004-03');
    expect(c.periodo.fim.slice(0, 7)).toBe('2006-12');
  });
});
```

> ⚠️ **Achado de qualidade de dado.** A MVG-R tem **259 pontos para 257 meses** — os meses
> **2005-10** e **2015-10** aparecem **duas vezes** cada um, e é por isso que o Lula I
> conta **35** pontos (e não 34). É **dado real, não erro do modelo** — e é o tipo de
> coisa que a fatia 11 (o notebook do `mvgr`) deve corrigir. Registrar e não "consertar"
> aqui: o modelo conta pontos, e a spec mediu 35.

- [ ] **Passo 2: rodar**

Run: `cd sitio/app && npm test`
Esperado: PASS. **Se `mvgr-nominal no Lula I` não der 35 pontos**, a medição
da spec ou o modelo de datas está errado: parar e reconciliar antes de seguir (é
exatamente o tipo de erro silencioso que esta fatia existe para pegar).

- [ ] **Passo 3: commitar**

```bash
cd sitio && git add app/src/domain/mandates.medicao.test.js
git commit -m "test(domain): trava a medicao de cobertura por mandato da spec"
```

---

## Critérios de aceite da fatia 03

- [ ] `dados/governos/index.json` e `federal.json` existem, no schema da §7.2, e
      **nenhum campo guarda cor**.
- [ ] `inicio`/`fim` são datas explícitas; nenhuma linha de código **deriva** data de
      regra ("1º de janeiro", "+4 anos").
- [ ] `git grep -n "GOVERNMENT_PERIODS\|Lula 3"` em `sitio/` → só os arquivos do legado
      que a fatia 10 vai apagar (nenhuma ocorrência nova).
- [ ] `npm test` → verdes, incluindo a medição real: a matriz de cobertura **reproduz o
      anexo da spec célula a célula** (13 × 8 = 104 células, 4 sem cobertura, 1 ponto
      único, 99 com Δ) e **as 15 células "abaixo do esperado"** da §7.3.
- [ ] A régua da cobertura é **por contagem de pontos contra o esperado da granularidade**
      (`pontosEsperados`), **não** por comparação de datas cruas — comparar datas marcaria
      49 células em vez de 15.
- [ ] `deltaNoMandato` **nunca** devolve `delta: 0` para ausência de dado (§9.4).
- [ ] `ordenarMandatos` põe o mandato em curso na ponta direita.
- [ ] **FHC I está no arquivo** (R22) e o teste da medição continua travando as 8
      colunas publicadas, filtrando FHC I explicitamente.

## Auto-revisão

- **Cobertura da spec:** §7.1 (índice + arquivo por entidade, esferas) → tarefa 1; §7.2
  (schema) → tarefa 1; §7.3.1–3 e .6 (exercício efetivo, datas explícitas, reeleição
  separada, ordenação) → tarefas 1–2; §7.3.5 (cobertura parcial generalizada + os quatro
  estados) → tarefas 2–3; §7.3.4 (sem cor) → restrição global e critério de aceite.
- **Onde a exibição mora:** a matriz e o trilho são a fatia 09; aqui só nasce o dado e a
  regra.
- **Ponto honesto em aberto:** FHC I — declarado como decisão no Passo 2 da tarefa 1, com
  o impacto nas contagens medido; os testes foram escritos para não depender do total.
- **Consistência de nomes:** `COBERTURA`, `deltaNoMandato`, `pontosNoMandato`,
  `formatarPeriodo`, `ordenarMandatos` — consumidos como estão pela fatia 09.

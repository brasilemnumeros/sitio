### Tarefa 2: Shell Svelte + a constante de schema

**Arquivos:**
- Criar: `sitio/app/src/main.js`
- Criar: `sitio/app/src/App.svelte`
- Criar: `sitio/app/src/domain/schema.js`
- Teste: `sitio/app/src/domain/schema.test.js`

**Interfaces:**
- Consome: nada.
- Produz:
  - `src/main.js` — monta `App` no elemento `#app`.
  - `src/domain/schema.js` → `export const SCHEMA_VERSION = 1`.
  - `src/App.svelte` — componente raiz (cresce nas fatias 07–09).

- [ ] **Passo 1: escrever o teste que falha**

`sitio/app/src/domain/schema.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { SCHEMA_VERSION } from './schema.js';

describe('contrato de schema', () => {
  it('declara a versão 1 — o único schema que este app entende (§6)', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});
```

- [ ] **Passo 2: rodar o teste e vê-lo falhar**

Run: `cd sitio/app && npm test`
Esperado: FALHA — `Failed to resolve import "./schema.js"`.

- [ ] **Passo 3: implementação mínima**

`sitio/app/src/domain/schema.js`:

```js
/** Versão do schema de série que este app entende (spec §6). */
export const SCHEMA_VERSION = 1;
```

- [ ] **Passo 4: rodar o teste e vê-lo passar**

Run: `cd sitio/app && npm test`
Esperado: PASS — a suíte fica verde.

- [ ] **Passo 5: montar o shell Svelte**

`sitio/app/src/main.js`:

```js
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, { target: document.getElementById('app') });

export default app;
```

`sitio/app/src/App.svelte`:

```svelte
<script>
  import { SCHEMA_VERSION } from './domain/schema.js';
</script>

<main class="mx-auto max-w-5xl p-4">
  <h1 class="text-lg font-semibold">Brasil em Números — camada de gráficos</h1>
  <p class="text-sm opacity-70">schema v{SCHEMA_VERSION} · esqueleto em construção</p>
</main>
```

- [ ] **Passo 6: commitar**

```bash
cd sitio
git add app/src
git commit -m "feat(app): shell Svelte e a constante de versao do schema"
```

---


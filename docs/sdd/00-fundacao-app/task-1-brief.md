### Tarefa 1: Projeto npm autocontido em `sitio/app/`

**Arquivos:**
- Criar: `sitio/app/package.json`
- Criar: `sitio/app/vite.config.js`
- Criar: `sitio/app/index.html`
- Modificar: `sitio/.gitignore`

**Interfaces:**
- Consome: nada.
- Produz: o diretório `sitio/app/` como raiz de um projeto Node ESM, com os scripts
  `dev`, `build`, `test`, `test:watch`.

- [ ] **Passo 1: instalar as dependências com os resolvedores (não escrever versões à mão)**

```bash
cd sitio/app 2>/dev/null || mkdir -p sitio/app && cd sitio/app
npm init -y
npm pkg set type=module name=brasil-em-numeros-app version=0.0.0 private=true
npm pkg set scripts.dev=vite scripts.build="vite build" scripts.test="vitest run" scripts.test:watch=vitest
npm install --save-dev vite @sveltejs/vite-plugin-svelte svelte vitest
```

Isso resolve as versões correntes e grava `package-lock.json` — que é **commitado**. Não
fixar versões manualmente neste passo.

- [ ] **Passo 2: escrever `sitio/app/vite.config.js`**

```js
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    // Artefato publicado em sitio/assets/js/app/ (gitignored) — §10.1
    outDir: '../assets/js/app',
    emptyOutDir: true,
    rollupOptions: {
      // Entrada de BUILD aponta para o JS: o index.html é só o shell do `vite dev`.
      // Sem isto o Vite copiaria o index.html para o outDir e ele iria ao ar como
      // shell órfão — o Jekyll lê a ÁRVORE DE TRABALHO, não o git (ruling R13).
      input: fileURLToPath(new URL('./src/main.js', import.meta.url)),
      output: {
        // Nome fixo: o HTML não precisa de manifest para descobrir o nome gerado.
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
  test: {
    // §10.7 — só unidade, sem navegador por ora.
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
```

> **R13 — o app NÃO emite CSS próprio.** Com a entrada de build no JS, o `vite build`
> emite **só `app.js`**. O `app.css` que a §10.1 menciona era o Vite seguindo o
> `<link rel="stylesheet">` do `index.html` — ou seja, era o próprio `main.dist.css` do
> site re-empacotado, não um CSS do app. O app é estilizado pelo **`main.dist.css`**
> (Tailwind sobre o site inteiro, que já varre `app/src` — é exatamente por isso que a
> §10.3 exige que `app/src` não seja ignorado, e por isso existe a classe-canário). O
> `_layouts/default.html` já carrega esse CSS. A fatia 10 **não** deve referenciar
> `app.css`.

- [ ] **Passo 3: escrever o shell de desenvolvimento `sitio/app/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Brasil em Números — app (dev)</title>
    <!-- CSS do site, gerado pelo Tailwind CLI a partir de sitio/ (§10.4):
         npx -y @tailwindcss/cli -i ./assets/css/main.css -o ./assets/css/main.dist.css -->
    <link rel="stylesheet" href="../assets/css/main.dist.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Passo 4: ignorar só o artefato de build; manter `sitio/app/src/` versionado**

Acrescentar ao final de `sitio/.gitignore`:

```
# Artefato de build do app (fatia 00) — src/ NÃO é ignorado (§10.3)
assets/js/app/
app/.vite
```

- [ ] **Passo 5: conferir que o `src/` não ficou ignorado**

Run: `cd sitio && git check-ignore -v app/src/main.js; echo "exit=$?"`
Esperado: **sem saída** e `exit=1` (não está ignorado). Se imprimir uma regra e
`exit=0`, a regra está errada — corrigir o Passo 4 antes de seguir.

- [ ] **Passo 6: commitar**

```bash
cd sitio
git add app/package.json app/package-lock.json app/vite.config.js app/index.html .gitignore
git commit -m "feat(app): projeto Vite+Svelte autocontido com build de saida fixa"
```

---


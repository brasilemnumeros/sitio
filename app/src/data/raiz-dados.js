import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Onde mora o repo `dados/` para os testes que leem o disco (§6: sem rede).
 *
 * O default é o repo IRMÃO: de `app/src/data/` são quatro níveis acima. Ele serve o
 * desenvolvimento local, mas **não** o CI — no Actions o `dados` vai para `./dados/` dentro
 * do próprio repo do sitio (o checkout não escreve fora do workspace) e o `../../../../dados`
 * resolvia para `<workspace>/dados`, um diretório que não existe. Por isso cada teste carregava
 * o caminho na mão e a integração nunca rodou lá.
 *
 * `DADOS_DIR` é a mesma convenção do `vite.config.js` (o E2E já usa): relativo ao cwd do
 * vitest, que é `app/`. No CI `DADOS_DIR: ../dados/` → `<repo>/dados`.
 */
const IRMAO = fileURLToPath(new URL('../../../../dados', import.meta.url));

/** Raiz do repo `dados/`: `DADOS_DIR` vence o repo irmão. */
export function raizDados() {
  const env = process.env.DADOS_DIR;
  return env ? resolve(process.cwd(), env) : IRMAO;
}

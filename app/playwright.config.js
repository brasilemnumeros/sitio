import { defineConfig, devices } from '@playwright/test';

/**
 * Config do Playwright (E2E de navegação). Nasceu de uma reabertura: a §10.7 decidia "E2E = não"
 * apostando que o build do CI + a classe-canário cobriam. Caiu por medição — três defeitos
 * SILENCIOSOS (Tailwind ausente, eixo duplo ausente, `setVisibleRange` lançando em gráfico vazio)
 * passaram por toda a suíte de unidade e só uma captura de tela pegou. O alvo aqui NÃO é cobertura:
 * é fazer o CI RECUSAR o que hoje só um humano vendo a tela pega.
 *
 * ⚠️ Porta separada da 5173 (já há um dev server desta sessão lá) — o config não briga com ele.
 * ⚠️ `NODE_ENV=development`: a máquina tem `NODE_ENV=production` + `npm omit=dev` no ambiente, então
 *    sem isto o `vite`/as devDependencies somem.
 */
const PORTA = Number(process.env.PW_PORTA ?? 5199);
const BASE_URL = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.artefatos',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 }, // desktop: a cascata de 3 colunas (§1.1)
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `NODE_ENV=development npx vite --port ${PORTA} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

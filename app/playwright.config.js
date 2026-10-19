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
  /**
   * Dois projetos, e o `viewport` de cada um é declarado AQUI — não herdado do descritor.
   * 🔴 Medido em 2026-10-19: `devices['Desktop Chrome']` traz `viewport: {1280, 720}`, e o `use`
   *    do projeto sobrepõe o do topo. Com o descritor sozinho o "desktop" era 1280×**720** enquanto
   *    o comentário acima prometia 900 — a config mentia, em silêncio.
   * 🔴 O celular é o `Pixel 7` (Android/Chromium) e NÃO um iPhone: o CI instala só o chromium
   *    (`playwright install --with-deps chromium`), então um descritor WebKit não sobe lá.
   *    A suíte inteira passa no celular — medido antes de fixar o projeto (ver e2e/mobile.spec.js).
   */
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `NODE_ENV=development npx vite --port ${PORTA} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

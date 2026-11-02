import { mount } from 'svelte';
import App from './App.svelte';
import { iniciarPermalink, seriesForamEscritasPeloApp } from './permalink-init.js';

// A URL COMO ELA CHEGOU, lida ANTES de qualquer escrita — e por isso mora aqui, acima do
// `iniciarPermalink()`. Quando não há `?series=`, ele aplica o PRESET DO DIA e grava os ids na
// URL (`replaceState`); alguns milissegundos depois, toda primeira visita parece um link
// compartilhado, e o tour nunca abriria. O `?series=` do tour é o de ENTRADA, não o de agora.
//
// O marcador em `sessionStorage` existe para o caso que só apareceu em 2026-11-01: o
// consentimento RECARREGA a página, e no reload o preset já está na URL. Sem o marcador, quem
// acabou de aceitar os cookies entrava como "veio de link compartilhado" e perdia o tour.
const entrouComSeries =
  new URLSearchParams(window.location.search).has('series') && !seriesForamEscritasPeloApp();

// O permalink (`/?series=<ids>`) é lido na entrada, uma vez. Não aguardamos o catálogo
// antes de montar: a store é reativa e as séries entram assim que resolvem (§5/§6).
iniciarPermalink();

const app = mount(App, { target: document.getElementById('app'), props: { entrouComSeries } });

export default app;

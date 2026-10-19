import { mount } from 'svelte';
import App from './App.svelte';
import { iniciarPermanlink } from './permalink-init.js';

// O permalink (`/?indicators=<ids>`) é lido na entrada, uma vez. Não aguardamos o catálogo
// antes de montar: a store é reativa e as séries entram assim que resolvem (§5/§6).
iniciarPermanlink();

const app = mount(App, { target: document.getElementById('app') });

export default app;

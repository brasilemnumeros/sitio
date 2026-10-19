import { writable } from 'svelte/store';

const inicial = { from: null, to: null };
const store = writable(inicial);
export const viewportStore = { subscribe: store.subscribe };

/**
 * "A janela passou a ser escolha do usuário" — um EVENTO, não estado.
 *
 * Quem escreve a janela é o ADAPTER (o eco do gráfico, §8.1) **e** as duas telas que o usuário
 * opera: o filtro de tempo e o minimapa. As duas escritas são indistinguíveis dentro da store, mas
 * só uma delas é do usuário — e é isso que o adapter precisa saber para (a) parar de re-enquadrar
 * automaticamente e (b) não deixar uma atualização de DADO mover a janela. Por isso a autoria
 * viaja como AVISO, com a forma de `viewportStore` intacta (`{from, to}` — a barra de filtros lê
 * a forma, e o eco do adapter não a declara).
 */
const ouvintesDaEscolha = new Set();

/** Registra um ouvinte; devolve a função que o remove. `doUsuario: false` avisa o CONTRÁRIO —
 * "não é uma janela, é a AUSÊNCIA dela" (o "Tudo") — e o enquadramento automático volta a valer. */
export function aoEscolherJanela(fn) {
  ouvintesDaEscolha.add(fn);
  return () => ouvintesDaEscolha.delete(fn);
}

const avisarEscolha = (doUsuario) => {
  for (const fn of ouvintesDaEscolha) fn(doUsuario);
};

/** A única escrita que o ADAPTER chama (§8.1) — nenhum componente lê a janela de volta do
 * gráfico para escrevê-la aqui. (`resetarJanela` é a outra escrita: as duas são ações nomeadas,
 * nenhuma é alcançável de fora de `stores/`.)
 *
 * ⚠ `escolhaDoUsuario` é declarado pela TELA que opera (filtro de tempo, minimapa) — nunca pelo
 * adapter, cujo eco é reação, não escolha. O aviso sai DEPOIS do `set`: quem ouve desarma o fit
 * automático, e o desenho já tem o valor novo. */
export function definirJanela({ from = null, to = null } = {}, { escolhaDoUsuario = false } = {}) {
  store.set({ from, to });
  if (escolhaDoUsuario) avisarEscolha(true);
}

/** "Tudo": volta ao intervalo completo (o adapter responde com um `fitContent`). Não é uma janela
 * escolhida — é a AUSÊNCIA dela; por isso o enquadramento automático é REARMADO e passa a incluir
 * no alcance o dado de uma série adicionada depois. */
export function resetarJanela() {
  store.set({ ...inicial });
  avisarEscolha(false);
}

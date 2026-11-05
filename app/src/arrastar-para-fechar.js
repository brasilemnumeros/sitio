import { deveFecharAoArrastar } from './domain/gesto.js';

/**
 * Ação Svelte: arrastar o grabber para baixo além do limiar fecha a folha.
 *
 * É para elementos NÃO-BOTÃO (o grabber). Num `<button>`, o navegador dispara `click` depois do
 * arrasto e o handler de clique togglaria a folha de volta — quem for usar num botão precisa
 * absorver esse clique, como `BottomDrawer` faz na alça dele.
 *
 * Não anima a folha atrás do dedo: o gesto é medido na soltura e o fechamento é o mesmo caminho
 * do "×" (uma decisão só, sem estado de arrasto espalhado).
 *
 * @param {HTMLElement} node
 * @param {{ aoFechar: () => void }} params
 */
export function arrastarParaFechar(node, { aoFechar }) {
  let inicioY = null;

  const aoPressionar = (evento) => {
    inicioY = evento.clientY;
    try {
      node.setPointerCapture(evento.pointerId);
    } catch {
      // capture é conveniência: sem ela o `pointerup` pode chegar fora do grabber e o gesto
      // é cancelado — nunca um estado preso.
    }
  };

  const aoSoltar = (evento) => {
    if (inicioY === null) return;
    const deslocamento = evento.clientY - inicioY;
    inicioY = null;
    try {
      node.releasePointerCapture(evento.pointerId);
    } catch {
      /* idem acima */
    }
    if (deveFecharAoArrastar(deslocamento)) aoFechar();
  };

  const aoCancelar = () => {
    inicioY = null;
  };

  node.addEventListener('pointerdown', aoPressionar);
  node.addEventListener('pointerup', aoSoltar);
  node.addEventListener('pointercancel', aoCancelar);

  return {
    destroy() {
      node.removeEventListener('pointerdown', aoPressionar);
      node.removeEventListener('pointerup', aoSoltar);
      node.removeEventListener('pointercancel', aoCancelar);
    },
  };
}

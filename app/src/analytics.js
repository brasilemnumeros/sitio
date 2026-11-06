/**
 * Emissão de eventos do app para o GA4 (`gtag`), que o `Analytics.astro` só cria DEPOIS do
 * consentimento LGPD. Não existe fila: sem `gtag`, o evento é DESCARTADO — guardar para depois
 * seria mandar dado de quem não consentiu assim que a permissão chegasse (AGENTS.md).
 *
 * O app é Svelte e os gatilhos são chamados de componentes, não de listeners presos ao
 * `DOMContentLoaded` — por isso não há delegação aqui.
 *
 * @param {string} nome  `object_action`, minúsculo e em inglês (`report_opened`)
 * @param {Record<string, string|number|boolean>} [parametros]  contexto enxuto, sem PII
 * @returns {boolean} `true` quando o evento saiu, `false` quando foi descartado
 */
export function registrarEvento(nome, parametros = {}) {
  const gtag = globalThis.window?.gtag;
  if (typeof gtag !== 'function') return false;
  gtag('event', nome, parametros);
  return true;
}

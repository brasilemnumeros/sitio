// Selo de cache-bust do build. Uma avaliação por build: o módulo é lido UMA vez,
// então todas as páginas emitem o mesmo `?v=`. Não volte a chamar Date.now() num
// componente — isso volta a variar por página.
export const VERSAO = Date.now();

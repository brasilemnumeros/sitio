/** Pura: {date,value} -> {time,value} no formato da lib, ordenado por tempo.
 * O tempo da lib é em SEGUNDOS UNIX UTC. O corte em 10 caracteres não é cosmético: o dado
 * já veio com hora em algum arquivo, e sem ele o fuso desloca o ponto de dia. */
export function paraPontosDaBiblioteca(data) {
  return data
    .map(({ date, value }) => ({
      time: Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / 1000),
      value,
    }))
    .sort((a, b) => a.time - b.time);
}

/** O caminho de volta, para o callback da janela visível (§8.1). */
export function paraISO(segundos) {
  return new Date(segundos * 1000).toISOString().slice(0, 10);
}

/** Pura: {data,valor} -> {time,value} no formato da lib, ordenado por tempo.
 * O tempo da lib é em SEGUNDOS UNIX UTC. O corte em 10 caracteres não é cosmético: o dado
 * já veio com hora em algum arquivo, e sem ele o fuso desloca o ponto de dia. */
export function paraPontosDaBiblioteca(dados) {
  const porTempo = new Map();
  for (const { data, valor } of dados) {
    porTempo.set(Math.floor(Date.parse(`${data.slice(0, 10)}T00:00:00Z`) / 1000), valor);
  }
  // O Map já resolve as duas coisas de uma vez: o mesmo `time` SOBRESCREVE (fica a última
  // leitura — numa república, a posterior é a revisão), e a iteração de um Map é por ordem de
  // inserção, então o `.sort` continua garantindo a ordem crescente que a lib exige em DEV.
  return [...porTempo]
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time - b.time);
}

/** O caminho de volta, para o callback da janela visível (§8.1). */
export function paraISO(segundos) {
  return new Date(segundos * 1000).toISOString().slice(0, 10);
}

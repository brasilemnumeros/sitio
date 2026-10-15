import { paraPontosDaBiblioteca, paraISO } from './points.js';

describe('paraPontosDaBiblioteca', () => {
  it('converte {date, value} para o tempo da lib (segundos UNIX UTC)', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-03-01', value: 42 },
      { date: '2004-04-01', value: 43 },
    ]);
    expect(pontos).toEqual([
      { time: 1078099200, value: 42 },
      { time: 1080777600, value: 43 },
    ]);
  });

  it('ordena por tempo — a lib exige série ordenada', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2004-04-01', value: 43 },
      { date: '2004-03-01', value: 42 },
    ]);
    expect(pontos.map((p) => p.value)).toEqual([42, 43]);
  });

  it('corta a data em 10 caracteres — o dado é diário, não horário', () => {
    // O caminho publicado já teve data com hora; sem o corte, o fuso desloca o ponto de dia.
    const [p] = paraPontosDaBiblioteca([{ date: '2004-03-01T23:00:00-03:00', value: 1 }]);
    expect(p.time).toBe(1078099200);
  });

  it('série vazia devolve lista vazia, não quebra', () => {
    expect(paraPontosDaBiblioteca([])).toEqual([]);
  });
});

describe('paraISO', () => {
  it('volta de segundos UNIX para YYYY-MM-DD', () => {
    expect(paraISO(1078099200)).toBe('2004-03-01');
  });
});

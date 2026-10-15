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

  it('deduplica o mesmo mês — a lib LANÇA em desenvolvimento com tempo repetido', () => {
    // Medido: o build de DEV tem asserção (`data must be asc ordered by time`) que o de PROD não
    // tem. E a exceção aborta o laço de quem chama — as séries seguintes nunca desenham.
    const pontos = paraPontosDaBiblioteca([
      { date: '2005-01-01', value: 3.2 },
      { date: '2005-01-01', value: 3.1 }, // repetida
      { date: '2005-02-01', value: 3.4 },
    ]);
    expect(pontos).toHaveLength(2);
    // Fica a ÚLTIMA leitura do mês: numa república, a posterior é a revisão.
    expect(pontos[0].value).toBe(3.1);
  });

  it('duplicata ESPALHADA também cai — não é só a vizinha', () => {
    const pontos = paraPontosDaBiblioteca([
      { date: '2005-01-01', value: 1 },
      { date: '2010-01-01', value: 2 },
      { date: '2005-01-01', value: 9 }, // repetida, fora de ordem
    ]);
    expect(pontos.map((p) => p.value)).toEqual([9, 2]);
  });
});

describe('paraISO', () => {
  it('volta de segundos UNIX para YYYY-MM-DD', () => {
    expect(paraISO(1078099200)).toBe('2004-03-01');
  });
});

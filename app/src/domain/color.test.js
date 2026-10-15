import { describe, it, expect } from 'vitest';
import {
  hexParaRgb,
  rgbParaHex,
  rgbParaOKLab,
  oklabParaRGB,
  deltaEOK,
  simularDaltonismo,
  VISOES,
  PALETA_PADRAO,
  separacaoMinima,
  separacaoGlobal,
  LIMIAR_ENVELOPE,
  LIMIAR_COLISAO,
  avisoDeColisao,
  avisosDeColisao,
} from './color.js';

describe('hex ↔ rgb', () => {
  it('lê e escreve hex de 6 dígitos', () => {
    expect(hexParaRgb('#0e1117')).toEqual({ r: 14, g: 17, b: 23 });
    expect(rgbParaHex({ r: 14, g: 17, b: 23 })).toBe('#0e1117');
  });
});

describe('OKLab (Ottosson)', () => {
  it('ida e volta preserva a cor', () => {
    for (const hex of ['#6351ca', '#00fddc', '#d25200', '#ffd000', '#0e1117', '#ffffff']) {
      const volta = rgbParaHex(oklabParaRGB(rgbParaOKLab(hexParaRgb(hex))));
      expect(volta).toBe(hex);
    }
  });

  it('branco e preto caem onde a teoria diz', () => {
    const branco = rgbParaOKLab({ r: 255, g: 255, b: 255 });
    const preto = rgbParaOKLab({ r: 0, g: 0, b: 0 });
    expect(branco.L).toBeCloseTo(1, 2);
    expect(branco.a).toBeCloseTo(0, 3);
    expect(branco.b).toBeCloseTo(0, 3);
    expect(preto.L).toBeCloseTo(0, 5);
  });
});

describe('deltaEOK', () => {
  it('é 0 para a mesma cor e simétrico', () => {
    const a = hexParaRgb('#6351ca');
    const b = hexParaRgb('#00fddc');
    expect(deltaEOK(a, a)).toBe(0);
    expect(deltaEOK(a, b)).toBeCloseTo(deltaEOK(b, a), 12);
  });

  it('ordena distâncias como o olho espera: tons próximos < tons distantes', () => {
    const perto = deltaEOK(hexParaRgb('#6351ca'), hexParaRgb('#9d99ed'));
    const longe = deltaEOK(hexParaRgb('#6351ca'), hexParaRgb('#ffd000'));
    expect(perto).toBeLessThan(longe);
  });
});

describe('simularDaltonismo (§1)', () => {
  it('as quatro visões, e só elas', () => {
    expect(VISOES).toEqual(['normal', 'protanopia', 'deuteranopia', 'tritanopia']);
  });

  it('visão normal é identidade', () => {
    const c = hexParaRgb('#6351ca');
    expect(simularDaltonismo(c, 'normal')).toEqual(c);
  });

  it('preserva o cinza (nenhuma simulação introduz cor onde não há)', () => {
    for (const visao of VISOES) {
      const cinza = simularDaltonismo({ r: 128, g: 128, b: 128 }, visao);
      expect(cinza.r).toBeCloseTo(cinza.g, 0);
      expect(cinza.g).toBeCloseTo(cinza.b, 0);
    }
  });

  it('deuteranopia COLAPSA o par azul/roxo medido na §1 (#309aff × #9581ff)', () => {
    const normal = deltaEOK(hexParaRgb('#309aff'), hexParaRgb('#9581ff'));
    const deut = deltaEOK(
      simularDaltonismo(hexParaRgb('#309aff'), 'deuteranopia'),
      simularDaltonismo(hexParaRgb('#9581ff'), 'deuteranopia'),
    );
    // Sob deuteranopia o par praticamente cola — é o achado que motivou todo o §1.
    expect(deut).toBeLessThan(normal / 3);
  });
});

describe('PALETA_PADRAO (§1)', () => {
  it('tem exatamente 10 cores e nenhuma repetida', () => {
    expect(PALETA_PADRAO).toHaveLength(10);
    expect(new Set(PALETA_PADRAO).size).toBe(10);
  });

  it('é a paleta medida na spec, na ordem', () => {
    expect(PALETA_PADRAO).toEqual([
      '#6351ca', '#00fddc', '#d25200', '#9d99ed', '#ffd000',
      '#8d5375', '#ff8b75', '#b47699', '#a5c4ff', '#cea2ba',
    ]);
  });

  it('faz ida e volta exata em todas as 10 cores', () => {
    for (const hex of PALETA_PADRAO) {
      expect(rgbParaHex(oklabParaRGB(rgbParaOKLab(hexParaRgb(hex))))).toBe(hex);
    }
  });
});

describe('separação (§1)', () => {
  it('mede a MINIMA entre todos os 45 pares', () => {
    const s = separacaoMinima(PALETA_PADRAO, 'normal');
    // Todos os pares, sem exceção — o valor fica registrado na spec.
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(separacaoMinima(PALETA_PADRAO.slice(0, 2), 'normal'));
  });

  it('a paleta otimizada é melhor que a ingênua igualmente espaçada (§1)', () => {
    // Uma paleta ingênua de 10 matizes de 36° em HSL. Mede global 0,0216 — NÃO é a
    // ingênua que a §1 cita (0,0061), que é de outra construção; o teste só compara os
    // dois globais, então não é contradição.
    const ingenua = Array.from({ length: 10 }, (_, i) => hslParaHex((i * 36) % 360, 70, 55));
    expect(separacaoGlobal(PALETA_PADRAO)).toBeGreaterThan(separacaoGlobal(ingenua));
  });

  it('TRAVA o envelope: nenhuma visão cai abaixo do piso medido', () => {
    // Medido em 2026-10-14: normal 0,1112 · protanopia 0,0953 · deuteranopia 0,0950 ·
    // tritanopia 0,1061. O piso fica logo abaixo do pior caso (deuteranopia, 0,0950).
    // É o teste que falha se alguém ajustar a paleta à mão e quebrar o daltonismo (§10.7).
    for (const visao of ['normal', 'protanopia', 'deuteranopia', 'tritanopia']) {
      expect(separacaoMinima(PALETA_PADRAO, visao)).toBeGreaterThan(LIMIAR_ENVELOPE);
    }
    expect(separacaoGlobal(PALETA_PADRAO)).toBeCloseTo(0.095, 2);
  });
});

describe('avisoDeColisao (§1, R25)', () => {
  it('a régua é o envelope da paleta, não um número solto', () => {
    expect(LIMIAR_COLISAO).toBe(LIMIAR_ENVELOPE);
  });

  it('mede o PIOR CASO entre as quatro visões — e avisa onde a visão normal não avisaria', () => {
    // O par que a §1 cita como o colapso do daltonismo: dista 0,1114 em visão normal
    // (ACIMA do limiar) e colapsa para 0,0067 sob deuteranopia. É o teste que impede a
    // régua de voltar a medir só visão normal.
    const r = avisoDeColisao('#309aff', ['#9581ff']);
    expect(r.colide).toBe(true);
    expect(r.distancia).toBeCloseTo(0.0067, 3);
    expect(r.contra).toBe(0);
  });

  it('avisa quando a cor chega perto de outra, mesmo em visão normal', () => {
    // Medido: pior caso de (#6351ca, #6a58c8) = 0,0208
    const r = avisoDeColisao('#6351ca', ['#6a58c8', '#ffd000']);
    expect(r.colide).toBe(true);
    expect(r.distancia).toBeCloseTo(0.0208, 3);
    expect(r.contra).toBe(0);
  });

  it('não avisa quando a cor é bem separada em TODAS as visões', () => {
    // Medido: pior caso de (#00fddc, #d25200) = 0,3041 · de (#9d99ed, #6351ca) = 0,2049
    expect(avisoDeColisao('#00fddc', ['#d25200']).colide).toBe(false);
    expect(avisoDeColisao('#9d99ed', ['#6351ca']).colide).toBe(false);
  });

  it('não avisa e não quebra quando não há outras séries', () => {
    expect(avisoDeColisao('#6351ca', [])).toEqual({ colide: false, distancia: Infinity, contra: -1 });
  });
});

describe('avisosDeColisao — UMA mensagem por PAR (§1, T2)', () => {
  it('o par em colisão fala UMA vez, pela série de maior índice', () => {
    const itens = [{ cor: '#309aff' }, { cor: '#9581ff' }];
    const a = avisosDeColisao(itens);
    expect(a).toHaveLength(2);
    expect(a[0]).toEqual({ colide: false, distancia: Infinity, contra: -1 }); // a primeira não tem com quem
    expect(a[1].colide).toBe(true);
    expect(a[1].contra).toBe(0);
    expect(a[1].distancia).toBeCloseTo(0.0067, 3);
    // Era o defeito da T2: um par colidindo gerava DUAS mensagens simétricas. Agora é UMA.
    expect(a.filter((x) => x.colide)).toHaveLength(1);
  });

  it('mantém o alinhamento POSICIONAL com a lista de séries', () => {
    const itens = [{ cor: '#6351ca' }, { cor: '#ffd000' }, { cor: '#6a58c8' }];
    const a = avisosDeColisao(itens);
    expect(a).toHaveLength(3);
    // #6a58c8 (idx 2) colide com #6351ca (idx 0) — e só com ela; #ffd000 não entra.
    expect(a[2].colide).toBe(true);
    expect(a[2].contra).toBe(0);
    expect(a[0].colide).toBe(false);
    expect(a[1].colide).toBe(false);
  });

  it('lista vazia ou de um só não avisa nada', () => {
    expect(avisosDeColisao([])).toEqual([]);
    expect(avisosDeColisao([{ cor: '#6351ca' }])).toEqual([
      { colide: false, distancia: Infinity, contra: -1 },
    ]);
  });
});

/** Utilitário de teste: HSL → hex, só para gerar a paleta ingênua de comparação. */
function hslParaHex(h, s, l) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return rgbParaHex({ r: f(0), g: f(8), b: f(4) });
}

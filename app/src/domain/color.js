/**
 * Matemática de cor (spec §1). Camada 3: puro, sem Svelte, sem DOM, sem rede.
 * OKLab conforme Björn Ottosson, "A perceptual color space for image processing" (2020).
 * Simulação de daltonismo conforme Machado, Oliveira & Fernandes (2009), severidade 1.0.
 */

export function hexParaRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbParaHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** sRGB (0–255) → linear */
const paraLinear = (v) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const paraSRGB = (v) => {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return s * 255;
};

export function rgbParaOKLab({ r, g, b }) {
  const R = paraLinear(r);
  const G = paraLinear(g);
  const B = paraLinear(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/**
 * OKLab → sRGB. Devolve valores **possivelmente fora de [0,255]** para entradas fora de
 * gamut (não faz *clamp*: preserva a informação para quem chama). O *clamp* acontece em
 * `rgbParaHex`, que é o ponto de conversão para texto.
 */
export function oklabParaRGB({ L, a, b }) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return {
    r: paraSRGB(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: paraSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: paraSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

/** Distância euclidiana em OKLab — a "ΔE_ok" deste projeto. */
export function deltaEOK(corA, corB) {
  const A = rgbParaOKLab(corA);
  const B = rgbParaOKLab(corB);
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

export const VISOES = Object.freeze(['normal', 'protanopia', 'deuteranopia', 'tritanopia']);

/** Machado, Oliveira & Fernandes (2009), severidade 1.0 — em RGB LINEAR. */
const MATRIZES = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/**
 * Simula como uma cor é vista sob um tipo de daltonismo (§1).
 * @param {{r:number,g:number,b:number}} rgb
 * @param {'normal'|'protanopia'|'deuteranopia'|'tritanopia'} visao
 */
export function simularDaltonismo(rgb, visao) {
  if (visao === 'normal') return { ...rgb };
  const M = MATRIZES[visao];
  if (!M) throw new Error(`visão desconhecida: ${visao}`);
  const [R, G, B] = [paraLinear(rgb.r), paraLinear(rgb.g), paraLinear(rgb.b)];
  return {
    r: paraSRGB(M[0][0] * R + M[0][1] * G + M[0][2] * B),
    g: paraSRGB(M[1][0] * R + M[1][1] * G + M[1][2] * B),
    b: paraSRGB(M[2][0] * R + M[2][1] * G + M[2][2] * B),
  };
}

/** Piso do envelope, medido em 2026-10-14: o pior caso entre as quatro visões é 0,0950
 * (deuteranopia). O piso fica logo abaixo — é o que o teste de não-regressão trava (§10.7). */
export const LIMIAR_ENVELOPE = 0.09;

/**
 * A paleta de 10 séries (spec §1) — envelope medido, SEM ciclo, exatamente 10 entradas.
 * O override pessoal (localStorage) mora fora daqui, chaveado pelo id do indicador.
 */
export const PALETA_PADRAO = Object.freeze([
  '#6351ca', '#00fddc', '#d25200', '#9d99ed', '#ffd000',
  '#8d5375', '#ff8b75', '#b47699', '#a5c4ff', '#cea2ba',
]);

/** Menor ΔE_ok entre todos os pares da paleta, sob uma visão. */
export function separacaoMinima(paleta, visao) {
  let minima = Infinity;
  for (let i = 0; i < paleta.length; i++) {
    for (let j = i + 1; j < paleta.length; j++) {
      const d = deltaEOK(
        simularDaltonismo(hexParaRgb(paleta[i]), visao),
        simularDaltonismo(hexParaRgb(paleta[j]), visao),
      );
      if (d < minima) minima = d;
    }
  }
  return minima;
}

/** O pior caso entre as quatro visões — é isto que o teste trava (§10.7). */
export function separacaoGlobal(paleta) {
  return Math.min(...VISOES.map((v) => separacaoMinima(paleta, v)));
}

/** Abaixo disto, duas séries são "a mesma cor" para efeito de aviso (§1).
 * É o próprio envelope da paleta — a régua do que o app avisa é o que ele já aceita. */
export const LIMIAR_COLISAO = LIMIAR_ENVELOPE;

/**
 * Avisa (com a distância medida) quando a cor escolhida pelo usuário colidir com uma
 * série já selecionada — mas NÃO bloqueia (§1).
 *
 * **R25 — a distância é o PIOR CASO entre as quatro visões, não a distância em visão
 * normal.** O limiar é o envelope da paleta, que é um pior-caso; comparar uma distância
 * de visão normal contra ele é comparar duas medidas diferentes. Medido (2026-10-14):
 * o par que a §1 cita como o colapso do daltonismo (`#309aff` × `#9581ff`) dista
 * **0,1114** em visão normal — acima do limiar, então a régua antiga **não avisava** —
 * e **0,0067** sob deuteranopia. O aviso ficava cego exatamente no risco que o envelope
 * existe para pegar.
 */
export function avisoDeColisao(cor, outrasCores) {
  if (outrasCores.length === 0) return { colide: false, distancia: Infinity, contra: -1 };
  let distancia = Infinity;
  let contra = -1;
  outrasCores.forEach((outra, i) => {
    const d = separacaoGlobal([cor, outra]);   // pior caso entre as quatro visões
    if (d < distancia) {
      distancia = d;
      contra = i;
    }
  });
  return { colide: distancia < LIMIAR_COLISAO, distancia, contra };
}

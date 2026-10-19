import { it, expect, vi } from 'vitest';
import { get } from 'svelte/store';
import { viewportStore, definirJanela, resetarJanela, aoEscolherJanela } from './viewport.js';

it('definirJanela é a única escrita, e vem do adapter (§8.1)', () => {
  definirJanela({ from: '2020-01-01', to: '2021-01-01' });
  expect(get(viewportStore)).toEqual({ from: '2020-01-01', to: '2021-01-01' });
});

it('campos ausentes viram null, não undefined', () => {
  definirJanela({ from: '2020-01-01' });
  expect(get(viewportStore)).toEqual({ from: '2020-01-01', to: null });
});

it('resetarJanela volta ao intervalo completo', () => {
  definirJanela({ from: '2020-01-01', to: '2021-01-01' });
  resetarJanela();
  expect(get(viewportStore)).toEqual({ from: null, to: null });
});

// A AUTORIA da janela (§8.1): é um AVISO, não estado — a forma da store segue `{from, to}`.
// O adapter precisa distinguir "o usuário escolheu" (para de re-enquadrar, e não deixa uma
// atualização de dado mover a janela) do eco do próprio gráfico (que não escolheu nada).

it('aoEscolherJanela NÃO é avisado pelo eco do adapter', () => {
  const ouvinte = vi.fn();
  const parar = aoEscolherJanela(ouvinte);
  definirJanela({ from: '2020-01-01', to: '2021-01-01' }); // escrita do adapter: reação
  expect(ouvinte).not.toHaveBeenCalled();
  parar();
});

it('aoEscolherJanela é avisado quando a TELA declara a escolha', () => {
  const ouvinte = vi.fn();
  const parar = aoEscolherJanela(ouvinte);
  definirJanela({ from: '2020-01-01', to: '2021-01-01' }, { escolhaDoUsuario: true });
  expect(ouvinte).toHaveBeenCalledWith(true);
  parar();
});

it('resetarJanela avisa `false`: "Tudo" não é uma janela, é a AUSÊNCIA dela', () => {
  const ouvinte = vi.fn();
  const parar = aoEscolherJanela(ouvinte);
  resetarJanela();
  expect(ouvinte).toHaveBeenCalledWith(false);
  parar();
});

it('aoEscolherJanela devolve a função que desinscreve', () => {
  const ouvinte = vi.fn();
  const parar = aoEscolherJanela(ouvinte);
  parar();
  definirJanela({ from: '2020-01-01' }, { escolhaDoUsuario: true });
  expect(ouvinte).not.toHaveBeenCalled();
});

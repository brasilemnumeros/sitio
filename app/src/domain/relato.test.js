import { describe, it, expect } from 'vitest';
import { montarRelato, REPO_ISSUES } from './relato.js';

const base = {
  id: 'ipca-acum-12m',
  nome: 'IPCA — acumulado em 12 meses',
  periodo: 'mai/2026',
  texto: 'O valor aparece 4,72%, mas no SIDRA é 4,84%.',
  valorVisto: '4,72%',
  valorEsperado: '4,84%',
  fonte: 'https://sidra.ibge.gov.br/tabela/1737',
  ids: ['ipca-acum-12m', 'selic-meta'],
  urlBase: 'https://www.brasilemnumeros.ong.br/',
  janela: { de: '2019-01-01', ate: '2026-05-01' },
  mandato: 'Lula III',
  data: '2026-11-06',
};

const corpo = (r) => new URL(r.url).searchParams.get('body');
const params = (r) => new URL(r.url).searchParams;

describe('montarRelato', () => {
  it('aponta para o repositório de dados, com a label', () => {
    const r = montarRelato(base);
    expect(r.url.startsWith(`${REPO_ISSUES}?`)).toBe(true);
    expect(params(r).get('labels')).toBe('erro-de-dado');
  });

  it('só manda título, corpo e label — nada do navegador', () => {
    const r = montarRelato(base);
    expect([...params(r).keys()].sort()).toEqual(['body', 'labels', 'title']);
  });

  it('monta todos os blocos do corpo', () => {
    const c = corpo(montarRelato(base));
    expect(c).toContain('### Indicador\n`ipca-acum-12m` — IPCA — acumulado em 12 meses');
    expect(c).toContain('### Período\nmai/2026');
    expect(c).toContain('### O que está errado\nO valor aparece 4,72%, mas no SIDRA é 4,84%.');
    expect(c).toContain('- Aparece no site: 4,72%\n- Esperado: 4,84%');
    expect(c).toContain('### Fonte oficial\nhttps://sidra.ibge.gov.br/tabela/1737');
    expect(c).toContain('janela visível: 2019-01 a 2026-05 · mandato: Lula III');
    expect(c).toContain('Enviado pelo formulário do site · 2026-11-06');
  });

  it('leva TODAS as séries no permalink, na ordem recebida', () => {
    const c = corpo(montarRelato(base));
    expect(c).toContain(
      '### Como reproduzir\nhttps://www.brasilemnumeros.ong.br/?series=ipca-acum-12m%2Cselic-meta'
    );
  });

  it('codifica acentos, %, & e # sem perder o texto', () => {
    const texto = '100% & #1 — atenção ção';
    const r = montarRelato({ ...base, texto });
    expect(corpo(r)).toContain(texto);
    expect(r.url).not.toContain(' ');
    expect(r.url).toContain('%26');
  });

  it('ausências viram "não informado", nunca vazio', () => {
    const c = corpo(
      montarRelato({ ...base, periodo: '', valorVisto: '', valorEsperado: '', fonte: '', janela: null, mandato: null })
    );
    expect(c).toContain('### Período\nnão informado');
    expect(c).toContain('- Aparece no site: não informado\n- Esperado: não informado');
    expect(c).toContain('### Fonte oficial\nnão informada');
    expect(c).toContain('janela visível: não informada · mandato: nenhum');
  });

  it('trunca o relato em 2000 caracteres', () => {
    const c = corpo(montarRelato({ ...base, texto: 'a'.repeat(2500) }));
    expect(c).toContain('a'.repeat(2000));
    expect(c).not.toContain('a'.repeat(2001));
  });

  it('sem período o título fala em possível erro', () => {
    const r = montarRelato({ ...base, periodo: '' });
    expect(params(r).get('title')).toBe('IPCA — acumulado em 12 meses: possível erro no dado');
  });

  it('com período o título nomeia o mês', () => {
    const r = montarRelato(base);
    expect(params(r).get('title')).toBe(
      'IPCA — acumulado em 12 meses: valor de mai/2026 parece errado'
    );
  });

  it('mantém a URL abaixo do limite prático do GitHub', () => {
    const r = montarRelato({ ...base, texto: 'a'.repeat(2000) });
    expect(r.url.length).toBeLessThan(8000);
  });
});

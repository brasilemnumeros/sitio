// node puro: nada de runner. Sai !=0 na primeira falha.
//
// A montagem dos itens do feed é pura e testável — e é o ÚNICO jeito de exercitar
// o caso da coleção VAZIA (Review Focus 5) sem uma coleção de verdade.
import { montarItens } from '../src/lib/feed-items.js';

function eq(nome, obtido, esperado) {
  const a = JSON.stringify(obtido);
  const b = JSON.stringify(esperado);
  if (a !== b) {
    console.error(`feed-itens: ${nome}\n  obtido:   ${a}\n  esperado: ${b}`);
    process.exit(1);
  }
  console.log(`ok: ${nome}`);
}

eq(
  'um item por post, com link absoluto',
  montarItens(
    [
      {
        id: '2025-07-27-hoje-nasce-o-brasil-em-numeros',
        data: { title: 'T', categories: ['noticias'], body: '' },
      },
    ],
    'https://www.brasilemnumeros.ong.br',
  )[0].link,
  'https://www.brasilemnumeros.ong.br/noticias/2025/07/27/hoje-nasce-o-brasil-em-numeros.html',
);

// Review Focus 5 — coleção vazia: nenhum item quebrado, nenhuma exceção
eq(
  'coleção vazia devolve lista vazia',
  montarItens([], 'https://www.brasilemnumeros.ong.br'),
  [],
);

// O `description` sai com o HTML do post e as URLs ABSOLUTIZADAS (o RSS 2.0 não
// tem `xml:base`, diferente do Atom — ver o relatório da fatia).
eq(
  'description absolutiza href/src de raiz',
  montarItens(
    [
      {
        id: '2025-07-27-hoje-nasce-o-brasil-em-numeros',
        data: { title: 'T', categories: ['noticias'] },
        rendered: { html: '<p><a href="/x">a</a><img src="/y.png"></p>' },
      },
    ],
    'https://www.brasilemnumeros.ong.br',
  )[0].description,
  '<p><a href="https://www.brasilemnumeros.ong.br/x">a</a><img src="https://www.brasilemnumeros.ong.br/y.png"></p>',
);

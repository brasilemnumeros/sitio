// O mapa `blog_categories` do `_config.yml`, portado com os valores medidos.
// A ORDEM aqui é a da navegação (a mesma do mapa).
//
// `name`/`description`/`icon`/`color` vêm do `_config.yml:9-23`.
// `intro`/`estadoVazio`/`voltar` NÃO vêm de lá: são os textos do corpo das três
// páginas de categoria, que divergem entre si. Medido em 2026-10-18 — e as
// divergências são reproduzidas de propósito, não consertadas:
//
// - `analises` diz "← Voltar para o blog"; as outras duas dizem "Artigos";
// - `indicadores` diz "Nenhum post"; as outras dizem "Nenhuma análise/notícia".
export type Categoria = 'analises' | 'indicadores' | 'noticias';

export interface DadosDaCategoria {
  name: string;
  description: string;
  icon: string;
  color: 'blue' | 'green' | 'purple';
  intro: string;
  estadoVazio: string;
  voltar: string;
}

export const CATEGORIAS: Record<Categoria, DadosDaCategoria> = {
  analises: {
    name: 'Análises',
    description: 'Análises aprofundadas dos indicadores econômicos brasileiros',
    icon: '📊',
    color: 'blue',
    intro:
      'Análises aprofundadas dos indicadores econômicos, suas relações e impactos na economia brasileira.',
    estadoVazio: 'Nenhuma análise encontrada nesta categoria.',
    voltar: '← Voltar para o blog',
  },
  indicadores: {
    name: 'Indicadores',
    description: 'Novidades sobre indicadores econômicos disponíveis no site',
    icon: '📈',
    color: 'green',
    intro: 'Novidades sobre os indicadores econômicos disponíveis, metodologias e interpretações.',
    estadoVazio: 'Nenhum post encontrado nesta categoria.',
    voltar: '← Voltar para Artigos',
  },
  noticias: {
    name: 'Notícias',
    description: 'Novidades e atualizações do projeto Brasil em Números',
    icon: '📢',
    color: 'purple',
    intro: 'Novidades, atualizações e marcos do projeto Brasil em Números.',
    estadoVazio: 'Nenhuma notícia encontrada nesta categoria.',
    voltar: '← Voltar para Artigos',
  },
};

export const ORDEM_CATEGORIAS: Categoria[] = ['analises', 'indicadores', 'noticias'];

// Configuração do site. Antes vinha do `_config.yml` (que morre na fatia 07).
//
// `GA4_ID` substitui o `{{ site.google_analytics }}` (`_config.yml:44`,
// `google_analytics: G-N4CFQ7CL1S`). Até lá, a constante é conferida contra ele
// (`grep google_analytics _config.yml`).
export const GA4_ID = 'G-N4CFQ7CL1S';

// Metadados de SITE (`_config.yml`: `title`/`description`/`tagline`). Vivem aqui porque
// o 404 publica o título do SITE — `<title>` = `title | tagline` — e não o da página
// (fatia 02/T3). O `description` também é o fallback do 404. Strings medidas no publicado.
export const SITE = {
  nome: 'Brasil em Números',
  descricao: 'Uma plataforma dedicada a fornecer dados e informações sobre o Brasil.',
  tagline: 'Dados e informações sobre o Brasil em um só lugar',
  // O publicado emitia `og:locale: en_US` (o plugin de SEO do site antigo caía no
  // default `en` quando o idioma não era declarado). Decisão do usuário em 2026-10-18: corrigir
  // para pt_BR — não é fiel, é conserto deliberado de uma meta errada.
  idioma: 'pt_BR',
};

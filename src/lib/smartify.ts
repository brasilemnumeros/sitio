// O `jekyll-seo-tag` roda o filtro `smartify` (smart quotes do kramdown) no título
// ANTES de escrevê-lo nas meta tags. Medido no site publicado (2026-10-18), no post
// `selic`: `<title>`, `og:title`, `twitter:title` e o `headline` do JSON-LD saem com
// aspas CURVAS (`“Taxaço”`), enquanto o `<h1>` do corpo mantém as retas.
//
// Reproduzimos o par `"` → `“`/`”` e a reticência `...` → `…`: medido que NENHUM dos
// 10 títulos tem apóstrofo ou travessão, só DOIS têm aspas duplas (`selic` e `igpm`) e
// UM tem reticência (`hoje-nasce-o-brasil-em-numeros`). Portanto NÃO é smartypants
// completo — apóstrofos (`'` → `’`) e travessões (`--` → `–`) ficam FORA de propósito.
// Se um título futuro usar esses caracteres, esta função precisa crescer junto (o
// `testar-meta.sh` pega a regressão das aspas E da reticência).
//
// A reticência foi ACHADA na conferência antes × depois do `dist/` (2026-10-19), pela
// difusão do texto publicado contra o novo: o `<h1>` mantém `...` nos dois, mas as
// metas de título do publicado trazem `…`. A ausência dela era a ÚNICA diferença não
// intencional de conteúdo em toda a varredura (todas as outras eram: mês em português,
// `target`/`rel`, e a `politica-de-privacidade` que já estava à frente no repo).
//
// A primeira aspa ABRE (`“`), a segunda FECHA (`”`), alternando. NÃO aplicar a uma
// string já smartificada: o par seria reinterpretado e corrompido (medido na
// `description` do `selic`, que já vem com `“inflação”` do markdown).
export function smartify(texto: string): string {
  let abre = true;
  const comAspas = texto.replace(/"/g, () => {
    const aspa = abre ? '\u201C' : '\u201D';
    abre = !abre;
    return aspa;
  });
  return comAspas.replace(/\.\.\./g, '\u2026');
}

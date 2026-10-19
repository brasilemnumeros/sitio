// O `jekyll-seo-tag` roda o filtro `smartify` (smart quotes do kramdown) no título
// ANTES de escrevê-lo nas meta tags. Medido no site publicado (2026-10-18), no post
// `selic`: `<title>`, `og:title`, `twitter:title` e o `headline` do JSON-LD saem com
// aspas CURVAS (`“Taxaço”`), enquanto o `<h1>` do corpo mantém as retas.
//
// Reproduzimos só o par `"` → `“`/`”`: medido que NENHUM dos 10 títulos tem apóstrofo
// ou travessão, e só DOIS têm aspas duplas (`selic` e `igpm`). Portanto NÃO é
// smartypants completo — apóstrofos (`'` → `’`) e travessões (`--` → `–`) ficam FORA
// de propósito. Se um título futuro usar esses caracteres, esta função precisa crescer
// junto (o teste do `testar-meta.sh` pega a regressão das aspas).
//
// A primeira aspa ABRE (`“`), a segunda FECHA (`”`), alternando. NÃO aplicar a uma
// string já smartificada: o par seria reinterpretado e corrompido (medido na
// `description` do `selic`, que já vem com `“inflação”` do markdown).
export function smartify(texto: string): string {
  let abre = true;
  return texto.replace(/"/g, () => {
    const aspa = abre ? '\u201C' : '\u201D';
    abre = !abre;
    return aspa;
  });
}

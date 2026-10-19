// URL publicada do post, no formato do Jekyll: `/categoria/AAAA/MM/DD/slug.html`.
// A categoria vem de `categories[0]` e o slug é o `id` sem o prefixo de data.
//
// Helper ÚNICO de propósito: é lógica de URL de conteúdo crítico. Duas cópias
// (`links.astro` e `ListaDePosts.astro`) tendem a divergir com o tempo, e uma
// divergência aqui muda a URL publicada — que é exatamente a categoria Critical.
// A rota do post (fatia 03/T2) também importa daqui.
export function urlDoPost(id: string, categoria: string): string {
  const [ano, mes, dia] = id.slice(0, 10).split('-');
  const slug = id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return `/${categoria}/${ano}/${mes}/${dia}/${slug}.html`;
}

// A data NÃO está no front matter: ela vem do nome do arquivo, como no Jekyll.
// Tudo em UTC — a data do arquivo é meia-noite UTC e o fuso local (UTC-3)
// jogaria a formatação para o DIA ANTERIOR.
export function dataDoId(id: string): Date {
  const m = id.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) throw new Error(`post: id não começa com data: ${id}`);
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  // Data que ROLA é erro de digitação no nome do arquivo (2025-02-30 vira 2 de
  // março) e publicaria URL e data erradas em silêncio — o round-trip é o que pega.
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) {
    throw new Error(`post: data inválida no id: ${id}`);
  }
  return d;
}

// medido no site publicado: "2025-07-27T00:00:00+00:00" (com +00:00, não "Z")
export function isoDoJekyll(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

const MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' });

// O publicado saía com o mês em INGLÊS ("27 de July de 2025"): o Jekyll não
// declara locale e o Liquid formata em en por padrão. Reproduzir era fiel, mas o
// inglês no meio de uma data em português é defeito visível — decisão do usuário em
// 2026-10-18: traduzir. Sai "27 de julho de 2025" e "07 de agosto de 2025"
// (dia sempre com dois dígitos, como o `%d` do Liquid).
export function dataPorExtenso(d: Date): string {
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${dia} de ${MES.format(d)} de ${d.getUTCFullYear()}`;
}

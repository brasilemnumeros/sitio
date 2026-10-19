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

const MES = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' });

// medido no site publicado: "27 de July de 2025" e "07 de August de 2025".
// O mês sai em INGLÊS porque o Jekyll não declara locale — ver o item aberto.
export function dataPorExtenso(d: Date): string {
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${dia} de ${MES.format(d)} de ${d.getUTCFullYear()}`;
}

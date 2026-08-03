export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000・･.·'’"“”\-‐‑–—―]/g, "")
    .trim();
}

export function normalizeIsbn(value: string) {
  const isbn = value.replace(/[^0-9X]/gi, "").toUpperCase();
  if (isbn.length !== 10 && isbn.length !== 13) throw new Error(`Invalid ISBN: ${value}`);
  return isbn;
}

export function isbn13From(value: string) {
  const isbn = normalizeIsbn(value);
  if (isbn.length === 13) return isbn;
  const body = `978${isbn.slice(0, 9)}`;
  const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

// AmazonのASINは書籍のISBN-10と一致する。978で始まるISBN-13からは決まった手順で復元できるので、
// 取り込み元がISBN-10を返していない本でも商品ページへ直接リンクできる。
// 979始まり(ISBN-10が存在しない)や桁数が違う場合はundefinedを返す。
export function isbn10From(value: string): string | undefined {
  let isbn: string;
  try { isbn = normalizeIsbn(value); } catch { return undefined; }
  if (isbn.length === 10) return isbn;
  if (!isbn.startsWith("978")) return undefined;
  const body = isbn.slice(3, 12);
  const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = (11 - (sum % 11)) % 11;
  return `${body}${remainder === 10 ? "X" : remainder}`;
}

export function slugify(value: string) {
  const normalized = normalizeSearchText(value);
  return normalized.replace(/[^a-z0-9\u3040-\u309f\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "") || crypto.randomUUID();
}
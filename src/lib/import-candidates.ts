import { books } from "@/lib/catalog";
import { currentRanking } from "@/lib/current-ranking";

export type ImportCandidateSource = "rakuten_ranking" | "amazon_ranking" | "book_award" | "famous_author" | "catalog";
export type ImportCandidate = { isbn: string; title: string; author: string; source: ImportCandidateSource; priority: number };

export function popularImportCandidates(): ImportCandidate[] {
  const candidates: ImportCandidate[] = [];
  for (const book of currentRanking) candidates.push({ isbn: book.isbn, title: book.title, author: book.author, source: "rakuten_ranking", priority: 100 });
  for (const book of books.filter((item) => item.amazonRank).sort((a, b) => (a.amazonRank ?? 999) - (b.amazonRank ?? 999))) {
    candidates.push({ isbn: book.isbn, title: book.title, author: book.author, source: "amazon_ranking", priority: 90 });
  }
  for (const book of books.filter((item) => item.awards?.some((award) => ["本屋大賞", "芥川賞", "直木賞"].includes(award.name)))) {
    candidates.push({ isbn: book.isbn, title: book.title, author: book.author, source: "book_award", priority: 80 });
  }
  const authorFrequency = new Map<string, number>();
  for (const book of books) authorFrequency.set(book.author, (authorFrequency.get(book.author) ?? 0) + 1);
  for (const book of books.filter((item) => (authorFrequency.get(item.author) ?? 0) >= 2)) {
    candidates.push({ isbn: book.isbn, title: book.title, author: book.author, source: "famous_author", priority: 70 });
  }
  for (const book of books) candidates.push({ isbn: book.isbn, title: book.title, author: book.author, source: "catalog", priority: 50 });

  const unique = new Map<string, ImportCandidate>();
  for (const candidate of candidates.sort((a, b) => b.priority - a.priority)) if (!unique.has(candidate.isbn)) unique.set(candidate.isbn, candidate);
  return [...unique.values()];
}

export function popularImportIsbns() {
  return popularImportCandidates().map((candidate) => candidate.isbn);
}
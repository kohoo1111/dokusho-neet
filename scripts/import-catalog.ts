import { books } from "../src/lib/catalog";
import { importIsbn } from "../src/lib/import-pipeline";

async function main() {
  const isbns = [...new Set(books.map((book) => book.isbn).filter(Boolean))];
  let imported = 0;
  const errors: { isbn: string; error: string }[] = [];

  for (const isbn of isbns) {
    try {
      await importIsbn(isbn);
      imported += 1;
      console.log(`IMPORTED ${imported}/${isbns.length}`);
    } catch (error) {
      errors.push({ isbn, error: error instanceof Error ? error.message : String(error) });
      console.error(`FAILED ${isbn}`);
    }
  }

  console.log(JSON.stringify({ requested: isbns.length, imported, errors }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
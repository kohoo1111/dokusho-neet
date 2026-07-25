const presence = (name) => {
  const value = process.env[name] ?? "";
  return { present: value.length > 0, length: value.length };
};

console.log(JSON.stringify({
  GOOGLE_BOOKS_API_KEY: presence("GOOGLE_BOOKS_API_KEY"),
  OPENAI_API_KEY: presence("OPENAI_API_KEY"),
  DATABASE_URL: { present: Boolean(process.env.DATABASE_URL) },
}));
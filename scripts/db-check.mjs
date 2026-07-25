import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const [connection] = await sql`select current_database() as database, current_user as role, now() as checked_at`;
const extensions = await sql`select extname from pg_extension where extname in ('vector','pg_trgm') order by extname`;
const tables = await sql`select count(*)::int as count from information_schema.tables where table_schema='public'`;
console.log(JSON.stringify({ connected: true, database: connection.database, extensions: extensions.map((row) => row.extname), tables: tables[0].count }));
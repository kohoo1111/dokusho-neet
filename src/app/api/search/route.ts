import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/catalog-repository";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.slice(0, 120) ?? "";
  return NextResponse.json({ books: await searchCatalog(query) });
}
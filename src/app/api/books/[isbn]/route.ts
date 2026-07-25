import { bookByIsbn } from "@/lib/catalog-repository";

export async function GET(_request:Request,{params}:{params:Promise<{isbn:string}>}){
  const {isbn}=await params;
  const book=await bookByIsbn(isbn);
  if(!book)return Response.json({error:"book_not_found"},{status:404});
  return Response.json({book:{id:book.id,title:book.title,author:book.author,synopsis:book.synopsis,publisher:book.publisher}},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=3600"}});
}
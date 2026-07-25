export type NormalizedMetadata={isbn:string;title:string;authors:string[];description:string;publisher?:string;categories:string[];coverImage?:string;sources:("google-books"|"open-library"|"catalog")[]};
export type MetadataFallback=Omit<NormalizedMetadata,"sources">;

const normalizeIsbn=(value:string)=>value.replace(/[^0-9X]/gi,"");
const present=(value:unknown)=>typeof value==="string"&&value.trim().length>0;

async function googleBooks(isbn:string):Promise<Partial<NormalizedMetadata>|null>{
  try{const key=process.env.GOOGLE_BOOKS_API_KEY?`&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}`:"";const response=await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1${key}`,{next:{revalidate:86400}});if(!response.ok)return null;const data=await response.json() as {items?:{volumeInfo?:{title?:string;authors?:string[];description?:string;publisher?:string;categories?:string[];imageLinks?:{thumbnail?:string};industryIdentifiers?:{identifier:string}[]}}[]};const info=data.items?.[0]?.volumeInfo;if(!info?.title)return null;return {isbn:normalizeIsbn(info.industryIdentifiers?.find(item=>normalizeIsbn(item.identifier)===isbn)?.identifier??isbn),title:info.title,authors:info.authors??[],description:info.description??"",publisher:info.publisher,categories:info.categories??[],coverImage:info.imageLinks?.thumbnail?.replace("http://","https://")}}catch{return null}
}

async function openLibrary(isbn:string):Promise<Partial<NormalizedMetadata>|null>{
  try{const key=`ISBN:${isbn}`;const response=await fetch(`https://openlibrary.org/api/books?bibkeys=${key}&jscmd=data&format=json`,{next:{revalidate:604800}});if(!response.ok)return null;const data=await response.json() as Record<string,{title?:string;authors?:{name:string}[];publishers?:{name:string}[];subjects?:{name:string}[];cover?:{large?:string;medium?:string}}> ;const item=data[key];if(!item)return null;return {isbn,title:item.title,authors:item.authors?.map(author=>author.name)??[],publisher:item.publishers?.[0]?.name,categories:item.subjects?.slice(0,8).map(subject=>subject.name)??[],coverImage:item.cover?.large??item.cover?.medium}}catch{return null}
}

export async function resolveMetadata(isbnValue:string,fallback:MetadataFallback):Promise<NormalizedMetadata>{
  const isbn=normalizeIsbn(isbnValue);const google=await googleBooks(isbn);const needsOpenLibrary=!google||!present(google.title)||!google.authors?.length||!present(google.coverImage)||!present(google.publisher);const open=needsOpenLibrary?await openLibrary(isbn):null;
  return {isbn,title:google?.title??fallback.title??open?.title??"",authors:google?.authors?.length?google.authors:fallback.authors.length?fallback.authors:open?.authors??[],description:google?.description||fallback.description,publisher:google?.publisher??open?.publisher??fallback.publisher,categories:[...new Set([...(google?.categories??[]),...(open?.categories??[]),...fallback.categories])],coverImage:google?.coverImage??open?.coverImage??fallback.coverImage,sources:[...(google?["google-books" as const]:[]),...(open?["open-library" as const]:[]),"catalog"]};
}
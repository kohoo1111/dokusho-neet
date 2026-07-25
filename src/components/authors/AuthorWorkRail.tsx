"use client";
import { useEffect,useRef,useState } from "react";
import { AuthorWorkCard,type AuthorWork } from "@/components/authors/AuthorWorkCard";
import { weightedDiscovery } from "@/lib/discovery";

export function AuthorWorkRail({works,authorSlug,author}:{works:AuthorWork[];authorSlug:string;author:string}){
  const [visible,setVisible]=useState(works);const applied=useRef(false);
  useEffect(()=>{if(applied.current)return;applied.current=true;setVisible(weightedDiscovery(works,{key:work=>`author:${authorSlug}:${work.id}`,popularity:(_work,index)=>Math.max(.45,.9-index*.06),limit:Math.min(8,works.length)}))},[works,authorSlug]);
  return <div className="book-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-8 md:-mx-8 md:px-8">{visible.map(work=><div key={work.id} className="w-[42vw] min-w-[150px] max-w-[190px] shrink-0 snap-start"><AuthorWorkCard work={work} author={author}/></div>)}</div>
}
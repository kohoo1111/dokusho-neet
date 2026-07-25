export type DiscoveryItem={key:string;popularity:number};
type Exposure={views:number;lastShown:number};
type Store={items:Record<string,Exposure>;recent:string[]};

const STORAGE_KEY="dokusho-discovery-v1";
const emptyStore=():Store=>({items:{},recent:[]});

function readStore():Store{
  try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)??"") as Store;return parsed?.items&&Array.isArray(parsed.recent)?parsed:emptyStore()}catch{return emptyStore()}
}

function weight(item:DiscoveryItem,store:Store,now:number){
  const exposure=store.items[item.key];
  const views=exposure?.views??0;
  const ageHours=exposure?Math.max(0,(now-exposure.lastShown)/3_600_000):Number.POSITIVE_INFINITY;
  const recency=ageHours<1?.06:ageHours<24?.22:ageHours<168?.62:ageHours<720?1:1.35;
  const novelty=1/(1+views*.32);
  const duplicate=store.recent.includes(item.key)?.12:1;
  return Math.max(.001,(.45+item.popularity*.55)*recency*novelty*duplicate);
}

export function weightedDiscovery<T>(items:T[],options:{key:(item:T)=>string;popularity:(item:T,index:number)=>number;limit:number}){
  const store=readStore();const now=Date.now();
  const ranked=items.map((item,index)=>{const key=options.key(item);const score=weight({key,popularity:options.popularity(item,index)},store,now);return {item,key,order:-Math.log(Math.max(Math.random(),Number.EPSILON))/score}}).sort((a,b)=>a.order-b.order).slice(0,options.limit);
  for(const {key} of ranked){const previous=store.items[key];store.items[key]={views:(previous?.views??0)+1,lastShown:now}}
  store.recent=[...ranked.map(item=>item.key),...store.recent.filter(key=>!ranked.some(item=>item.key===key))].slice(0,36);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(store))}catch{}
  return ranked.map(item=>item.item);
}
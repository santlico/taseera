import { load } from 'cheerio';
import { fetchStoreDocument } from '../../shared/http';
import type { Product, SearchQuery } from '@market/core';
type Obj=Record<string,unknown>;
const object=(v:unknown):v is Obj=>typeof v==='object'&&v!==null&&!Array.isArray(v);
export function parseNinjaResponse(html:string):Product[]{
  let flight='';
  for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)){
    for(const match of script[1].matchAll(/\bself\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\s*\]\)\s*;?/g)){
      try{flight+=JSON.parse(match[1])}catch{}
    }
  }
  const links=new Map<string,string>();
  const $=load(html);
  $('a[href]').each((_,anchor)=>{
    try{
      const url=new URL($(anchor).attr('href')!, 'https://ananinja.com');
      const id=url.pathname.match(/^\/sa\/ar\/product\/[^/]+-(\d+)$/)?.[1];
      if(url.protocol==='https:'&&url.hostname==='ananinja.com'&&id)links.set(id,url.pathname);
    }catch{}
  });
  const products=new Map<string,Product>();let found=false;
  function walk(value:unknown){
    if(Array.isArray(value)){value.forEach(walk);return}
    if(!object(value))return;
    if(Array.isArray(value.searchedProducts)){
      found=true;
      for(const item of value.searchedProducts){
        if(!object(item)||typeof item.productId!=='string'||typeof item.nameAr!=='string'||!item.nameAr.trim()||typeof item.priceCents!=='number')continue;
        const path=links.get(item.productId);
        const cents=typeof item.discountedPriceCents==='number'&&item.discountedPriceCents>0?item.discountedPriceCents:item.priceCents;
        if(!path||!Number.isFinite(cents)||cents<=0)continue;
        const media=Array.isArray(item.medias)?item.medias.find(m=>object(m)&&typeof m.url==='string'&&m.url.startsWith('https://')):undefined;
        products.set(item.productId,{store:'ninja',id:item.productId,name:item.nameAr,price:cents/100,currency:'SAR',
          url:'https://ananinja.com'+path,imageUrl:object(media)?String(media.url):undefined,
          availability:item.isAvailable===true?'in_stock':item.isAvailable===false?'out_of_stock':'unknown',
          location:'سعر موقع نينجا الافتراضي — الموقع غير محدد',fetchedAt:new Date().toISOString()});
      }
      return;
    }
    Object.values(value).forEach(walk);
  }
  for(const line of flight.split('\n')){
    if(!/^[a-f\d]+:[\[{]/i.test(line))continue;
    try{walk(JSON.parse(line.slice(line.indexOf(':')+1)))}catch{}
  }
  if(!found)throw new Error('Ninja search data missing');
  return [...products.values()];
}
export async function searchNinja(query:SearchQuery,signal:AbortSignal):Promise<Product[]>{
  if(query.storeLocationId)throw new Error('Ninja custom location not supported');
  const url=new URL('https://ananinja.com/sa/ar/product/search');url.searchParams.set('q',query.term);
  const {response,text}=await fetchStoreDocument('ninja',url,{signal});if(!response.ok)throw new Error(`Ninja search failed (HTTP ${response.status})`);
  return parseNinjaResponse(text);
}

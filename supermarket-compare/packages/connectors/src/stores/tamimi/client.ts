import { fetchStoreDocument } from '../../shared/http';
import type { Product, SearchQuery } from '@market/core';
interface StoreData { storeId:number; mrp:string; discount:string; stock:number|null; unlimitedStock?:boolean }
interface Variant {id:number;fullName?:string;name:string;images?:string[];storeSpecificData?:StoreData[];brand?:{name:string}}
interface Item extends Variant {slug:string;variants?:Variant[]}

export function parseTamimiResponse(html:string):Product[] {
  const json=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(!json)throw new Error('Tamimi data unavailable');
  const data=JSON.parse(json);
  const layouts=data?.props?.pageProps?.data?.page?.layouts;
  if(!Array.isArray(layouts))throw new Error('Tamimi layout changed');
  const result=new Map<string,Product>();let found=false;
  for(const layout of layouts){
    const items=layout?.value?.collection?.product;
    if(!Array.isArray(items))continue;
    found=true;
    for(const item of items as Item[]){
      if(typeof item.slug!=='string'||!/^[-a-z\d]+$/i.test(item.slug))continue;
      for(const variant of item.variants?.length?item.variants:[item]){
        // Explicitly use the default store observed in the public search response.
        const store=variant.storeSpecificData?.find(s=>s.storeId===4);
        if(!store||store.mrp==null||store.mrp===''||store.discount==null)continue;
        const price=Math.round((Number(store.mrp)-Number(store.discount))*100)/100;
        if(!Number.isFinite(price)||price<=0)continue;
        const brand=variant.brand?.name||item.brand?.name;
        const label=variant.fullName||[item.name,variant===item?'':variant.name].filter(Boolean).join(' ');
        if(!label)continue;
        const id=String(variant.id);
        result.set(id,{store:'tamimi',id,name:[brand,label].filter(Boolean).join(' '),brand,price,currency:'SAR',
          url:`https://shop.tamimimarkets.com/ar/product/${item.slug}`,
          imageUrl:variant.images?.[0]||item.images?.[0],
          availability:store.unlimitedStock||typeof store.stock==='number'&&store.stock>0?'in_stock':store.stock===0?'out_of_stock':'unknown',
          location:'سعر موقع التميمي الافتراضي — الفرع غير محدد',fetchedAt:new Date().toISOString()});
      }
    }
  }
  if(!found)throw new Error('Tamimi search collection missing');
  return [...result.values()];
}

export async function searchTamimi(query:SearchQuery,signal:AbortSignal):Promise<Product[]>{
  if(query.storeLocationId)throw new Error('Custom Tamimi branch is not supported');
  const url=new URL('https://shop.tamimimarkets.com/ar/search');url.searchParams.set('query',query.term);
  const {response,text}=await fetchStoreDocument('tamimi',url,{signal});
  if(!response.ok)throw new Error(`Tamimi request failed (HTTP ${response.status})`);
  return parseTamimiResponse(text);
}

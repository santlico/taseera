import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
import {load} from 'cheerio';

export function parseInnovaResponse(html:string,term:string,now=new Date()):Product[]{
  let flight='';
  for(const match of html.matchAll(/self\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g)){
    try{flight+=JSON.parse(match[1]);}catch{}
  }
  let context=false,listing:any;
  function walk(value:any){
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value.products)&&Number.isInteger(value.numberOfHits)&&value.numberOfHits>=0)listing=value;
    Object.values(value).forEach(walk);
  }
  for(const line of flight.split('\n')){
    if(!/^[a-f\d]+:[\[{]/i.test(line))continue;
    try{
      const value=JSON.parse(line.slice(line.indexOf(':')+1));
      if(line.startsWith('0:')&&Array.isArray(value.c)&&value.c[1]?.startsWith('search?')){
        const url=new URL('/'+value.c[1],'https://innovapharmacy.com');context=url.pathname==='/search'&&url.searchParams.get('q')===term;
      }
      walk(value);
    }catch{}
  }
  if(context&&!listing){const $=load(html);$('script,style').remove();if($('main').text().includes('لم نجد نتائج مطابقة للبحث'))return [];}
  if(!context||!listing)throw new Error('Innova search context or listing missing');
  const products=new Map<string,Product>();
  for(const item of listing.products.slice(0,32)){
    if(!item||typeof item.name!=='string'||!item.name.trim()||typeof item.objectID!=='string'||!item.objectID||
      typeof item.innova_url!=='string'||!/^[-a-zA-Z0-9]+$/.test(item.innova_url))continue;
    const price=item.display_price??item.prices_with_tax?.price;
    if(typeof price!=='number'||!Number.isFinite(price)||price<=0)continue;
    let imageUrl:string|undefined;
    for(const media of Array.isArray(item._media_?.image)?item._media_.image:[]){
      try{const url=new URL(media?.image);if(url.origin==='https://img.innovapharmacy.com'&&!url.username&&!url.password&&/^\/media\/+catalog\/product\//.test(url.pathname)){imageUrl=url.href;break;}}catch{}
    }
    products.set(item.objectID,{store:'innova',id:item.objectID,name:item.name.trim(),price,currency:'SAR',
      // Exact /<innova_url> route used by the public storefront's product card.
      url:`https://innovapharmacy.com/${item.innova_url}`,imageUrl,brand:typeof item.brand_label==='string'?item.brand_label:undefined,
      availability:item.stock?.is_in_stock===true?'in_stock':item.stock?.is_in_stock===false?'out_of_stock':'unknown',
      location:'إنوفا أونلاين · السعودية · عنوان وطريقة الشحن غير محددين',fetchedAt:now.toISOString()});
  }
  if(listing.products.length&&!products.size)throw new Error('Innova products failed validation');
  return [...products.values()];
}
export async function searchInnova(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
  if(query.storeLocationId)throw new Error('Innova custom delivery address not supported');
  const url=new URL('https://innovapharmacy.com/search');url.searchParams.set('q',query.term);
  const {response,text}=await fetchStoreDocument('innova',url,{signal});
  if(!response.ok||new URL(response.url).origin!==url.origin||new URL(response.url).pathname!==url.pathname)throw new Error(`Innova search HTTP/context ${response.status}`);
  return {products:parseInnovaResponse(text,query.term),notice:'إنوفا: أول 32 نتيجة من الكتالوج السعودي، بسعر العبوة الحالي شامل الضريبة. عروض القطعة الثانية غير محتسبة؛ السعر والتوفر والشحن تُؤكّد بعد تحديد عنوانك لدى الصيدلية.'};
}

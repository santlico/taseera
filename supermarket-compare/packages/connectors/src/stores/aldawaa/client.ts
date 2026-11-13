import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const origin='https://www.al-dawaa.com';
// This is the endpoint actually used by the live public storefront (including
// its hostname). No customer session, credentials or selected address required.
const endpoint='https://stgprevapi.al-dawaa.com/occ/v2/aldawaa/products/search';

export function parseAldawaaResponse(data:unknown,term:string,now=new Date()):Product[]{
  const d=data as any;
  if(d?.freeTextSearch!==term||!Array.isArray(d.products)||!Number.isInteger(d.pagination?.totalResults)||d.pagination.totalResults<0)throw new Error('Al-Dawaa search context missing');
  const products=new Map<string,Product>();
  for(const item of d.products){
    if(!item||item.hidePrice||item.hidePriceSearch||item.hidePricePLP||typeof item.code!=='string'||!/^\d+$/.test(item.code)||
      typeof item.name!=='string'||!item.name.trim()||typeof item.urlProductName!=='string'||!/^[-\p{L}\p{N}]+$/u.test(item.urlProductName))continue;
    const price=item.simulatedDiscountPrice??item.price;
    if(price?.currencyIso!=='SAR'||typeof price.value!=='number'||!Number.isFinite(price.value)||price.value<=0)continue;
    const media=Array.isArray(item.imageUrl)?item.imageUrl.find((x:any)=>x?.key==='ar')??item.imageUrl.find((x:any)=>x?.key==='en'):undefined;
    let imageUrl:string|undefined;
    try{const url=new URL(media?.value,'https://stgprevapi.al-dawaa.com');if(url.origin==='https://stgprevapi.al-dawaa.com'&&!url.username&&!url.password&&url.pathname.startsWith('/medias/'))imageUrl=url.href;}catch{}
    products.set(item.code,{store:'aldawaa',id:item.code,name:item.name.trim(),price:price.value,currency:'SAR',
      url:`${origin}/ar/p/${item.code}/${encodeURIComponent(item.urlProductName)}`,imageUrl,
      brand:typeof item.brand?.name==='string'?item.brand.name:undefined,
      availability:item.stock?.stockLevelStatus==='outOfStock'?'out_of_stock':item.stock?.stockLevelStatus==='inStock'&&item.addToCartDisabled===false?'in_stock':'unknown',
      location:'الدواء أونلاين · السعودية · كتالوج الإنترنت دون تحديد عنوان',fetchedAt:now.toISOString()});
  }
  // Intentionally hidden-price products may legitimately leave no public offers.
  if(d.products.some((p:any)=>p&&!p.hidePrice&&!p.hidePriceSearch&&!p.hidePricePLP)&&!products.size)throw new Error('Al-Dawaa products failed validation');
  return [...products.values()];
}
export async function searchAldawaa(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
  if(query.storeLocationId)throw new Error('Al-Dawaa custom delivery address not supported');
  const url=new URL(endpoint);url.search=new URLSearchParams({fields:'FULL',query:query.term,pageSize:'16',lang:'ar',curr:'SAR'}).toString();
  const {response,text}=await fetchStoreDocument('aldawaa',url,{signal,headers:{Accept:'application/json'}});
  if(!response.ok||new URL(response.url).origin!==url.origin||new URL(response.url).pathname!==url.pathname)throw new Error(`Al-Dawaa search HTTP/context ${response.status}`);
  return {products:parseAldawaaResponse(JSON.parse(text),query.term),notice:'الدواء: نتائج الصفحة الأولى من كتالوج الإنترنت السعودي. الأسعار والتوفر ورسوم التوصيل تُؤكّد بعد تحديد عنوانك لدى الصيدلية.'};
}

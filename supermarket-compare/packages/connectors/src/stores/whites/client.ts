import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const origin='https://www.whites.sa';
// Public search-only settings from the live storefront's search/page chunk,
// module 43152, verified 2026-11-13. No customer token or analytics events.
const settings={applicationId:'AHYKO0TELX',apiKey:'b0bbe4982fcf187041bf7bfb53afbfb1',indexName:'whites_extensions_prod'};

function sarPrice(value:unknown):number|undefined {
  if(typeof value!=='string'||!/^\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?\s+SAR\s*$/.test(value))return;
  const price=Number(value.trim().replace(/\s+SAR$/,'').replaceAll(',',''));
  return Number.isFinite(price)&&price>0?price:undefined;
}
/** Exact slug fallback used by Whites search UI (module 43152, export Uu). */
export function whitesProductUrl(item:{absolute_url?:unknown;url?:unknown;title?:unknown}):string|undefined {
  const provided=item.absolute_url||item.url;
  let value:string;
  if(provided){if(typeof provided!=='string')return;value=provided;}
  else {
    if(typeof item.title!=='string')return;
    const slug=item.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(!slug)return;value=`/ar-sa/${slug}/`;
  }
  try{const url=new URL(value,origin);if(url.origin!==origin||url.username||url.password||!/^\/ar-sa\/[^/]+\/$/.test(url.pathname))return;
    url.search='';url.hash='';return url.href;
  }catch{return;}
}
export function parseWhitesResponse(data:unknown,term:string,now=new Date()):Product[]{
  const d=data as any;
  if(d?.query!==term||!Array.isArray(d.hits)||!Number.isInteger(d.nbHits)||d.nbHits<0)throw new Error('Whites search context missing');
  const products=new Map<string,Product>();
  for(const item of d.hits.slice(0,20)){
    if(!item||typeof item.objectID!=='string'||!item.objectID)continue;
    const name=typeof item.title_ar==='string'&&item.title_ar.trim()?item.title_ar:item.title;
    const price=sarPrice(item.sale_price||item.price),url=whitesProductUrl(item);
    if(typeof name!=='string'||!name.trim()||price===undefined||!url)continue;
    let imageUrl:string|undefined;
    try{const image=new URL(item.image_link);if(image.origin==='https://cd3c14-whites.akinoncloudcdn.com'&&!image.username&&!image.password&&image.pathname.startsWith('/products/'))imageUrl=image.href;}catch{}
    const stock=typeof item.stock==='number'?item.stock:typeof item.stock==='string'&&/^\d+$/.test(item.stock)?Number(item.stock):NaN;
    products.set(item.objectID,{store:'whites',id:item.objectID,name:name.trim(),price,currency:'SAR',url,imageUrl,
      brand:typeof item.brand_ar==='string'?item.brand_ar:typeof item.brand==='string'?item.brand:undefined,
      availability:Number.isInteger(stock)&&stock>=0?(stock>0?'in_stock':'out_of_stock'):'unknown',
      location:'وايتس أونلاين · السعودية · عنوان وطريقة التوصيل غير محددين',fetchedAt:now.toISOString()});
  }
  if(d.hits.length&&!products.size)throw new Error('Whites products failed validation');
  return [...products.values()];
}
export async function searchWhites(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
  if(query.storeLocationId)throw new Error('Whites custom delivery address not supported');
  const url=`https://${settings.applicationId.toLowerCase()}-dsn.algolia.net/1/indexes/${settings.indexName}/query`;
  const {response,text}=await fetchStoreDocument('whites',url,{signal,method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',
    'X-Algolia-Application-Id':settings.applicationId,'X-Algolia-API-Key':settings.apiKey},
    body:JSON.stringify({query:query.term,hitsPerPage:20,analytics:false,clickAnalytics:false})});
  if(!response.ok)throw new Error(`Whites search HTTP ${response.status}`);
  return {products:parseWhitesResponse(JSON.parse(text),query.term),notice:'وايتس: أول 20 نتيجة من الكتالوج العام بالريال السعودي. السعر والتوفر والتوصيل تُؤكّد بعد اختيار عنوانك وطريقة التوصيل لدى وايتس.'};
}

import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
import publicSearchSettings from './public-search-settings.json';
type Config={applicationId:string;apiKey:string;indexName:string};

export function parseUnitedConfig(html:string):Config {
  // Parse only the public JSON literal; never execute upstream scripts.
  const match=html.match(/window\.algoliaConfig\s*=\s*(\{[^\n]+\})\s*;/);
  const c=match?JSON.parse(match[1]):null;
  if(!c||!/^\w{10}$/.test(c.applicationId)||typeof c.apiKey!=='string'||!c.apiKey||c.indexName!=='unitedpharmacy_livear'||
    c.currencyCode!=='SAR'||c.customerGroupId!==0||c.priceKey!=='.SAR.default'||c.instant?.default_address!=='Jeddah')throw new Error('United public search context changed');
  return {applicationId:c.applicationId,apiKey:c.apiKey,indexName:c.indexName+'_products'};
}
export function parseUnitedResponse(data:unknown,term:string,now=new Date()):Product[]{
  const d=data as any;
  if(d?.query!==term||!Array.isArray(d.hits)||!Number.isInteger(d.nbHits)||d.nbHits<0)throw new Error('United search context missing');
  const products=new Map<string,Product>();
  const visible=d.hits.slice(0,20).filter((item:any)=>item&&item.visibility_search===1&&(!Array.isArray(item.allow_cities)||!item.allow_cities.length||item.allow_cities.includes('Jeddah')));
  for(const item of visible){
    if(typeof item.objectID!=='string'||!item.objectID||typeof item.name!=='string'||!item.name.trim())continue;
    const price=item.price?.SAR?.default;
    if(typeof price!=='number'||!Number.isFinite(price)||price<=0)continue;
    let url:URL;
    try{url=new URL(item.url);}catch{continue;}
    if(url.origin!=='https://unitedpharmacy.sa'||url.username||url.password||!/^\/ar\/[^/]+\.html$/.test(url.pathname))continue;
    url.search='';url.hash='';
    let imageUrl:string|undefined;
    try{const image=new URL(item.image_url);if(image.origin==='https://imagenew.unitedpharmacy.sa'&&!image.username&&!image.password&&image.pathname.startsWith('/live/media/catalog/product/'))imageUrl=image.href;}catch{}
    products.set(item.objectID,{store:'united',id:item.objectID,name:item.name.trim(),price,currency:'SAR',url:url.href,imageUrl,
      brand:typeof item.brand==='string'?item.brand:undefined,
      availability:item.in_stock===0||item.custom_in_stock===false?'out_of_stock':item.in_stock===1?'in_stock':'unknown',
      location:'المتحدة أونلاين · السعودية · جدة الافتراضية دون تحديد عنوان',fetchedAt:now.toISOString()});
  }
  if(visible.length&&!products.size)throw new Error('United products failed validation');
  return [...products.values()];
}
export async function searchUnited(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
  if(query.storeLocationId)throw new Error('United custom delivery address not supported');
  const home=await fetchStoreDocument('united','https://unitedpharmacy.sa/ar/',{signal});
  // Some hosted IPs cannot read the homepage even though the public search
  // endpoint accepts anonymous queries. The fallback is the same public,
  // search-only configuration published on that page, verified 2026-11-13.
  // It contains no customer token and never substitutes cached product data.
  if(!home.response.ok&&home.response.status!==403)throw new Error(`United configuration HTTP ${home.response.status}`);
  const c=home.response.status===403?publicSearchSettings:parseUnitedConfig(home.text);
  const url=new URL(`https://${c.applicationId.toLowerCase()}-dsn.algolia.net/1/indexes/${c.indexName}/query`);
  const {response,text}=await fetchStoreDocument('united',url,{signal,method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',
    'X-Algolia-Application-Id':c.applicationId,'X-Algolia-API-Key':c.apiKey},
    body:JSON.stringify({query:query.term,hitsPerPage:20})});
  if(!response.ok)throw new Error(`United search HTTP ${response.status}`);
  return {products:parseUnitedResponse(JSON.parse(text),query.term),notice:'المتحدة: أول 20 نتيجة من الكتالوج السعودي العام بنطاق جدة الافتراضي للموقع. السعر والتوفر والتوصيل تُؤكّد بعد تحديد عنوانك لدى الصيدلية.'};
}

import type {Product,SearchQuery,StoreConnector} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const publicKey='klevu-175913366633818212';
export function parseSwsgResponse(payload:unknown,term:string):Product[]{
 const d=payload as any,listing=d?.queryResults?.find((q:any)=>q.id==='productList');
 if(listing?.meta?.searchedTerm!==term||listing.meta.apiKey!==publicKey||!Number.isInteger(listing.meta.totalResultsFound)||listing.meta.totalResultsFound<0||!Array.isArray(listing.records))throw new Error('SWSG search context missing');
 const products=new Map<string,Product>();
 for(const item of listing.records){
  const id=item?.id,name=item?.name,raw=item?.salePrice;
  if(typeof id!=='string'||!/^\d{1,15}$/.test(id)||typeof name!=='string'||!name.trim()||item.typeOfRecord!=='KLEVU_PRODUCT'||item.currency!=='SAR'||item.storeBaseCurrency!=='SAR'||typeof raw!=='string'||!/^\d+(\.\d+)?$/.test(raw))continue;
  const price=Number(raw);if(!Number.isFinite(price)||price<=0)continue;
  let url:URL;try{url=new URL(item.url);}catch{continue;}
  if(!['swsg.co','www.swsg.co'].includes(url.hostname)||url.protocol!=='https:'||url.port||url.username||url.password||url.search||url.hash||!/^\/ar\/[a-z0-9-]+\.html$/.test(url.pathname))continue;
  url.hostname='swsg.co';
  let imageUrl:string|undefined;
  for(const rawImage of [item.imageUrl,item.image]){try{const image=new URL(rawImage);if(!['swsg.co','www.swsg.co'].includes(image.hostname)||image.protocol!=='https:'||image.port||image.username||image.password)continue;
   // The published index includes a placeholder prefix; the storefront removes it.
   image.pathname=image.pathname.replace(/^\/needtochange\/media\//,'/media/');
   if(image.pathname.startsWith('/media/catalog/product/')&&!image.search&&!image.hash){image.hostname='swsg.co';imageUrl=image.href;break;}
  }catch{}}
  products.set(id,{store:'swsg',id,name:name.trim(),price:Math.round(price*100)/100,currency:'SAR',url:url.href,imageUrl,brand:typeof item.a_brand==='string'?item.a_brand:undefined,availability:item.inStock==='yes'?'in_stock':item.inStock==='no'?'out_of_stock':'unknown',location:'الشتاء والصيف · السعودية · التوصيل والتركيب حسب العنوان',fetchedAt:new Date().toISOString()});
 }
 if(listing.records.length&&!products.size)throw new Error('SWSG returned no valid Saudi offers');
 if(listing.meta.totalResultsFound>0&&!listing.records.length)throw new Error('SWSG listing missing products');
 return [...products.values()];
}
export async function searchSwsg(query:SearchQuery,signal:AbortSignal){
 if(query.storeLocationId)throw new Error('SWSG custom branch not supported');
 const body={context:{apiKeys:[publicKey]},recordQueries:[{id:'productList',typeOfRequest:'SEARCH',settings:{query:{term:query.term},typeOfRecords:['KLEVU_PRODUCT'],limit:15}}]};
 const {response,text}=await fetchStoreDocument('swsg','https://eucs35v2.ksearchnet.com/cs/v2/search',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal,redirect:'error'});
 if(!response.ok)throw new Error(`SWSG search HTTP ${response.status}`);
 return {products:parseSwsgResponse(JSON.parse(text),query.term),notice:'الشتاء والصيف: أول 15 نتيجة من البحث السعودي بالسعر الحالي، دون احتساب القسط الشهري أو عروض الدفع المشروطة. راجع الموديل والسعة واللون والضمان والتوفر ورسوم التوصيل والتركيب لدى المتجر.'};
}
export const swsg:StoreConnector={id:'swsg',name:'الشتاء والصيف',enabled:true,preserveSearchTerm:true,search:searchSwsg};

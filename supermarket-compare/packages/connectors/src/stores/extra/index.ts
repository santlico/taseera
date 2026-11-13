import type {Product,SearchQuery,StoreConnector} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
// Public, anonymous Saudi Arabic search endpoint used by extra.com's listing UI.
const endpoint='https://search.unbxd.io/8fb45132f31d81ab46966cc135c24430/ss-unbxd-auk-extra-saudi-ar-prod11541714990564/search';
export function parseExtraResponse(payload:unknown,term:string):Product[]{
 const d=payload as any,context=d?.searchMetaData;
 if(context?.status!==0||context?.queryParams?.q!==term||context.queryParams.filter!=='type:PRODUCT'||!Array.isArray(d?.response?.products)||!Number.isInteger(d.response.numberOfProducts)||d.response.numberOfProducts<0)throw new Error('Extra search context missing');
 const products=new Map<string,Product>();
 for(const item of d.response.products){
  const id=item?.productCode,price=item?.price,name=item?.nameAr;
  if(typeof id!=='string'||!/^(?:MP)?\d{6,12}$/.test(id)||item.uniqueId!==id||item.type!=='PRODUCT'||item.currency!=='SAR'||item.catalogId!=='extra_sa_ProductCatalog'||item.catalogVersion!=='Online'||typeof name!=='string'||!name.trim()||typeof price!=='number'||!Number.isFinite(price)||price<=0)continue;
  // Listing price includes the public offer; sellingPrice can be the own-store
  // price when the card displays a cheaper partner offer. Never use installments,
  // membership-only prices, cashbacks or coupon savings as the current price.
  let url:URL;try{if(typeof item.urlAr!=='string'||!item.urlAr.startsWith('/')||item.urlAr.startsWith('//'))continue;url=new URL('/ar-sa'+item.urlAr,'https://www.extra.com');}catch{continue;}
  if(url.origin!=='https://www.extra.com'||url.search||url.hash||!/^\/ar-sa\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/p\/(?:MP)?\d+$/.test(url.pathname)||!url.pathname.endsWith('/p/'+id))continue;
  let imageUrl:string|undefined;
  for(const raw of Array.isArray(item.imageUrl)?item.imageUrl:[]){try{const image=new URL(raw);if(image.origin==='https://media.extra.com'&&!image.username&&!image.password&&new RegExp('^/[si]/aurora/'+id+'_[a-zA-Z0-9_]+/').test(image.pathname)){imageUrl=image.href;break;}}catch{}}
  products.set(id,{store:'extra',id,name:name.trim(),price,currency:'SAR',url:url.href,imageUrl,brand:typeof item.brandAr==='string'?item.brandAr:undefined,retailer:item.isMarketPlaceItem==='true'?'شريك إكسترا':undefined,availability:'unknown',location:'إكسترا · السعودية · الرياض افتراضيًا، التوفر والتوصيل حسب العنوان',fetchedAt:new Date().toISOString()});
 }
 if(d.response.products.length&&!products.size)throw new Error('Extra returned no valid Saudi offers');
 if(d.response.numberOfProducts>0&&!d.response.products.length)throw new Error('Extra listing missing products');
 return [...products.values()];
}
export async function searchExtra(query:SearchQuery,signal:AbortSignal){
 if(query.storeLocationId)throw new Error('Extra custom branch not supported');
 const url=new URL(endpoint);for(const [key,value] of Object.entries({q:query.term,rows:'24',page:'1',version:'V2',filter:'type:PRODUCT',bfrule:'inStockCities:"SA-riyadh" OR sellingOutFastCities:"SA-riyadh" OR restockableCities:SA-riyadh',boost:'if(eq(query($bfrule),false),0,1)'}))url.searchParams.set(key,value);
 const {response,text}=await fetchStoreDocument('extra',url,{signal,headers:{Accept:'application/json'},redirect:'error'});
 if(!response.ok)throw new Error(`Extra search HTTP ${response.status}`);
 return {products:parseExtraResponse(JSON.parse(text),query.term),notice:'إكسترا: أول 24 نتيجة من البحث السعودي بالسعر الظاهر شامل الضريبة؛ قد تُباع بعض العروض عبر شركاء. راجع البائع والموديل والسعة واللون والضمان والتوفر والشحن لدى المتجر.'};
}
export const extra:StoreConnector={id:'extra',name:'إكسترا',enabled:true,preserveSearchTerm:true,search:searchExtra};

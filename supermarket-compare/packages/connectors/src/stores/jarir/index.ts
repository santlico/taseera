import type {Product,SearchQuery,StoreConnector} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
// Public Saudi Arabic autocomplete key observed in Jarir's anonymous storefront.
const publicKey='key_g0Gi7pKaE5cyqDGl';
export function parseJarirResponse(payload:unknown,term:string):Product[]{
 const d=payload as any;
 if(d?.request?.term!==term||!Array.isArray(d?.sections?.Products))throw new Error('Jarir search context missing');
 const products=new Map<string,Product>();let matched=0;
 for(const hit of d.sections.Products){
  if(!Array.isArray(hit?.matched_terms)||!hit.matched_terms.length)continue;matched++;
  const item=hit?.data,meta=item?.metadata,id=item?.id,basePrice=item?.price,name=meta?.name;
  if(typeof id!=='string'||!/^\d{4,12}$/.test(id)||item.sku!==id||typeof name!=='string'||!name.trim()||typeof basePrice!=='number'||!Number.isFinite(basePrice)||basePrice<=0)continue;
  // Base fields agree; the storefront final price includes active discounts, never monthly installments.
  if(typeof meta.price!=='string'||Math.abs(Number(meta.price)-basePrice)>.005)continue;
  let extra:any;try{extra=JSON.parse(meta.additionalDataToReturn);}catch{continue;}
  const price=extra?.GTM_final_price;
  if(extra?.GTM_sku!==id||typeof price!=='number'||!Number.isFinite(price)||price<=0||price>basePrice)continue;
  let url:URL;try{url=new URL(item.url,'https://www.jarir.com/');}catch{continue;}
  if(url.origin!=='https://www.jarir.com'||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('-'+id+'.html')||!/^\/[a-z0-9-]+\.html$/.test(url.pathname))continue;
  let imageUrl:string|undefined;try{const image=new URL(item.image_url);if(image.origin==='https://ak-asset.jarir.com'&&!image.username&&!image.password&&!image.search&&!image.hash&&(image.pathname===`/akeneo-prod/asset/saas/${id}.jpg`||image.pathname===`/akeneo-prod/asset/m1images/${id[0]}/${id[1]}/${id}.jpg`||new RegExp('^/akeneo-prod/asset/[a-f0-9]/[a-f0-9]/[a-f0-9]/[a-f0-9]/[a-f0-9]{40}_'+id+'\\.jpg$').test(image.pathname)))imageUrl=image.href;}catch{}
  products.set(id,{store:'jarir',id,name:name.trim(),price,currency:'SAR',url:url.href,imageUrl,brand:typeof meta.brand==='string'?meta.brand:undefined,availability:'unknown',location:'جرير · السعودية · سعر الكتالوج شامل الضريبة، التوفر حسب العنوان',fetchedAt:new Date().toISOString()});
 }
 if(matched&&!products.size)throw new Error('Jarir returned no valid product offers');
 return [...products.values()];
}
export async function searchJarir(query:SearchQuery,signal:AbortSignal){
 if(query.storeLocationId)throw new Error('Jarir custom branch not supported');
 const url=new URL('https://ac.cnstrc.com/v1/autocomplete/'+encodeURIComponent(query.term));url.searchParams.set('key',publicKey);url.searchParams.set('num_section_results_per_page[Products]','20');url.searchParams.set('c','cio-fe-web-jarir');
 const {response,text}=await fetchStoreDocument('jarir',url,{signal,headers:{Accept:'application/json'},redirect:'error'});
 if(!response.ok)throw new Error(`Jarir search HTTP ${response.status}`);
 return {products:parseJarirResponse(JSON.parse(text),query.term),notice:'جرير: أول 20 اقتراح منتج من البحث السعودي العام، بالسعر الكامل شامل الضريبة وليس القسط الشهري. راجع الموديل والسعة واللون والضمان والتوفر لدى المتجر.'};
}
export const jarir:StoreConnector={id:'jarir',name:'جرير',enabled:true,preserveSearchTerm:true,search:searchJarir};

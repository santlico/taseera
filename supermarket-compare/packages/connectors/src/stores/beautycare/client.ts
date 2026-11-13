import type {Product,SearchQuery,ConnectorSearchResult} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
export function parseBeautycareResponse(data:unknown):Product[]{
 const d=data as any;
 if(d?.status!==200||d.success!==true||!Array.isArray(d.data))throw new Error('Beautycare search response invalid');
 const products=new Map<string,Product>();
 for(const p of d.data){
  if(p.status!=='sale')continue;
  const id=String(p.id),price=p.price;
  if(!/^\d+$/.test(id)||typeof p.name!=='string'||!p.name.trim()||p.currency!=='SAR'||!(p.with_tax===true||(p.with_tax===false&&p.is_taxable===false))||typeof price!=='number'||!Number.isFinite(price)||price<=0||p.is_dynamic_pricing===true)throw new Error('Beautycare product price/context invalid');
  let url:URL;try{url=new URL(p.url);}catch{throw new Error('Beautycare product URL invalid');}
  if(url.origin!=='https://beautycare.sa'||url.username||url.password||!url.pathname.startsWith('/ar/')||!url.pathname.endsWith(`/p${id}`))throw new Error('Beautycare product URL mismatch');
  let imageUrl:string|undefined;try{const u=new URL(p.image?.url||p.original_image);if(u.origin==='https://cdn.salla.sa'&&u.pathname.startsWith('/dprOK/')&&!u.username&&!u.password)imageUrl=u.href;}catch{}
  products.set(id,{store:'beautycare',id,name:p.name.trim(),price,currency:'SAR',url:url.href,imageUrl,brand:p.brand?.name,
   availability:p.is_out_of_stock===true||p.is_available===false?'out_of_stock':p.is_available===true?'in_stock':'unknown',
   location:'بيوتي كير · السعودية · كتالوج الإنترنت دون تحديد عنوان',fetchedAt:new Date().toISOString()});
 }
 return [...products.values()];
}
export async function searchBeautycare(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
 if(query.storeLocationId)throw new Error('Beautycare custom delivery address not supported');
 const url=new URL('https://api.salla.dev/store/v1/products');url.search=new URLSearchParams({source:'search',source_value:query.term,limit:'20'}).toString();
 const {response,text}=await fetchStoreDocument('beautycare',url,{signal,headers:{Accept:'application/json','Store-Identifier':'345490712',currency:'SAR','Accept-Language':'ar'}});
 if(!response.ok)throw new Error(`Beautycare search HTTP ${response.status}`);
 return {products:parseBeautycareResponse(JSON.parse(text)),notice:'بيوتي كير: أول صفحة من كتالوج المتجر السعودي، بالسعر الحالي المعروض؛ بعض المنتجات غير خاضعة للضريبة حسب المصدر. تأكد من العبوة والسعر والتوفر والشحن النهائي لدى المتجر.'};
}

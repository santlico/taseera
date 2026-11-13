import type {Product,SearchQuery,StoreConnector} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
export function blackboxGuestToken(token:unknown):string{
 if(typeof token!=='string'||token.length>8192||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token))throw new Error('Blackbox guest context invalid');
 let claims:any;try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));}catch{throw new Error('Blackbox guest context invalid');}
 if(claims.storeName!=='ar'||typeof claims.exp!=='number'||!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now())throw new Error('Blackbox guest context expired');
 return token;
}
export function parseBlackboxResponse(payload:unknown):Product[]{
 const d=(payload as any)?.data;
 if(!Array.isArray(d?.products)||d.currentPage!==0||!Number.isInteger(d.totalProducts)||d.totalProducts<0)throw new Error('Blackbox search context missing');
 const products=new Map<string,Product>();
 for(const item of d.products){
  const id=item?.sku,slug=item?.rewrite_url,name=Array.isArray(item?.name)?item.name[0]:item?.name,price=item?.prices_with_tax?.price;
  if(typeof id!=='string'||!/^\d{8,20}$/.test(id)||typeof slug!=='string'||slug.includes('..')||!new RegExp('^[a-z0-9][a-z0-9._-]*-p-'+id+'$','i').test(slug)||typeof name!=='string'||!name.trim()||typeof price!=='number'||!Number.isFinite(price)||price<=0)continue;
  let imageUrl:string|undefined;
  for(const candidate of Array.isArray(item._media_?.image)?item._media_.image:[]){try{const image=new URL(candidate.image);if(image.origin==='https://store.ops.blackbox.com.sa'&&!image.username&&!image.password&&image.pathname.startsWith('/media/')&&image.pathname.includes('/catalog/product/')&&!image.search&&!image.hash){imageUrl=image.href;break;}}catch{}}
  const rawBrand=item.option_text_brand||item.option_text_a_brand,brand=Array.isArray(rawBrand)?rawBrand[0]:rawBrand;
  products.set(id,{store:'blackbox',id,name:name.trim(),price:Math.round(price*100)/100,currency:'SAR',url:'https://www.blackbox.com.sa/product/'+slug,imageUrl,brand:typeof brand==='string'?brand:undefined,availability:item.stock?.is_in_stock===true?'in_stock':item.stock?.is_in_stock===false?'out_of_stock':'unknown',location:'الصندوق الأسود · السعودية · التوصيل والتوفر حسب المنطقة',fetchedAt:new Date().toISOString()});
 }
 if(d.products.length&&!products.size)throw new Error('Blackbox returned no valid product offers');
 if(d.totalProducts>0&&!d.products.length)throw new Error('Blackbox listing missing products');
 return [...products.values()];
}
export async function searchBlackbox(query:SearchQuery,signal:AbortSignal){
 if(query.storeLocationId)throw new Error('Blackbox custom delivery region not supported');
 // Obtain a fresh anonymous storefront handshake, never a signed-in user's session.
 const bootstrap=await fetchStoreDocument('blackbox','https://api.ops.blackbox.com.sa/api/v1/handshake',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({store:'ar'}),signal,redirect:'error'});
 if(!bootstrap.response.ok)throw new Error(`Blackbox bootstrap HTTP ${bootstrap.response.status}`);
 let guest:any;try{guest=JSON.parse(bootstrap.text);}catch{throw new Error('Blackbox guest bootstrap invalid');}
 const token=blackboxGuestToken(guest?.token);
 const url=new URL('https://api.ops.blackbox.com.sa/api/v1/search_rules/products/searchQuery');
 for(const [key,value] of Object.entries({search:query.term,pageNo:'0',pageSize:'30',sortBy:'default',sortDir:'ASC'}))url.searchParams.set(key,value);
 for(const field of ['sku','entity_id','name','prices_with_tax','_media_','rewrite_url','stock','option_text_brand','option_text_a_brand'])url.searchParams.append('select',field);
 const {response,text}=await fetchStoreDocument('blackbox',url,{signal,redirect:'error',headers:{Accept:'application/json',Authorization:'Bearer '+token}});
 if(!response.ok)throw new Error(`Blackbox search HTTP ${response.status}`);
 return {products:parseBlackboxResponse(JSON.parse(text)),notice:'الصندوق الأسود: أول 30 نتيجة من البحث السعودي بسعر الشراء الحالي شامل الضريبة، دون خصم استرجاع نقدي أو احتساب سعر العضوية. تحقق من البائع والموديل والسعة واللون والضمان والتوفر والتوصيل لدى المتجر.'};
}
export const blackbox:StoreConnector={id:'blackbox',name:'الصندوق الأسود',enabled:process.env.NODE_ENV==='development',preserveSearchTerm:true,search:searchBlackbox};

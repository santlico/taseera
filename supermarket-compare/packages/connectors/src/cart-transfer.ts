import {Agent} from 'undici';
import {cartTransferStores,canTransferCart} from '../../core/src/cart';
const dispatcher=new Agent({connect:{family:4}});
export interface TransferLine {id:string;quantity:number}
export async function prepareStoreCart(store:string,items:TransferLine[],signal:AbortSignal){
 if(!canTransferCart(store)||!Array.isArray(items)||!items.length||items.length>20||items.some(i=>!i||!/^\d{1,16}$/.test(i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>99)||new Set(items.map(i=>i.id)).size!==items.length)throw new Error('INVALID_CART');
 const config=cartTransferStores[store];
 async function request(path:string,body?:unknown){
  // No automatic retries on cart writes: a lost response must never double-add a line.
  const r=await fetch('https://api.salla.dev/store/v2/checkout'+path,{dispatcher,method:body===undefined?'GET':'POST',signal,redirect:'error',cache:'no-store',headers:{Accept:'application/json','Content-Type':'application/json','Store-Identifier':config.id,'s-source':'app','s-app-name':'Taseera','s-app-version':'1.0',currency:'SAR','Accept-Language':'ar','User-Agent':'Taseera/1.0'},...(body!==undefined?{body:JSON.stringify(body)}:{})} as RequestInit&{dispatcher:Agent});
  const d=await r.json();if(!r.ok||d?.success!==true||!d.data)throw new Error('STORE_CART_FAILED');return d.data;
 }
 const generated=await request('/generate',{});
 const id=generated.id;
 if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{10,160}$/.test(id)||String(generated.store_id)!==config.id)throw new Error('STORE_CART_INVALID');
 for(const item of items){try{await request(`/${id}/items`,{identifier_type:'id',identifier:item.id,quantity:item.quantity});}catch{throw new Error(`ITEM_REQUIRES_REVIEW:${item.id}`);}}
 const cart=await request(`/${id}?include_items=true`);
 if(String(cart.store_id)!==config.id||cart.currency?.code!=='SAR'||!Array.isArray(cart.items)||cart.items.length!==items.length||items.some(i=>!cart.items.some((p:any)=>String(p.product_id)===i.id&&Number(p.quantity)===i.quantity)))throw new Error('STORE_CART_NOT_VERIFIED');
 const url=new URL(cart.checkout_url);
 if(url.origin!==config.origin||url.username||url.password||!url.pathname.startsWith('/ar/checkout/')||!url.pathname.endsWith('/'+id))throw new Error('STORE_CART_URL_INVALID');
 return {url:url.href,count:items.length};
}

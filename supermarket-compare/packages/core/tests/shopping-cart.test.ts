import {test} from 'node:test';import assert from 'node:assert/strict';
import {addShoppingItem,restoreShoppingCart,shoppingTotal,shoppingKey,type ShoppingItem} from '../src/cart';
import {prepareStoreCart} from '../../connectors/src/cart-transfer';import type {Product} from '../src/index';
const p:Product={store:'beautycare',id:'1861130304',name:'شامبو',price:10.15,currency:'SAR',url:'https://beautycare.sa/ar/shampoo/p1861130304',availability:'in_stock',location:'السعودية',fetchedAt:new Date().toISOString()};
test('shopping cart merges only exact store and product IDs, retains quantities and computes money in cents',()=>{
 let rows=addShoppingItem([],p);rows=addShoppingItem(rows,p);assert.equal(rows.length,1);assert.equal(rows[0].quantity,2);assert.equal(shoppingTotal(rows),20.3);
 assert.notEqual(shoppingKey(p),shoppingKey({...p,store:'outlet'}));assert.equal(addShoppingItem(rows,{...p,availability:'out_of_stock'}),rows);
 const restored=restoreShoppingCart(JSON.parse(JSON.stringify(rows)),['beautycare']);assert.equal(restored[0].quantity,2);assert.equal(restored[0].product.price,p.price);assert.equal(restored[0].product.id,p.id);
 assert.deepEqual(restoreShoppingCart([{product:{...p,url:'https://evil.example/'},quantity:1},{product:p,quantity:-1},{product:p,quantity:100}],['beautycare']),[]);
 assert.deepEqual(restoreShoppingCart(rows,['outlet']),[]);
});
test('store transfer requires exact verified product IDs and quantities before returning a checkout URL',async(t)=>{
 const cartId='abcdefghij1234567890';const base={id:cartId,store_id:'345490712',currency:{code:'SAR'},checkout_url:`https://beautycare.sa/ar/checkout/${cartId}`};let calls=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{calls++;assert.equal(new Headers(init?.headers).get('Store-Identifier'),'345490712');assert.equal(init?.redirect,'error');
  const u=new URL(String(input));assert.equal(u.origin,'https://api.salla.dev');
  if(calls===1){assert.equal(init?.body,'{}');return Response.json({success:true,data:base});}
  if(calls===2){assert.deepEqual(JSON.parse(String(init?.body)),{identifier_type:'id',identifier:p.id,quantity:2});return Response.json({success:true,data:base});}
  assert.equal(u.searchParams.get('include_items'),'true');return Response.json({success:true,data:{...base,items:[{product_id:p.id,quantity:2}]}});
 });
 const result=await prepareStoreCart('beautycare',[{id:p.id,quantity:2}],new AbortController().signal);assert.equal(result.url,base.checkout_url);assert.equal(calls,3);
});
test('store transfer rejects unsupported, duplicate and oversized carts without a network call',async(t)=>{
 const mock=t.mock.method(globalThis,'fetch',async()=>{throw new Error('must not fetch');});
 for(const [store,items] of [['noon',[{id:'1',quantity:1}]],['beautycare',[]],['beautycare',[{id:'1',quantity:0}]],['beautycare',[{id:'1',quantity:1},{id:'1',quantity:2}]],['beautycare',Array.from({length:21},(_,i)=>({id:String(i),quantity:1}))]] as const){await assert.rejects(prepareStoreCart(store,items as any,new AbortController().signal),/INVALID_CART/);}
 assert.equal(mock.mock.callCount(),0);
});
test('store transfer never returns a partial cart, wrong quantities or an off-site checkout URL',async(t)=>{
 const base={id:'abcdefghij1234567890',store_id:'345490712',currency:{code:'SAR'},checkout_url:'https://evil.example/ar/checkout/abcdefghij1234567890'};
 for(const items of [[{product_id:p.id,quantity:1}],[{product_id:p.id,quantity:2}]]){let calls=0;t.mock.method(globalThis,'fetch',async()=>Response.json({success:true,data:{...base,...(++calls===3?{items}:{})}}));await assert.rejects(prepareStoreCart('beautycare',[{id:p.id,quantity:2}],new AbortController().signal),/STORE_CART_(NOT_VERIFIED|URL_INVALID)/);}
});
test('failed cart writes are not automatically retried',async(t)=>{let calls=0;t.mock.method(globalThis,'fetch',async()=>{if(++calls===1)return Response.json({success:true,data:{id:'abcdefghij1234567890',store_id:'345490712'}});throw new Error('response lost');});await assert.rejects(prepareStoreCart('beautycare',[{id:p.id,quantity:2}],new AbortController().signal),/ITEM_REQUIRES_REVIEW/);assert.equal(calls,2);});

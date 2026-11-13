import {test} from 'node:test';import assert from 'node:assert/strict';import {parseBeautycareResponse,searchBeautycare} from '../../connectors/src/stores/beautycare/client';import {scopeStores} from '../../../apps/web/app/search-scope';
const product={id:'1861130304',name:'شامبو وغسول أطفال',status:'sale',price:55,regular_price:70,currency:'SAR',with_tax:true,is_taxable:true,is_available:true,url:'https://beautycare.sa/ar/baby-shampoo/p1861130304',image:{url:'https://cdn.salla.sa/dprOK/products/test.jpg'}};
const data=(items:unknown[]=[product])=>({status:200,success:true,data:items});
test('Beauty Care uses current SAR offer, explicit stock, fixed official product/image context',()=>{
 const [p]=parseBeautycareResponse(data());assert.equal(p.price,55);assert.equal(p.imageUrl,product.image.url);assert.equal(p.availability,'in_stock');
 assert.equal(parseBeautycareResponse(data([{...product,is_available:false}]))[0].availability,'out_of_stock');assert.deepEqual(parseBeautycareResponse(data([])),[]);assert.deepEqual(parseBeautycareResponse(data([{...product,status:'hidden'}])),[]);
 for(const bad of [{...product,currency:'USD'},{...product,price:0},{...product,with_tax:false},{...product,url:'https://evil.example/ar/x/p1861130304'}])assert.throws(()=>parseBeautycareResponse(data([bad])));
});
test('Beauty Care search requests its store ID and Saudi currency without customer session',async(t)=>{
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{assert.equal(new URL(String(input)).searchParams.get('source_value'),'شامبو');assert.equal(new Headers(init?.headers).get('Store-Identifier'),'345490712');assert.equal(new Headers(init?.headers).get('currency'),'SAR');return Response.json(data());});
 assert.equal((await searchBeautycare({term:'شامبو',city:'الرياض'},new AbortController().signal)).products.length,1);assert.ok(scopeStores('beauty').some(s=>s.id==='beautycare'));
});

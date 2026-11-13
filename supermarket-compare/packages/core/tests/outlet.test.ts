import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOutletResponse,searchOutlet} from '../../connectors/src/stores/outlet/client';
import {scopeStores} from '../../../apps/web/app/search-scope';
const p={id:'2087249426',name:'سيتافيل لوشن مرطب 236مل',status:'sale',currency:'SAR',with_tax:true,price:57.5,regular_price:80,is_available:true,url:'https://outletpharmacyonline.sa/ar/cetaphil/p2087249426',image:{url:'https://cdn.salla.sa/aeogjR/test.png'}};
const data=(items:unknown[]=[p])=>({status:200,success:true,data:items});
test('Outlet validates current tax-inclusive SAR price, stock, official domain and images',()=>{
 const [offer]=parseOutletResponse(data());assert.equal(offer.price,57.5);assert.equal(offer.availability,'in_stock');assert.equal(offer.imageUrl,p.image.url);
 assert.equal(parseOutletResponse(data([{...p,is_out_of_stock:true}]))[0].availability,'out_of_stock');
 assert.deepEqual(parseOutletResponse(data([])),[]);assert.deepEqual(parseOutletResponse(data([{...p,status:'hidden'}])),[]);
 for(const bad of [{...p,price:0},{...p,currency:'AED'},{...p,with_tax:false},{...p,url:'https://evil.example/ar/x/p2087249426'}])assert.throws(()=>parseOutletResponse(data([bad])));
 assert.throws(()=>parseOutletResponse({success:false}));
});
test('Outlet uses its public store-specific search without sessions and belongs to requested beauty scope',async(t)=>{
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{const u=new URL(String(input));assert.equal(u.searchParams.get('source'),'search');assert.equal(u.searchParams.get('source_value'),'سيتافيل');assert.equal(new Headers(init?.headers).get('Store-Identifier'),'1030092989');return Response.json(data());});
 assert.equal((await searchOutlet({term:'سيتافيل',city:'الرياض'},new AbortController().signal)).products.length,1);
 assert.ok(scopeStores('beauty').some(s=>s.id==='outlet'));
});

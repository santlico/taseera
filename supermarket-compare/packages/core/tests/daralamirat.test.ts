import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDaralamiratResponse,searchDaralamirat} from '../../connectors/src/stores/daralamirat/client';
import {scopeStores} from '../../../apps/web/app/search-scope';
const item={id:'1702435220_ar',lang:'ar',status:'sale',name:'سيتافيل كريم مرطب - 453 جرام',price:120,sale_price:79.6,is_sale:true,is_available:true,url:'https://daralamirat.com.sa/ar/cetaphil-453g/p1702435220',main_image:'https://cdn.salla.sa/onqKZz/cetaphil.png'};
const data=(results:unknown[]=[item])=>({code:200,response:{results,found_documents:results.length}});
test('Dar Al Amirat reads actual sale price and verified product/image context, excludes hidden products',()=>{
 const [p]=parseDaralamiratResponse(data([item,item,{...item,status:'hidden'}]));assert.equal(parseDaralamiratResponse(data([item,item])).length,1);assert.equal(p.price,79.6);assert.equal(p.availability,'in_stock');assert.equal(p.url,item.url);assert.equal(p.imageUrl,item.main_image);
 assert.deepEqual(parseDaralamiratResponse(data([])),[]);assert.deepEqual(parseDaralamiratResponse(data([{...item,status:'hidden'}])),[]);
 for(const d of [{code:500},data([{...item,sale_price:0}]),data([{...item,url:'https://evil.example/ar/x/p1702435220'}])])assert.throws(()=>parseDaralamiratResponse(d));
});
test('Dar Al Amirat uses public store-specific settings and Arabic visible-stock search without sessions',async(t)=>{
 let calls=0;const signal=new AbortController().signal;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{calls++;assert.equal(init?.signal,signal);
  if(calls===1)return Response.json({response:{projectId:'salla_1945128061',searchAPIKey:'public-search-only',isTax:true}});
  const u=new URL(String(input));assert.equal(u.searchParams.get('q'),'سيتافيل');assert.equal(u.searchParams.get('status'),'sale');assert.equal(u.searchParams.get('is_available'),'true');return Response.json(data());
 });
 assert.equal((await searchDaralamirat({term:'سيتافيل',city:'الرياض'},signal)).products.length,1);
});
test('beauty source is available in all/beauty scopes and never mislabeled as grocery or pharmacy',()=>{
 assert.ok(scopeStores('beauty').some(s=>s.id==='daralamirat'));assert.ok(scopeStores('all').some(s=>s.id==='daralamirat'));
 assert.ok(!scopeStores('pharmacy').some(s=>s.id==='daralamirat'));assert.ok(!scopeStores('grocery').some(s=>s.id==='daralamirat'));
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../../../apps/web/app/api/search/route';
import {requestStore} from '../../../apps/web/app/search-client';

test('API rejects empty, oversized, and unknown-store requests without upstream calls',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('unexpected upstream call');});
 for(const params of ['', 'q='+ 'x'.repeat(201),'q=milk&city='+ 'x'.repeat(101),'q=milk&store=unknown']){
  const response=await GET(new Request('http://localhost/api/search?'+params));
  assert.equal(response.status,400);
 }
 assert.equal(fetch.mock.callCount(),0);
});
test('disabled stores are represented explicitly without fetching or invented prices',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('must not fetch');});
 const response=await GET(new Request('http://localhost/api/search?q=milk&store=lulu'));
 const data=await response.json();assert.equal(data.results[0].status,'not_configured');assert.deepEqual(data.results[0].products,[]);assert.equal(fetch.mock.callCount(),0);
});
test('client requests only the chosen store and rejects a mismatched result',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input),'http://localhost');assert.equal(url.searchParams.get('q'),'حليب');assert.deepEqual(url.searchParams.getAll('store'),['ninja']);assert.ok(init?.signal);
  return Response.json({results:[{store:'ninja',status:'ok',products:[],durationMs:0}]});
 });
 assert.equal((await requestStore('حليب','ninja',new AbortController().signal)).store,'ninja');
 fetch.mock.mockImplementation(async()=>Response.json({results:[{store:'amazon',status:'ok',products:[]}]}));
 await assert.rejects(requestStore('حليب','ninja',new AbortController().signal),/استجابة/);
});
test('client propagates cancellation to an outstanding store request',async(t)=>{
 t.mock.method(globalThis,'fetch',async(_input:unknown,init?:RequestInit)=>new Promise<Response>((_,reject)=>{
  init?.signal?.addEventListener('abort',()=>reject(init.signal?.reason),{once:true});
 }));
 const controller=new AbortController();const request=requestStore('حليب','ninja',controller.signal);controller.abort();await assert.rejects(request);
});

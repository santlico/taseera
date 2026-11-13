import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../../../apps/web/app/api/hungerstation-image/route';
import {productImageSrc} from '../../../apps/web/app/product-image';
const png=new Uint8Array([137,80,78,71,13,10,26,10,0]);
const request=(id:string)=>new Request(`http://localhost/api/hungerstation-image?id=${encodeURIComponent(id)}`);
test('image route accepts only asset IDs, never arbitrary upstream URLs or traversal',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw Error('must not fetch');});
 for(const id of ['','../secret.png','https://example.com/milk.png','milk.svg','milk.png?width=2000','a'.repeat(129)+'.png'])assert.equal((await GET(request(id))).status,400);
 assert.equal(fetch.mock.callCount(),0);
});
test('image route fixes CDN and thumbnail size, returns actual image bytes with cache and no cookies',async(t)=>{
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  assert.equal(String(input),'https://hungerstation.dhmedia.io/image/product-information-management/milk.png?width=350&quality=75&webp=true');
  assert.equal(init?.redirect,'error');assert.ok(init?.signal);assert.equal(new Headers(init?.headers).has('cookie'),false);
  return new Response(png,{headers:{'content-type':'image/png; width=350','set-cookie':'upstream=value'}});
 });
 const r=await GET(request('milk.png'));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');
 assert.match(r.headers.get('cache-control')!,/s-maxage/);assert.equal(r.headers.get('set-cookie'),null);
 assert.deepEqual(new Uint8Array(await r.arrayBuffer()),png);
});
test('image route rejects HTML, forged images, oversized streams, HTTP failures, and network failure without caching errors',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>new Response('html',{headers:{'content-type':'text/html'}}));
 for(const makeResponse of [()=>new Response('html',{headers:{'content-type':'image/png'}}),()=>new Response(png,{status:403,headers:{'content-type':'image/png'}}),()=>new Response(new Uint8Array(512*1024+1),{headers:{'content-type':'image/png'}}),()=>{throw Error('reset');}]){
  fetch.mock.mockImplementation(async()=>makeResponse());const r=await GET(request('milk.png'));assert.equal(r.status,502);assert.equal(r.headers.get('cache-control'),'no-store');
 }
});
test('only Hungerstation images use same-origin route; invalid sources remain absent',()=>{
 const imageUrl='https://hungerstation.dhmedia.io/image/product-information-management/milk.jpg?width=350';
 assert.equal(productImageSrc({store:'hungerstation',imageUrl}),'/api/hungerstation-image?id=milk.jpg');
 assert.equal(productImageSrc({store:'danube',imageUrl}),imageUrl);
 for(const value of [undefined,imageUrl.replace('hungerstation.dhmedia.io','example.com'),imageUrl.replace('https://','https://user@')])assert.equal(productImageSrc({store:'hungerstation',imageUrl:value}),undefined);
});

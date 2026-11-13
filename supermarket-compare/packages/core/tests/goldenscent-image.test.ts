import {test} from 'node:test';import assert from 'node:assert/strict';
import {fetchGoldenscentImage,validGoldenscentImagePath} from '../../connectors/src/stores/goldenscent/image';
import {productImageSrc} from '../../../apps/web/app/product-image';
const path='2/1/21gs100954_-_dior.png';
test('Golden Scent images use same-origin route with only a fixed product path',()=>{
 assert.equal(productImageSrc({store:'goldenscent',imageUrl:'https://assets.goldenscent.com/catalog/product/'+path}),'/api/goldenscent-image?path='+encodeURIComponent(path));
 for(const value of ['../secret.png','https://evil.example/x.png','2/1/test.svg','2/1/%2fsecret.png','2/1/test.png?url=https://evil.example'])assert.equal(validGoldenscentImagePath(value),false);
 assert.equal(productImageSrc({store:'goldenscent',imageUrl:'https://evil.example/catalog/product/'+path}),undefined);
});
test('Golden Scent fetch validates image bytes and refuses HTML or oversized content',async(t)=>{
 const png=Buffer.from([137,80,78,71,13,10,26,10,1]);
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{assert.equal(String(input),'https://assets.goldenscent.com/catalog/product/'+path);assert.equal(new Headers(init?.headers).get('User-Agent'),'Taseera/1.0');assert.equal(init?.redirect,'error');return new Response(png,{headers:{'content-type':'image/png'}});});
 assert.equal((await fetchGoldenscentImage(path,new AbortController().signal)).bytes.length,png.length);
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>denied</html>',{headers:{'content-type':'image/png'}}));await assert.rejects(fetchGoldenscentImage(path,new AbortController().signal),/signature/);
 t.mock.method(globalThis,'fetch',async()=>new Response(png,{headers:{'content-type':'image/png','content-length':'99999999'}}));await assert.rejects(fetchGoldenscentImage(path,new AbortController().signal),/upstream/);
 await assert.rejects(fetchGoldenscentImage('../x',new AbortController().signal),/Invalid/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseInnovaResponse,searchInnova} from '../../connectors/src/stores/innova/client';
const term='سيتافيل';
const item={objectID:'2119',name:'سيتافيل كريم مرطب 453 جرام',innova_url:'cetaphil-moisturizing-cream-453g',display_price:89.01,prices_with_tax:{price:89.01,original_price:197.8,discounted_price:89.01},stock:{is_in_stock:true},_media_:{image:[{image:'https://img.innovapharmacy.com/media//catalog/product/1/0/x.jpg'}]}};
function page(products:unknown[]=[item],q=term){const flight='0:'+JSON.stringify({c:['','search?q='+encodeURIComponent(q)]})+'\n1:'+JSON.stringify({products,numberOfHits:products.length,numberOfPages:1})+'\n';return `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`;}
test('Innova reads current VAT-inclusive price, real product route, image and explicit stock without recalculating offers',()=>{
 const [p]=parseInnovaResponse(page([item,item]),term);assert.equal(parseInnovaResponse(page([item,item]),term).length,1);assert.equal(p.price,89.01);assert.equal(p.name,item.name);assert.equal(p.availability,'in_stock');assert.equal(p.url,'https://innovapharmacy.com/cetaphil-moisturizing-cream-453g');assert.match(p.imageUrl!,/^https:\/\/img.innovapharmacy.com/);
 assert.equal(parseInnovaResponse(page([{...item,display_price:undefined,prices_with_tax:{price:41.4,discounted_price:0},cart_rule:[{discount_amount:80}]}]),term)[0].price,41.4);
});
test('Innova distinguishes empty searches from missing context and rejects invalid prices and unsafe paths/images',()=>{
 assert.deepEqual(parseInnovaResponse(page([]),term),[]);
 const root='0:'+JSON.stringify({c:['','search?q='+encodeURIComponent(term)]})+'\n';
 assert.deepEqual(parseInnovaResponse(`<main>لم نجد نتائج مطابقة للبحث</main><script>self.__next_f.push([1,${JSON.stringify(root)}])</script>`,term),[]);
 for(const html of ['<html></html>',page([], 'other'),page([{...item,display_price:0}]),page([{...item,innova_url:'../private'}])])assert.throws(()=>parseInnovaResponse(html,term));
 const [p]=parseInnovaResponse(page([{...item,_media_:{image:[{image:'https://evil.example/x.jpg'}]},stock:{is_in_stock:false}}]),term);assert.equal(p.imageUrl,undefined);assert.equal(p.availability,'out_of_stock');
 assert.throws(()=>parseInnovaResponse('<script>self.__next_f.push([1,(()=>{throw Error()})()])</script>',term));
});
test('Innova requests the public Arabic search with full original query and cancellation',async(t)=>{
 const signal=new AbortController().signal;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{const url=new URL(String(input));assert.equal(url.pathname,'/search');assert.equal(url.searchParams.get('q'),term);assert.equal(init?.signal,signal);const r=new Response(page());Object.defineProperty(r,'url',{value:url.href});return r;});
 assert.equal((await searchInnova({term,city:'الرياض'},signal)).products.length,1);
});

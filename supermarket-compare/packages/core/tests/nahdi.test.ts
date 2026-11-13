import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNahdiResponse} from '../../connectors/src/stores/nahdi/client';
import {nahdi} from '../../connectors/src/stores/nahdi/index';
import {searchStores,searchRelevance} from '../src/index';
const term='سيتافيل';
const card=(price='71.07',href='/ar-sa/cetaphil-225-gm/pdp/101257243')=>`<div class="js-plp-product"><a href="${href}"><img src="https://ecombe.nahdionline.com/media/catalog/product/1/0/milk.jpg?width=265"></a><a href="${href}"><span class="line-clamp-3">سيتافيل كريم 225 جم</span><span dir="ltr"><svg id="sar_symbol_svg__Layer_1"><style>.currency{fill:#000}</style></svg>${price}</span><span class="line-through" dir="ltr">109.25</span></a></div>`;
const page=(cards=card(),q=term)=>`<html><body><script type="application/ld+json">${JSON.stringify({'@type':'BreadcrumbList',itemListElement:[{item:{'@id':`https://www.nahdionline.com/ar-sa/search?query=${encodeURIComponent(q)}`}}]})}</script>${cards}</body></html>`;
test('pharmacy relevance recognizes brand spellings while retaining explicit strength and pack numbers',()=>{
 const [p]=parseNahdiResponse(page(),term);
 const medicine={...p,name:'بانادول 500 مجم 24 قرص'};
 assert.equal(searchRelevance(medicine,'بنادول 500'),1);
 assert.equal(searchRelevance(medicine,'Panadol 500'),1);
 assert.equal(searchRelevance(medicine,'بنادول 1000'),0);
 assert.equal(searchRelevance(medicine,'بنادول 500 48 قرص'),0);
});
test('Nahdi extracts actual SAR offer, full title and observed product/image links, with unknown shipping stock',()=>{
 const [p]=parseNahdiResponse(page(card()+card()),term);
 assert.equal(parseNahdiResponse(page(card()+card()),term).length,1);assert.equal(p.id,'101257243');assert.equal(p.name,'سيتافيل كريم 225 جم');assert.equal(p.price,71.07);
 assert.equal(p.url,'https://www.nahdionline.com/ar-sa/cetaphil-225-gm/pdp/101257243');assert.match(p.imageUrl!,/^https:\/\/ecombe.nahdionline.com\/media\/catalog\/product\//);assert.equal(p.availability,'unknown');assert.match(p.location,/غير محددين/);
});
test('Nahdi empty search requires explicit visible no-results text and correct query context',()=>{
 assert.deepEqual(parseNahdiResponse(page('<p>عذرًا! لم نتمكن من العثور على أي نتائج مطابقة</p>'),term),[]);
 for(const html of [page(''),page('', 'other'),'<html></html>',page('').replace('/ar-sa/','/ar-ae/'),page('<script>لم نتمكن من العثور على أي نتائج مطابقة</script>')])assert.throws(()=>parseNahdiResponse(html,term));
});
test('Nahdi rejects foreign, credentialed, or malformed links, invalid prices and unsafe images',()=>{
 for(const href of ['https://evil.example/ar-sa/test/pdp/101257243','https://user@www.nahdionline.com/ar-sa/test/pdp/101257243','/ar-ae/test/pdp/101257243','/ar-sa/test/pdp/invalid'])assert.throws(()=>parseNahdiResponse(page(card('7',href)),term),/invalid/);
 for(const price of ['0','-1','','NaN','7 USD'])assert.throws(()=>parseNahdiResponse(page(card(price)),term),/invalid/);
 const [p]=parseNahdiResponse(page(card().replace('https://ecombe.nahdionline.com/media/','https://evil.example/media/')),term);assert.equal(p.imageUrl,undefined);
 assert.equal(parseNahdiResponse(page(card('0')+card()),term).length,1);
});
test('Nahdi preserves concentration and container volume in the upstream query',async(t)=>{
 const query='شراب 120 مجم / 5 مل';
 t.mock.method(globalThis,'fetch',async(input:unknown,options?:RequestInit)=>{
  const url=new URL(String(input));assert.equal(url.searchParams.get('query'),query);assert.ok(options?.signal);
  const response=new Response(page(card(),query),{headers:{'content-type':'text/html'}});Object.defineProperty(response,'url',{value:url.href});return response;
 });
 const {results:[result]}=await searchStores({term:query,city:'الرياض'},[nahdi]);assert.equal(result.status,'ok');assert.equal(result.products.length,1);
});
test('Nahdi rejects HTTP denials and mismatched response context instead of false empty results',async(t)=>{
 const fetch=t.mock.method(globalThis,'fetch',async()=>new Response('',{status:403}));
 const {results:[result]}=await searchStores({term,city:'الرياض'},[nahdi]);assert.equal(result.status,'error');
 fetch.mock.mockImplementation(async()=>{const r=new Response(page());Object.defineProperty(r,'url',{value:'https://www.nahdionline.com/ar-ae/search'});return r;});
 assert.equal((await searchStores({term,city:'الرياض'},[nahdi])).results[0].status,'error');
});

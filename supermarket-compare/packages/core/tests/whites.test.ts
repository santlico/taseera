import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseWhitesResponse,whitesProductUrl,searchWhites} from '../../connectors/src/stores/whites/client';
const term='سيتافيل';
const item={objectID:'10347',title:'Cetaphil Face and Body Moisturizing Cream Jar 453 g',title_ar:'سيتافيل كريم مرطب للوجه والجسم علبة 453 جم',price:'197.69 SAR',sale_price:'98.84 SAR',stock:'204',image_link:'https://cd3c14-whites.akinoncloudcdn.com/products/2025/09/09/x.jpg'};
const data=(hits:unknown[]=[item])=>({query:term,nbHits:hits.length,hits});
test('Whites reads Arabic title, current SAR sale price and explicit stock with the same slug rule as the public UI',()=>{
 const [p]=parseWhitesResponse(data([item,item]),term);assert.equal(parseWhitesResponse(data([item,item]),term).length,1);assert.equal(p.price,98.84);assert.equal(p.name,item.title_ar);assert.equal(p.availability,'in_stock');
 assert.equal(p.url,'https://www.whites.sa/ar-sa/cetaphil-face-and-body-moisturizing-cream-jar-453-g/');assert.equal(p.imageUrl,item.image_link);
 assert.equal(parseWhitesResponse(data([{...item,sale_price:'',stock:'0'}]),term)[0].price,197.69);
 assert.equal(parseWhitesResponse(data([{...item,stock:undefined}]),term)[0].availability,'unknown');
});
test('Whites accepts valid empty searches but rejects mismatched query, unsafe links, other currencies and invalid prices',()=>{
 assert.deepEqual(parseWhitesResponse(data([]),term),[]);assert.throws(()=>parseWhitesResponse({...data(),query:'other'},term));
 for(const x of [{...item,sale_price:'98.84 AED'},{...item,sale_price:'0 SAR'},{...item,url:'https://evil.example/ar-sa/product/'}])assert.throws(()=>parseWhitesResponse(data([x]),term));
 assert.equal(whitesProductUrl({title:'Test, Product (50 ml)'}),'https://www.whites.sa/ar-sa/test-product-50-ml/');
 assert.equal(whitesProductUrl({absolute_url:'https://user@www.whites.sa/ar-sa/x/'}),undefined);
 assert.equal(parseWhitesResponse(data([{...item,image_link:'https://evil.example/products/x.jpg'}]),term)[0].imageUrl,undefined);
});
test('Whites public search preserves the complete query, caller cancellation and disables analytics',async(t)=>{
 const signal=new AbortController().signal;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  assert.match(String(input),/ahyko0telx-dsn.algolia.net\/1\/indexes\/whites_extensions_prod\/query/);assert.equal(init?.signal,signal);
  const body=JSON.parse(String(init?.body));assert.equal(body.query,term);assert.equal(body.analytics,false);assert.equal(body.clickAnalytics,false);assert.equal(body.userToken,undefined);return Response.json(data());
 });
 assert.equal((await searchWhites({term,city:'الرياض'},signal)).products.length,1);
});

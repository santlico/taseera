import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseUnitedConfig,parseUnitedResponse,searchUnited} from '../../connectors/src/stores/united/client';
const term='سيتافيل';
const item={objectID:'8377',visibility_search:1,name:'سيتافيل كريم 100جم',url:'https://unitedpharmacy.sa/ar/cetaphil-100-gm.html',price:{SAR:{default:83.95,bv_default_original:167.9}},in_stock:1,custom_in_stock:true,image_url:'https://imagenew.unitedpharmacy.sa/live/media/catalog/product/x.webp?width=265'};
const response=(hits:unknown[]=[item])=>({query:term,nbHits:hits.length,hits});
const config={applicationId:'Y1GOQ9DTV8',apiKey:'public-search-only',indexName:'unitedpharmacy_livear',currencyCode:'SAR',customerGroupId:0,priceKey:'.SAR.default',instant:{default_address:'Jeddah'}};
test('United reads public guest Saudi config without executing scripts and rejects changed region/price context',()=>{
 const html=`window.algoliaConfig = ${JSON.stringify(config)};`;assert.equal(parseUnitedConfig(html).indexName,'unitedpharmacy_livear_products');
 for(const c of [{...config,currencyCode:'AED'},{...config,customerGroupId:2},{...config,instant:{default_address:'Riyadh'}}])assert.throws(()=>parseUnitedConfig(`window.algoliaConfig = ${JSON.stringify(c)};`));
 assert.throws(()=>parseUnitedConfig('window.algoliaConfig = (()=>{throw Error()})();'));
});
test('United uses current price, safe source links and explicit stock, not original price or promotion labels',()=>{
 const [p]=parseUnitedResponse(response([item,item]),term);assert.equal(p.price,83.95);assert.equal(parseUnitedResponse(response([item,item]),term).length,1);assert.equal(p.availability,'in_stock');assert.match(p.location,/جدة/);assert.equal(p.imageUrl,item.image_url);
 assert.deepEqual(parseUnitedResponse(response([]),term),[]);
 assert.deepEqual(parseUnitedResponse(response([{...item,allow_cities:['Riyadh']}]),term),[]);
 assert.deepEqual(parseUnitedResponse(response([{...item,visibility_search:0}]),term),[]);
 for(const x of [{...response(),query:'other'},response([{...item,url:'https://evil.example/ar/x.html'}]),response([{...item,price:{SAR:{default:0}}}])])assert.throws(()=>parseUnitedResponse(x,term));
 assert.equal(parseUnitedResponse(response([{...item,custom_in_stock:false}]),term)[0].availability,'out_of_stock');
});
test('United discovers public search settings and sends full query with Saudi visibility/city filters and cancellation',async(t)=>{
 const signal=new AbortController().signal;let calls=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  calls++;assert.equal(init?.signal,signal);
  if(calls===1)return new Response(`window.algoliaConfig = ${JSON.stringify(config)};`);
  assert.match(String(input),/^https:\/\/y1goq9dtv8-dsn.algolia.net\/1\/indexes\/unitedpharmacy_livear_products\/query$/);
  const body=JSON.parse(String(init?.body));assert.equal(body.query,term);assert.equal(body.hitsPerPage,20);assert.equal(body.facetFilters,undefined);
  assert.equal(new Headers(init?.headers).get('X-Algolia-API-Key'),'public-search-only');return Response.json(response());
 });
 assert.equal((await searchUnited({term,city:'الرياض'},signal)).products.length,1);assert.equal(calls,2);
});

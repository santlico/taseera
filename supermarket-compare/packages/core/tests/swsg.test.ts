import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseSwsgResponse,searchSwsg} from '../../connectors/src/stores/swsg/index';
import {scopeStores} from '../../../apps/web/app/search-scope';
const fixture=()=>({queryResults:[{id:'productList',meta:{searchedTerm:'ثلاجة',apiKey:'klevu-175913366633818212',totalResultsFound:1},records:[{id:'16985',sku:'1707011000000568',name:'ثلاجة هيتاشي دولابي 4 أبواب 19.1 قدم زجاج رمادي R-W660PS7GGR',typeOfRecord:'KLEVU_PRODUCT',currency:'SAR',storeBaseCurrency:'SAR',price:'7599',basePrice:'4999.0',salePrice:'4999.0',url:'https://swsg.co/ar/hitachi-refrigerator.html',imageUrl:'https://swsg.co/needtochange/media/catalog/product/h/i/hitachi.webp',a_brand:'هيتاشي',inStock:'yes'}]}]});
test('SWSG reads current SAR selling price, not original price or installments, and matches storefront image path correction',()=>{
 const [p]=parseSwsgResponse(fixture(),'ثلاجة');assert.equal(p.price,4999);assert.equal(p.currency,'SAR');assert.equal(p.brand,'هيتاشي');assert.equal(p.availability,'in_stock');assert.equal(p.url,'https://swsg.co/ar/hitachi-refrigerator.html');assert.equal(p.imageUrl,'https://swsg.co/media/catalog/product/h/i/hitachi.webp');
 const d=fixture();d.queryResults[0].records[0].inStock='no';assert.equal(parseSwsgResponse(d,'ثلاجة')[0].availability,'out_of_stock');d.queryResults[0].records.push(d.queryResults[0].records[0]);assert.equal(parseSwsgResponse(d,'ثلاجة').length,1);
});
test('SWSG rejects foreign prices, unsafe sources and fallback queries; explicit empty records remain honest',()=>{
 for(const change of [(p:any)=>p.currency='AED',(p:any)=>p.storeBaseCurrency='BHD',(p:any)=>p.salePrice='0',(p:any)=>p.salePrice='NaN',(p:any)=>p.url='https://evil.example/ar/fridge.html',(p:any)=>p.url='https://swsg.co/en/fridge.html']){const d=fixture();change(d.queryResults[0].records[0]);assert.throws(()=>parseSwsgResponse(d,'ثلاجة'));}
 const image=fixture();image.queryResults[0].records[0].imageUrl='https://evil.example/a.jpg';assert.equal(parseSwsgResponse(image,'ثلاجة')[0].imageUrl,undefined);
 assert.throws(()=>parseSwsgResponse(fixture(),'ايفون'));const fallback=fixture();fallback.queryResults[0].id='productListFallback';assert.throws(()=>parseSwsgResponse(fallback,'ثلاجة'));
 const empty=fixture();empty.queryResults[0].records=[];assert.throws(()=>parseSwsgResponse(empty,'ثلاجة'));empty.queryResults[0].meta.totalResultsFound=0;assert.deepEqual(parseSwsgResponse(empty,'ثلاجة'),[]);
});
test('SWSG requests only the observed public product query without wildcard fallback, customer sessions or analytics',async(t)=>{
 const signal=new AbortController().signal,term='ايفون 17 256 جيجا';
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{assert.equal(String(input),'https://eucs35v2.ksearchnet.com/cs/v2/search');assert.equal(init?.method,'POST');assert.equal(init?.signal,signal);assert.equal(new Headers(init?.headers).get('cookie'),null);const body=JSON.parse(String(init?.body));assert.deepEqual(body.context,{apiKeys:['klevu-175913366633818212']});assert.equal(body.recordQueries.length,1);assert.equal(body.recordQueries[0].settings.query.term,term);assert.equal(body.recordQueries[0].settings.limit,15);const d=fixture();d.queryResults[0].meta.searchedTerm=term;d.queryResults[0].meta.totalResultsFound=0;d.queryResults[0].records=[];return Response.json(d);});
 assert.deepEqual((await searchSwsg({term,city:'الرياض'},signal)).products,[]);assert.ok(scopeStores('electronics').some(s=>s.id==='swsg'));assert.ok(!scopeStores('grocery').some(s=>s.id==='swsg'));
});

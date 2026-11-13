import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseJarirResponse,searchJarir} from '../../connectors/src/stores/jarir/index';
import {scopeStores,restoreSelection} from '../../../apps/web/app/search-scope';
const fixture=()=>({request:{term:'ايفون'},sections:{Products:[{matched_terms:['ايفون'],data:{id:'689731',sku:'689731',url:'apple-iphone-duo-smartphones-689731.html',price:9499,image_url:'https://ak-asset.jarir.com/akeneo-prod/asset/saas/689731.jpg',metadata:{name:'ابل آيفون ديو، 256 جيجابايت، أبيض نجمي',brand:'Apple',price:'9499.000000',additionalDataToReturn:JSON.stringify({GTM_sku:'689731',GTM_final_price:9499})}}}]}});
test('Jarir reads the complete Saudi VAT-inclusive price, exact variant link and official image without inferring stock',()=>{
 const [p]=parseJarirResponse(fixture(),'ايفون');assert.equal(p.price,9499);assert.equal(p.currency,'SAR');assert.equal(p.availability,'unknown');assert.equal(p.id,'689731');assert.equal(p.brand,'Apple');assert.equal(p.url,'https://www.jarir.com/apple-iphone-duo-smartphones-689731.html');assert.equal(p.imageUrl,'https://ak-asset.jarir.com/akeneo-prod/asset/saas/689731.jpg');
 const duplicate=fixture();duplicate.sections.Products.push(duplicate.sections.Products[0]);assert.equal(parseJarirResponse(duplicate,'ايفون').length,1);
});
test('Jarir refuses mismatched prices, unsafe links, foreign images, wrong queries and challenge responses',()=>{
 for(const change of [(p:any)=>p.price=577,(p:any)=>p.metadata.price='1',(p:any)=>p.url='https://evil.example/689731.html',(p:any)=>p.url='apple-iphone-111111.html',(p:any)=>p.metadata.additionalDataToReturn='{}']){const d=fixture();change(d.sections.Products[0].data);assert.throws(()=>parseJarirResponse(d,'ايفون'));}
 const d=fixture();d.sections.Products[0].data.image_url='https://evil.example/image.jpg';assert.equal(parseJarirResponse(d,'ايفون')[0].imageUrl,undefined);
 assert.throws(()=>parseJarirResponse(fixture(),'لابتوب'));assert.throws(()=>parseJarirResponse('<html>Human verification</html>','ايفون'));assert.throws(()=>parseJarirResponse({request:{term:'ايفون'},sections:{}},'ايفون'));assert.deepEqual(parseJarirResponse({request:{term:'ايفون'},sections:{Products:[]}},'ايفون'),[]);
});
test('Jarir uses the observed anonymous Saudi search endpoint, preserves model and capacity and propagates cancellation',async(t)=>{
 const signal=new AbortController().signal;const term='ايفون 17 256 جيجابايت';
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{const url=new URL(String(input));assert.equal(url.origin,'https://ac.cnstrc.com');assert.equal(decodeURIComponent(url.pathname),'/v1/autocomplete/'+term);assert.equal(url.searchParams.get('key'),'key_g0Gi7pKaE5cyqDGl');assert.equal(url.searchParams.get('num_section_results_per_page[Products]'),'20');assert.equal(init?.signal,signal);assert.equal(new Headers(init?.headers).get('cookie'),null);return Response.json({request:{term},sections:{Products:[]}});});
 assert.deepEqual((await searchJarir({term,city:'الرياض'},signal)).products,[]);
 assert.deepEqual(scopeStores('electronics').map(s=>s.id),['jarir','extra','almanea','swsg']);assert.ok(scopeStores('all').some(s=>s.id==='jarir'));assert.ok(!scopeStores('grocery').some(s=>s.id==='jarir'));assert.equal(restoreSelection(new URLSearchParams('store=jarir'),null,null).scope,'electronics');
});

test('Jarir selects discounted final price and excludes generic recommendations when the term has no matches',()=>{
 const discounted=fixture();const p=discounted.sections.Products[0].data;p.metadata.additionalDataToReturn=JSON.stringify({GTM_sku:'689731',GTM_final_price:8999});assert.equal(parseJarirResponse(discounted,'ايفون')[0].price,8999);
 p.image_url='https://ak-asset.jarir.com/akeneo-prod/asset/6/c/7/7/6c7712623ca16470a9de6a92b0a991b46baaa8b5_689731.jpg';assert.equal(parseJarirResponse(discounted,'ايفون')[0].imageUrl,p.image_url);
 discounted.sections.Products[0].matched_terms=[];assert.deepEqual(parseJarirResponse(discounted,'ايفون'),[]);
});

import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseAlmaneaResponse,searchAlmanea} from '../../connectors/src/stores/almanea/index';
import {scopeStores,restoreSelection} from '../../../apps/web/app/search-scope';
const fixture=()=>({page:'/search',locale:'ar',query:{q:'ايفون'},props:{pageProps:{searchResults:{numberOfHits:1,products:[{sku:'170111802030092',name:'ابل ايفون 18 برو ماكس، 256 جيجا - النسخة الدولية',brand:'ابل',rewrite_url:'apple-iphone-18-pro-max-p-170111802030092',price:6298.998501,price_incl_tax:5303.48,prices_with_tax:{discounted_price:6099.002001,price:6099.002001,original_price:6298.998501},thumbnail_url:'https://imgs.dev-almanea.com/media/catalog/product/cache/abc/iphone.jpeg'}]}}}});
const page=(d:unknown)=>'<html><script id="__NEXT_DATA__" type="application/json">'+JSON.stringify(d)+'</script></html>';
test('Almanea matches visible rounded VAT-inclusive discounted price and retains variant and condition information',()=>{
 const d=fixture();const [p]=parseAlmaneaResponse(page(d),'ايفون');assert.equal(p.price,6099);assert.equal(p.currency,'SAR');assert.equal(p.brand,'ابل');assert.equal(p.availability,'unknown');assert.ok(p.name.includes('النسخة الدولية'));assert.equal(p.url,'https://www.almanea.sa/product/apple-iphone-18-pro-max-p-170111802030092');assert.ok(p.imageUrl?.startsWith('https://imgs.dev-almanea.com/media/catalog/product/'));
 const item=d.props.pageProps.searchResults.products[0];item.name+=' (خدوش على العلبة فقط)';item.prices_with_tax.discounted_price=0;item.prices_with_tax.price=4749.005501;assert.equal(parseAlmaneaResponse(page(d),'ايفون')[0].price,4749);assert.ok(parseAlmaneaResponse(page(d),'ايفون')[0].name.includes('خدوش'));
});
test('Almanea requires Arabic search context, validates prices and source paths, and distinguishes genuine empty results',()=>{
 assert.throws(()=>parseAlmaneaResponse(page(fixture()),'ثلاجة'));const d=fixture();d.locale='en';assert.throws(()=>parseAlmaneaResponse(page(d),'ايفون'));assert.throws(()=>parseAlmaneaResponse('<html>blocked</html>','ايفون'));
 for(const change of [(p:any)=>p.rewrite_url='https://evil.example/product',(p:any)=>p.rewrite_url='iphone-p-111111111111111',(p:any)=>p.prices_with_tax={price:0},(p:any)=>p.sku='../../etc']){const d=fixture();change(d.props.pageProps.searchResults.products[0]);assert.throws(()=>parseAlmaneaResponse(page(d),'ايفون'));}
 const empty=fixture();empty.props.pageProps.searchResults.products=[];assert.throws(()=>parseAlmaneaResponse(page(empty),'ايفون'));empty.props.pageProps.searchResults.numberOfHits=0;assert.deepEqual(parseAlmaneaResponse(page(empty),'ايفون'),[]);
 const image=fixture();image.props.pageProps.searchResults.products[0].thumbnail_url='https://evil.example/image.jpg';assert.equal(parseAlmaneaResponse(page(image),'ايفون')[0].imageUrl,undefined);
});
test('Almanea uses public document search with the full query and caller cancellation, without customer sessions',async(t)=>{
 const signal=new AbortController().signal,term='ايفون 17 256 جيجا';
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{const url=new URL(String(input));assert.equal(url.origin,'https://www.almanea.sa');assert.equal(url.pathname,'/search');assert.equal(url.searchParams.get('q'),term);assert.equal(init?.signal,signal);assert.equal(new Headers(init?.headers).get('cookie'),null);const d=fixture();d.query.q=term;d.props.pageProps.searchResults={numberOfHits:0,products:[]};return new Response(page(d));});
 assert.deepEqual((await searchAlmanea({term,city:'الرياض'},signal)).products,[]);assert.ok(scopeStores('electronics').some(s=>s.id==='almanea'));assert.ok(!scopeStores('grocery').some(s=>s.id==='almanea'));assert.equal(restoreSelection(new URLSearchParams('store=almanea'),null,null).scope,'electronics');
});

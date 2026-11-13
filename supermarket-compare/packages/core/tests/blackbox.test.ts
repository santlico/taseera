import {test} from 'node:test';import assert from 'node:assert/strict';
import {blackboxGuestToken,parseBlackboxResponse,searchBlackbox} from '../../connectors/src/stores/blackbox/index';
import {scopeStores} from '../../../apps/web/app/search-scope';
const guest=(storeName='ar',exp=Date.now()/1000+60)=>'e30.'+Buffer.from(JSON.stringify({storeName,exp})).toString('base64url')+'.test';
const html=(token=guest(),locale='ar')=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({locale,props:{pageProps:{initialHandshake:token}}})+'</script>';
const fixture=()=>({data:{currentPage:0,totalProducts:1,products:[{sku:'1711126210000728',name:['أبل ايفون 17 برو ماكس، 256 جيجابايت، برتقالي'],rewrite_url:'apple-iphone-17-pro-max-6.9-inche-p-1711126210000728',prices_with_tax:{price:6399,original_price:6999},after_cashback_price:'5000',blackbox_plus_price:'5900',stock:{is_in_stock:false},_media_:{image:[{image:'https://store.ops.blackbox.com.sa/media/webps/jpg/media/catalog/product/a/p/iphone.webp'}]},option_text_a_brand:['أبل']}]}});
test('Blackbox uses public VAT-inclusive purchase price instead of cashback or membership and retains explicit stock',()=>{
 const [p]=parseBlackboxResponse(fixture());assert.equal(p.price,6399);assert.equal(p.currency,'SAR');assert.equal(p.availability,'out_of_stock');assert.equal(p.brand,'أبل');assert.equal(p.url,'https://www.blackbox.com.sa/product/apple-iphone-17-pro-max-6.9-inche-p-1711126210000728');assert.ok(p.imageUrl?.startsWith('https://store.ops.blackbox.com.sa/'));
 const d=fixture();d.data.products[0].stock.is_in_stock=true;d.data.products[0].prices_with_tax.price=39;assert.equal(parseBlackboxResponse(d)[0].price,39);assert.equal(parseBlackboxResponse(d)[0].availability,'in_stock');
});
test('Blackbox validates guest locale/expiry and product URLs and distinguishes empty listings from broken responses',()=>{
 assert.ok(blackboxGuestToken(html()));assert.throws(()=>blackboxGuestToken(html(guest('en'))));assert.throws(()=>blackboxGuestToken(html(guest('ar',1))));assert.throws(()=>blackboxGuestToken('<html>blocked</html>'));
 for(const change of [(p:any)=>p.prices_with_tax.price=0,(p:any)=>p.rewrite_url='https://evil.example/a',(p:any)=>p.rewrite_url='phone-p-1111111111111111',(p:any)=>p.sku='../test']){const d=fixture();change(d.data.products[0]);assert.throws(()=>parseBlackboxResponse(d));}
 const d=fixture();d.data.products[0]._media_.image[0].image='https://evil.example/image.jpg';assert.equal(parseBlackboxResponse(d)[0].imageUrl,undefined);
 const empty=fixture();empty.data.products=[];assert.throws(()=>parseBlackboxResponse(empty));empty.data.totalProducts=0;assert.deepEqual(parseBlackboxResponse(empty),[]);empty.data.currentPage=1;assert.throws(()=>parseBlackboxResponse(empty));
});
test('Blackbox bootstraps a fresh anonymous session and sends it only to the fixed product API with full query',async(t)=>{
 const signal=new AbortController().signal,term='ايفون 17 256';const token=guest();let count=0;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{count++;assert.equal(init?.signal,signal);assert.equal(init?.redirect,'error');const headers=new Headers(init?.headers);assert.equal(headers.get('cookie'),null);if(count===1){assert.equal(String(input),'https://www.blackbox.com.sa/');assert.equal(headers.get('authorization'),null);return new Response(html(token));}const url=new URL(String(input));assert.equal(url.origin,'https://api.ops.blackbox.com.sa');assert.equal(url.pathname,'/api/v1/search_rules/products/searchQuery');assert.equal(url.searchParams.get('search'),term);assert.equal(headers.get('authorization'),'Bearer '+token);return Response.json({data:{currentPage:0,totalProducts:0,products:[]}});});
 assert.deepEqual((await searchBlackbox({term,city:'الرياض'},signal)).products,[]);assert.equal(count,2);assert.ok(scopeStores('electronics').some(s=>s.id==='blackbox'));assert.ok(!scopeStores('grocery').some(s=>s.id==='blackbox'));
});

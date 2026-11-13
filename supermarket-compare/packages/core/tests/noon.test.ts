import {test} from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {EventEmitter} from 'node:events';
import {parseNoonResponse,searchNoon} from '../../connectors/src/stores/noon/client';
import {fetchNoonDocument} from '../../connectors/src/stores/noon/document';
import {productFacts} from '../src/index';
const term='حليب المراعي';
const url=new URL('https://minutes.noon.com/saudi-ar/search/?q='+encodeURIComponent(term));
const card=(price='12.50',href='/saudi-ar/now-product/Z123ABCZ-1/',extra='')=>`<a data-testid="catalog-product-box-Z123ABCZ-1" href="${href}"><img src="https://k.nooncdn.com/chilled.png"><img src="https://f.nooncdn.com/p/pzsku/Z123ABCZ/45/1/milk.jpg?width=2000"><h2 data-testid="product-title">المراعي حليب &amp; طازج</h2><span>2لتر</span><div data-testid="product-price"><strong>${price}</strong><span>18.50</span></div><div data-testid="add-to-cart-default"><button disabled>إضافة</button></div>${extra}</a>`;
const page=(cards=card(),q=term)=>`<html lang="ar-SA"><head><link rel="canonical" href="https://minutes.noon.com/saudi-ar/search/?q=${encodeURIComponent(q)}"></head><body><div data-testid="catalog-listing"><div data-testid="catalog-modules">${cards}</div></div></body></html>`;

test('Noon uses selling price, title and separate size, real SKU link, correct product thumbnail and conservative stock',()=>{
 const [p]=parseNoonResponse(page(card()+card()),term);
 assert.equal(parseNoonResponse(page(card()+card()),term).length,1);
 assert.equal(p.name,'المراعي حليب & طازج · 2لتر');assert.equal(p.price,12.5);assert.equal(p.currency,'SAR');
 assert.equal(p.url,'https://minutes.noon.com/saudi-ar/now-product/Z123ABCZ-1/');
 assert.equal(p.imageUrl,'https://f.nooncdn.com/p/pzsku/Z123ABCZ/45/1/milk.jpg?width=320');
 assert.equal(p.availability,'unknown');assert.match(p.location,/عنوان التوصيل غير محدد/);assert.equal(productFacts(p).unitPrice,6.25);
 assert.equal(parseNoonResponse(page(card('١٢٫٥٠')),term)[0].price,12.5);
 assert.equal(parseNoonResponse(page(card('1,234.50')),term)[0].price,1234.5);
 assert.equal(parseNoonResponse(page(card('7',undefined,'<button data-testid="stock-notification-button">أبلغ</button>')),term)[0].availability,'out_of_stock');
});
test('Noon legitimate empty catalog is distinct from challenges, wrong query/country and missing markup',()=>{
 assert.deepEqual(parseNoonResponse(page(''),term),[]);
 for(const html of ['<title>Just a moment...</title>','<html></html>',page('', 'بيبسي'),page('').replace('ar-SA','ar-AE'),page('').replace('catalog-modules','unexpected')])assert.throws(()=>parseNoonResponse(html,term));
});
test('Noon rejects unsafe links, SKU mismatches and invalid prices without discarding valid offers',()=>{
 for(const href of ['https://example.com/saudi-ar/now-product/Z123ABCZ-1/','https://user@minutes.noon.com/saudi-ar/now-product/Z123ABCZ-1/','/uae-ar/now-product/Z123ABCZ-1/','/saudi-ar/now-product/ZOTHERZ-1/'])assert.throws(()=>parseNoonResponse(page(card('7',href)),term),/validation/);
 for(const price of ['0','-1','7 USD','','NaN'])assert.throws(()=>parseNoonResponse(page(card(price)),term),/validation/);
 assert.equal(parseNoonResponse(page(card('0')+card()),term).length,1);
 const [p]=parseNoonResponse(page(card().replace('https://f.nooncdn.com/p/','https://evil.example/p/')),term);assert.equal(p.imageUrl,undefined);
});
test('Noon native document request is public, encoded and cancelled with caller signal; normalized offers returned',async(t)=>{
 const signal=new AbortController().signal;
 const get=t.mock.method(https,'get',(input:unknown,options:any,callback:(response:unknown)=>void)=>{
  assert.equal(new URL(String(input)).searchParams.get('q'),term);assert.equal(options.signal,signal);
  assert.equal(options.headers['User-Agent'],'Taseera/1.0');assert.equal(options.headers.Cookie,undefined);
  const response=Object.assign(new EventEmitter(),{statusCode:200,headers:{'content-type':'text/html'}});
  queueMicrotask(()=>{callback(response);response.emit('data',Buffer.from(page()));response.emit('end');});return new EventEmitter();
 });
 const result=await searchNoon({term,city:'الرياض'},signal);assert.equal(result.products.length,1);assert.match(result.notice!,/الصفحة الأولى/);assert.equal(get.mock.callCount(),1);
 await assert.rejects(searchNoon({term,city:'جدة'},signal),/area/);
});
test('Noon retries one interrupted connection using IPv4, but does not retry HTTP denials',async(t)=>{
 let calls=0;
 t.mock.method(https,'get',(_url:unknown,options:any,callback:(response:unknown)=>void)=>{
  calls++;const request=new EventEmitter();
  queueMicrotask(()=>{if(calls===1){request.emit('error',Object.assign(new Error('reset'),{code:'ECONNRESET'}));return;}
   assert.equal(options.family,4);const response=Object.assign(new EventEmitter(),{statusCode:403,headers:{'content-type':'text/html'}});callback(response);response.emit('end');});return request;
 });
 await assert.rejects(fetchNoonDocument(url,new AbortController().signal),/HTTP 403/);assert.equal(calls,2);
 const controller=new AbortController();controller.abort();await assert.rejects(fetchNoonDocument(url,controller.signal),{name:'AbortError'});assert.equal(calls,2);
 await assert.rejects(fetchNoonDocument(new URL('https://example.com/saudi-ar/search/'),new AbortController().signal),/Invalid Noon/);
});

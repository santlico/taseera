import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carrefourFlightText, parseCarrefourResponse, searchCarrefour } from '../../connectors/src/stores/carrefour/client';
const product={productId:'531284',productName:'ساديا صدور دجاج 1 كجم',sellingPrice:28.99,currency:'SAR',productUrl:'/mafsau/ar/chicken/p/531284',stock:{stockLevelStatus:'inStock'}};
const record=(items:unknown[])=>'e:'+JSON.stringify(['$','component',null,{data:{sections:items.map(additionalAttributes=>({componentDTO:{additionalAttributes}})),pagination:{totalResults:items.length}}}]);
test('Carrefour reads product fields and deduplicates Flight records',()=>{
  const result=parseCarrefourResponse(record([product,product]));
  assert.equal(result.length,1);assert.equal(result[0].price,28.99);assert.equal(result[0].availability,'in_stock');
});
test('Carrefour distinguishes empty search from broken shell and rejects unsafe links',()=>{
  assert.deepEqual(parseCarrefourResponse(record([])),[]);
  assert.throws(()=>parseCarrefourResponse('<html></html>'));
  assert.deepEqual(parseCarrefourResponse(record([{...product,productUrl:'https://example.com/'}])),[]);
});

test('Carrefour reads HTML Flight chunks, including records split across chunks',()=>{
  const flight=record([product]);
  const html='<html><script>self.__next_f.push([1,'+JSON.stringify(flight.slice(0,31))+'])</script><script>self.__next_f.push([1,'+JSON.stringify(flight.slice(31))+'])</script></html>';
  assert.equal(parseCarrefourResponse(html)[0].id,product.productId);
  assert.deepEqual(parseCarrefourResponse('<html><script>self.__next_f.push([1,'+JSON.stringify(record([]))+'])</script></html>'),[]);
});

test('Carrefour rejects challenge pages and does not execute upstream JavaScript',()=>{
  assert.throws(()=>carrefourFlightText('<html>Access Denied</html>'),/possible access challenge/);
  assert.throws(()=>carrefourFlightText('<html><script>self.__next_f.push([1,(()=>{throw Error("executed")})()])</script></html>'),/no search data/);
});

test('Carrefour requests a normal document and validates its location',async(t)=>{
  const flight='0:'+JSON.stringify({defaultAreaCode:'Granada - Riyadh'})+'\n'+record([product]);
  t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
    assert.equal(new URL(String(input)).searchParams.get('keyword'),'حليب');
    assert.equal(new Headers(init?.headers).get('RSC'),null);
    assert.equal(new Headers(init?.headers).get('Accept'),'text/html');
    return new Response('<html><script>self.__next_f.push([1,'+JSON.stringify(flight)+'])</script></html>',{headers:{'content-type':'text/html'}});
  });
  const products=await searchCarrefour({term:'حليب',city:'الرياض'},new AbortController().signal);
  assert.equal(products[0].id,product.productId);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNinjaResponse} from '../../connectors/src/stores/ninja/client';
function html(items:unknown[]){const flight='a:'+JSON.stringify({searchedProducts:items})+'\n';return '<a href="/sa/ar/product/chicken-1737"></a><script>self.__next_f.push('+JSON.stringify([1,flight])+')</script>'}
test('Ninja maps minor currency units and uses observed product link',()=>{
  const [product]=parseNinjaResponse(html([{productId:'1737',nameAr:'صدور ساديا',priceCents:2295,discountedPriceCents:0,isAvailable:true}]));
  assert.equal(product.price,22.95);assert.equal(product.availability,'in_stock');assert.match(product.url,/chicken-1737$/);
});
test('Ninja does not execute script or invent links, and detects missing payload',()=>{
  assert.deepEqual(parseNinjaResponse(html([{productId:'999',nameAr:'missing',priceCents:200}])),[]);
  assert.deepEqual(parseNinjaResponse(html([])),[]);assert.throws(()=>parseNinjaResponse('<html/>'));
});


test('Ninja reads query-string product links and multiple spaced Flight pushes',()=>{
 const flight='a:'+JSON.stringify({searchedProducts:[{productId:'1737',nameAr:'صدور ساديا',priceCents:2295}]})+'\n';
 const html='<a href="https://ananinja.com/sa/ar/product/chicken-1737?ref=search&amp;lang=ar"></a><script> self.__next_f.push([1,'+JSON.stringify(flight.slice(0,28))+']); self.__next_f.push([1,'+JSON.stringify(flight.slice(28))+']); </script>';
 const [product]=parseNinjaResponse(html);
 assert.equal(product.price,22.95);
 assert.equal(product.url,'https://ananinja.com/sa/ar/product/chicken-1737');
});

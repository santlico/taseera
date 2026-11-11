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

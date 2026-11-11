import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCarrefourResponse } from '../../connectors/src/stores/carrefour/client';
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

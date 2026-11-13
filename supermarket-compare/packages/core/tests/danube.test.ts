import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapDanubeHit } from '../../connectors/src/stores/danube/client';
const hit = {objectID:'test',name_ar:'صدور دجاج',price:29.99,url_ar:'/products/test',in_stock:true};
test('Danube uses Riyadh home-delivery modifier before base price or branch price',()=>{
  const product=mapDanubeHit({...hit,inventory_modifiers:{'378_hd':{price:'21.99'},'378_':{price:'25'}}});
  assert.equal(product?.price,21.99);
  assert.match(product!.location,/الريان/);
});
test('Danube excludes unavailable products and invalid prices',()=>{
  assert.equal(mapDanubeHit({...hit,inventory_modifiers:{'378_':{available:false}}}),null);
  assert.equal(mapDanubeHit({...hit,price:NaN}),null);
});


test('danube skips malformed products instead of throwing away a store search',()=>{
 const hit={objectID:'1',name_ar:'حليب',price:12,url_ar:'/products/milk'};
 assert.equal(mapDanubeHit({...hit,url_ar:'https://['}),null);
 assert.equal(mapDanubeHit({...hit,url_ar:'http://www.danube.sa/products/milk'}),null);
 assert.equal(mapDanubeHit({...hit,name_ar:' '}),null);
});

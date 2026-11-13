import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapBindawoodHit} from '../../connectors/src/stores/bindawood/client';
test('BinDawood uses Panorama price and its own product domain',()=>{
 const product=mapBindawoodHit({objectID:'1',name_ar:'صدور ساديا',price:29.99,url_ar:'/products/chicken',inventory_modifiers:{'207_':{price:'21.99',in_stock:true},'378_':{price:'40'}}});
 assert.equal(product?.price,21.99);assert.equal(product?.store,'bindawood');assert.equal(new URL(product!.url).hostname,'www.bindawood.sa');assert.match(product!.location,/بانوراما/);
});


test('bindawood skips malformed products instead of throwing away a store search',()=>{
 const hit={objectID:'1',name_ar:'حليب',price:12,url_ar:'/products/milk'};
 assert.equal(mapBindawoodHit({...hit,url_ar:'https://['}),null);
 assert.equal(mapBindawoodHit({...hit,url_ar:'http://www.bindawood.sa/products/milk'}),null);
 assert.equal(mapBindawoodHit({...hit,name_ar:' '}),null);
});

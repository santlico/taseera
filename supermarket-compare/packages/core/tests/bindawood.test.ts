import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapBindawoodHit} from '../../connectors/src/stores/bindawood/client';
test('BinDawood uses Panorama price and its own product domain',()=>{
 const product=mapBindawoodHit({objectID:'1',name_ar:'صدور ساديا',price:29.99,url_ar:'/products/chicken',inventory_modifiers:{'207_':{price:'21.99',in_stock:true},'378_':{price:'40'}}});
 assert.equal(product?.price,21.99);assert.equal(product?.store,'bindawood');assert.equal(new URL(product!.url).hostname,'www.bindawood.sa');assert.match(product!.location,/بانوراما/);
});

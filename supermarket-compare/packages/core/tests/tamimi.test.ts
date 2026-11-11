import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTamimiResponse} from '../../connectors/src/stores/tamimi/client';
const html=(products:unknown[])=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{data:{page:{layouts:[{value:{collection:{product:products}}}]}}}}})+'</script>';
test('Tamimi subtracts monetary discount and preserves variant stock',()=>{
  const products=parseTamimiResponse(html([{slug:'chicken',name:'صدور دجاج',brand:{name:'ساديا'},variants:[{id:1,name:'2 كيلو',storeSpecificData:[{storeId:4,mrp:'52.95',discount:'12.96',stock:0}]}]}]));
  assert.equal(products[0].price,39.99);assert.equal(products[0].availability,'out_of_stock');assert.match(products[0].url,/\/ar\/product\/chicken$/);
});
test('Tamimi distinguishes empty search from a broken source',()=>{
  assert.deepEqual(parseTamimiResponse(html([])),[]);assert.throws(()=>parseTamimiResponse('<html/>'));
});

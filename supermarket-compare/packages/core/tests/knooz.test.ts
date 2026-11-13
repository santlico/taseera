import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseKnoozResponse} from '../../connectors/src/stores/knooz/client';
import {scopeStores} from '../../../apps/web/app/search-scope';
const html=readFileSync(new URL('./fixtures/knooz/search.html',import.meta.url),'utf8');
test('Knooz reads current SAR prices, stock, source images and product links',()=>{
 const p=parseKnoozResponse(html,'Cetaphil');assert.equal(p.length,2);
 assert.ok(p.some(x=>x.price===78.5&&x.availability==='in_stock'));
 assert.ok(p.some(x=>x.price===47.5&&x.availability==='out_of_stock'));
 assert.ok(p.every(x=>x.imageUrl?.startsWith('https://img.zid.store/')&&x.url.startsWith('https://knooz-store.com/products/')));
 assert.throws(()=>parseKnoozResponse(html,'unrelated'));assert.throws(()=>parseKnoozResponse(html.replace('47.50','invalid'),'Cetaphil'));
});
test('Knooz distinguishes empty searches from broken pages and belongs to beauty',()=>{
 const context=html.slice(0,html.indexOf('<div class="product-item'));
 assert.deepEqual(parseKnoozResponse(context+'لا توجد منتجات','Cetaphil'),[]);
 assert.throws(()=>parseKnoozResponse(context,'Cetaphil'));
 assert.ok(scopeStores('beauty').some(s=>s.id==='knooz'));assert.ok(!scopeStores('pharmacy').some(s=>s.id==='knooz'));
});

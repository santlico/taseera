import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseNiceoneResponse} from '../../connectors/src/stores/niceone/client';
import {scopeStores} from '../../../apps/web/app/search-scope';
const html=readFileSync(new URL('./fixtures/niceone/search.html',import.meta.url),'utf8');
test('Nice One uses complete visible SAR price instead of truncated schema price or crossed-out price',()=>{
 const [p]=parseNiceoneResponse(html,'test');assert.equal(p.price,56.95);assert.equal(p.store,'niceone');assert.ok(p.imageUrl?.includes('/image/product/'));assert.ok(p.url.startsWith('https://niceonesa.com/ar/'));
 assert.throws(()=>parseNiceoneResponse(html,'other'));assert.throws(()=>parseNiceoneResponse(html.replace('56.95','59.95'),'test'));assert.throws(()=>parseNiceoneResponse(html.replace('"SAR"','"AED"'),'test'));
});
test('Nice One accepts explicit empty listings, skips variant-only cards without offers, rejects missing context',()=>{
 const data={'@type':'ItemList',url:'https://niceonesa.com/ar/search',name:'test',itemListElement:[] as unknown[]};
 const page=()=>'<script type="application/ld+json">'+JSON.stringify(data)+'</script>';
 assert.deepEqual(parseNiceoneResponse(page(),'test'),[]);data.itemListElement=[{'@type':'Product',name:'Variant product'}];assert.deepEqual(parseNiceoneResponse(page(),'test'),[]);
 assert.throws(()=>parseNiceoneResponse('<html>blocked</html>','test'));assert.ok(scopeStores('beauty').some(s=>s.id==='niceone'));
});

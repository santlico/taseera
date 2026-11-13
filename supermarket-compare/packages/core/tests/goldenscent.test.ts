import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {parseGoldenscentResponse} from '../../connectors/src/stores/goldenscent/client';import {fetchGoldenscentDocument} from '../../connectors/src/stores/goldenscent/document';import {scopeStores} from '../../../apps/web/app/search-scope';
const html=readFileSync(new URL('./fixtures/goldenscent/search.html',import.meta.url),'utf8');
test('Golden Scent matches SAR offers to visible current prices, official links and image paths',()=>{
 const [p]=parseGoldenscentResponse(html,'test');assert.equal(p.price,1234);assert.equal(p.availability,'in_stock');assert.ok(p.url.startsWith('https://www.goldenscent.com/p/'));assert.ok(p.imageUrl?.startsWith('https://assets.goldenscent.com/catalog/product/'));
 assert.throws(()=>parseGoldenscentResponse(html,'other'));assert.throws(()=>parseGoldenscentResponse(html.replace('"SAR"','"AED"'),'test'));assert.throws(()=>parseGoldenscentResponse(html.replace('>1234<','>1235<'),'test'));assert.ok(scopeStores('beauty').some(s=>s.id==='goldenscent'));
});
test('Golden Scent resolves streamed price markup without evaluating JavaScript and distinguishes empty from broken pages',()=>{
 const streamed=html.replace('>1234<','><template id="P:ab"></template><')+'<div hidden id="S:ab">1234</div><script>$RS("S:ab","P:ab")</script>';
 assert.equal(parseGoldenscentResponse(streamed,'test')[0].price,1234);
 const base='<html lang="ar"><link rel="canonical" href="https://www.goldenscent.com/search?q=test">';
 assert.deepEqual(parseGoldenscentResponse(base+'لم يتم العثور على منتجات','test'),[]);assert.throws(()=>parseGoldenscentResponse(base,'test'));
});
test('Golden Scent transport refuses non-Saudi or arbitrary URLs before making any request',async()=>{
 await assert.rejects(fetchGoldenscentDocument(new URL('https://www.goldenscent.com/search?q=x&___store=ar_ae'),new AbortController().signal),/Invalid/);
});

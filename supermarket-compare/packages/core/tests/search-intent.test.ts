import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSearchIntent} from '../../../apps/web/app/search-intent';
test('natural search isolates an explicit budget and usage without changing product specifications',()=>{
 const a=parseSearchIntent('أبي سماعات عزل للدوام تحت ٣٠٠ ريال');
 assert.equal(parseSearchIntent('سماعات للدوام سوني').query,'سماعات سوني');
 assert.equal(a.query,'سماعات عزل');assert.equal(a.budget,300);assert.equal(a.need,'أبي سماعات عزل للدوام تحت ٣٠٠ ريال');
 const b=parseSearchIntent('ايفون 17 256 جيجا أقل من ٤٠٠٠ ريال');assert.equal(b.query,'ايفون 17 256 جيجا');assert.equal(b.budget,4000);
 const c=parseSearchIntent('حليب المراعي ١.٤ لتر');assert.equal(c.query,'حليب المراعي ١.٤ لتر');assert.equal(c.budget,null);
});
test('ordinary searches and medical product identifiers remain literal; unsupported limits are never guessed',()=>{
 for(const q of ['ببسي','سيتافيل 500 مل','بنادول 500 مجم','سماعات 300','تحت الصفر'])assert.equal(parseSearchIntent(q).query,q);
 assert.equal(parseSearchIntent('سماعات تحت 0 ريال').budget,null);
 assert.equal(parseSearchIntent('سماعات تحت 2000000 ريال').budget,null);
 assert.equal(parseSearchIntent('ميزانية 100 ريال').query,'ميزانية 100 ريال');
});

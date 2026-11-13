import {sourceSearchTerm} from '../src/product-insights';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productFacts, searchRelevance, comparisonWarning, type Product} from '../src/index';
const p=(name:string,price=12):Product=>({store:'danube',id:'1',name,price,currency:'SAR',url:'https://www.danube.sa/products/milk',availability:'unknown',location:'الرياض',fetchedAt:new Date().toISOString()});

test('quantity extraction equates Arabic digits, grams and kilograms',()=>{
 assert.equal(productFacts(p('صدور ساديا ١ كغم')).totalAmount,1);
 assert.equal(productFacts(p('صدور ساديا 1000 غرام')).totalAmount,1);
 assert.equal(productFacts(p('حليب 1,5 لتر')).totalAmount,1.5);
 assert.equal(productFacts(p('حليب ١٫٥ لتر')).totalAmount,1.5);
});
test('multipacks are distinct from singles in both multiplication directions',()=>{
 for(const name of ['بيبسي 12 × 150 مل','Pepsi 150 ml x 12','بيبسي 150 مل 12 عبوة']){
  const f=productFacts(p(name,18));assert.equal(f.packCount,12);assert.ok(Math.abs(f.totalAmount!-1.8)<0.001);assert.ok(Math.abs(f.unitPrice!-10)<0.001);
 }
 const f=productFacts(p('المراعي عبوة كرتون من 12 قطعة سعة 1 لتر لكل قطعة',60));assert.equal(f.totalAmount,12);assert.equal(f.unitPrice,5);
});
test('missing, conflicting or uncounted multipack quantities stay unknown',()=>{
 for(const name of ['حليب المراعي','حليب كرتون 1 لتر','حليب 1 لتر + 500 مل','حليب 0 لتر','حليب 12 × 1 لتر 6 عبوات','milk 1 liter pack'])assert.equal(productFacts(p(name)).unitPrice,undefined,name);
});
test('relevance recognizes brand translations and rejects other brands and sizes',()=>{
 assert.equal(searchRelevance(p('Almarai Full Fat Fresh Milk 1 Liter'),'حليب المراعي'),1);
 assert.equal(searchRelevance(p('حليب نادك 1 لتر'),'حليب المراعي'),0);
 assert.equal(searchRelevance(p('بيبسي 2 لتر'),'بيبسي 1 لتر'),0);
 assert.equal(searchRelevance(p('بيبسي 12 × 150 مل'),'بيبسي 1.8 لتر'),0);
 assert.ok(searchRelevance(p('حليب المراعي'),'حليب المراعي 1 لتر')<0.5);
 assert.equal(searchRelevance(p('حليب 2 لتر'),'1l'),0);
 assert.equal(searchRelevance(p('ساديا صدور دجاج 1 كيلو'),'صدور دجاج ساديا'),1);
});
test('comparison warns about quantity differences, unknown sizes, and incompatible units',()=>{
 assert.match(comparisonWarning([p('حليب 1 لتر'),p('حليب 12 × 1 لتر')]),/مختلفة/);
 assert.match(comparisonWarning([p('حليب 1 لتر'),p('حليب')]),/غير واضحة/);
 assert.match(comparisonWarning([p('حليب 1 لتر'),p('حليب بودرة 1 كجم')]),/وحدات القياس مختلفة/);
 assert.match(comparisonWarning([p('حليب 1 لتر'),p('حليب 1000 مل')]),/غير مؤكد|تأكد/);
});


test('source queries drop explicit quantities while keeping identity and never becoming empty',()=>{
 assert.equal(sourceSearchTerm('حليب المراعي 1 لتر'),'حليب المراعي');
 assert.equal(sourceSearchTerm('Pepsi 12 x 150 ml'),'Pepsi');
 assert.equal(sourceSearchTerm('صدور دجاج ساديا ١ كيلو'),'صدور دجاج ساديا');
 assert.equal(sourceSearchTerm('1 لتر'),'1 لتر');
 assert.equal(sourceSearchTerm('قهوة عربية 250 غرام'),'قهوة عربية');
 assert.equal(sourceSearchTerm('iPhone 16 128GB'),'iPhone 16 128GB');
});

test('Pepsi common Arabic spelling matches Arabic and English titles without relaxing brand or quantity checks',()=>{
 for(const name of ['بيبسي 330 مل','Pepsi 330 ml','ببسي 330 مل'])assert.equal(searchRelevance(p(name),'ببسي'),1);
 assert.equal(searchRelevance(p('كوكا كولا 330 مل'),'ببسي'),0);
 assert.equal(searchRelevance(p('بيبسي 2 لتر'),'ببسي 1 لتر'),0);
});

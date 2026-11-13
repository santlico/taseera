import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateProducts} from '../src/validation';
import {searchStores, type Product, type StoreConnector} from '../src/index';
const valid:Product={store:'danube',id:'1',name:'حليب',price:12,currency:'SAR',url:'https://www.danube.sa/products/milk',availability:'unknown',location:'الرياض',fetchedAt:new Date().toISOString()};
test('product boundary rejects invalid prices, foreign URLs, credentials, timestamps and duplicates',()=>{
 const bad=[{...valid,price:0},{...valid,price:NaN},{...valid,url:'https://evil.example/products/milk'},{...valid,url:'https://user:secret@www.danube.sa/products/milk'},{...valid,fetchedAt:'bad'},{...valid,name:' '},{...valid,store:'ninja' as const}];
 assert.deepEqual(validateProducts([valid,...bad,valid],'danube'),[{...valid,imageUrl:undefined}]);
 assert.throws(()=>validateProducts(bad,'danube'),/failed validation/);
 assert.deepEqual(validateProducts([],'danube'),[]);
});
test('invalid upstream data produces an error rather than a false empty result',async(t)=>{
 t.mock.method(console,'warn',()=>{});
 const connector:StoreConnector={id:'danube',name:'الدانوب',enabled:true,async search(){return [{...valid,price:-1}]}};
 assert.equal((await searchStores({term:'حليب',city:'الرياض'},[connector])).results[0].status,'error');
});

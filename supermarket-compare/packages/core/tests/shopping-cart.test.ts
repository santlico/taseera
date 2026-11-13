import {test} from 'node:test';import assert from 'node:assert/strict';
import {addShoppingItem,restoreShoppingCart,shoppingTotal,shoppingKey,type ShoppingItem} from '../src/cart';
import type {Product} from '../src/index';
const p:Product={store:'beautycare',id:'1861130304',name:'شامبو',price:10.15,currency:'SAR',url:'https://beautycare.sa/ar/shampoo/p1861130304',availability:'in_stock',location:'السعودية',fetchedAt:new Date().toISOString()};
test('shopping cart merges only exact store and product IDs, retains quantities and computes money in cents',()=>{
 let rows=addShoppingItem([],p);rows=addShoppingItem(rows,p);assert.equal(rows.length,1);assert.equal(rows[0].quantity,2);assert.equal(shoppingTotal(rows),20.3);
 assert.notEqual(shoppingKey(p),shoppingKey({...p,store:'outlet'}));assert.equal(addShoppingItem(rows,{...p,availability:'out_of_stock'}),rows);
 const restored=restoreShoppingCart(JSON.parse(JSON.stringify(rows)),['beautycare']);assert.equal(restored[0].quantity,2);assert.equal(restored[0].product.price,p.price);assert.equal(restored[0].product.id,p.id);
 assert.deepEqual(restoreShoppingCart([{product:{...p,url:'https://evil.example/'},quantity:1},{product:p,quantity:-1},{product:p,quantity:100}],['beautycare']),[]);
 assert.deepEqual(restoreShoppingCart(rows,['outlet']),[]);
});

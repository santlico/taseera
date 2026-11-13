import type {Product,StoreId} from './index';
import {validateProducts} from './validation';
export interface ShoppingItem {product:Product;quantity:number}
export const shoppingKey=(p:Pick<Product,'store'|'id'>)=>`${p.store}:${p.id}`;
export function restoreShoppingCart(value:unknown,allowed:readonly StoreId[]):ShoppingItem[]{
 if(!Array.isArray(value))return [];
 const items=new Map<string,ShoppingItem>();
 for(const row of value.slice(0,100)){
  if(!row||!allowed.includes(row.product?.store)||!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>99)continue;
  try{const p=validateProducts([row.product],row.product.store)[0];if(p)items.set(shoppingKey(p),{product:p,quantity:row.quantity});}catch{}
 }
 return [...items.values()];
}
export function addShoppingItem(items:ShoppingItem[],product:Product):ShoppingItem[]{
 if(product.availability==='out_of_stock')return items;
 const key=shoppingKey(product),found=items.some(i=>shoppingKey(i.product)===key);
 if(!found&&items.length>=100)return items;
 return found?items.map(i=>shoppingKey(i.product)===key?{product,quantity:Math.min(99,i.quantity+1)}:i):[...items,{product,quantity:1}];
}
export const shoppingTotal=(items:ShoppingItem[])=>items.reduce((n,i)=>n+Math.round(i.product.price*100)*i.quantity,0)/100;

'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {Product} from '@market/core';
import {addShoppingItem,restoreShoppingCart,shoppingKey,shoppingTotal,type ShoppingItem} from '../../../packages/core/src/cart';
import {stores,storeInfo} from './store-catalog';
import {productImageSrc} from './product-image';
import {StoreLogo} from './store-logo';
import {UiIcon} from './ui-icon';
const KEY='taseera.shopping.v1';
const money=(n:number)=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const CartContext=createContext<{items:ShoppingItem[];add:(p:Product)=>void;open:()=>void}|null>(null);
const useCart=()=>useContext(CartContext)!;
export function ShoppingCartButton(){const {items,open}=useCart();const count=items.reduce((n,i)=>n+i.quantity,0);return <button className="shopping-launch" onClick={open} aria-label={`سلة مشترياتي، ${count} قطعة`}><UiIcon name="grocery"/><span>سلتي</span>{count>0&&<b>{count}</b>}</button>;}
export function AddToShoppingCart({product}:{product:Product}){const {items,add}=useCart();const quantity=items.find(i=>shoppingKey(i.product)===shoppingKey(product))?.quantity??0;const disabled=product.availability==='out_of_stock'||quantity>=99||(!quantity&&items.length>=100);return <button className={`shopping-add ${quantity?'is-added':''}`} disabled={disabled} onClick={()=>add(product)} aria-label={`إضافة ${product.name} إلى سلة مشترياتي`}>{quantity?`+ أضف للسلة (${quantity})`:'+ أضف للسلة'}</button>;}
export function ShoppingCartProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<ShoppingItem[]>([]),[loaded,setLoaded]=useState(false),[opened,setOpened]=useState(false),[announcement,setAnnouncement]=useState('');
 const sheet=useRef<HTMLDialogElement>(null);
 useEffect(()=>{try{setItems(restoreShoppingCart(JSON.parse(localStorage.getItem(KEY)||'[]'),stores.filter(s=>s.enabled).map(s=>s.id)));}catch{}setLoaded(true);},[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(KEY,JSON.stringify(items));}catch{setAnnouncement('تعذّر حفظ السلة على الجهاز؛ تبقى متاحة في هذه الصفحة.');}},[items,loaded]);
 useEffect(()=>{const d=sheet.current;if(!d)return;if(opened&&!d.open)d.showModal();if(!opened&&d.open)d.close();if(!opened)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[opened]);
 function add(product:Product){setItems(old=>addShoppingItem(old,product));setAnnouncement(`أُضيف ${product.name} إلى سلة مشترياتك`);}
 function change(key:string,quantity:number){setItems(old=>old.flatMap(i=>shoppingKey(i.product)!==key?[i]:quantity<=0?[]:[{...i,quantity:Math.min(99,quantity)}]));}
 const groups=stores.map(store=>({store,lines:items.filter(i=>i.product.store===store.id)})).filter(g=>g.lines.length);
 return <CartContext.Provider value={{items,add,open:()=>setOpened(true)}}>{children}<div role="status" aria-live="polite" className="sr-only">{announcement}</div>
  <dialog ref={sheet} className="shopping-sheet" aria-labelledby="shopping-title" onClose={()=>setOpened(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpened(false);}}}>
   <header className="shopping-heading"><div><span className="shopping-eyebrow">اختياراتك، مرتّبة حسب المتجر</span><h2 id="shopping-title">سلة مشترياتي <small>{items.reduce((n,i)=>n+i.quantity,0)} قطعة</small></h2></div><button className="icon-button" onClick={()=>setOpened(false)} aria-label="إغلاق سلة المشتريات">×</button></header>
   {items.length?<><div className="shopping-content"><p className="shopping-intro">اجمع منتجاتك هنا، ثم افتح كل منتج عند متجره لإضافته وإكمال الشراء. اختياراتك وكمياتك محفوظة على جهازك.</p>{groups.map(g=><StoreCart key={g.store.id} lines={g.lines} change={change}/>)}<p className="shopping-disclaimer">هذه مجاميع تقديرية من أسعار البحث، قبل رسوم التوصيل. راجع السعر والحجم والخيارات والتوفر عند المتجر. </p></div><footer className="shopping-summary"><div><span>إجمالي السلة · {groups.length===1?'متجر واحد':groups.length===2?'متجران':`${groups.length} متاجر`}</span><strong><bdi>{money(shoppingTotal(items))}</bdi> <small>ر.س</small></strong><small>بدون رسوم التوصيل</small></div><button className="secondary" onClick={()=>setOpened(false)}>متابعة البحث</button></footer></>:<div className="shopping-empty"><UiIcon name="grocery"/><h3>كل مشترياتك في مكان واحد</h3><p>ابحث عن منتج واضغط «أضف للسلة». نجمع اختياراتك حسب المتجر ونحسب لك الكميات والمجموع.</p><button className="primary" onClick={()=>setOpened(false)}>ابدأ البحث</button></div>}
  </dialog>
 </CartContext.Provider>;
}
function StoreCart({lines,change}:{lines:ShoppingItem[];change:(key:string,quantity:number)=>void}){
 const store=storeInfo(lines[0].product.store);
 return <section className="shopping-store" aria-label={`منتجات ${store.name}`}>
  <div className="shopping-store-head"><StoreLogo src={store.logo} name={store.name}/><div><h3>{store.name}</h3><span>{lines.length} منتجات · {lines.reduce((n,i)=>n+i.quantity,0)} قطعة</span></div></div>
  <ul>{lines.map(item=><ShoppingCartItem key={shoppingKey(item.product)} item={item} change={change}/>)}</ul>
  <div className="shopping-store-total"><span>إجمالي {store.name}<small>قبل رسوم التوصيل</small></span><strong><bdi>{money(shoppingTotal(lines))}</bdi> <small>ر.س</small></strong></div>
 </section>;
}
function ShoppingCartItem({item:{product:p,quantity},change}:{item:ShoppingItem;change:(key:string,quantity:number)=>void}){
 const [imageError,setImageError]=useState(false),image=productImageSrc(p);
 return <li>
  <div className="shopping-product-row"><a className="shopping-product-image" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`عرض ${p.name} عند المتجر`}>{image&&!imageError?<img src={image} alt={p.name} width="80" height="90" loading="lazy" onError={()=>setImageError(true)}/>:<span>صورة غير متاحة</span>}</a>
   <div className="shopping-item-name"><a href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a><span><bdi>{money(p.price)}</bdi> ر.س للقطعة{Date.now()-Date.parse(p.fetchedAt)>3600000?' · سعر محفوظ؛ راجعه عند المتجر':''}</span>{p.availability==='out_of_stock'&&<small className="shopping-stock-warning">غير متوفر حسب آخر بحث</small>}<a className="shopping-visit" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`اذهب للمتجر لشراء ${p.name}`}>اذهب للمتجر <span aria-hidden="true">↗</span></a></div>
  </div>
  <div className="shopping-line-bottom"><div className="shopping-quantity"><button disabled={quantity<=1} aria-label={`تقليل كمية ${p.name}`} onClick={()=>change(shoppingKey(p),quantity-1)}>−</button><output aria-label={`كمية ${p.name}`}>{quantity}</output><button disabled={quantity>=99} aria-label={`زيادة كمية ${p.name}`} onClick={()=>change(shoppingKey(p),quantity+1)}>+</button></div><strong><bdi>{money(p.price*quantity)}</bdi> <small>ر.س</small></strong><button className="text-button shopping-remove" aria-label={`إزالة ${p.name} من السلة`} onClick={()=>change(shoppingKey(p),0)}>إزالة</button></div>
 </li>;
}

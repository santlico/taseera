'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import type {Product} from '@market/core';
import {addShoppingItem,restoreShoppingCart,shoppingKey,shoppingTotal,canTransferCart,type ShoppingItem} from '../../../packages/core/src/cart';
import {stores,storeInfo} from './store-catalog';
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
   {items.length?<><div className="shopping-content"><p className="shopping-intro">جهّز سلة مستقلة لكل متجر يدعم النقل، أو افتح المنتج لإضافته عند المتجر. اختياراتك محفوظة هنا.</p>{groups.map(g=><StoreCart key={g.store.id} lines={g.lines} change={change}/>)}<p className="shopping-disclaimer">هذه مجاميع تقديرية من أسعار البحث، قبل رسوم التوصيل. راجع السعر والحجم والخيارات والتوفر عند المتجر. تجهيز السلة لا ينشئ طلب شراء.</p></div><footer className="shopping-summary"><div><span>مجموع المنتجات · {groups.length} متاجر</span><strong><bdi>{money(shoppingTotal(items))}</bdi> <small>ر.س</small></strong><small>بدون رسوم التوصيل</small></div><button className="secondary" onClick={()=>setOpened(false)}>متابعة البحث</button></footer></>:<div className="shopping-empty"><UiIcon name="grocery"/><h3>كل مشترياتك في مكان واحد</h3><p>ابحث عن منتج واضغط «أضف للسلة». نجمع اختياراتك حسب المتجر ونحسب لك الكميات والمجموع.</p><button className="primary" onClick={()=>setOpened(false)}>ابدأ البحث</button></div>}
  </dialog>
 </CartContext.Provider>;
}
function StoreCart({lines,change}:{lines:ShoppingItem[];change:(key:string,quantity:number)=>void}){
 const store=storeInfo(lines[0].product.store),supported=canTransferCart(store.id);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState<{signature:string;url:string}|null>(null),[copied,setCopied]=useState('');
 const signature=JSON.stringify(lines.map(i=>[i.product.id,i.quantity]).sort());
 const readyUrl=ready?.signature===signature?ready.url:undefined;
 const submitting=useRef(false);
 async function prepare(){
  if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/cart-transfer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({store:store.id,items:lines.map(i=>({id:i.product.id,quantity:i.quantity}))}),signal:AbortSignal.timeout(40000)});
   const data=await response.json();if(!response.ok){const failed=lines.find(i=>i.product.id===data.itemId);throw new Error(failed?`راجع «${failed.product.name}» عند المتجر؛ قد يحتاج اختيار حجم أو لون أو تغيّر توفره. لم يكتمل تجهيز السلة.`:'لم نتمكن من تأكيد سلة المتجر. اختياراتك محفوظة؛ أعد المحاولة أو افتح المنتجات عند المتجر.');}
   const url=new URL(data.url);if(url.protocol!=='https:'||url.origin!==new URL(lines[0].product.url).origin)throw new Error('تعذّر التحقق من رابط السلة.');
   setReady({signature,url:url.href});
  }catch(e){setError(e instanceof Error&&/^(راجع|لم نتمكن|تعذّر)/.test(e.message)?e.message:'تعذّر الاتصال أثناء تجهيز السلة؛ اختياراتك محفوظة. حاول مرة أخرى.');}finally{submitting.current=false;setBusy(false);}
 }
 async function copy(){try{await navigator.clipboard.writeText(lines.map(i=>`${i.quantity} × ${i.product.name}\n${i.product.url}`).join('\n\n'));setCopied(signature);}catch{setError('تعذّر نسخ القائمة. افتح المنتجات من الروابط أدناه.');}}
 return <section className="shopping-store"><div className="shopping-store-head"><StoreLogo src={store.logo} name={store.name}/><div><h3>{store.name}</h3><span>{lines.reduce((n,i)=>n+i.quantity,0)} قطعة · {supported?'يدعم تجهيز سلة المتجر':'الإضافة من صفحة المنتج'}</span></div><strong><bdi>{money(shoppingTotal(lines))}</bdi> <small>ر.س</small></strong></div>
  <ul>{lines.map(({product:p,quantity})=><li key={shoppingKey(p)}><div className="shopping-item-name"><a href={p.url} target="_blank" rel="noopener noreferrer">{p.name} <span>↗</span></a><span><bdi>{money(p.price)}</bdi> ر.س للقطعة{Date.now()-Date.parse(p.fetchedAt)>3600000?' · سعر محفوظ؛ راجعه عند المتجر':''}</span>{p.availability==='out_of_stock'&&<small className="shopping-stock-warning">غير متوفر حسب آخر بحث</small>}</div><div className="shopping-line-bottom"><div className="shopping-quantity"><button disabled={busy||quantity<=1} aria-label={`تقليل كمية ${p.name}`} onClick={()=>change(shoppingKey(p),quantity-1)}>−</button><output aria-label={`كمية ${p.name}`}>{quantity}</output><button disabled={busy||quantity>=99} aria-label={`زيادة كمية ${p.name}`} onClick={()=>change(shoppingKey(p),quantity+1)}>+</button></div><strong><bdi>{money(p.price*quantity)}</bdi> <small>ر.س</small></strong><button className="text-button shopping-remove" disabled={busy} aria-label={`إزالة ${p.name} من السلة`} onClick={()=>change(shoppingKey(p),0)}>إزالة</button></div></li>)}</ul>
  {supported?<div className="shopping-transfer"><p>تُنشأ سلة ضيف جديدة لدى {store.name} بالمنتجات والكميات المحددة. المنتجات ذات الخيارات قد تتطلب مراجعة؛ لا ندمجها بسلة سابقة.</p>{readyUrl?<><div className="shopping-ready" role="status">✓ تأكدنا من إضافة {lines.length} منتجات بالكميات المطلوبة</div><a className="primary" href={readyUrl} target="_blank" rel="noopener noreferrer">افتح سلة {store.name} الجاهزة ↗</a></>:<button className="primary" disabled={busy||lines.length>20||lines.some(i=>i.product.availability==='out_of_stock')} onClick={prepare}>{busy?'نجهّز سلتك ونتحقق من الكميات…':`جهّز سلتي في ${store.name}`}</button>}{lines.length>20&&<p>انقل حتى 20 منتجًا مختلفًا في المرة الواحدة.</p>}</div>:<div className="shopping-transfer"><p>هذا المتجر لا يدعم نقل السلة من تسعيرة حاليًا. افتح كل منتج من اسمه لإضافته؛ قائمتك تبقى محفوظة هنا.</p><button className="secondary" onClick={copy}>{copied===signature?'تم نسخ المنتجات والروابط':'انسخ قائمة هذا المتجر'}</button></div>}
  {error&&<p className="shopping-error" role="alert">{error}</p>}
 </section>;
}

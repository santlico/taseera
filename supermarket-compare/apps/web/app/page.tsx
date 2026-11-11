'use client';
import {useState,type FormEvent} from 'react';
import type {SearchResponse,StoreId} from '@market/core';
import {stores} from './store-catalog';
import {StoreLogo} from './store-logo';
import {SearchResults} from './search-results';
const available=stores.filter(s=>s.enabled);
function SearchIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>}
export default function Page(){
 const [selected,setSelected]=useState<StoreId[]>(available.map(s=>s.id));
 const [term,setTerm]=useState('');const [loading,setLoading]=useState(false);
 const [response,setResponse]=useState<SearchResponse|null>(null);const [error,setError]=useState('');
 const [picker,setPicker]=useState(false);
 const change=(id:StoreId)=>{setSelected(old=>old.includes(id)?old.filter(s=>s!==id):[...old,id]);setResponse(null)};
 async function search(event:FormEvent){event.preventDefault();if(loading||!term.trim()||!selected.length)return;
 setLoading(true);setError('');setResponse(null);
 try{const params=new URLSearchParams({q:term.trim(),city:'الرياض'});selected.forEach(id=>params.append('store',id));const r=await fetch(`/api/search?${params}`);if(!r.ok)throw Error();setResponse(await r.json())}catch{setError('تعذّر إكمال البحث. جرّب مرة أخرى.')}finally{setLoading(false)}}
 return <div className="shell">
 <aside className="sidebar">
  <a className="brand" href="/" aria-label="تسعيرة الرئيسية"><svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M28 4H15L4 15l17 17 11-11V8Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/><circle cx="24" cy="11" r="2" fill="currentColor"/><path d="m12 19 4 4 8-8" stroke="currentColor" strokeWidth="2.4"/></svg><span>تسعيرة<small>كل سعر، في مكانه.</small></span></a>
  <div className="nav-active"><SearchIcon/>البحث والمقارنة</div>
  <button className="mobile-picker" onClick={()=>setPicker(!picker)} aria-expanded={picker}>متاجر المقارنة <span>{selected.length} محددة {picker?'−':'+'}</span></button>
  <div className={`picker ${picker?'open':''}`}>
   <div className="section-label"><h2>متاجرك</h2><span>{selected.length}/{available.length}</span></div>
   <button className="select-all" disabled={loading} onClick={()=>{setSelected(selected.length===available.length?[]:available.map(s=>s.id));setResponse(null)}}>{selected.length===available.length?'إلغاء تحديد الكل':'تحديد المتاجر المتاحة'}</button>
   <fieldset disabled={loading}><legend className="sr-only">حدد المتاجر التي تريد البحث فيها</legend>{stores.filter(s=>s.enabled).map(store=><label className={`store-option ${selected.includes(store.id)?'chosen':''}`} key={store.id}><StoreLogo src={store.logo} name={store.name}/><span><strong>{store.name}</strong><small>{store.english}</small></span><input type="checkbox" checked={selected.includes(store.id)} onChange={()=>change(store.id)}/></label>)}</fieldset>
   <h3 className="soon-title">قريبًا في تسعيرة</h3><div className="soon-stores">{stores.filter(s=>!s.enabled).map(store=><label className="store-option unavailable" key={store.id}><StoreLogo src={store.logo} name={store.name}/><span><strong>{store.name}</strong><small>قريبًا</small></span><input type="checkbox" disabled aria-label={`${store.name} — قريبًا`}/></label>)}</div>
  </div>
  <div className="side-foot"><span className="status-dot"/> {available.length} متاجر متاحة للبحث<p>أسعار من مواقع المتاجر مباشرة.<br/>قد تختلف حسب الموقع والتوفّر.</p></div>
 </aside>
 <main>
  <header className="topbar"><span>مشتريات أوضح. قرار أذكى.</span><span>السعودية <span className="sep">/</span> الأسعار بـ ر.س</span></header>
  <div className="canvas">
   <div className="page-heading"><div><h1>قارن قبل ما تتسوّق.</h1><p>ابحث مرة واحدة، واستكشف الأسعار في متاجرك المختارة.</p></div><span className="live-label"><span className="status-dot"/> بحث مباشر</span></div>
   <section className="search-card" aria-label="بحث المنتجات"><form onSubmit={search}><label htmlFor="query">وش ناوي تشتري؟</label><div className="search-line"><div className="search-input"><SearchIcon/><input id="query" type="search" value={term} onChange={e=>setTerm(e.target.value)} maxLength={200} placeholder="اسم المنتج، العلامة، أو الوزن…" disabled={loading}/></div><button className="primary" disabled={loading||!term.trim()||!selected.length}>{loading?'جارٍ البحث…':'قارن الأسعار'}<span aria-hidden="true">←</span></button></div><div className="search-meta"><span>{selected.length?`البحث في ${selected.length} متاجر مختارة`:'اختر متجرًا واحدًا على الأقل'}</span><span>تحديد الوزن يساعدك في مقارنة أدق</span></div></form><div className="suggestions"><span>بحث سريع</span>{['صدور دجاج ساديا','حليب المراعي','بيبسي'].map(s=><button disabled={loading} key={s} onClick={()=>{setTerm(s);setResponse(null)}}>{s}<span aria-hidden="true">↖</span></button>)}</div></section>
   {error?<div role="alert" className="error-panel">{error}<button onClick={()=>setError('')}>إغلاق</button></div>:null}
   {loading?<section className="panel loading" aria-live="polite"><span className="spinner"/><h2>نبحث في متاجرك…</h2><p>تُعرض حالة كل متجر حتى لو تعذّر الوصول إلى أحدها.</p></section>:response?<SearchResults response={response}/>:<section className="welcome panel"><div><span className="empty-mark" aria-hidden="true">↔</span><h2>ابدأ بقائمة متاجرك، ثم منتجك.</h2><p>نتائج مستقلة لكل متجر، وروابط مباشرة للمنتجات.<br/>الإحصائيات تظهر بعد البحث وتُحسب من نتائجك الفعلية.</p></div><div className="welcome-stores"><h3>جاهزة للمقارنة</h3>{available.map(s=><div key={s.id}><StoreLogo src={s.logo} name={s.name}/><strong>{s.name}</strong><span>{s.scope}</span></div>)}</div></section>}
   <footer>تسعيرة <span>الأسعار وقت البحث، ولا تشمل رسوم التوصيل. تحقق من التفاصيل لدى المتجر.</span></footer>
  </div>
 </main></div>
}

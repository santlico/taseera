'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import type {StoreId} from '@market/core';
import {stores} from './store-catalog';
import {StoreLogo} from './store-logo';
import {SearchResults} from './search-results';
import {requestStore, type LiveSearch, type LiveStoreResult} from './search-client';
const available=stores.filter(s=>s.enabled);
const STORE_KEY='taseera.stores.v1', HISTORY_KEY='taseera.history.v1';
function SearchIcon(){return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>}
export default function Page(){
 const [selected,setSelected]=useState<StoreId[]>(available.map(s=>s.id));
 const [term,setTerm]=useState(''),[search,setSearch]=useState<LiveSearch|null>(null);
 const [picker,setPicker]=useState(false),[history,setHistory]=useState<string[]>([]),[notice,setNotice]=useState('');
 const run=useRef(0),controller=useRef<AbortController|null>(null);
 const loading=!!search?.results.some(r=>r.status==='pending');
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),query=params.get('q')?.trim().slice(0,200);
  if(query)setTerm(query);
  const requested=params.getAll('store');let ids:unknown[]=requested.length?requested:available.map(s=>s.id);
  try{const saved=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
   if(!requested.length&&Array.isArray(saved))ids=saved;
   const recent=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
   if(Array.isArray(recent))setHistory(recent.filter(v=>typeof v==='string'&&v.length<=200).slice(0,5));
  }catch{}
  setSelected(available.filter(s=>ids.includes(s.id)).map(s=>s.id));
  return()=>controller.current?.abort();
 },[]);
 function choose(ids:StoreId[]){setSelected(ids);try{localStorage.setItem(STORE_KEY,JSON.stringify(ids));}catch{}}
 function update(id:StoreId,result:LiveStoreResult,version:number){if(run.current===version)setSearch(old=>old?{...old,results:old.results.map(r=>r.store===id?result:r)}:old);}
 async function fetchOne(query:string,id:StoreId,version:number,signal:AbortSignal){
  try{update(id,await requestStore(query,id,signal),version);}
  catch{update(id,{store:id,status:signal.aborted?'cancelled':'error',products:[],durationMs:0},version);}
 }
 function start(query:string){
  query=query.trim();if(!query||!selected.length)return;
  controller.current?.abort();controller.current=new AbortController();const version=++run.current;
  setTerm(query);setNotice('');setPicker(false);
  setSearch({term:query,startedAt:new Date().toISOString(),results:selected.map(store=>({store,status:'pending',products:[],durationMs:0}))});
  const recent=[query,...history.filter(q=>q!==query)].slice(0,5);setHistory(recent);
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(recent));}catch{}
  const params=new URLSearchParams({q:query});selected.forEach(id=>params.append('store',id));window.history.replaceState(null,'',`/?${params}`);
  for(const id of selected)void fetchOne(query,id,version,controller.current.signal);
 }
 function cancel(){controller.current?.abort();++run.current;setSearch(old=>old?{...old,results:old.results.map(r=>r.status==='pending'?{...r,status:'cancelled'}:r)}:old);setNotice('أُوقف البحث. النتائج التي وصلت ما زالت متاحة.');}
 function retry(id:StoreId){if(!search||search.results.find(r=>r.store===id)?.status==='pending')return;
  if(!controller.current||controller.current.signal.aborted)controller.current=new AbortController();
  const version=run.current;update(id,{store:id,status:'pending',products:[],durationMs:0},version);void fetchOne(search.term,id,version,controller.current.signal);
 }
 async function share(){try{await navigator.clipboard.writeText(window.location.href);setNotice('تم نسخ الرابط. افتحه واضغط «ابحث وقارن» للحصول على أسعار جديدة.');}catch{setNotice('تقدر تنسخ رابط البحث من شريط العنوان وتشاركه.');}}
 function submit(event:FormEvent){event.preventDefault();start(term);}
 return <div className="shell">
  <a className="skip-link" href="#main">انتقل إلى البحث</a>
  <aside className="sidebar" aria-label="إعدادات المقارنة">
   <a className="brand" href="/" aria-label="تسعيرة الرئيسية"><svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M28 4H15L4 15l17 17 11-11V8Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round"/><circle cx="24" cy="11" r="2" fill="currentColor"/><path d="m12 19 4 4 8-8" stroke="currentColor" strokeWidth="2.4"/></svg><span>تسعيرة<small>قارن بوضوح. تسوّق بثقة.</small></span></a>
   <div className="nav-active"><SearchIcon/>البحث والمقارنة</div>
   <button className="mobile-picker" onClick={()=>setPicker(!picker)} aria-expanded={picker} aria-controls="store-picker">متاجر المقارنة <span>{selected.length} محددة {picker?'−':'+'}</span></button>
   <div id="store-picker" className={`picker ${picker?'open':''}`}>
    <div className="section-label"><h2>أين نبحث لك؟</h2><span><bdi>{selected.length}/{available.length}</bdi></span></div>
    <button className="select-all" onClick={()=>choose(selected.length===available.length?[]:available.map(s=>s.id))}>{selected.length===available.length?'إلغاء تحديد الكل':'تحديد كل المتاجر'}</button>
    <fieldset><legend className="sr-only">المتاجر التي سيشملها البحث القادم</legend>{available.map(store=><label className={`store-option ${selected.includes(store.id)?'chosen':''}`} key={store.id}><StoreLogo src={store.logo} name={store.name}/><span><strong>{store.name}</strong><small>{store.english}</small></span><input type="checkbox" aria-label={store.name} checked={selected.includes(store.id)} onChange={()=>choose(selected.includes(store.id)?selected.filter(id=>id!==store.id):[...selected,store.id])}/></label>)}</fieldset>
    <details className="upcoming"><summary>متاجر نعمل على إضافتها</summary>{stores.filter(s=>!s.enabled).map(store=><div className="store-option unavailable" key={store.id}><StoreLogo src={store.logo} name={store.name}/><span>{store.name}</span><small>قريبًا</small></div>)}</details>
   </div>
   <div className="side-foot"><span className="status-dot"/> من مواقع المتاجر مباشرة<p>بدون تسجيل دخول.<br/>اختياراتك وآخر بحث محفوظة على جهازك.</p></div>
  </aside>
  <main id="main">
   <header className="topbar"><span>مشتريات أوضح. قرار أذكى.</span><span>الرياض والسعر الافتراضي للمتاجر <span className="sep">/</span> ر.س</span></header>
   <div className={`canvas ${search?'has-results':''}`}>
    <div className="page-heading"><div><span className="eyebrow">كل مقارنة تبدأ بسؤال بسيط</span><h1>وين أحصل السعر الأنسب؟</h1><p>ابحث عن منتجك، اختر العروض، وقارن الحجم والسعر بوضوح.</p></div><span className="live-label"><span className="status-dot"/> {available.length} متاجر في بحث واحد</span></div>
    <section className="search-card" aria-label="بحث المنتجات"><form onSubmit={submit}><label htmlFor="query">وش ناوي تشتري؟</label><div className="search-line"><div className="search-input"><SearchIcon/><input id="query" name="q" type="search" value={term} onChange={e=>setTerm(e.target.value)} maxLength={200} placeholder="مثل: حليب المراعي كامل الدسم 1 لتر" autoComplete="off" enterKeyHint="search"/></div><button className="primary" disabled={!term.trim()||!selected.length}>ابحث وقارن <span aria-hidden="true">←</span></button></div><div className="search-meta"><span>{selected.length?`البحث في ${selected.length} متاجر مختارة`:'اختر متجرًا واحدًا على الأقل للبحث'}</span><span>أضف النوع والحجم لنتائج أقرب</span></div></form><div className="suggestions"><span>جرّب تبحث عن</span>{['حليب المراعي','صدور دجاج ساديا','بيبسي'].map(q=><button disabled={!selected.length} key={q} onClick={()=>start(q)}>{q}<span aria-hidden="true">↖</span></button>)}</div></section>
    {!search&&history.length>0&&<section className="recent-searches" aria-label="آخر عمليات البحث"><span>بحثت مؤخرًا</span>{history.map(q=><button key={q} disabled={!selected.length} onClick={()=>start(q)}>{q}</button>)}<button className="text-button" onClick={()=>{setHistory([]);try{localStorage.removeItem(HISTORY_KEY);}catch{}}}>مسح السجل</button></section>}
    <div role="status" aria-live="polite" className={notice?'notice':'sr-only'}>{notice}</div>
    {search?<SearchResults key={search.startedAt} search={search} onRetry={retry} onCancel={cancel} onShare={share} loading={loading}/>:<>
     <section className="welcome panel"><div><span className="empty-mark" aria-hidden="true">↔</span><h2>نفس المنتج؟<br/>خلّ المقارنة على بيّنة.</h2><p>السعر الأقل قد يكون لحجم أصغر أو عبوة واحدة.<br/>اختر حتى 4 عروض وقارن الحجم، عدد العبوات وسعر الوحدة.</p><a className="inline-link" href="#how-it-works">كيف تساعدك تسعيرة؟ ↓</a></div><div className="welcome-stores"><h3>متاجرك، في مكان واحد</h3>{available.map(s=><div key={s.id}><StoreLogo src={s.logo} name={s.name}/><strong>{s.name}</strong><span>{s.scope}</span></div>)}</div></section>
     <section className="how-it-works" id="how-it-works" aria-label="كيف تستخدم تسعيرة">{[['01','ابحث بدقة','اكتب العلامة والنوع والحجم إذا تعرفها.'],['02','اختر العروض','شاهد مصدر السعر وموقعه وحالة التوفر.'],['03','قارن بوضوح','راجع سعر العبوة والوحدة، ثم انتقل للمتجر.']].map(([n,title,description])=><div key={n}><span>{n}</span><h3>{title}</h3><p>{description}</p></div>)}</section>
    </>}
    <footer><span>تسعيرة · قرار شراء أوضح</span><span>الأسعار وقت الجلب، ولا تشمل التوصيل. الفرع والعنوان والبائع قد يغيّرون السعر والتوفر.</span></footer>
   </div>
  </main>
 </div>;
}

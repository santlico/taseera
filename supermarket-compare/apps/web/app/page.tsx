'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import type {StoreId} from '@market/core';
import {stores} from './store-catalog';
import {scopes,scopeStores,restoreSelection,type SearchScope} from './search-scope';
import {UiIcon} from './ui-icon';
import {ShoppingCartButton} from './shopping-cart';
import {Splash} from './splash';
import {StoreLogo} from './store-logo';
import {parseSearchIntent} from './search-intent';
import {SearchResults} from './search-results';
import {requestStore, type LiveSearch, type LiveStoreResult} from './search-client';
const allAvailable=scopeStores('all');
const STORE_KEY='taseera.stores.v1', HISTORY_KEY='taseera.history.v1', SCOPE_KEY='taseera.scope.v1';
function SearchIcon(){return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>}
export default function Page(){
 const [scope,setScope]=useState<SearchScope>('all'),[ready,setReady]=useState(false);
 const [splashElapsed,setSplashElapsed]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setSplashElapsed(true),3000);return()=>clearTimeout(timer);},[]);
 const available=scopeStores(scope);
 const [choices,setChoices]=useState<StoreId[]>(allAvailable.map(s=>s.id));
 const selected=choices.filter(id=>available.some(s=>s.id===id));
 const [smart,setSmart]=useState(false);
 const [term,setTerm]=useState(''),[search,setSearch]=useState<LiveSearch|null>(null);
 const [picker,setPicker]=useState(false),[history,setHistory]=useState<string[]>([]),[notice,setNotice]=useState('');
 const run=useRef(0),controller=useRef<AbortController|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),queryInput=useRef<HTMLInputElement>(null);
 const [draftStores,setDraftStores]=useState<StoreId[]>(allAvailable.map(s=>s.id));
 const loading=!!search?.results.some(r=>r.status==='pending');
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),query=params.get('q')?.trim().slice(0,200);
  if(query)setTerm(query);
  let saved:unknown=null,savedScope:unknown=null;
  try{saved=JSON.parse(localStorage.getItem(STORE_KEY)||'null');savedScope=localStorage.getItem(SCOPE_KEY);
   const recent=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
   if(Array.isArray(recent))setHistory(recent.filter(v=>typeof v==='string'&&v.length<=200).slice(0,5));
  }catch{}
  const restored=restoreSelection(params,saved,savedScope);setScope(restored.scope);setChoices(restored.ids);setReady(true);
  return()=>controller.current?.abort();
 },[]);
 useEffect(()=>{
  const sheet=dialog.current;if(!sheet)return;
  if(picker&&!sheet.open)sheet.showModal();
  if(!picker&&sheet.open)sheet.close();
  if(!picker)return;
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=previous;};
 },[picker]);
 function openPicker(){setDraftStores(selected);setPicker(true);}
 function choose(ids:StoreId[]){const next=[...choices.filter(id=>!available.some(s=>s.id===id)),...ids];setChoices(next);try{localStorage.setItem(STORE_KEY,JSON.stringify(next.length===allAvailable.length?'all':next));}catch{}}
 function changeScope(next:SearchScope){
  if(next===scope)return;setScope(next);setPicker(false);try{localStorage.setItem(SCOPE_KEY,next);}catch{}
  let ids=choices.filter(id=>scopeStores(next).some(s=>s.id===id));
  if(!ids.length){ids=scopeStores(next).map(s=>s.id);const restored=[...new Set([...choices,...ids])];setChoices(restored);try{localStorage.setItem(STORE_KEY,JSON.stringify(restored.length===allAvailable.length?'all':restored));}catch{}}
  if(search&&ids.length)start(term.trim()||search.term,ids,next);
  else {controller.current?.abort();++run.current;setSearch(null);const params=new URLSearchParams(window.location.search);params.set('scope',next);params.delete('store');window.history.replaceState(null,'',`/?${params}`);}
 }
 function update(id:StoreId,result:LiveStoreResult,version:number){if(run.current===version)setSearch(old=>old?{...old,results:old.results.map(r=>r.store===id?result:r)}:old);}
 async function fetchOne(query:string,id:StoreId,version:number,signal:AbortSignal){
  try{update(id,await requestStore(query,id,signal),version);}
  catch{update(id,{store:id,status:signal.aborted?'cancelled':'error',products:[],durationMs:0},version);}
 }
 function start(query:string,storeIds:StoreId[]=selected,searchScope:SearchScope=scope){
  query=query.trim();if(!query||!storeIds.length)return;
  const intent=smart?parseSearchIntent(query):null,lookup=intent?.query||query;
  if(window.matchMedia('(max-width:800px)').matches)queryInput.current?.blur();
  controller.current?.abort();controller.current=new AbortController();const version=++run.current;
  setTerm(query);setNotice('');setPicker(false);
  setSearch({term:lookup,intent:intent||undefined,smart,startedAt:new Date().toISOString(),results:storeIds.map(store=>({store,status:'pending',products:[],durationMs:0}))});
  const recent=[query,...history.filter(q=>q!==query)].slice(0,5);setHistory(recent);
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(recent));}catch{}
  const params=new URLSearchParams({q:query,scope:searchScope});storeIds.forEach(id=>params.append('store',id));window.history.replaceState(null,'',`/?${params}`);
  for(const id of storeIds)void fetchOne(lookup,id,version,controller.current.signal);
 }
 function cancel(){controller.current?.abort();++run.current;setSearch(old=>old?{...old,results:old.results.map(r=>r.status==='pending'?{...r,status:'cancelled'}:r)}:old);setNotice('أُوقف البحث. النتائج التي وصلت ما زالت متاحة.');}
 function retry(id:StoreId){if(!search||search.results.find(r=>r.store===id)?.status==='pending')return;
  if(!controller.current||controller.current.signal.aborted)controller.current=new AbortController();
  const version=run.current;update(id,{store:id,status:'pending',products:[],durationMs:0},version);void fetchOne(search.term,id,version,controller.current.signal);
 }
 async function share(){try{await navigator.clipboard.writeText(window.location.href);setNotice('تم نسخ الرابط. افتحه واضغط «ابحث وقارن» للحصول على أسعار جديدة.');}catch{setNotice('تقدر تنسخ رابط البحث من شريط العنوان وتشاركه.');}}
 function submit(event:FormEvent){event.preventDefault();start(term);}
 return <>{(!ready||!splashElapsed)&&<Splash/>}<div className="shell" aria-busy={!ready||!splashElapsed} inert={!ready||!splashElapsed}>
  <a className="skip-link" href="#main">انتقل إلى البحث</a>
  <aside className="sidebar" aria-label="إعدادات المقارنة">
   <a className="brand" href="/" aria-label="تسعيرة الرئيسية"><img className="brand-wordmark" src="/brand/taseera.webp" width="1636" height="511" alt="تسعيرة" fetchPriority="high"/><small>قارن بوضوح. تسوّق بثقة.</small></a>
   <div className="header-actions"><ShoppingCartButton/><span className="mobile-location"><UiIcon name="location"/> الرياض <span>· ر.س</span></span></div>
   <div className="nav-active"><SearchIcon/>البحث والمقارنة</div>
   <div className="desktop-stores"><div className="section-label"><h2>متاجر بحثك</h2><span><bdi>{selected.length}/{available.length}</bdi></span></div><StoreChoices selected={selected} choose={choose} scope={scope}/></div>
   <div className="side-foot"><span className="status-dot"/> من مواقع المتاجر مباشرة<p>بدون تسجيل دخول.<br/>آخر بحث واختياراتك محفوظة على جهازك.</p></div>
  </aside>
  <main id="main">
   <header className="topbar"><span>مشتريات أوضح. قرار أذكى.</span><span>الرياض والسعر الافتراضي للمتاجر <span className="sep">/</span> الأسعار بالريال</span></header>
   <div className={`canvas ${search?'has-results':''}`}>
    <div className="page-heading"><div><span className="eyebrow">مقارنة أسعار مشترياتك</span><h1>قبل ما تشتري،<br/><em>شوف الفرق.</em></h1><p>منتجك في أكثر من متجر. قارن السعر والحجم، واختر العرض اللي يناسبك.</p></div><span className="live-label"><span className="status-dot"/> {available.length} {available.length===1?'متجر متاح':'متاجر متاحة'} للبحث</span></div>
    <section className="search-card" data-enter aria-label="بحث المنتجات">
     <div className="scope-picker" role="group" aria-label="نوع المتاجر">{scopes.map(s=><button key={s.id} aria-pressed={scope===s.id} onClick={()=>changeScope(s.id)}><span className={`scope-icon scope-icon-${s.id}`}><UiIcon name={s.id}/></span><span className="scope-label">{s.label}</span></button>)}</div>
     <form onSubmit={submit}><label htmlFor="query">ابحث عن منتجك</label><div className="search-line"><div className="search-input"><SearchIcon/><input ref={queryInput} id="query" name="q" type="search" value={term} onChange={e=>setTerm(e.target.value)} maxLength={200} placeholder={smart?'مثلاً: سماعات للدوام تحت 300 ريال':scope==='electronics'?'مثلاً: آيفون 17، سماعات، لابتوب':scope==='pharmacy'?'اسم المنتج، التركيز أو حجم العبوة':'مثلاً: شامبو، حليب، أو واقي شمس'} autoComplete="off" enterKeyHint="search"/></div><button className="primary search-submit" aria-label="ابحث وقارن" disabled={!term.trim()||!selected.length}><span className="search-label-long">ابحث وقارن</span><span className="search-label-short">ابحث</span><span className="search-arrow" aria-hidden="true">←</span></button></div><div className="search-meta"><span>{selected.length?'أضف النوع والحجم لنتائج أدق':'اختر متجرًا واحدًا على الأقل للبحث'}</span><span>السعر قد يختلف حسب الفرع والتوصيل</span></div><div className="smart-search-option"><label><input type="checkbox" checked={smart} onChange={e=>setSmart(e.target.checked)}/><span><strong>مختارات ذكية <span aria-hidden="true">✦</span></strong><small>نختصر لك النتائج حسب طلبك</small></span></label><p>{smart?'عند البحث نرسل طلبك وبيانات المنتجات إلى OpenAI لاختيار حتى 3 منتجات. لا تكتب معلومات شخصية أو صحية خاصة.':'اكتب اسم المنتج، أو صف احتياجك وحدد ميزانيتك.'}</p></div></form>
     <button className="merchant-trigger" onClick={openPicker} aria-label="تغيير متاجر البحث" aria-describedby="selected-stores-count"><span className="merchant-avatars" aria-hidden="true">{available.filter(s=>selected.includes(s.id)).slice(0,3).map(s=><StoreLogo key={s.id} src={s.logo} name={s.name}/>)}</span><span id="selected-stores-count">{selected.length?`نبحث في ${selected.length===1?(scope==='pharmacy'?'صيدلية واحدة':'مصدر واحد'):selected.length===2?(scope==='pharmacy'?'صيدليتين':'مصدرين'):`${selected.length} ${scope==='pharmacy'?'صيدليات':'مصادر'}`}`:'حدد مصادر البحث'}<small>{scope==='all'?'جميع أنواع المتاجر':scope==='pharmacy'?'منتجات الصيدليات':scope==='electronics'?'الإلكترونيات':scope==='beauty'?'العناية والجمال':'متاجر المقاضي'}</small></span><span className="merchant-change"><UiIcon name="settings"/> تحديد المتاجر <span aria-hidden="true">⌄</span></span></button>
    </section>
    {!search&&<div className="suggestions" aria-label="اقتراحات بحث"><span>جرّب</span>{(scope==='electronics'?['ايفون','سماعات','لابتوب']:scope==='pharmacy'?['سيتافيل','حليب أطفال','معجون أسنان']:scope==='beauty'?['سيتافيل','سيرافي','واقي شمس']:scope==='all'?['حليب المراعي','شامبو','معجون أسنان']:['حليب المراعي','صدور دجاج ساديا','بيبسي']).map(q=><button disabled={!selected.length} key={q} onClick={()=>start(q)}>{q}<span aria-hidden="true">↖</span></button>)}</div>}
    {!search&&history.length>0&&<section className="recent-searches" aria-label="آخر عمليات البحث"><div className="recent-heading"><h2>آخر بحث لك</h2><button className="text-button" onClick={()=>{setHistory([]);try{localStorage.removeItem(HISTORY_KEY);}catch{}}}>مسح السجل</button></div><div className="recent-items">{history.map(q=><button key={q} disabled={!selected.length} onClick={()=>start(q)}><span aria-hidden="true">↺</span>{q}</button>)}</div></section>}
    {scope==='pharmacy'&&<p className="pharmacy-note">قارن سعر المنتج نفسه؛ تأكد من التركيز والشكل وعدد الوحدات. تسعيرة لا يقترح بدائل علاجية.</p>}
    <div role="status" aria-live="polite" className={notice?'notice':'sr-only'}>{notice}</div>
    {search?<SearchResults key={search.startedAt} search={search} onRetry={retry} onCancel={cancel} onShare={share} onRefine={q=>start(q)} loading={loading}/>:<>
     <section className="home-merchants" aria-label="المتاجر المتاحة"><div className="home-section-title"><h2>{scope==='electronics'?'متاجر إلكترونياتك':scope==='pharmacy'?'صيدليات بحثك':scope==='grocery'?'متاجر مقاضيك':scope==='beauty'?'متاجر العناية والجمال':'نبحث لك في'}</h2><span>{available.length} {available.length===1?'مصدر':'مصادر'} · أسعار من المصدر</span></div><div className="merchant-strip">{available.map(store=><div key={store.id}><StoreLogo src={store.logo} name={store.name}/><span>{store.name}</span></div>)}</div></section>
     <section className="comparison-tip"><span className="tip-symbol"><UiIcon name="compare"/></span><div><h2>{scope==='electronics'?'نفس الموديل، نفس المواصفات.':scope==='pharmacy'?'نفس المنتج، نفس التفاصيل.':'نفس المنتج؟ قارن حجم العبوة.'}</h2><p>{scope==='electronics'?'راجع السعة واللون ورقم الموديل والضمان قبل مقارنة السعر.':scope==='pharmacy'?'راجع التركيز والشكل وعدد الوحدات قبل مقارنة سعر العبوة.':'اختر عرضين وقارن الحجم وعدد العبوات وسعر الوحدة.'}</p><div className="tip-sizes" aria-hidden="true"><span>{scope==='electronics'?'256 GB':scope==='pharmacy'?'التركيز':'1 لتر'}</span><span>{scope==='electronics'?'512 GB':scope==='pharmacy'?'الشكل والعدد':'12 × 1 لتر'}</span><small>{scope==='electronics'?'مواصفات مختلفة، مقارنة أدق':scope==='pharmacy'?'التفاصيل أولًا، ثم السعر':'عبوات مختلفة، مقارنة أوضح'}</small></div></div></section>
     <section className="how-it-works" id="how-it-works" aria-label="كيف تستخدم تسعيرة">{[['01','ابحث عن منتجك','العلامة والنوع والحجم تساعدك توصل أسرع.'],['02','اختر العروض المناسبة','أضف عرضين إلى أربعة للمقارنة.'],['03','راجع ثم تسوّق',scope==='pharmacy'?'راجع تفاصيل المنتج، وتحقق لدى الصيدلية.':'قارن العبوة والوحدة، وتحقق لدى المتجر.']].map(([n,title,description])=><div key={n}><span>{n}</span><h3>{title}</h3><p>{description}</p></div>)}</section>
     <p className="home-reassurance"><span>بدون تسجيل دخول</span><span>روابط المتاجر الأصلية</span><span>الأسعار بالريال</span></p>
    </>}
    <footer><span>تسعيرة · قرار شراء أوضح</span><span>الأسعار وقت الجلب ولا تشمل التوصيل. الفرع والعنوان والبائع قد يغيّرون السعر والتوفر.</span></footer>
   </div>
  </main>
  <dialog ref={dialog} className="store-sheet" aria-labelledby="store-sheet-title" onClose={()=>setPicker(false)} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientY<rect.top||event.clientY>rect.bottom||event.clientX<rect.left||event.clientX>rect.right)setPicker(false);}}}>
   <div className="sheet-grip" aria-hidden="true"/><div className="sheet-heading"><div><h2 id="store-sheet-title">وين نبحث لك؟</h2><p>{scope==='electronics'?'اختر متاجر الإلكترونيات التي يشملها بحثك.':scope==='pharmacy'?'اختر الصيدليات التي يشملها بحثك.':scope==='grocery'?'اختر متاجر المقاضي التي يشملها بحثك.':scope==='beauty'?'اختر متاجر العناية والجمال التي يشملها بحثك.':'اختر المتاجر والصيدليات التي يشملها بحثك.'}</p></div><button className="icon-button" aria-label="إغلاق اختيار المتاجر" onClick={()=>setPicker(false)}>×</button></div>
   <div className="sheet-content"><StoreChoices selected={draftStores} choose={setDraftStores} scope={scope}/><p className="sheet-scope">الأسعار حسب نطاق كل متجر؛ تأكد من الفرع والتوصيل عند الشراء.</p></div>
   <div className="sheet-footer"><span aria-live="polite">{draftStores.length?`المحدد: ${draftStores.length} من ${available.length}`:'اختر متجرًا واحدًا على الأقل'}</span><button className="primary" disabled={!draftStores.length} onClick={()=>{choose(draftStores);setPicker(false);if(search)start(term.trim()||search.term,draftStores);}}>{search?'تحديث البحث':'اعتماد المتاجر'} <span aria-hidden="true">✓</span></button></div>
  </dialog>
 </div></>;
}

function StoreChoices({selected,choose,scope}:{selected:StoreId[];choose:(ids:StoreId[])=>void;scope:SearchScope}){
 const available=scopeStores(scope);
 return <><button className="select-all" onClick={()=>choose(selected.length===available.length?[]:available.map(s=>s.id))}>{selected.length===available.length?'إلغاء تحديد الكل':'تحديد كل المتاجر'}</button><fieldset className="store-choices"><legend className="sr-only">المتاجر التي سيشملها البحث القادم</legend>{available.map(store=><label className={`store-option ${selected.includes(store.id)?'chosen':''}`} key={store.id}><StoreLogo src={store.logo} name={store.name}/><span><strong>{store.name}</strong><small>{store.english}</small></span><input type="checkbox" aria-label={store.name} checked={selected.includes(store.id)} onChange={()=>choose(selected.includes(store.id)?selected.filter(id=>id!==store.id):[...selected,store.id])}/></label>)}</fieldset></>;
}

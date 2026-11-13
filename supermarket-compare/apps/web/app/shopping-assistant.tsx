'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {AssistantAnswer,AssistantPick} from './api/assistant/engine';
import {storeInfo} from './store-catalog';
import {StoreLogo} from './store-logo';
import {AddToShoppingCart} from './shopping-cart';
import {productImageSrc} from './product-image';
import type {SearchIntent} from './search-intent';
export function ShoppingAssistant({term,stores,searching,onRefine,intent,automatic=false}:{term:string;stores:string[];searching:boolean;onRefine:(term:string)=>void;intent?:SearchIntent;automatic?:boolean}){
 const [busy,setBusy]=useState(false),[answer,setAnswer]=useState<(AssistantAnswer&{cached:boolean})|null>(null),[error,setError]=useState(''),[dismissed,setDismissed]=useState(false),[expanded,setExpanded]=useState(false);
 const [budget,setBudget]=useState<number|null>(intent?.budget??null);
 const request=useRef<AbortController|null>(null),started=useRef(false),mounted=useRef(true);
 const storeKey=stores.slice().sort().join(',');
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();request.current=null;started.current=false;};},[]);
 const submit=useCallback(async()=>{
  if(request.current)return;
  const c=new AbortController();request.current=c;const timer=setTimeout(()=>c.abort(),45000);setBusy(true);setError('');setAnswer(null);
  try{const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({term,stores:storeKey.split(','),note:intent?.need||term,budget}),signal:c.signal});const d=await r.json();if(!r.ok)throw Error(typeof d.error==='string'?d.error:'تعذّر تجهيز المختارات.');if(!Array.isArray(d.picks)||d.picks.length>3)throw Error('تعذّر تجهيز المختارات.');if(mounted.current&&!c.signal.aborted)setAnswer(d);}
  catch(e){if(request.current!==c)return;if(mounted.current&&!c.signal.aborted)setError(e instanceof Error?e.message:'تعذّر تجهيز المختارات.');else if(mounted.current)setError('أخذت المختارات وقتًا أطول من المعتاد. نتائج المتاجر متاحة تحت.');}
  finally{clearTimeout(timer);if(request.current===c){request.current=null;if(mounted.current)setBusy(false);}}
 },[term,storeKey,intent?.need,budget]);
 useEffect(()=>{if(automatic&&!searching&&!started.current){started.current=true;void submit();}},[automatic,searching,submit]);
 if(dismissed)return <button className="assistant-restore" onClick={()=>setDismissed(false)}>✦ إظهار المختارات الذكية</button>;
 if(!automatic&&!answer&&!busy&&!error)return <div className="assistant-invitation"><span><strong>نتائج كثيرة؟</strong> نختار لك حتى 3 منتجات من بحثك.</span><button onClick={()=>{started.current=true;void submit();}} disabled={searching}>✦ اختصر لي النتائج</button><small>بالضغط ترسل بحثك وبيانات المنتجات إلى OpenAI. لا ترسل معلومات شخصية أو صحية خاصة.</small></div>;
 return <section className="shopping-assistant" aria-label="مختارات لك" aria-busy={busy}>
  <div className="assistant-heading"><span className="assistant-mark" aria-hidden="true">✦</span><div><h3>مختارات لك</h3><p>حسب طلبك، من نتائج المتاجر</p></div><button className="text-button" onClick={()=>setDismissed(true)} aria-label="إخفاء المختارات">إخفاء</button></div>
  <div className="assistant-content">
   <div className="assistant-intent" aria-label="تفاصيل طلبك"><span>{term}</span>{budget!==null&&<button onClick={()=>{request.current?.abort();request.current=null;setBusy(false);setBudget(null);setAnswer(null);setError('');started.current=false;}} aria-label="إلغاء حد الميزانية">حتى {budget.toLocaleString('ar-SA')} ر.س <b aria-hidden="true">×</b></button>}{intent&&intent.original!==term&&<small>طلبك: {intent.original}</small>}</div>
   {busy&&<div className="assistant-working" role="status"><span className="mini-spinner"/><div><strong>نراجع الخيارات المناسبة لطلبك…</strong><p>كمل تصفح نتائج المتاجر؛ نجهّز المختارات هنا.</p></div></div>}
   {error&&<div className="assistant-error" role="status"><p>{error}</p><button onClick={()=>void submit()}>أعد المحاولة</button><span>تقدر تكمل التصفح والشراء من النتائج أدناه.</span></div>}
   {searching&&!busy&&!answer&&<p className="assistant-status" role="status">تظهر نتائج المتاجر أولًا، ثم نجهّز المختارات تلقائيًا.</p>}
   {!searching&&!busy&&!answer&&!error&&<button className="assistant-refine" onClick={()=>void submit()}>اعرض المختارات بدون حد للميزانية ←</button>}
   {answer&&<div className="assistant-answer" aria-live="polite"><p className="assistant-coverage">راجعنا {answer.scanned} منتجًا من {answer.responded} من {answer.requested} متاجر.{answer.cached?' مختارات محفوظة لبضع دقائق.':''}</p>
   {answer.picks.length>0?<div className={`assistant-choices ${expanded?'is-expanded':''}`}>{answer.picks.map(p=><AssistantChoice key={p.product.store+':'+p.product.id} pick={p}/>)}</div>:<p className="assistant-empty">ما لقينا مختارات مؤكدة لطلبك. جميع نتائج المتاجر ما زالت متاحة.</p>}
   {answer.picks.length>1&&<button className="assistant-more" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'اختصر المختارات':`عرض ${answer.picks.length-1} مختارات إضافية`} <span aria-hidden="true">{expanded?'−':'+'}</span></button>}
   {answer.question&&<p className="assistant-question">{answer.question}</p>}
   {answer.refinedQuery&&answer.refinedQuery!==term&&answer.refinedQuery!==intent?.original&&<button className="assistant-refine" onClick={()=>onRefine(answer.refinedQuery)}>بحث أدق: <strong>{answer.refinedQuery}</strong><span aria-hidden="true">←</span></button>}
   <p className="assistant-footnote">اقتراحات بمساعدة AI من عينة النتائج، وليست كل السوق. راجع المواصفات والتوفر ورسوم التوصيل لدى المتجر.</p></div>}
  </div>
 </section>;
}
function AssistantChoice({pick}:{pick:AssistantPick}){
 const {product:p}=pick,store=storeInfo(p.store),src=productImageSrc(p),[failed,setFailed]=useState(false);
 return <article className="assistant-choice"><div className="assistant-choice-store"><StoreLogo src={store.logo} name={store.name}/><span>{store.name}{p.retailer?' · '+p.retailer:''}</span><small>{p.availability==='in_stock'?'متوفر':'التوفر غير مؤكد'}</small></div><div className="assistant-choice-main">{src&&!failed?<img src={src} alt="" width="76" height="90" loading="lazy" onError={()=>setFailed(true)}/>:<span className="assistant-no-image">صورة غير متاحة</span>}<div><h4>{p.name}</h4><strong className="assistant-price"><bdi>{p.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</bdi> <small>ر.س</small></strong></div></div><p className="assistant-choice-reason">{pick.reason}</p><details className="assistant-why"><summary>ليش هذا الخيار؟</summary><p className="assistant-evidence">من وصف المتجر: «{pick.evidence}»</p><p className="assistant-choice-check">{pick.check}</p></details><div className="assistant-choice-actions"><AddToShoppingCart product={p}/><a href={p.url} target="_blank" rel="noopener noreferrer">اذهب للمتجر ↗</a></div></article>;
}

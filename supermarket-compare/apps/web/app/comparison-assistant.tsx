 'use client';
import {useEffect,useRef,useState} from 'react';
import type {Product} from '@market/core';
import type {AssistantPick} from './api/assistant/engine';
import {storeInfo} from './store-catalog';
export function ComparisonAssistant({products,term}:{products:Product[];term:string}){
 const [picks,setPicks]=useState<AssistantPick[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null),version=useRef(0);
 const ids=products.map(p=>p.store+':'+p.id).sort().join('|');
 useEffect(()=>{++version.current;controller.current?.abort();controller.current=null;setBusy(false);setPicks(null);setError('');return()=>{++version.current;controller.current?.abort();};},[ids]);
 async function explain(){
  if(busy)return;const current=++version.current,c=new AbortController();controller.current=c;setBusy(true);setError('');const timer=setTimeout(()=>c.abort(),45000);
  try{const r=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({term,stores:[...new Set(products.map(p=>p.store))],note:'قراءة الفروقات المذكورة في أسماء المنتجات المختارة فقط',budget:null,compare:products.map(p=>p.store+':'+p.id)}),signal:c.signal});const d=await r.json();if(!r.ok)throw Error(d.error||'تعذّر شرح الفروقات.');if(!Array.isArray(d.picks)||d.picks.length!==products.length)throw Error('لم تكتمل بيانات المنتجات المختارة.');if(version.current===current)setPicks(d.picks);}
  catch(e){if(version.current===current)setError(e instanceof Error&&e.name!=='AbortError'?e.message:'أخذ الشرح وقتًا أطول. جدول المقارنة ما زال متاحًا.');}finally{clearTimeout(timer);if(version.current===current)setBusy(false);}
 }
 const difference=Math.max(...products.map(p=>p.price))-Math.min(...products.map(p=>p.price));
 return <div className="comparison-assistant"><div className="comparison-ai-heading"><div><strong>وش يفرق بين اختياراتك؟</strong><p>نبرز المواصفات المذكورة في أسماء المنتجات.</p></div><button disabled={busy} onClick={()=>void explain()}>{busy?'نراجع التفاصيل…':picks?'تحديث الشرح':'✦ وضّح لي الفروقات'}</button></div><small>عند الطلب نرسل بحثك وبيانات المنتجات المختارة إلى OpenAI.</small>{error&&<p role="status" className="assistant-error">{error}</p>}{picks&&<div aria-live="polite"><p>فرق السعر بين أعلى وأقل عرض: <bdi>{difference.toFixed(2)}</bdi> ر.س. فرق السعر وحده لا يعني أن العروض متطابقة.</p><ul>{picks.map(p=><li key={p.product.store+':'+p.product.id}><strong>{storeInfo(p.product.store).name} · {p.product.name}</strong><span>من اسم المنتج: «{p.evidence}»</span></li>)}</ul><p>هذه قراءة بمساعدة AI للنص المتاح؛ راجع المواصفات في صفحة المتجر. لا تعني تطابق المنتجات أو أنها بدائل علاجية.</p></div>}</div>;
}

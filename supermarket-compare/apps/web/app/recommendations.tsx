'use client';
import {useEffect,useRef,useState} from 'react';
import type {Product} from '@market/core';
import {loadRecommendationBatch} from './recommendations-client';
import {emptyRecommendation,parseRecommendation,recommendationReasons,type ProductRecommendation,type RecommendationReason} from '../../../packages/core/src/recommendations';
export const recommendationKey=(p:Pick<Product,'store'|'id'>)=>`${p.store}:${p.id}`;
export function useRecommendations(products:Product[]){
 const [votes,setVotes]=useState<Record<string,ProductRecommendation>>({}),[available,setAvailable]=useState<boolean|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
 const epochs=useRef<Record<string,number>>({}),writing=useRef(false);
 const [local,setLocal]=useState(false),[partial,setPartial]=useState(false);
 const signature=JSON.stringify([...new Map(products.map(p=>[recommendationKey(p),{store:p.store,id:p.id}])).values()]);
 useEffect(()=>{
  const list=JSON.parse(signature) as {store:string;id:string}[];if(!list.length)return;
  const controller=new AbortController();let alive=true;setLoading(true);setPartial(false);
  const timer=setTimeout(async()=>{
   try{
    let succeeded=false,failed=false;
    // Sequential batches ensure a first anonymous visitor receives one stable cookie.
    for(let i=0;i<list.length;i+=100){
     const snapshot={...epochs.current};
     try{const data=await loadRecommendationBatch(list.slice(i,i+100),controller.signal);succeeded=true;if(alive){setAvailable(true);setLocal(data.local);setVotes(old=>({...old,...Object.fromEntries(Object.entries(data.votes).filter(([key])=>(epochs.current[key]??0)===(snapshot[key]??0)))}));}}
     catch{controller.signal.throwIfAborted();failed=true;}
    }
    if(alive){setAvailable(succeeded);setPartial(failed&&succeeded);}
   }catch{if(alive)setAvailable(false);}finally{if(alive)setLoading(false);}
  },350);
  return()=>{alive=false;clearTimeout(timer);controller.abort();};
 },[signature]);
 async function vote(product:Product,reason:RecommendationReason|'remove'){
  if(writing.current)return false;writing.current=true;const key=recommendationKey(product);epochs.current[key]=(epochs.current[key]??0)+1;setBusy(key);setError('');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch('/api/recommendations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'vote',product:{store:product.store,id:product.id},reason}),signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(response.status===429?'تمهل قليلًا ثم حاول مجددًا.':'تعذّر حفظ التوصية. حاول مجددًا.');const result=parseRecommendation(data.vote);epochs.current[key]++;setAvailable(true);setLocal(data.local===true);setVotes(old=>({...old,[key]:result}));return true;}
  catch(e){setError(e instanceof Error&&/^(تمهل|تعذّر)/.test(e.message)?e.message:'تعذّر حفظ التوصية. تأكد من الاتصال وحاول مجددًا.');return false;}finally{clearTimeout(timer);writing.current=false;setBusy(null);}
 }
 return {votes,available,loading,busy,error,vote,local,partial,clearError:()=>setError('')};
}
export function RecommendationButton({product,value,disabled,onRecommend}:{product:Product;value?:ProductRecommendation;disabled:boolean;onRecommend:()=>void}){
 const state=value||emptyRecommendation();
 const top=(Object.entries(state.reasons) as [RecommendationReason,number][]).filter(([r,n])=>r!=='general'&&n>0).sort((a,b)=>b[1]-a[1])[0]?.[0];
 return <div className="product-community"><button className={`recommend-button ${state.mine?'recommended':''}`} disabled={disabled} aria-pressed={!!state.mine} aria-label={state.mine?`إلغاء توصيتي بـ${product.name}`:`أوصي بـ${product.name}`} onClick={onRecommend}><span aria-hidden="true">👍</span>{state.mine?'أوصيت فيه':'أوصي فيه'}</button>{state.total>0&&<span className="recommend-count">{state.total} توصية{top&&<small>{recommendationReasons[top]}</small>}</span>}</div>;
}
export function RecommendationDialog({product,onClose,onSubmit,busy,error}:{product:Product|null;onClose:()=>void;onSubmit:(reason:RecommendationReason)=>Promise<boolean>;busy:boolean;error:string}){
 const dialog=useRef<HTMLDialogElement>(null);const [reason,setReason]=useState<RecommendationReason>('general');
 useEffect(()=>{const d=dialog.current;if(!d)return;if(product&&!d.open){setReason('general');d.showModal();}if(!product&&d.open)d.close();if(!product)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[product]);
 return <dialog ref={dialog} className="recommend-dialog" aria-labelledby="recommend-title" onClose={onClose} onCancel={e=>{if(busy)e.preventDefault();}}><div className="recommend-dialog-head"><div><span>تجربتك تساعد غيرك يختار</span><h2 id="recommend-title">أوصِ بهذا المنتج</h2></div><button className="icon-button" aria-label="إغلاق التوصية" disabled={busy} onClick={onClose}>×</button></div>{product&&<><p className="recommend-product">{product.name}</p><fieldset><legend>وش سبب توصيتك؟ <small>اختياري</small></legend><div className="recommend-reasons">{(Object.entries(recommendationReasons) as [RecommendationReason,string][]).filter(([key])=>key!=='general').map(([key,label])=><button type="button" key={key} disabled={busy} aria-pressed={reason===key} onClick={()=>setReason(old=>old===key?'general':key)}>{label}</button>)}</div></fieldset><p className="recommend-explanation">تُحسب توصية واحدة من هذا المتصفح لهذا المنتج عند هذا المتجر. تبدأ التوصيات من جديد بعد تحديث الموقع.</p>{error&&<p className="recommend-error" role="alert">{error}</p>}<button className="primary recommend-submit" disabled={busy} onClick={async()=>{if(await onSubmit(reason))onClose();}}>{busy?'جارٍ حفظ توصيتك…':'نشر التوصية 👍'}</button></>}</dialog>;
}

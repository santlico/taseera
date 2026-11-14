 'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {StoreLogo} from './store-logo';
type Merchant={id:string;name:string;logo:string};
export function MerchantOrbit({stores,active}:{stores:Merchant[];active:boolean}){
 const root=useRef<HTMLDivElement>(null);
 const [visible,setVisible]=useState(false),[reduced,setReduced]=useState(false),[focused,setFocused]=useState('');
 useEffect(()=>{const preference=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(preference.matches);change();preference.addEventListener('change',change);return()=>preference.removeEventListener('change',change);},[]);
 useEffect(()=>{if(!root.current||!('IntersectionObserver' in window)){setVisible(true);return;}const observer=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting)),{threshold:0.05});observer.observe(root.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{setFocused('');},[stores.map(s=>s.id).join(',')]);
 const rings=stores.length>8?[stores.filter((_,i)=>i%2===0),stores.filter((_,i)=>i%2!==0)]:[stores];
 return <div ref={root} className={`merchant-orbits ${!visible||!active?'is-paused':''} ${reduced?'is-reduced':''}`}>
  <div className="merchant-orbit-stage" aria-label="شعارات المتاجر"><div className="merchant-orbit-center" aria-hidden="true"><img src="/brand/taseera.webp" alt="" width="1636" height="511"/><span>{focused||`${stores.length} متاجر، بحث واحد`}</span></div>
  {rings.map((ring,r)=><div className={`merchant-orbit-ring ring-${rings.length===1?'single':r}`} key={r} style={{'--orbit-duration':r===0?'90s':'120s','--orbit-direction':r===0?'normal':'reverse','--counter-direction':r===0?'reverse':'normal'} as CSSProperties}>{ring.map((store,i)=><div className="merchant-orbit-position" key={store.id} style={{'--orbit-angle':`${i*360/ring.length}deg`} as CSSProperties}><div className="merchant-orbit-upright"><button className="merchant-orbit-tile" title={store.name} aria-label={`عرض اسم المتجر: ${store.name}`} onClick={()=>{setFocused(store.name);}} onFocus={()=>{setFocused(store.name);}}><StoreLogo src={store.logo} name={store.name}/><span className="orbit-store-name">{store.name}</span></button></div></div>)}</div>)}
  </div>
 </div>;
}

import type {StoreId} from '@market/core';
import {stores} from './store-catalog';
export type SearchScope='all'|'grocery'|'pharmacy';
export const scopes=[{id:'all',label:'الكل',symbol:'✦'},{id:'grocery',label:'المقاضي',symbol:'▧'},{id:'pharmacy',label:'الصيدليات',symbol:'+'}] as const;
export const validScope=(value:unknown):value is SearchScope=>scopes.some(s=>s.id===value);
export const scopeStores=(scope:SearchScope)=>stores.filter(s=>s.enabled&&(scope==='all'||s.category===scope));
export function restoreSelection(params:URLSearchParams,saved:unknown,savedScope:unknown){
 const available=scopeStores('all'),requested=params.getAll('store');
 let ids:unknown[]=Array.isArray(saved)?saved:available.map(s=>s.id);
 // Legacy explicit "all" selections from before new sources were added.
 const legacy=['danube','carrefour','tamimi','ninja','bindawood','amazon','hungerstation','noon'];
 if(Array.isArray(saved)&&[6,7,8].includes(saved.length)&&legacy.slice(0,saved.length).every(id=>saved.includes(id)))ids=available.map(s=>s.id);
 if(requested.length)ids=requested;
 const explicit=params.get('scope');
 let scope:SearchScope=validScope(explicit)?explicit:validScope(savedScope)?savedScope:'all';
 if(requested.length&&!validScope(explicit)){
  const groups=new Set(available.filter(s=>requested.includes(s.id)).map(s=>s.category));
  scope=groups.size===1?[...groups][0]:'all';
 }
 return {scope,ids:available.filter(s=>ids.includes(s.id)).map(s=>s.id) as StoreId[]};
}

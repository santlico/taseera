import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const project='salla_1945128061';
export function parseDaralamiratResponse(data:unknown):Product[]{
  const d=data as any;
  if(d?.code!==200||!Array.isArray(d.response?.results)||!Number.isInteger(d.response?.found_documents)||d.response.found_documents<0)throw new Error('Dar Al Amirat search context missing');
  const products=new Map<string,Product>();
  const visible=d.response.results.slice(0,20).filter((p:any)=>p?.status==='sale'&&p.lang==='ar');
  for(const item of visible){
    const id=typeof item.id==='string'?item.id.match(/^(\d+)_ar$/)?.[1]:undefined;
    if(!id||typeof item.name!=='string'||!item.name.trim())continue;
    const price=item.is_sale===true?item.sale_price:item.price;
    if(typeof price!=='number'||!Number.isFinite(price)||price<=0)continue;
    let url:URL;
    try{url=new URL(item.url);}catch{continue;}
    if(url.origin!=='https://daralamirat.com.sa'||url.username||url.password||!url.pathname.startsWith('/ar/')||!url.pathname.endsWith(`/p${id}`))continue;
    url.search='';url.hash='';
    let imageUrl:string|undefined;
    try{const image=new URL(item.main_image||item.images?.[0]);if(image.origin==='https://cdn.salla.sa'&&!image.username&&!image.password&&image.pathname.startsWith('/onqKZz/'))imageUrl=image.href;}catch{}
    products.set(id,{store:'daralamirat',id,name:item.name.trim(),price,currency:'SAR',url:url.href,imageUrl,
      brand:typeof item.brand==='string'?item.brand:undefined,
      availability:item.is_available===true?'in_stock':item.is_available===false?'out_of_stock':'unknown',
      location:'دار الأميرات · السعودية · كتالوج الإنترنت دون تحديد عنوان',fetchedAt:new Date().toISOString()});
  }
  if(visible.length&&!products.size)throw new Error('Dar Al Amirat products failed validation');
  return [...products.values()];
}
export async function searchDaralamirat(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
  if(query.storeLocationId)throw new Error('Dar Al Amirat custom delivery address not supported');
  // Same public settings and search service used by the store's Lableb extension.
  const settings=await fetchStoreDocument('daralamirat',`https://api-debugging.lableb.com/v2/projects/${project}/settings`,{signal,headers:{Accept:'application/json'}});
  if(!settings.response.ok)throw new Error(`Dar Al Amirat settings HTTP ${settings.response.status}`);
  const c=JSON.parse(settings.text)?.response;
  if(c?.projectId!==project||typeof c.searchAPIKey!=='string'||!c.searchAPIKey||c.isTax!==true)throw new Error('Dar Al Amirat public settings changed');
  const url=new URL(`https://api.lableb.com/v2/projects/${project}/indices/index/search/default`);
  url.search=new URLSearchParams({q:query.term,apikey:c.searchAPIKey,lang:'ar',limit:'20',status:'sale',is_available:'true'}).toString();
  const {response,text}=await fetchStoreDocument('daralamirat',url,{signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`Dar Al Amirat search HTTP ${response.status}`);
  return {products:parseDaralamiratResponse(JSON.parse(text)),notice:'دار الأميرات: أول 20 نتيجة منشورة ومتاحة من كتالوج المتجر السعودي. الأسعار تشمل الضريبة حسب المصدر؛ تأكد من السعر والشحن النهائيين لدى المتجر.'};
}

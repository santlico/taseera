import {load} from 'cheerio';
import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const origin='https://www.nahdionline.com';

export function parseNahdiResponse(html:string,term:string,now=new Date()):Product[] {
  const $=load(html);
  // Validate the public search breadcrumb, not a home page or UAE response.
  let context=false;
  $('script[type="application/ld+json"]').each((_,el)=>{
    try {
      const data=JSON.parse($(el).text());
      if(data['@type']!=='BreadcrumbList'||!Array.isArray(data.itemListElement))return;
      for(const item of data.itemListElement){
        const url=new URL(item?.item?.['@id']);
        if(url.origin===origin&&!url.username&&!url.password&&url.pathname==='/ar-sa/search'&&url.searchParams.get('query')===term)context=true;
      }
    }catch{/* Unrelated JSON-LD is not a search context. */}
  });
  if(!context)throw new Error('Nahdi search context missing');
  const cards=$('.js-plp-product');
  const products=new Map<string,Product>();
  cards.each((_,el)=>{
    const card=$(el),link=card.find('a[href*="/pdp/"]').filter((_,a)=>$(a).find('.line-clamp-3').length>0).first();
    const name=link.find('.line-clamp-3').first().text().trim();
    let url:URL;
    try{url=new URL(link.attr('href')!,origin);}catch{return;}
    const id=url.pathname.match(/^\/ar-sa\/[^/]+\/pdp\/(\d+)$/)?.[1];
    if(url.origin!==origin||url.username||url.password||!id||!name)return;
    const priceNode=link.find('span[dir="ltr"]').filter((_,e)=>!$(e).hasClass('line-through')&&$(e).find('svg[id^="sar_symbol"]').length>0).first().clone();
    priceNode.find('svg,style').remove();
    const raw=priceNode.text().trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/٬/g,',').replace(/٫/g,'.');
    if(!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(raw))return;
    const price=Number(raw.replaceAll(',',''));if(!Number.isFinite(price)||price<=0)return;
    let imageUrl:string|undefined;
    card.find('img[src]').each((_,img)=>{
      if(imageUrl)return;
      try{const image=new URL($(img).attr('src')!);
        if(image.origin==='https://ecombe.nahdionline.com'&&!image.username&&!image.password&&image.pathname.startsWith('/media/catalog/product/'))imageUrl=image.href;
      }catch{/* Missing image does not discard a valid offer. */}
    });
    url.search='';url.hash='';
    products.set(id,{store:'nahdi',id,name,price,currency:'SAR',url:url.href,imageUrl,availability:'unknown',
      location:'النهدي أونلاين · السعودية · عنوان وطريقة الشحن غير محددين',fetchedAt:now.toISOString()});
  });
  if(cards.length&&!products.size)throw new Error('Nahdi product prices or links invalid');
  if(!cards.length){
    $('script,style').remove();
    if(!/لم نتمكن من العثور على أي نتائج مطابقة/.test($('body').text()))throw new Error('Nahdi search listing missing');
  }
  return [...products.values()];
}

export async function searchNahdi(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult> {
  if(query.storeLocationId)throw new Error('Nahdi custom shipping context is not supported');
  const url=new URL('/ar-sa/search',origin);url.searchParams.set('query',query.term);
  const {response,text}=await fetchStoreDocument('nahdi',url,{signal});
  if(!response.ok||new URL(response.url).origin!==origin||new URL(response.url).pathname!==url.pathname)throw new Error(`Nahdi search HTTP/context ${response.status}`);
  return {products:parseNahdiResponse(text,query.term),notice:'النهدي: نتائج الصفحة الأولى من الموقع السعودي، وقد تشمل منتجات جلوبال. السعر والتوفر والشحن تُؤكّد بعد تحديد عنوانك وطريقة التوصيل لدى النهدي.'};
}

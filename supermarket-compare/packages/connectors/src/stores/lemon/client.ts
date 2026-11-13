import {load} from 'cheerio';
import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const origin='https://lemon.sa';

export function parseLemonResponse(html:string,term:string,now=new Date()):Product[]{
  const $=load(html),content=$('#content');
  if(content.find('h1').first().text().trim()!==`بحث - ${term}`)throw new Error('Lemon search context missing');
  const cards=content.find('.main-products .product-thumb'),products=new Map<string,Product>();
  cards.each((_,el)=>{
    const card=$(el),link=card.find('.name a').first(),name=link.text().trim();
    const id=card.find('input[name="product_id"]').first().attr('value')??card.find('[data-product-id]').first().attr('data-product-id');
    if(!id||!/^\d+$/.test(id)||!name)return;
    let url:URL;
    try{url=new URL(link.attr('href')!,origin);}catch{return;}
    if(url.origin!==origin||url.username||url.password)return;
    if(url.pathname==='/index.php'){
      if(url.searchParams.get('route')!=='product/product'||url.searchParams.get('product_id')!==id)return;
    }else{if(!/^\/[^/]+$/.test(url.pathname)||url.pathname.startsWith('/image'))return;url.search='';}
    url.hash='';
    // Deliberately exclude .price-old and .price-tax (VAT-exclusive price).
    const selected=card.find('.price-new').length?card.find('.price-new').first():card.find('.price-normal').first();
    const priceNode=selected.clone();priceNode.find('svg,style').remove();
    const raw=priceNode.text().trim().replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/٬/g,',').replace(/٫/g,'.');
    if(!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(raw))return;
    const price=Number(raw.replaceAll(',',''));if(!Number.isFinite(price)||price<=0)return;
    let imageUrl:string|undefined;
    const img=card.find('.image img').first();
    try{const image=new URL(img.attr('data-src')||img.attr('src')||'',origin);
      if(image.origin===origin&&!image.username&&!image.password&&image.pathname.startsWith('/image/')&&!image.pathname.includes('transparent-'))imageUrl=image.href;
    }catch{}
    products.set(id,{store:'lemon',id,name,price,currency:'SAR',url:url.href,imageUrl,availability:'unknown',
      location:'ليمون أونلاين · السعودية · كتالوج الإنترنت دون تحديد عنوان',fetchedAt:now.toISOString()});
  });
  if(cards.length&&!products.size)throw new Error('Lemon products failed validation');
  if(!cards.length){content.find('script,style').remove();if(!content.text().includes('لا يوجد أي منتجات تطابق معايير البحث'))throw new Error('Lemon search listing missing');}
  return [...products.values()];
}
export async function searchLemon(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
  if(query.storeLocationId)throw new Error('Lemon custom delivery address not supported');
  const url=new URL('/index.php',origin);url.search=new URLSearchParams({route:'product/search',search:query.term}).toString();
  const {response,text}=await fetchStoreDocument('lemon',url,{signal});
  if(!response.ok||new URL(response.url).origin!==origin||new URL(response.url).pathname!=='/index.php')throw new Error(`Lemon search HTTP/context ${response.status}`);
  return {products:parseLemonResponse(text,query.term),notice:'ليمون: نتائج الصفحة الأولى بسعر العبوة المعروض شامل الضريبة. التوفر والشحن غير مؤكدين دون تحديد عنوان؛ تأكد من التفاصيل لدى الصيدلية.'};
}

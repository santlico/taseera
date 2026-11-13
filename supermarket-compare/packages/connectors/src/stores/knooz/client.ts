import {load} from 'cheerio';
import type {Product,SearchQuery,ConnectorSearchResult} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
const origin='https://knooz-store.com';
export function parseKnoozResponse(html:string,term:string):Product[]{
 const $=load(html);
 const context=$('a[data-href]').toArray().some(el=>{try{const u=new URL($(el).attr('data-href')!);return u.origin===origin&&u.pathname==='/products'&&u.searchParams.get('q')===term;}catch{return false;}});
 if(!context||!html.includes('caddf466-1b7a-4155-8a9b-3495ba54d825'))throw new Error('Knooz search context missing');
 const cards=$('.product-item'),products=new Map<string,Product>();
 cards.each((_,el)=>{
  const card=$(el),img=card.find('img[id^="product-card-img-"]').first();
  const id=img.attr('id')?.replace('product-card-img-','');
  const name=card.find('.product-title').text().trim();
  const raw=card.find('.product-price').first().text().trim();
  if(!id||!name||!/^\d+(?:,\d{3})*(?:\.\d{1,2})?\s*ر\.س$/.test(raw))return;
  const price=Number(raw.replace(/\s*ر\.س$/,'').replaceAll(',',''));if(price<=0)return;
  let url:URL;try{url=new URL(card.find('a[href^="/products/"]').first().attr('href')!,origin);}catch{return;}
  if(url.origin!==origin||url.username||url.password||!url.pathname.startsWith('/products/'))return;
  let imageUrl:string|undefined;try{const u=new URL(img.attr('src')!);if(u.origin==='https://img.zid.store'&&u.pathname.includes('/https://media.zid.store/caddf466-1b7a-4155-8a9b-3495ba54d825/'))imageUrl=u.href;}catch{}
  products.set(id,{store:'knooz',id,name,price,currency:'SAR',url:url.href,imageUrl,
   availability:card.find('.btn-product-card-out-of-stock').length?'out_of_stock':card.find('.product-card-add-to-cart').length?'in_stock':'unknown',
   location:'كنوز العناية · السعودية · كتالوج الإنترنت دون تحديد عنوان',fetchedAt:new Date().toISOString()});
 });
 if(cards.length&&products.size!==cards.length)throw new Error('Knooz product cards failed validation');
 if(!cards.length&&!/لا توجد منتجات/.test($('body').text()))throw new Error('Knooz search listing missing');
 return [...products.values()];
}
export async function searchKnooz(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
 if(query.storeLocationId)throw new Error('Knooz custom delivery address not supported');
 const url=new URL('/products',origin);url.searchParams.set('q',query.term);
 const {response,text}=await fetchStoreDocument('knooz',url,{signal});
 if(!response.ok)throw new Error(`Knooz search HTTP ${response.status}`);
 return {products:parseKnoozResponse(text,query.term),notice:'كنوز العناية: نتائج الصفحة الأولى من المتجر السعودي، بالسعر الحالي والتوفر الظاهرين. تأكد من السعر والشحن النهائيين لدى المتجر.'};
}

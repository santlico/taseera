import {load} from 'cheerio';
import type {Product,SearchQuery,ConnectorSearchResult} from '@market/core';
import {fetchGoldenscentDocument} from './document';
const origin='https://www.goldenscent.com';
export function parseGoldenscentResponse(html:string,term:string):Product[]{
 const $=load(html);let canonical:URL;
 // Resolve React's streamed HTML insertions as markup, never execute source scripts.
 const inserts=[...html.matchAll(/\$RS\("(S:[a-f0-9]+)","(P:[a-f0-9]+)"\)/g)];
 for(let pass=0;pass<4;pass++)for(const [,source,target] of inserts){const content=$(`[id="${source}"]`),slot=$(`template[id="${target}"]`);if(content.length&&slot.length){slot.replaceWith(content.html()||'');content.remove();}}

 try{canonical=new URL($('link[rel="canonical"]').attr('href')!);}catch{throw new Error('Golden Scent search context missing');}
 if(canonical.origin!==origin||canonical.pathname!=='/search'||canonical.searchParams.get('q')!==term||$('html').attr('lang')!=='ar')throw new Error('Golden Scent search context mismatch');
 let listing:any;
 $('script[type="application/ld+json"]').each((_,el)=>{try{const d=JSON.parse($(el).text());if(d['@type']==='ItemList'&&Array.isArray(d.itemListElement))listing=d.itemListElement;}catch{}});
 const cards=$('[data-product-card-root]');
 if(!cards.length){$('script,style').remove();if(/لم يتم العثور على منتجات/.test($('body').text()))return [];throw new Error('Golden Scent listing missing');}
 if(!listing)throw new Error('Golden Scent offers missing');
 const products=new Map<string,Product>();
 for(const row of listing){
  const p=row.item,o=p?.offers;
  if(p?.['@type']!=='Product'||typeof p.name!=='string'||!p.name.trim()||typeof p.sku!=='string'||!p.sku||o?.priceCurrency!=='SAR'||typeof o.price!=='number'||!Number.isFinite(o.price)||o.price<=0)throw new Error('Golden Scent offer invalid');
  const card=cards.filter((_,el)=>$(el).find('img[src]').toArray().some(img=>$(img).attr('src')===p.image)).filter((_,el)=>$(el).text().includes(p.name)).first();
  if(!card.length)throw new Error('Golden Scent offer card missing');
  let url:URL;try{url=new URL(card.find('a[href^="/p/"]').first().attr('href')!,origin);}catch{throw new Error('Golden Scent product URL missing');}
  if(url.origin!==origin||!/^\/p\/[^/]+$/.test(url.pathname)||url.username||url.password)throw new Error('Golden Scent product URL invalid');
  const priceNode=card.find('a[href^="/p/"] span.font-semibold').filter((_,el)=>$(el).find('.font-currency').length>0).first();
  const visible=Number(priceNode.clone().find('.font-currency').remove().end().text().trim().replaceAll(',',''));
  if(!priceNode.length||Math.abs(visible-o.price)>0.005)throw new Error('Golden Scent visible price mismatch');
  let imageUrl:string|undefined;try{const image=new URL(p.image);if(image.origin==='https://assets.goldenscent.com'&&image.pathname.startsWith('/catalog/product/')&&!image.username&&!image.password)imageUrl=image.href;}catch{}
  products.set(p.sku,{store:'goldenscent',id:p.sku,name:p.name.trim(),price:visible,currency:'SAR',url:url.href,imageUrl,
   availability:o.availability==='https://schema.org/InStock'?'in_stock':o.availability==='https://schema.org/OutOfStock'?'out_of_stock':'unknown',
   location:'قولدن سنت · السعودية · راجع حجم العبوة وخيارات المنتج لدى المتجر',fetchedAt:new Date().toISOString()});
 }
 return [...products.values()];
}
export async function searchGoldenscent(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
 if(query.storeLocationId)throw new Error('Golden Scent custom delivery address not supported');
 const url=new URL('/search',origin);url.search=new URLSearchParams({q:query.term,___store:'ar_sa'}).toString();
 return {products:parseGoldenscentResponse(await fetchGoldenscentDocument(url,signal),query.term),notice:'قولدن سنت: نتائج الصفحة الأولى من المتجر السعودي. قد يختلف السعر حسب حجم العبوة أو خيار المنتج؛ تأكد من السعر والشحن النهائي لدى المتجر.'};
}

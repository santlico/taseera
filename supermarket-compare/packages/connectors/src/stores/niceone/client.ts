import {load} from 'cheerio';
import type {Product,SearchQuery,ConnectorSearchResult} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
export function parseNiceoneResponse(html:string,term:string):Product[]{
 const $=load(html);let listing:any;
 $('script[type="application/ld+json"]').each((_,el)=>{try{const d=JSON.parse($(el).text());if(d['@type']==='ItemList'&&d.url==='https://niceonesa.com/ar/search'&&d.name===term&&Array.isArray(d.itemListElement))listing=d;}catch{}});
 if(!listing)throw new Error('Nice One search context missing');
 const products=new Map<string,Product>();
 for(const item of listing.itemListElement){
  const offer=item.offers;if(!offer)continue; // Variant-only cards without a public offer have no comparable price.
  let price=offer.price;
  if(item['@type']!=='Product'||typeof item.name!=='string'||!item.name.trim()||offer?.priceCurrency!=='SAR'||typeof price!=='number'||!Number.isFinite(price)||price<=0)throw new Error('Nice One product price invalid');
  let url:URL;try{url=new URL(offer.url);}catch{throw new Error('Nice One product link invalid');}
  const id=url.pathname.match(/^\/ar\/[^/]+-n(\d+)$/)?.[1];
  if(url.origin!=='https://niceonesa.com'||url.username||url.password||!id)throw new Error('Nice One product context invalid');
  // Cross-check the offer against a real visible search card, never a raw index price.
  const card=$('a[href]').filter((_,a)=>{try{return new URL($(a).attr('href')!,'https://niceonesa.com').pathname===url.pathname;}catch{return false;}}).first();
  if(!card.length||!card.text().includes(item.name))throw new Error('Nice One search card missing');
  const priceNodes=card.find('.font-niceone-bold').filter((_,e)=>$(e).find('.currency-symbol').length>0&&!$(e).hasClass('line-through'));
  const visiblePrice=Number(priceNodes.first().clone().find('.currency-symbol').remove().end().text().replaceAll(',','').trim());
  if(!priceNodes.length||!Number.isFinite(visiblePrice)||visiblePrice<=0||(Math.abs(visiblePrice-price)>0.005&&Math.floor(visiblePrice)!==price))throw new Error('Nice One visible price mismatch');
  // The site's JSON-LD truncates decimals on some offers; visible card price is authoritative.
  price=visiblePrice;
  let imageUrl:string|undefined;try{const image=new URL(item.image);if(image.origin==='https://d1aq4ubbxe020v.cloudfront.net'&&image.pathname.startsWith(`/image/product/${id}/`)&&!image.username&&!image.password)imageUrl=image.href;}catch{}
  products.set(id,{store:'niceone',id,name:item.name.trim(),price,currency:'SAR',url:url.href,imageUrl,brand:typeof item.brand?.name==='string'?item.brand.name:undefined,
   availability:offer.availability==='https://schema.org/InStock'?'in_stock':offer.availability==='https://schema.org/OutOfStock'?'out_of_stock':'unknown',
   location:'نايس ون · السعودية · كتالوج الإنترنت دون تحديد عنوان',fetchedAt:new Date().toISOString()});
 }
 return [...products.values()];
}
export async function searchNiceone(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult>{
 if(query.storeLocationId)throw new Error('Nice One custom delivery address not supported');
 const url=new URL('https://niceonesa.com/ar/search');url.searchParams.set('q',query.term);
 const {response,text}=await fetchStoreDocument('niceone',url,{signal});
 if(!response.ok)throw new Error(`Nice One search HTTP ${response.status}`);
 return {products:parseNiceoneResponse(text,query.term),notice:'نايس ون: نتائج الصفحة الأولى بالسعر الظاهر في المتجر السعودي، وقد تشمل اقتراحات بديلة. تأكد من العبوة والسعر والتوفر والشحن النهائي لدى المتجر.'};
}

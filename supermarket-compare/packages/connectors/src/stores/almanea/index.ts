import {load} from 'cheerio';
import type {Product,SearchQuery,StoreConnector} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';
export function parseAlmaneaResponse(html:string,term:string):Product[]{
 const $=load(html);let d:any;try{d=JSON.parse($('#__NEXT_DATA__').text());}catch{throw new Error('Almanea document data missing');}
 const listing=d?.props?.pageProps?.searchResults;
 if(d.page!=='/search'||d.locale!=='ar'||d.query?.q!==term||!Array.isArray(listing?.products)||!Number.isInteger(listing.numberOfHits)||listing.numberOfHits<0)throw new Error('Almanea search context missing');
 const products=new Map<string,Product>();
 for(const item of listing.products){
  const id=item?.sku,slug=item?.rewrite_url,name=item?.name,offer=item?.prices_with_tax;
  if(typeof id!=='string'||!/^\d{8,20}$/.test(id)||typeof slug!=='string'||!new RegExp('^[a-z0-9-]+-p-'+id+'$').test(slug)||typeof name!=='string'||!name.trim())continue;
  // Match the storefront validateProductPrice formatter: nearest whole SAR,
  // discounted_price when truthy, otherwise price. Raw price_incl_tax is not used.
  const raw=offer?.discounted_price||offer?.price;
  if(typeof raw!=='number'||!Number.isFinite(raw)||raw<=0||Math.round(raw)<=0)continue;
  let imageUrl:string|undefined;
  for(const rawImage of [item.thumbnail_url,item.image_url]){try{const image=new URL(rawImage);if(image.origin==='https://imgs.dev-almanea.com'&&!image.username&&!image.password&&image.pathname.startsWith('/media/catalog/product/')&&!image.search&&!image.hash){imageUrl=image.href;break;}}catch{}}
  products.set(id,{store:'almanea',id,name:name.trim(),price:Math.round(raw),currency:'SAR',url:'https://www.almanea.sa/product/'+slug,imageUrl,brand:typeof item.brand==='string'?item.brand:undefined,availability:'unknown',location:'المنيع · السعودية · دون تحديد مدينة أو عنوان للتوصيل',fetchedAt:new Date().toISOString()});
 }
 if(listing.products.length&&!products.size)throw new Error('Almanea returned no valid offers');
 if(listing.numberOfHits>0&&!listing.products.length)throw new Error('Almanea listing missing products');
 return [...products.values()];
}
export async function searchAlmanea(query:SearchQuery,signal:AbortSignal){
 if(query.storeLocationId)throw new Error('Almanea custom delivery location not supported');
 const url=new URL('https://www.almanea.sa/search');url.searchParams.set('q',query.term);
 const {response,text}=await fetchStoreDocument('almanea',url,{signal});
 if(!response.ok)throw new Error(`Almanea search HTTP ${response.status}`);
 const finalUrl=new URL(response.url||url.href);if(finalUrl.origin!==url.origin||finalUrl.pathname!=='/search'||finalUrl.searchParams.get('q')!==query.term)throw new Error('Almanea redirected search context');
 return {products:parseAlmaneaResponse(text,query.term),notice:'المنيع: أول صفحة من البحث السعودي بالسعر الظاهر شامل الضريبة. راجع الموديل والسعة واللون وحالة العلبة أو الجهاز والضمان؛ التوفر والتوصيل حسب المدينة والعنوان.'};
}
export const almanea:StoreConnector={id:'almanea',name:'المنيع',enabled:true,preserveSearchTerm:true,search:searchAlmanea};

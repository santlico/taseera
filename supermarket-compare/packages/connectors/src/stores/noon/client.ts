import {load} from 'cheerio';
import type {ConnectorSearchResult,Product,SearchQuery} from '@market/core';
import {fetchNoonDocument} from './document';
const origin='https://minutes.noon.com';

export function parseNoonResponse(html:string,term:string,now=new Date()):Product[] {
  const $=load(html);
  if(/just a moment|captcha|access denied/i.test($('title').text()) || $('#challenge-error-text').length)throw new Error('Noon returned a challenge page');
  let canonical:URL;
  try {canonical=new URL($('link[rel="canonical"]').attr('href')!);}catch{throw new Error('Noon search context missing');}
  if(canonical.origin!==origin || canonical.username || canonical.password || canonical.pathname!=='/saudi-ar/search/' || canonical.searchParams.get('q')!==term ||
    $('html').attr('lang')!=='ar-SA' || !$('[data-testid="catalog-listing"] [data-testid="catalog-modules"]').length)throw new Error('Noon search context missing');
  const cards=$('[data-testid="catalog-listing"] a[data-testid^="catalog-product-box-"]');
  const products=new Map<string,Product>();
  cards.each((_,el)=>{
    const card=$(el),title=card.find('[data-testid="product-title"]').first();
    const name=title.text().trim(),size=title.next('span').text().trim();
    const text=card.find('[data-testid="product-price"] strong').first().text().trim()
      .replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/٬/g,',').replace(/٫/g,'.');
    if(!name || !/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/.test(text))return;
    const price=Number(text.replaceAll(',',''));if(!Number.isFinite(price)||price<=0)return;
    let url:URL;
    try{url=new URL(card.attr('href')!,origin);}catch{return;}
    const id=url.pathname.match(/^\/saudi-ar\/now-product\/(Z[A-Z0-9]+-\d+)\/$/)?.[1];
    if(url.origin!==origin || url.username || url.password || !id || card.attr('data-testid')!==`catalog-product-box-${id}`)return;
    url.search='';url.hash='';
    let imageUrl:string|undefined;
    card.find('img[src]').each((_,img)=>{
      if(imageUrl)return;
      try {const image=new URL($(img).attr('src')!);
        if(image.origin==='https://f.nooncdn.com'&&!image.username&&!image.password&&image.pathname.startsWith(`/p/pzsku/${id.split('-')[0]}/`)){image.search='?width=320';imageUrl=image.href;}
      }catch{/* A missing image must not hide a valid offer. */}
    });
    products.set(id,{store:'noon',id,name:size&&!name.includes(size)?`${name} · ${size}`:name,size:size||undefined,
      price,currency:'SAR',url:url.href,imageUrl,
      // SSR add buttons are disabled before hydration even for buyable items.
      availability:card.find('[data-testid="stock-notification-button"]').length?'out_of_stock':'unknown',
      location:'السعودية · كتالوج نون ماركت الافتراضي · عنوان التوصيل غير محدد',fetchedAt:now.toISOString()});
  });
  if(cards.length&&!products.size)throw new Error('Noon products failed price or URL validation');
  return [...products.values()];
}

export async function searchNoon(query:SearchQuery,signal:AbortSignal):Promise<ConnectorSearchResult> {
  if(query.storeLocationId || !['الرياض','riyadh'].includes(query.city.trim().toLowerCase()))throw new Error('Noon custom delivery area is not supported');
  const url=new URL('/saudi-ar/search/',origin);url.searchParams.set('q',query.term);
  const products=parseNoonResponse(await fetchNoonDocument(url,signal),query.term);
  return {products,notice:'نون ماركت: نتائج الصفحة الأولى من كتالوج السعودية الافتراضي، وقد تشمل إعلانات وبدائل. الأسعار والتوفر ورسوم التوصيل تُؤكّد بعد تحديد عنوانك في نون.'};
}

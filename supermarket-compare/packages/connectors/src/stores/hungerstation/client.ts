import {load} from 'cheerio';
import type {ConnectorSearchResult, Product, SearchQuery} from '@market/core';
import {fetchStoreDocument} from '../../shared/http';

// Public, indexable chain search pages. These are default Riyadh branches,
// not a delivery-address lookup or a promise of coverage across the platform.
export const branches = [
  {slug:'al-othaim-65969',chainId:65969,vendorId:141190,name:'العثيم'},
  {slug:'panda-59709',chainId:59709,vendorId:142447,name:'بنده'},
  {slug:'tamimi-markets-93306',chainId:93306,vendorId:169971,name:'التميمي'},
] as const;
type Branch = (typeof branches)[number];
const origin='https://hungerstation.com';

export function parseHungerstation(html:string, branch:Branch, term:string, now=new Date()):Product[] {
  const $=load(html);
  const data=JSON.parse($('#__NEXT_DATA__').text());
  const p=data?.props?.pageProps;
  if(data?.page!=='/supermarkets/[chain]' || data?.query?.chain!==branch.slug || data?.query?.query!==term ||
    p?.chain?.id!==branch.chainId || p?.vendor?.id!==branch.vendorId || p?.vendor?.chainId!==branch.chainId ||
    p?.city?.slug?.en!=='riyadh' || typeof p?.district?.name?.ar!=='string' || !p.district.name.ar.trim() ||
    !Array.isArray(p?.productSearchResult?.items)) throw new Error('Hungerstation search or branch context missing');
  const links:URL[]=[];
  $('a[href]').each((_,el)=>{
    try {
      const url=new URL($(el).attr('href')!,origin);
      if(url.origin===origin && !url.username && !url.password &&
        url.pathname.startsWith(`/sa-ar/supermarkets/${branch.slug}/product/`)) {
        decodeURIComponent(url.pathname); // Reject malformed percent-encoding before matching SKUs.
        links.push(url);
      }
    } catch { /* Ignore unrelated/malformed anchors. */ }
  });
  const items=p.productSearchResult.items.slice(0,20);
  const products:Product[]=items.flatMap((item: any)=>{
    if(typeof item?.id!=='string' || typeof item?.sku!=='string' || !item.sku ||
      typeof item.name!=='string' || !item.name.trim() || typeof item.price!=='number' || !Number.isFinite(item.price) || item.price<=0) return [];
    const url=links.find(link=>decodeURIComponent(link.pathname).endsWith(`-${item.sku}`));
    if(!url) return [];
    const image=Array.isArray(item.images)?item.images.find((image: any)=>typeof image?.url==='string' && image.url.startsWith('https://'))?.url:undefined;
    return [{store:'hungerstation',id:`${branch.vendorId}:${item.id}`,retailer:branch.name,name:item.name,
      price:item.price,currency:'SAR',url:url.href,imageUrl:image,availability:'unknown',
      location:`${branch.name} · الرياض، ${p.district.name.ar} · فرع هنقرستيشن الافتراضي${p.vendor.status==='CLOSE'?' · المتجر مغلق وقت البحث':''}`,
      fetchedAt:now.toISOString()}];
  });
  if(items.length && !products.length) throw new Error('Hungerstation products have no valid prices or product links');
  return [...new Map(products.map(product=>[product.id,product])).values()];
}

export async function searchHungerstation(query:SearchQuery, signal:AbortSignal):Promise<ConnectorSearchResult> {
  if(!['الرياض','riyadh'].includes(query.city.trim().toLowerCase()) || query.storeLocationId) {
    throw new Error('Hungerstation connector supports default Riyadh branches only');
  }
  const results=await Promise.allSettled(branches.map(async branch=>{
    const url=new URL(`/sa-ar/supermarkets/${branch.slug}`,origin);
    url.searchParams.set('query',query.term);
    // Bound each branch independently, leaving time for useful partial results.
    const branchSignal=AbortSignal.any([signal,AbortSignal.timeout(7000)]);
    const {response,text}=await fetchStoreDocument('hungerstation',url,{signal:branchSignal});
    if(!response.ok || new URL(response.url).pathname!==url.pathname) throw new Error(`Hungerstation HTTP/context ${response.status}`);
    return parseHungerstation(text,branch,query.term);
  }));
  signal.throwIfAborted();
  const failed=results.flatMap((result,i)=>result.status==='rejected'?[branches[i].name]:[]);
  if(failed.length===branches.length) throw new Error('All Hungerstation branch searches failed');
  const products=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
  return {products,partial:failed.length>0,
    notice:`هنقرستيشن: أول 20 نتيجة كحد أقصى من كل فرع افتراضي بالرياض: العثيم وبنده والتميمي. الأسعار والتوصيل والتوفر تُؤكّد بعد تحديد عنوانك.${failed.length?` تعذّر البحث في: ${failed.join('، ')}؛ نتائج بقية الفروع متاحة.`:''}`};
}

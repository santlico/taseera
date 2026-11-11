import type { Product, SearchQuery } from '@market/core';
import { parseWeight, matchesWeight } from '../../shared/search-query';

interface Modifier { price?: string | number | null; in_stock?: boolean; available?: boolean }
interface Hit {
  objectID: string; full_name_ar?: string; name_ar: string; brand_ar?: string;
  price: number; url_ar: string; image?: string; in_stock?: boolean;
  inventory_modifiers?: Record<string, Modifier>;
}

// Observed public store_selector mapping: district 296 (الريان) -> supermarket 378 (الروابي).
// Scope stays explicit; do not claim support for other Riyadh districts yet.
export function mapDanubeHit(hit: Hit): Product | null {
  const modifiers = hit.inventory_modifiers;
  const modifier = modifiers?.['378_hd'] ?? modifiers?.['378_'] ?? modifiers?.['_hd'];
  if (modifier?.available === false) return null;
  const rawPrice = modifier?.price ?? hit.price;
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return null;
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const url = new URL(hit.url_ar, 'https://www.danube.sa');
  if (!['www.danube.sa', 'danube.sa'].includes(url.hostname) || !url.pathname.startsWith('/products/')) return null;
  const stock = modifier?.in_stock ?? hit.in_stock;
  return {store:'danube',id:String(hit.objectID),name:hit.full_name_ar || hit.name_ar,
    brand:hit.brand_ar,price,currency:'SAR',url:url.href,imageUrl:hit.image,
    availability: stock === undefined ? 'unknown' : stock ? 'in_stock' : 'out_of_stock',
    location:'الريان، الرياض — الروابي (توصيل)',fetchedAt:new Date().toISOString()};
}

export async function searchDanube(query: SearchQuery, signal: AbortSignal): Promise<Product[]> {
  if (query.city !== 'الرياض' || (query.storeLocationId && query.storeLocationId !== '378')) {
    throw new Error('Only Riyadh Al Rayyan is configured');
  }
  const page = await fetch('https://www.danube.sa/search?query=' + encodeURIComponent(query.term), { signal });
  if (!page.ok) throw new Error('Danube page failed');
  const html = await page.text();
  // Public browser search credentials are discovered from the site's own page, never personal credentials.
  const app = html.match(/appId:\s*'([A-Z0-9]+)'/)?.[1];
  const key = html.match(/apiKey:\s*'([^']+)'/)?.[1];
  const index = html.match(/indexName:\s*'([\w-]+)'/)?.[1];
  const tenant = html.match(/var currentTenantId\s*=\s*(\d+)/)?.[1];
  if (!app || !key || !index || !tenant) throw new Error('Danube search config changed');
  const requestHits = async (term: string): Promise<Hit[]> => {
  const response = await fetch(`https://${app}-dsn.algolia.net/1/indexes/${index}/query`, {
    method:'POST', signal, headers:{'Content-Type':'application/json','X-Algolia-Application-Id':app,'X-Algolia-API-Key':key},
    body:JSON.stringify({query:term,filters:`tenant_id = ${tenant}`,hitsPerPage:40}),
  });
  if (!response.ok) throw new Error('Danube search failed');
  const data = await response.json() as {hits:Hit[]};
  if (!Array.isArray(data.hits)) throw new Error('Invalid Danube response');
  return data.hits;
  }
  const weight = parseWeight(query.term);
  let hits = await requestHits(query.term);
  // The upstream search does not equate "1 كيلو" with "١كغم".
  // Retry without the weight, then require an equivalent weight in each returned name.
  if (hits.length === 0 && weight && weight.term) hits = await requestHits(weight.term);
  return hits.map(mapDanubeHit).filter((product): product is Product => product !== null)
    .filter(product => !weight || matchesWeight(product.name, weight.grams));
}


import { fetchStoreDocument } from '../../shared/http';
import type { Product, SearchQuery } from '@market/core';
import { parseWeight, matchesWeight } from '../../shared/search-query';

interface Modifier { price?: string | number | null; in_stock?: boolean; available?: boolean }
interface Hit {
  objectID: string; full_name_ar?: string; name_ar: string; brand_ar?: string;
  price: number; url_ar: string; image?: string; in_stock?: boolean;
  inventory_modifiers?: Record<string, Modifier>;
}

// Observed public store_selector mapping: district 464 (المرسلات) -> supermarket 207 (بانوراما).
// Scope stays explicit; do not claim support for other Riyadh districts yet.
export function mapBindawoodHit(hit: Hit): Product | null {
  if (!hit || typeof hit.url_ar !== 'string' || !String(hit.objectID ?? '').trim() ||
      typeof (hit.full_name_ar || hit.name_ar) !== 'string' || !(hit.full_name_ar || hit.name_ar).trim()) return null;
  const modifiers = hit.inventory_modifiers;
  const modifier = modifiers?.['207_hd'] ?? modifiers?.['207_'] ?? modifiers?.['_hd'];
  if (modifier?.available === false) return null;
  const rawPrice = modifier?.price ?? hit.price;
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') return null;
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  let url: URL;
  try { url = new URL(hit.url_ar, 'https://www.bindawood.sa'); } catch { return null; }
  if (url.protocol !== 'https:' || !['www.bindawood.sa', 'bindawood.sa'].includes(url.hostname) || !url.pathname.startsWith('/products/')) return null;
  const stock = modifier?.in_stock ?? hit.in_stock;
  return {store:'bindawood',id:String(hit.objectID),name:hit.full_name_ar || hit.name_ar,
    brand:hit.brand_ar,price,currency:'SAR',url:url.href,imageUrl:hit.image,
    availability: stock === undefined ? 'unknown' : stock ? 'in_stock' : 'out_of_stock',
    location:'المرسلات، الرياض — بانوراما (توصيل)',fetchedAt:new Date().toISOString()};
}

export async function searchBindawood(query: SearchQuery, signal: AbortSignal): Promise<Product[]> {
  if (query.city !== 'الرياض' || (query.storeLocationId && query.storeLocationId !== '207')) {
    throw new Error('Only Riyadh Al Mursalat is configured');
  }
  const {response: page, text: html} = await fetchStoreDocument('bindawood', 'https://www.bindawood.sa/search?query=' + encodeURIComponent(query.term), {signal});
  if (!page.ok) throw new Error(`Bindawood page failed (HTTP ${page.status})`);
  // Public browser search credentials are discovered from the site's own page, never personal credentials.
  const app = html.match(/appId:\s*'([A-Z0-9]+)'/)?.[1];
  const key = html.match(/apiKey:\s*'([^']+)'/)?.[1];
  const index = html.match(/indexName:\s*'([\w-]+)'/)?.[1];
  const tenant = html.match(/var currentTenantId\s*=\s*(\d+)/)?.[1];
  if (!app || !key || !index || !tenant) throw new Error('Bindawood search config changed');
  const requestHits = async (term: string): Promise<Hit[]> => {
  const {response, text} = await fetchStoreDocument('bindawood', `https://${app}-dsn.algolia.net/1/indexes/${index}/query`, {
    method:'POST', signal, headers:{Accept:'application/json','Content-Type':'application/json','X-Algolia-Application-Id':app,'X-Algolia-API-Key':key},
    body:JSON.stringify({query:term,filters:`tenant_id = ${tenant}`,hitsPerPage:40}),
  });
  if (!response.ok) throw new Error(`Bindawood search failed (HTTP ${response.status})`);
  const data = JSON.parse(text) as {hits:Hit[]};
  if (!data || !Array.isArray(data.hits)) throw new Error('Invalid Bindawood response');
  return data.hits;
  }
  const weight = parseWeight(query.term);
  let hits = await requestHits(query.term);
  // The upstream search does not equate "1 كيلو" with "١كغم".
  // Retry without the weight, then require an equivalent weight in each returned name.
  if (hits.length === 0 && weight && weight.term) hits = await requestHits(weight.term);
  return hits.map(mapBindawoodHit).filter((product): product is Product => product !== null)
    .filter(product => !weight || matchesWeight(product.name, weight.grams));
}



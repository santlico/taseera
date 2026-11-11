import type { Product, SearchQuery } from '@market/core';

type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Read JSON records in Flight without evaluating JS or interpreting executable content. */
export function parseCarrefourResponse(text: string): Product[] {
  const products = new Map<string, Product>();
  let searchDataFound = false;
  function readProduct(value: unknown) {
    if (!object(value) || typeof value.productId !== 'string' || typeof value.productName !== 'string') return;
    if (typeof value.sellingPrice !== 'number' || !Number.isFinite(value.sellingPrice) || value.sellingPrice <= 0 || value.currency !== 'SAR') return;
    if (typeof value.productUrl !== 'string') return;
    let url: URL;
    try { url = new URL(value.productUrl, 'https://www.carrefourksa.com'); } catch { return; }
    if (url.protocol !== 'https:' || url.hostname !== 'www.carrefourksa.com' || !url.pathname.startsWith('/mafsau/ar/')) return;
    const stock = object(value.stock) ? value.stock.stockLevelStatus : undefined;
    const product: Product = {store:'carrefour',id:value.productId,name:value.productName,
      price:value.sellingPrice,currency:'SAR',url:url.href,
      imageUrl:typeof value.imageUrl === 'string' && value.imageUrl.startsWith('https://') ? value.imageUrl : undefined,
      availability:stock === 'inStock' ? 'in_stock' : stock === 'outOfStock' ? 'out_of_stock' : 'unknown',
      location:'Granada - Riyadh — الموقع الافتراضي لكارفور',fetchedAt:new Date().toISOString()};
    products.set(product.id,product);
  }
  function walk(value: unknown) {
    if (Array.isArray(value)) { value.forEach(walk); return; }
    if (!object(value)) return;
    if (object(value.data) && Array.isArray(value.data.sections) && object(value.data.pagination)) {
      searchDataFound = true;
      for (const section of value.data.sections) {
        if (object(section) && object(section.componentDTO)) readProduct(section.componentDTO.additionalAttributes);
      }
      return;
    }
    Object.values(value).forEach(walk);
  }
  for (const line of text.split(/\r?\n/)) {
    if (!/^[a-f\d]+:[\[{]/i.test(line)) continue;
    try { walk(JSON.parse(line.slice(line.indexOf(':')+1))); } catch { /* Flight also includes non-JSON records. */ }
  }
  if (!searchDataFound) throw new Error('Carrefour search response changed or returned an empty shell');
  return [...products.values()];
}

export async function searchCarrefour(query: SearchQuery, signal: AbortSignal): Promise<Product[]> {
  if (query.city !== 'الرياض' || query.storeLocationId) throw new Error('Only default Granada Riyadh scope is supported');
  const url = new URL('https://www.carrefourksa.com/mafsau/ar/search');
  url.searchParams.set('keyword',query.term);
  const response = await fetch(url,{signal,headers:{RSC:'1',Accept:'text/x-component'}});
  if (!response.ok) throw new Error('Carrefour search request failed');
  const text = await response.text();
  // Verify upstream default scope rather than silently presenting another city.
  if (!text.includes('"defaultAreaCode":"Granada - Riyadh"')) throw new Error('Carrefour default location changed');
  return parseCarrefourResponse(text);
}

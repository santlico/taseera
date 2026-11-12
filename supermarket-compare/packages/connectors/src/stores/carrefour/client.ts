import type { Product, SearchQuery } from '@market/core';

type JsonObject = Record<string, unknown>;
function object(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Decode only JSON string chunks; never execute scripts from the upstream page. */
export function carrefourFlightText(text: string): string {
  if (!/^\s*</.test(text)) return text;
  const chunks: string[] = [];
  for (const script of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    for (const match of script[1].matchAll(/\bself\.__next_f\.push\(\[1,\s*("(?:[^"\\]|\\.)*")\s*\]\)/g)) {
      try { chunks.push(JSON.parse(match[1])); } catch { /* Ignore malformed chunks. */ }
    }
  }
  if (!chunks.length) {
    const blocked = /access denied|captcha|robot|request rejected|incident id|challenge/i.test(text);
    const shortMessage = text.length <= 256 ? text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) : '';
    throw new Error(`Carrefour HTML has no search data (${blocked ? 'possible access challenge' : 'unexpected page'}, ${text.length} characters)${shortMessage ? `: ${shortMessage}` : ''}`);
  }
  return chunks.join('');
}

/** Read JSON records in Flight without evaluating JS or interpreting executable content. */
export function parseCarrefourResponse(text: string): Product[] {
  text = carrefourFlightText(text);
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
  // Request the public document directly. Some upstream edges return a tiny
  // HTML shell for RSC requests from hosted servers.
  const response = await fetch(url,{signal,headers:{Accept:'text/html'},cache:'no-store'});
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? 'unknown';
  try {
    if (!response.ok) throw new Error(`Carrefour search request failed (HTTP ${response.status})`);
    if (!contentType.includes('text/x-component') && !contentType.includes('text/html')) {
      throw new Error(`Carrefour returned an unexpected response (HTTP ${response.status}, ${contentType})`);
    }
    // Verify upstream default scope rather than silently presenting another city.
    const flight = carrefourFlightText(text);
    if (!flight.includes('"defaultAreaCode":"Granada - Riyadh"')) throw new Error('Carrefour default location changed');
    return parseCarrefourResponse(flight);
  } catch (error) {
    // Server-only diagnostics: never log cookies, headers, or a full product page.
    // Strip query parameters from the final URL to avoid recording search terms.
    let finalUrl = 'unavailable';
    try {
      const final = new URL(response.url);
      finalUrl = final.origin + final.pathname;
    } catch { /* A synthetic response may not have a URL. */ }
    console.warn('Carrefour upstream response rejected', {
      status: response.status,
      contentType,
      finalUrl,
      redirected: response.redirected,
      bodyLength: text.length,
      shortBody: text.length <= 256 ? text.replace(/[\u0000-\u001f\u007f]/g, ' ') : undefined,
    });
    throw error;
  }
}

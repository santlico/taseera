import { fetchStoreDocument } from '../../shared/http';
import { load } from 'cheerio';
import type { Product, SearchQuery } from '@market/core';

function priceNumber(text: string): number | null {
  const normalized = text.replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\s\u200e\u200f\u061c]/g, '').replace(/٬/g, ',').replace(/٫/g, '.');
  const match = normalized.match(/(?:^|[^\d])((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?![\d.])/);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseAmazonResponse(html: string): Product[] {
  const $ = load(html);
  if ($('form[action*="validateCaptcha"], #captchacharacters').length || /robot check|automated access/i.test($('title').text())) {
    throw new Error('Amazon returned an access challenge');
  }
  const cards = $('[data-component-type="s-search-result"][data-asin]');
  if (!cards.length && !/لم نعثر على|لا توجد نتائج|no results for|did not match any products/i.test($('.s-main-slot, #search').text())) {
    throw new Error('Amazon search results missing or page changed');
  }
  const products = new Map<string, Product>();
  cards.each((_, element) => {
    const card = $(element);
    const id = card.attr('data-asin') ?? '';
    if (!/^[A-Z0-9]{10}$/.test(id)) return;
    const heading = card.find('h2').first();
    const name = heading.text().replace(/\s+/g, ' ').trim();
    const href = heading.closest('a').attr('href') ?? heading.find('a').attr('href') ?? card.find('a:has(img.s-image)').first().attr('href');
    if (!name || !href) return;
    let url: URL;
    try { url = new URL(href, 'https://www.amazon.sa'); } catch { return; }
    const productPath = url.pathname.match(/^(.*\/dp\/([A-Z0-9]{10}))(?:\/|$)/);
    if (url.protocol !== 'https:' || !['www.amazon.sa', 'amazon.sa'].includes(url.hostname) || productPath?.[2] !== id) return;
    // Use the displayed offer, excluding crossed-out list prices and installment text.
    const offer = card.find('.a-price:not(.a-text-price)').first();
    const symbol = offer.find('.a-price-symbol').text();
    const priceText = offer.find('.a-offscreen').first().text();
    if (!/ريال|SAR|ر\.?س/i.test(symbol + priceText)) return;
    const price = priceNumber(priceText);
    if (price === null) return;
    const image = card.find('img.s-image').first().attr('src');
    const text = card.text();
    products.set(id, {
      store: 'amazon', id, name, price, currency: 'SAR',
      url: url.origin + productPath[1],
      imageUrl: image?.startsWith('https://') ? image : undefined,
      // A displayed price alone does not verify stock at the user's address.
      availability: /غير متوفر حاليًا|غير متوفر حاليا|currently unavailable/i.test(text) ? 'out_of_stock' : 'unknown',
      location: 'أمازون السعودية — الموقع الافتراضي؛ التوصيل والبائع حسب المنتج',
      fetchedAt: new Date().toISOString(),
    });
  });
  return [...products.values()];
}

export async function searchAmazon(query: SearchQuery, signal: AbortSignal): Promise<Product[]> {
  if (query.storeLocationId) throw new Error('Amazon custom delivery location is not supported');
  const url = new URL('https://www.amazon.sa/s');
  url.searchParams.set('k', query.term);
  const {response, text} = await fetchStoreDocument('amazon', url, {signal, cache: 'no-store', headers: {
    Accept: 'text/html', 'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8', 'User-Agent': 'Taseera/1.0',
  }});
  if (!response.ok) throw new Error(`Amazon search request failed (HTTP ${response.status})`);
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('Amazon returned unexpected content type');
  return parseAmazonResponse(text);
}

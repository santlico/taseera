import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAmazonResponse, searchAmazon} from '../../connectors/src/stores/amazon/client';
const card = (price = '59.00 ريال', href = '/milk/dp/B089K3DFBP/ref=search?tag=tracking') => `<div data-component-type="s-search-result" data-asin="B089K3DFBP"><a href="${href}"><h2>حليب &amp; المراعي 12 × 1 لتر</h2></a><img class="s-image" src="https://m.media-amazon.com/milk.jpg"><span class="a-price a-text-price"><span class="a-offscreen">99 ريال</span></span><span class="a-price"><span class="a-offscreen">${price}</span><span class="a-price-symbol">ريال</span></span></div>`;

test('Amazon reads offer price, decodes titles, removes tracking, and deduplicates ASINs', () => {
  const [p, ...rest] = parseAmazonResponse(card() + card());
  assert.equal(rest.length, 0);
  assert.equal(p.name, 'حليب & المراعي 12 × 1 لتر');
  assert.equal(p.price, 59);
  assert.equal(p.url, 'https://www.amazon.sa/milk/dp/B089K3DFBP');
  assert.equal(p.availability, 'unknown');
});
test('Amazon accepts Arabic and thousands-formatted prices', () => {
  assert.equal(parseAmazonResponse(card('١٬٢٣٤٫٥٠ ريال'))[0].price, 1234.5);
  assert.equal(parseAmazonResponse(card('1,234.50 SAR'))[0].price, 1234.5);
});
test('Amazon rejects missing prices, other currencies, and unsafe or mismatched links', () => {
  assert.deepEqual(parseAmazonResponse(card('')), []);
  assert.deepEqual(parseAmazonResponse(card('0 ريال')), []);
  assert.deepEqual(parseAmazonResponse(card('59', 'https://example.com/dp/B089K3DFBP')), []);
  assert.deepEqual(parseAmazonResponse(card('59 ريال', '/dp/B012345678')), []);
  assert.deepEqual(parseAmazonResponse(card().replaceAll('ريال', 'USD')), []);
});
test('Amazon distinguishes no results from challenges and broken pages', () => {
  assert.deepEqual(parseAmazonResponse('<div id="search"><div class="s-main-slot">No results for this query</div></div>'), []);
  assert.throws(() => parseAmazonResponse('<html></html>'), /missing/);
  assert.throws(() => parseAmazonResponse('<form action="/errors/validateCaptcha"></form>'), /challenge/);
});
test('Amazon sends encoded search, cancellation, and explicit headers', async (t) => {
  const signal = new AbortController().signal;
  t.mock.method(globalThis, 'fetch', async (input: unknown, init?: RequestInit) => {
    assert.equal(new URL(String(input)).searchParams.get('k'), 'حليب المراعي');
    assert.equal(init?.signal, signal);
    assert.equal(new Headers(init?.headers).get('User-Agent'), 'Taseera/1.0');
    return new Response(card(), {headers:{'content-type':'text/html'}});
  });
  assert.equal((await searchAmazon({term:'حليب المراعي',city:'الرياض'}, signal)).length, 1);
});

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// A single public search request: no browser impersonation, cookies, clearance tokens,
// proxies, challenge solving, automatic retries or alternate domains.
const term = process.argv[2] || 'رينبو حليب مبخر 170';
const url = new URL('https://gcc.luluhypermarket.com/ar-sa/list/');
url.searchParams.set('search_text', term);
const report = {
  checkedAt: new Date().toISOString(),
  runtime: process.version,
  scope: 'Machine running this command; not proof of access from another hosting provider',
  query: term,
  url: url.href,
  requestHeaders: {
    Accept: 'text/x-component',
    'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.7',
    RSC: '1',
    'Next-Url': '/ar-sa/',
    Referer: 'https://gcc.luluhypermarket.com/ar-sa/',
    'User-Agent': 'SupermarketCompare-ConnectivityProbe/1.0',
  },
};
const started = Date.now();
let result;
try {
  const response = await fetch(url, {
    headers: report.requestHeaders,
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
  const text = await response.text();
  const hasProductPayload = /"products"\s*:\s*\[/.test(text);
  const title = text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  result = { ...report, durationMs: Date.now() - started, status: response.status,
    contentType: response.headers.get('content-type'), responseBytes: Buffer.byteLength(text),
    title, hasProductPayload,
    outcome: response.ok && hasProductPayload ? 'product_payload_received'
      : response.status === 403 ? 'access_denied' : 'no_confirmed_product_payload',
  };
} catch (error) {
  result = { ...report, durationMs: Date.now() - started,
    outcome: 'network_error', error: error.message, code: error.cause?.code ?? null };
}
const directory = new URL('../reports/', import.meta.url);
await mkdir(directory, { recursive: true });
const destination = new URL('lulu-connectivity.json', directory);
await writeFile(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
console.log(`Report: ${fileURLToPath(destination)}`);
process.exitCode = result.outcome === 'product_payload_received' ? 0 : 1;

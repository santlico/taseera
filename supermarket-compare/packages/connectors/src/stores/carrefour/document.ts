import https from 'node:https';

export const carrefourHeaders = {
  Accept: 'text/html',
  'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8',
  'User-Agent': 'Taseera/1.0',
};

/** Use Node's HTTP/1.1 transport without Next.js fetch instrumentation. */
export function fetchCarrefourDocument(url: URL, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {signal, headers: carrefourHeaders}, response => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 8 * 1024 * 1024) {
          response.destroy(new Error('Carrefour document exceeds size limit'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
        }
        const result = new Response(Buffer.concat(chunks), {status: response.statusCode ?? 502, headers});
        Object.defineProperty(result, 'url', {value: url.href});
        resolve(result);
      });
    });
    request.on('error', reject);
  });
}

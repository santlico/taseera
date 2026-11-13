import { Agent } from 'undici';
import { setTimeout as delay } from 'node:timers/promises';
import type { StoreId } from '@market/core';

// Keep normal routing on the first attempt; use an isolated IPv4 pool after
// a transport failure. Never change process-wide DNS or fetch settings.
const ipv4Dispatcher = new Agent({connect: {family: 4}});

const transientCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT']);
function networkCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return;
  const failure = error as {code?: unknown; cause?: unknown};
  return typeof failure.code === 'string' ? failure.code : networkCode(failure.cause);
}

/** Search-only requests: at most two retries for interrupted connections, within the caller's deadline.
 * Read the body inside the attempt so a connection reset during streaming is covered too.
 * HTTP denials, invalid data, and cancellation are never retried here.
 */
export async function fetchStoreDocument(
  store: StoreId,
  input: string | URL,
  init: RequestInit & {signal: AbortSignal},
): Promise<{response: Response; text: string}> {
  const headers = new Headers({
    Accept: 'text/html', 'Accept-Language': 'ar-SA,ar;q=0.9,en;q=0.8', 'User-Agent': 'Taseera/1.0',
  });
  new Headers(init.headers).forEach((value, name) => headers.set(name, value));
  const backoffMs = [250, 750];
  for (let attempt = 0; ; attempt++) {
    init.signal.throwIfAborted();
    try {
      const options: RequestInit & {dispatcher?: Agent} = {...init, headers, cache: 'no-store',
        ...(attempt > 0 ? {dispatcher: ipv4Dispatcher} : {}),
      };
      const response = await fetch(input, options);
      const text = await response.text();
      return {response, text};
    } catch (error) {
      const code = networkCode(error);
      if (attempt >= backoffMs.length || init.signal.aborted || !code || !transientCodes.has(code)) throw error;
      console.warn('Store connection interrupted; retrying', {store, host: new URL(input).hostname, code, nextAttempt: attempt + 2});
      await delay(backoffMs[attempt], undefined, {signal: init.signal});
    }
  }
}

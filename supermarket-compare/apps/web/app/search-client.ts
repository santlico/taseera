import type { SearchResponse, StoreId, StoreResult } from '@market/core';
export type LiveStoreResult = Omit<StoreResult, 'status'> & {status: StoreResult['status'] | 'pending' | 'cancelled'};
import type {SearchIntent} from './search-intent';
export interface LiveSearch {intent?:SearchIntent;smart?:boolean;term: string; startedAt: string; results: LiveStoreResult[]}
export async function requestStore(term: string, store: StoreId, signal: AbortSignal): Promise<StoreResult> {
  const params = new URLSearchParams({q: term, city: 'الرياض', store});
  // Avoid AbortSignal.any/timeout so older mobile browsers can still search.
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => controller.abort(new DOMException('Store request timed out', 'TimeoutError')), 15_000);
  try {
    const response = await fetch(`/api/search?${params}`, {signal: controller.signal, cache: 'no-store'});
    if (!response.ok) throw new Error('تعذّر إكمال الطلب');
    const data = await response.json() as SearchResponse;
    const result = data.results?.find(result => result.store === store);
    if (!result || !Array.isArray(result.products)) throw new Error('استجابة غير مكتملة');
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

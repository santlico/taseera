import { sourceSearchTerm } from './product-insights';
import { validateProducts } from './validation';
export { productFacts, searchRelevance, comparisonWarning, normalizeText } from './product-insights';
export type { ProductFacts } from './product-insights';
export type StoreId = 'othaim' | 'danube' | 'sadhan' | 'tamimi' | 'lulu' | 'carrefour' | 'ninja' | 'bindawood' | 'amazon' | 'hungerstation' | 'noon' | 'nahdi' | 'aldawaa' | 'united' | 'whites';

export interface SearchQuery {
  term: string;
  city: string;
  storeLocationId?: string;
}

export interface Product {
  store: StoreId;
  id: string;
  name: string;
  price: number;
  currency: 'SAR';
  url: string;
  imageUrl?: string;
  brand?: string;
  retailer?: string;
  size?: string;
  availability: 'in_stock' | 'out_of_stock' | 'unknown';
  location: string;
  fetchedAt: string;
}

export interface ConnectorSearchResult {
  products: Product[];
  notice?: string;
  partial?: boolean;
}

export interface StoreConnector {
  id: StoreId;
  name: string;
  enabled: boolean;
  preserveSearchTerm?: boolean;
  search(query: SearchQuery, signal: AbortSignal): Promise<Product[] | ConnectorSearchResult>;
}

export interface StoreResult {
  store: StoreId;
  status: 'ok' | 'error' | 'timeout' | 'not_configured';
  products: Product[];
  durationMs: number;
  message?: string;
  notice?: string;
  partial?: boolean;
}

export interface SearchResponse {
  query: SearchQuery;
  results: StoreResult[];
}

/** One store failing must not prevent the other stores from returning results. */
export async function searchStores(
  query: SearchQuery,
  connectors: readonly StoreConnector[],
  timeoutMs = 10_000,
): Promise<SearchResponse> {
  if (!query.term.trim() || !query.city.trim()) throw new Error('Search term and city are required');
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid timeout');
  const normalized = { ...query, term: query.term.trim(), city: query.city.trim() };
  const sourceQuery = {...normalized, term: sourceSearchTerm(normalized.term)};
  const results = await Promise.all(connectors.map(async (connector): Promise<StoreResult> => {
    if (!connector.enabled) return { store: connector.id, status: 'not_configured', products: [], durationMs: 0 };
    const start = Date.now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs);
      });
      const rawProducts = await Promise.race([connector.search(connector.preserveSearchTerm ? normalized : sourceQuery, controller.signal), timeout]);
      const products = validateProducts(Array.isArray(rawProducts) ? rawProducts : rawProducts.products, connector.id);
      return { store: connector.id, status: 'ok', products, durationMs: Date.now() - start,
        ...(!Array.isArray(rawProducts) ? {notice: rawProducts.notice, partial: rawProducts.partial} : {}) };
    } catch (error) {
      // Keep diagnostics on the server; never expose upstream details to clients.
      console.warn('Store search failed', {
        store: connector.id,
        timedOut: controller.signal.aborted,
        durationMs: Date.now() - start,
        reason: error instanceof Error ? error.message : 'Unknown connector error',
        code: error instanceof Error && typeof error.cause === 'object' && error.cause !== null && 'code' in error.cause
          ? String(error.cause.code).slice(0, 64) : undefined,
      });
      return { store: connector.id, status: controller.signal.aborted ? 'timeout' : 'error', products: [],
        durationMs: Date.now() - start, message: controller.signal.aborted ? 'Store request timed out' : 'Store search failed' };
    } finally { clearTimeout(timer); }
  }));
  return { query: normalized, results };
}

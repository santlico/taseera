import type { Product, StoreId } from './index';

const domains: Record<StoreId, string[]> = {
  hungerstation: ['hungerstation.com'],
  noon: ['minutes.noon.com'],
  nahdi: ['www.nahdionline.com'],
  danube: ['www.danube.sa', 'danube.sa'], bindawood: ['www.bindawood.sa', 'bindawood.sa'],
  carrefour: ['www.carrefourksa.com'], tamimi: ['shop.tamimimarkets.com'], ninja: ['ananinja.com'],
  amazon: ['www.amazon.sa', 'amazon.sa'], lulu: ['gcc.luluhypermarket.com'], othaim: [], sadhan: [],
};
export function validateProducts(input: Product[], store: StoreId): Product[] {
  if (!Array.isArray(input)) throw new Error('Invalid product collection');
  const valid = new Map<string, Product>();
  for (const p of input) {
    if (!p || p.store !== store || typeof p.id !== 'string' || !p.id.trim() || typeof p.name !== 'string' || !p.name.trim() ||
      typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price <= 0 || p.currency !== 'SAR' ||
      typeof p.location !== 'string' || !p.location.trim() || !Number.isFinite(Date.parse(p.fetchedAt)) ||
      !['in_stock', 'out_of_stock', 'unknown'].includes(p.availability)) continue;
    try {
      const url = new URL(p.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !domains[store].includes(url.hostname)) continue;
      valid.set(p.id, {...p, name: p.name.trim(), imageUrl: typeof p.imageUrl === 'string' && p.imageUrl.startsWith('https://') ? p.imageUrl : undefined});
    } catch { /* Invalid individual products do not discard valid offers. */ }
  }
  if (input.length && !valid.size) throw new Error('All upstream products failed validation');
  return [...valid.values()];
}

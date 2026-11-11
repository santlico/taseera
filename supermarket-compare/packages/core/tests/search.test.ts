import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchStores, type StoreConnector } from '../src/index';
const query = { term: 'chicken', city: 'الرياض' };
test('store failures do not discard successful stores or disabled status', async () => {
  const stores: StoreConnector[] = [
    { id: 'lulu', name: 'Lulu', enabled: true, async search() { return []; } },
    { id: 'tamimi', name: 'Tamimi', enabled: true, async search() { throw new Error('secret'); } },
    { id: 'danube', name: 'Danube', enabled: false, async search() { throw new Error('must not run'); } },
  ];
  const result = await searchStores(query, stores);
  assert.deepEqual(result.results.map(r => r.status), ['ok', 'error', 'not_configured']);
  assert.equal(result.results[1].message, 'Store search failed');
});
test('a nonresponsive connector is bounded and receives cancellation', async () => {
  let signal: AbortSignal | undefined;
  const store: StoreConnector = { id: 'lulu', name: 'Lulu', enabled: true,
    search(_query, inputSignal) { signal = inputSignal; return new Promise(() => {}); } };
  const result = await searchStores(query, [store], 20);
  assert.equal(result.results[0].status, 'timeout');
  assert.equal(signal?.aborted, true);
});

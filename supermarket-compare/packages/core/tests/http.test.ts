import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchStoreDocument} from '../../connectors/src/shared/http';
const interrupted = () => new TypeError('fetch failed', {cause: Object.assign(new Error('connection reset'), {code:'ECONNRESET'})});

test('search transport retries one interrupted connection with the same body and signal', async (t) => {
  const signal = new AbortController().signal;
  t.mock.method(console, 'warn', () => {});
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (_input: unknown, init?: RequestInit) => {
    calls++;
    assert.equal(init?.signal, signal);
    assert.equal(init?.body, '{"query":"milk"}');
    assert.equal(new Headers(init?.headers).get('Accept'), 'application/json');
    const dispatcher = (init as RequestInit & {dispatcher?: unknown})?.dispatcher;
    if (calls === 1) { assert.equal(dispatcher, undefined); throw interrupted(); }
    assert.ok(dispatcher, 'retry uses an isolated connection pool');
    return new Response('{"hits":[]}');
  });
  const result = await fetchStoreDocument('bindawood','https://example.com/search', {signal, method:'POST',body:'{"query":"milk"}',headers:{Accept:'application/json'}});
  assert.equal(result.text, '{"hits":[]}');
  assert.equal(calls, 2);
});
test('search transport retries a reset while reading the response body', async (t) => {
  t.mock.method(console, 'warn', () => {});
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => ++calls === 1
    ? new Response(new ReadableStream({start(controller) {controller.error(interrupted());}}))
    : new Response('complete'));
  assert.equal((await fetchStoreDocument('ninja','https://example.com/search',{signal:new AbortController().signal})).text,'complete');
  assert.equal(calls,2);
});
test('search transport stops after three failed attempts', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const fetch = t.mock.method(globalThis,'fetch',async()=>{throw interrupted();});
  await assert.rejects(fetchStoreDocument('ninja','https://example.com/search',{signal:new AbortController().signal}),/fetch failed/);
  assert.equal(fetch.mock.callCount(),3);
});
test('search transport does not retry HTTP denials or non-network errors', async (t) => {
  const fetch = t.mock.method(globalThis,'fetch',async()=>new Response('denied',{status:403}));
  assert.equal((await fetchStoreDocument('amazon','https://example.com/search',{signal:new AbortController().signal})).response.status,403);
  assert.equal(fetch.mock.callCount(),1);
  fetch.mock.mockImplementation(async()=>{throw new Error('invalid request');});
  await assert.rejects(fetchStoreDocument('amazon','https://example.com/search',{signal:new AbortController().signal}),/invalid request/);
  assert.equal(fetch.mock.callCount(),2);
});
test('cancelling during retry delay prevents a second request', async (t) => {
  const controller = new AbortController();
  t.mock.method(console,'warn',()=>{controller.abort();});
  const fetch = t.mock.method(globalThis,'fetch',async()=>{throw interrupted();});
  await assert.rejects(fetchStoreDocument('ninja','https://example.com/search',{signal:controller.signal}));
  assert.equal(fetch.mock.callCount(),1);
});


test('search transport recovers after two consecutive connection resets', async (t) => {
  t.mock.method(console, 'warn', () => {});
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{if(++calls<3)throw interrupted();return new Response('recovered');});
  assert.equal((await fetchStoreDocument('bindawood','https://example.com/search',{signal:new AbortController().signal})).text,'recovered');
  assert.equal(calls,3);
});

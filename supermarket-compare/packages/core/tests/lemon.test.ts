import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLemonResponse,searchLemon} from '../../connectors/src/stores/lemon/client';
import https from 'node:https';
import {EventEmitter} from 'node:events';
const term='سيتافيل';
const card=(price='59.80',href='https://lemon.sa/cetaphil-cleanser',sale='')=>`<div class="product-thumb"><div class="image"><img src="https://lemon.sa/image/cache/transparent-255x255.png" data-src="https://lemon.sa/image/cache/catalog/cetaphil.jpg"></div><div class="name"><a href="${href}">سيتافيل غسول 118 مل</a></div><input name="product_id" value="644"><div class="price"><span class="price-normal"><svg></svg>${price}</span>${sale}<span class="price-tax">السعر بدون ضريبة : 52.00</span></div></div>`;
const page=(body=card(),q=term)=>`<div id="content"><h1>بحث - ${q}</h1><div class="main-products">${body}</div></div>`;
test('Lemon reads the current VAT-inclusive price and real lazy image, never old or VAT-exclusive price',()=>{
 const [p]=parseLemonResponse(page(card()+card()),term);assert.equal(parseLemonResponse(page(card()+card()),term).length,1);assert.equal(p.price,59.8);assert.equal(p.availability,'unknown');assert.equal(p.imageUrl,'https://lemon.sa/image/cache/catalog/cetaphil.jpg');
 assert.equal(parseLemonResponse(page(card('59.80',undefined,'<span class="price-old">59.80</span><span class="price-new">39.50</span>')),term)[0].price,39.5);
});
test('Lemon retries a hosted document denial through ordinary HTTPS while retaining actual VAT-inclusive prices',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('blocked',{status:403}));
 t.mock.method(https,'get',(_url:unknown,options:any,callback:(r:unknown)=>void)=>{
  assert.ok(options.signal);const response=Object.assign(new EventEmitter(),{statusCode:200});
  queueMicrotask(()=>{callback(response);response.emit('data',Buffer.from(page()));response.emit('end');});return new EventEmitter();
 });
 assert.equal((await searchLemon({term,city:'الرياض'},new AbortController().signal)).products[0].price,59.8);
});
test('Lemon requires matching query and explicit empty message, and rejects bad links and prices',()=>{
 assert.deepEqual(parseLemonResponse(page('لا يوجد أي منتجات تطابق معايير البحث.'),term),[]);
 for(const html of [page(''),page(card(),'other'),page(card('0')),page(card('59.80','https://evil.example/cetaphil')),page(card('59.80','https://user@lemon.sa/cetaphil'))])assert.throws(()=>parseLemonResponse(html,term));
 assert.equal(parseLemonResponse(page(card().replace('data-src="https://lemon.sa','data-src="https://evil.example')),term)[0].imageUrl,undefined);
});
test('Lemon sends full original query to the observed public search route with cancellation',async(t)=>{
 const signal=new AbortController().signal;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{const u=new URL(String(input));assert.equal(u.searchParams.get('route'),'product/search');assert.equal(u.searchParams.get('search'),term);assert.equal(init?.signal,signal);const r=new Response(page());Object.defineProperty(r,'url',{value:u.href});return r;});
 assert.equal((await searchLemon({term,city:'الرياض'},signal)).products.length,1);
});

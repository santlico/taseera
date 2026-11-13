import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAldawaaResponse,searchAldawaa} from '../../connectors/src/stores/aldawaa/client';
import {searchRelevance} from '../src/index';
const term='سيتافيل';
const item={code:'256456',name:'سيتافيل لوشن 473مل',urlProductName:'cetaphil-moisturizing-lotion-normal-dry-sensitive-skin',price:{currencyIso:'SAR',value:167.9},simulatedDiscountPrice:{currencyIso:'SAR',value:83.95},stock:{stockLevelStatus:'inStock'},addToCartDisabled:false,imageUrl:[{key:'ar',value:'/medias/cetaphil.webp?context=public'}]};
const data=(products:unknown[]=[item])=>({freeTextSearch:term,pagination:{totalResults:products.length},products});
test('Al-Dawaa reads displayed discounted price, canonical card URL, image and explicit catalog stock',()=>{
 const [p]=parseAldawaaResponse(data([item,item]),term);assert.equal(parseAldawaaResponse(data([item,item]),term).length,1);
 assert.equal(p.price,83.95);assert.equal(p.url,'https://www.al-dawaa.com/ar/p/256456/cetaphil-moisturizing-lotion-normal-dry-sensitive-skin');assert.match(p.imageUrl!,/^https:\/\/stgprevapi.al-dawaa.com\/medias\//);assert.equal(p.availability,'in_stock');
 assert.equal(parseAldawaaResponse(data([{...item,simulatedDiscountPrice:undefined,stock:{stockLevelStatus:'outOfStock'}}]),term)[0].price,167.9);
 assert.equal(searchRelevance({...p,name:'بانادول 500 مجم 24 قرص'},'بنادول 1000'),0);
});
test('Al-Dawaa permits legitimate empty/hidden-price searches but rejects broken context, bad prices and unsafe slugs',()=>{
 assert.deepEqual(parseAldawaaResponse(data([]),term),[]);assert.deepEqual(parseAldawaaResponse(data([{...item,hidePriceSearch:true}]),term),[]);
 for(const d of [{}, {...data(),freeTextSearch:'other'},data([{...item,urlProductName:'../secret'}]),data([{...item,simulatedDiscountPrice:{currencyIso:'AED',value:10}}]),data([{...item,simulatedDiscountPrice:{currencyIso:'SAR',value:0}}])])assert.throws(()=>parseAldawaaResponse(d,term));
 const [p]=parseAldawaaResponse(data([{...item,imageUrl:[{key:'ar',value:'https://evil.example/medias/x'}]}]),term);assert.equal(p.imageUrl,undefined);
});
test('Al-Dawaa uses the observed anonymous catalog API and preserves full query with cancellation',async(t)=>{
 const signal=new AbortController().signal;
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input));assert.equal(url.hostname,'stgprevapi.al-dawaa.com');assert.equal(url.searchParams.get('query'),term);assert.equal(url.searchParams.get('curr'),'SAR');assert.equal(url.searchParams.get('lang'),'ar');assert.equal(init?.signal,signal);
  const r=Response.json(data());Object.defineProperty(r,'url',{value:url.href});return r;
 });
 assert.equal((await searchAldawaa({term,city:'الرياض'},signal)).products.length,1);
});

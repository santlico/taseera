import {test} from 'node:test';
import assert from 'node:assert/strict';
import {branches,parseHungerstation,searchHungerstation} from '../../connectors/src/stores/hungerstation/client';
import {searchStores} from '../src/index';
import {hungerstation} from '../../connectors/src/stores/hungerstation/index';
const term='حليب المراعي';
const item={id:'product-1',sku:'milk_EA',name:'حليب المراعي 1 لتر',price:7,originalPrice:9,activePromotions:[{discountValue:5}],images:[{url:'https://hungerstation.dhmedia.io/milk.jpg'}]};
function fixture(branch:(typeof branches)[number]=branches[0],items:unknown[]=[item],href?:string,edit?:(data:any)=>void){
  const data={page:'/supermarkets/[chain]',query:{chain:branch.slug,query:term},props:{pageProps:{
    chain:{id:branch.chainId},vendor:{id:branch.vendorId,chainId:branch.chainId,status:'CLOSE'},
    city:{slug:{en:'riyadh'}},district:{name:{ar:'حي الاختبار'}},productSearchResult:{items,meta:{isLastPage:false,totalCount:35}},
  }}};
  edit?.(data);
  return `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script><a href="${href??`/sa-ar/supermarkets/${branch.slug}/product/milk-${item.sku}`}">milk</a>`;
}
test('Hungerstation uses actual price and observed product URL, names branch and never infers stock from store status',()=>{
 const [p]=parseHungerstation(fixture(),branches[0],term,new Date('2026-11-13T00:00:00Z'));
 assert.equal(p.price,7);assert.equal(p.availability,'unknown');assert.equal(p.retailer,'العثيم');
 assert.match(p.location,/الرياض.*حي الاختبار.*مغلق/);assert.match(p.id,/141190:/);
 assert.equal(p.url,'https://hungerstation.com/sa-ar/supermarkets/al-othaim-65969/product/milk-milk_EA');
 assert.equal(p.fetchedAt,'2026-11-13T00:00:00.000Z');
});
test('Hungerstation empty search is valid; empty HTML, wrong query, branch or city are failures',()=>{
 assert.deepEqual(parseHungerstation(fixture(branches[0],[]),branches[0],term),[]);
 assert.throws(()=>parseHungerstation('<html></html>',branches[0],term));
 for(const edit of [(d:any)=>d.query.query='other',(d:any)=>d.props.pageProps.vendor.id=1,(d:any)=>d.props.pageProps.city.slug.en='jeddah',(d:any)=>d.props.pageProps.productSearchResult=null])
  assert.throws(()=>parseHungerstation(fixture(branches[0],[item],undefined,edit),branches[0],term),/context/);
});
test('Hungerstation rejects missing prices and unobserved, unsafe, or different-retailer links; deduplicates IDs',()=>{
 for(const href of ['https://example.com/product/milk-milk_EA','https://user@hungerstation.com/sa-ar/supermarkets/al-othaim-65969/product/milk-milk_EA','/sa-ar/supermarkets/panda-59709/product/milk-milk_EA','/sa-ar/supermarkets/al-othaim-65969/product/milk-other'])
  assert.throws(()=>parseHungerstation(fixture(branches[0],[item],href),branches[0],term),/links/);
 for(const price of [0,-1,'7',null])assert.throws(()=>parseHungerstation(fixture(branches[0],[{...item,price}]),branches[0],term),/prices/);
 assert.equal(parseHungerstation(fixture(branches[0],[item,item]),branches[0],term).length,1);
});
test('Hungerstation isolates a failed retailer and carries partial coverage through searchStores',async(t)=>{
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{
  const url=new URL(String(input));assert.equal(url.searchParams.get('query'),term);assert.ok(init?.signal);
  const branch=branches.find(b=>url.pathname.endsWith(b.slug))!;
  const response=new Response(branch===branches[1]?'Unavailable':fixture(branch),{status:branch===branches[1]?503:200});
  Object.defineProperty(response,'url',{value:url.href});return response;
 });
 const {results:[result]}=await searchStores({term,city:'الرياض'},[hungerstation]);
 assert.equal(result.status,'ok');assert.equal(result.partial,true);assert.equal(result.products.length,2);
 assert.match(result.notice!,/تعذّر البحث في: بنده/);
 assert.equal(new Set(result.products.map(p=>p.id)).size,2);
});
test('Hungerstation all failures are an error, not an empty successful search, and cancellation wins',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('blocked',{status:403}));
 await assert.rejects(searchHungerstation({term,city:'الرياض'},new AbortController().signal),/All Hungerstation/);
 await assert.rejects(searchHungerstation({term,city:'جدة'},new AbortController().signal),/Riyadh/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(searchHungerstation({term,city:'الرياض'},controller.signal),{name:'AbortError'});
});

import {test,type TestContext} from 'node:test';import assert from 'node:assert/strict';
import type {Product} from '../src/index';
import {decodeAdvice,shortlist,suggestFromProducts,runAssistant,validateInput,type AssistantInput} from '../../../apps/web/app/api/assistant/engine';
import {POST,GET} from '../../../apps/web/app/api/assistant/route';
import {reserveUsage} from '../../../apps/web/app/api/assistant/limits';
function setEnv(t:TestContext,name:string,value:string){const old=process.env[name];process.env[name]=value;t.after(()=>{if(old===undefined)delete process.env[name];else process.env[name]=old;});}
const product=(id='1',store:Product['store']='danube',price=100):Product=>({id,store,name:'شامبو 400 مل',price,currency:'SAR',url:'https://www.danube.sa/products/shampoo',availability:'in_stock',location:'الرياض',fetchedAt:new Date().toISOString()});
const input:AssistantInput={term:'شامبو',stores:['danube'],note:'نفس حجم العبوة',budget:150};
const advice={picks:[{key:'p0',reason:'budget',evidence:'400 مل'}],question:'',refinedQuery:'شامبو 400 مل'};
test('assistant validates bounded input, excludes unavailable and over-budget offers and balances stores before capping context',()=>{
 assert.equal(validateInput(input).term,'شامبو');for(const invalid of [{...input,stores:['unknown']},{...input,budget:-1},{...input,note:'x'.repeat(241)},{...input,term:''},{...input,stores:[]}])assert.throws(()=>validateInput(invalid));
 const all=[...Array.from({length:80},(_,i)=>product(String(i))),product('other','jarir',120),{...product('missing'),availability:'out_of_stock' as const},product('expensive','extra',1000)];const list=shortlist(all,input);assert.equal(list.length,60);assert.ok(list.some(p=>p.store==='jarir'));assert.ok(!list.some(p=>p.id==='missing'||p.id==='expensive'));
});
test('assistant resolves model choices to server products; invented IDs, evidence and false budget claims are rejected',()=>{
 const p=product();const result=decodeAdvice({...advice,picks:[{...advice.picks[0],price:1,url:'https://evil.example'}]},[p],input);assert.equal(result.picks[0].product.price,100);assert.equal(result.picks[0].product.url,p.url);
 for(const bad of [{...advice,picks:[{...advice.picks[0],key:'p99'}]},{...advice,picks:[{...advice.picks[0],evidence:'مضاد للحساسية'}]},{...advice,picks:[advice.picks[0],advice.picks[0]]},{...advice,question:'https://evil.example'}])assert.throws(()=>decodeAdvice(bad,[p],input));
 assert.throws(()=>decodeAdvice(advice,[p],{...input,budget:null}));
});
test('assistant calls Responses with strict candidate IDs, bounded output and store:false, never trusting generated prices',async(t)=>{
 setEnv(t,'OPENAI_API_KEY','test-only-secret');let called=0;
 t.mock.method(globalThis,'fetch',async(url:unknown,init?:RequestInit)=>{called++;assert.equal(String(url),'https://api.openai.com/v1/responses');const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.max_output_tokens,1100);assert.equal(body.text.format.strict,true);assert.deepEqual(body.text.format.schema.properties.picks.items.properties.key.enum,['p0']);assert.ok(!JSON.stringify(body).includes('test-only-secret'));assert.ok(!body.input.includes('https://'));assert.equal(init?.redirect,'error');return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(advice)}]}]});});
 const result=await suggestFromProducts([product()],input,new AbortController().signal);assert.equal(called,1);assert.equal(result.picks[0].product.price,100);assert.equal(result.ai,true);
 const empty=await suggestFromProducts([product('1','danube',1000)],input,new AbortController().signal);assert.equal(empty.ai,false);assert.equal(empty.picks.length,0);assert.equal(called,1);
});
test('assistant fails honestly on model refusal or truncated responses and does not call AI when all sources fail',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>Response.json({status:'incomplete',output:[]}));await assert.rejects(suggestFromProducts([product()],input,new AbortController().signal),/AI_UNAVAILABLE/);
 const source=async()=>({query:{term:input.term,city:'الرياض'},results:[{store:'danube' as const,status:'error' as const,products:[],durationMs:1}]});await assert.rejects(runAssistant(input,new AbortController().signal,source),/SOURCES_UNAVAILABLE/);
});
test('assistant caps shared usage atomically and sends only a hashed visitor identifier to Redis',async(t)=>{
 setEnv(t,'UPSTASH_REDIS_REST_URL','https://redis.example');setEnv(t,'UPSTASH_REDIS_REST_TOKEN','redis-test');setEnv(t,'OPENAI_API_KEY','openai-test');let calls=0;
 t.mock.method(globalThis,'fetch',async(_url:unknown,init?:RequestInit)=>{const command=JSON.parse(String(init?.body));assert.equal(command[0],'EVAL');assert.ok(!String(init?.body).includes('203.0.113.1'));assert.equal(command[2],'2');return Response.json({result:++calls===1?'OK':'DAILY_LIMIT'});});
 const r=new Request('https://taseera.test/api/assistant',{headers:{'x-forwarded-for':'203.0.113.1'}});await reserveUsage(r,new AbortController().signal);await assert.rejects(reserveUsage(r,new AbortController().signal),/DAILY_LIMIT/);
});
test('assistant endpoint rejects cross-origin requests and missing configuration without spending tokens',async(t)=>{
 setEnv(t,'OPENAI_API_KEY','');let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected');});
 assert.equal((await GET()).status,200);assert.equal((await (await GET()).json()).available,false);
 assert.equal((await POST(new Request('https://taseera.test/api/assistant',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}))).status,403);
 assert.equal((await POST(new Request('https://taseera.test/api/assistant',{method:'POST',headers:{origin:'https://taseera.test'},body:JSON.stringify(input)}))).status,503);assert.equal(calls,0);
});
test('assistant production fails closed without shared limits; malformed and oversized inputs never reach the model',async(t)=>{
 for(const name of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN'])setEnv(t,name,'');setEnv(t,'OPENAI_API_KEY','test-only-secret');setEnv(t,'NODE_ENV','production');
 const req=new Request('https://taseera.test/api/assistant',{headers:{origin:'https://taseera.test'}});await assert.rejects(reserveUsage(req,new AbortController().signal),/AI_STORAGE_UNAVAILABLE/);
 setEnv(t,'NODE_ENV','development');let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;throw Error('unexpected');});
 for(const body of ['null','{',JSON.stringify({...input,note:'x'.repeat(5000)}),JSON.stringify({...input,stores:['unknown']})]){const r=await POST(new Request(req.url,{method:'POST',headers:{origin:'https://taseera.test'},body}));assert.equal(r.status,400);}
 assert.equal(calls,0);
});

test('comparison accepts only two to four distinct selected source keys and resolves four literal evidence excerpts',async()=>{
 const comparison={...input,budget:null,compare:['danube:1','danube:2','danube:3','danube:4']};
 assert.deepEqual(validateInput(comparison).compare,comparison.compare);
 for(const compare of [[],['danube:1'],['danube:1','danube:1'],['evil:1','danube:2'],['danube:1','danube:2','danube:3','danube:4','danube:5']])assert.throws(()=>validateInput({...comparison,compare}));
 const products=['1','2','3','4'].map(id=>product(id));
 const decoded=decodeAdvice({picks:products.map((p,i)=>({key:'p'+i,reason:'compare',evidence:'400 مل'})),question:'',refinedQuery:''},products,comparison);
 assert.equal(decoded.picks.length,4);
 await assert.rejects(suggestFromProducts(products.slice(0,3),comparison,new AbortController().signal),/SOURCES_UNAVAILABLE/);
});

test('equivalent Arabic digits in model evidence resolve back to the actual merchant name, never an invented specification',()=>{
 const p={...product(),name:'حليب المراعي ١.٤ لتر'};
 const answer=decodeAdvice({picks:[{key:'p0',reason:'match',evidence:'1.4 لتر'}],question:'',refinedQuery:''},[p],input);
 assert.equal(answer.picks[0].evidence,p.name);
 assert.throws(()=>decodeAdvice({picks:[{key:'p0',reason:'match',evidence:'2.4 لتر'}],question:'',refinedQuery:''},[p],input));
});

import {test,type TestContext} from 'node:test';import assert from 'node:assert/strict';
import {parseRecommendation,isRecommendationReason} from '../src/recommendations';
import {productIdentity,visitor,readRecommendations,saveRecommendation,version} from '../../../apps/web/app/api/recommendations/storage';
import {POST} from '../../../apps/web/app/api/recommendations/route';
function setEnv(t:TestContext,name:string,value:string){const previous=process.env[name];process.env[name]=value;t.after(()=>{if(previous===undefined)delete process.env[name];else process.env[name]=previous;});}
test('recommendation summaries validate anonymous counts and reasons without inventing totals',()=>{
 assert.equal(isRecommendationReason('value'),true);assert.equal(isRecommendationReason('constructor'),false);
 const valid={total:2,mine:'tried',reasons:{general:0,value:1,tried:1,discover:0}};assert.equal(parseRecommendation(valid).mine,'tried');
 for(const bad of [{...valid,total:3},{...valid,total:-1},{...valid,mine:'other'},{...valid,reasons:{...valid.reasons,tried:0}}])assert.throws(()=>parseRecommendation(bad));
 assert.deepEqual(productIdentity({store:'beautycare',id:'123'}),{store:'beautycare',id:'123'});assert.throws(()=>productIdentity({store:'lulu',id:'1'}));assert.throws(()=>productIdentity({store:'beautycare',id:'x\n'}));
});
test('anonymous recommendation cookie is HttpOnly, signed, stable and replaced on tampering',()=>{
 const r=new Request('https://taseera.test/api/recommendations');const a=visitor(r,'test-secret');assert.ok(a.cookie?.includes('HttpOnly'));assert.ok(a.cookie?.includes('Secure'));
 const cookie=a.cookie!.split(';')[0];const b=visitor(new Request(r.url,{headers:{cookie}}),'test-secret');assert.equal(a.hash,b.hash);assert.equal(b.cookie,undefined);
 const tampered=visitor(new Request(r.url,{headers:{cookie:cookie.replace(/.$/,'x')}}),'test-secret');assert.notEqual(a.hash,tampered.hash);assert.ok(tampered.cookie);
});
test('recommendation backend uses deployment-scoped atomic scripts and validates responses',async(t)=>{
 setEnv(t,'UPSTASH_REDIS_REST_URL','https://redis.example');setEnv(t,'UPSTASH_REDIS_REST_TOKEN','secret');let calls=0;
 const summary={total:1,mine:'value',reasons:{general:0,value:1,tried:0,discover:0}};
 t.mock.method(globalThis,'fetch',async(input:unknown,init?:RequestInit)=>{calls++;assert.equal(String(input),'https://redis.example');assert.equal(new Headers(init?.headers).get('authorization'),'Bearer secret');const command=JSON.parse(String(init?.body));assert.equal(command[0],'EVAL');assert.ok(command[3].includes('{'+version+'}'));if(calls===1){assert.equal(command[2],'2');assert.ok(command[4].includes(':rate:'));return Response.json({result:JSON.stringify(summary)});}return Response.json({result:JSON.stringify([summary])});});
 assert.equal((await saveRecommendation({store:'beautycare',id:'123'},'value','voter',new AbortController().signal)).total,1);
 assert.equal((await readRecommendations([{store:'beautycare',id:'123'}],'voter',new AbortController().signal))['beautycare:123'].mine,'value');
 await assert.rejects(saveRecommendation({store:'beautycare',id:'123'},'bad','voter',new AbortController().signal),/INVALID_REASON/);
});
test('recommendation endpoint refuses cross-origin mutations and reports missing storage honestly',async(t)=>{
 const cross=await POST(new Request('https://taseera.test/api/recommendations',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}));assert.equal(cross.status,403);
 for(const name of ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN'])setEnv(t,name,'');
 const r=await POST(new Request('https://taseera.test/api/recommendations',{method:'POST',headers:{origin:'https://taseera.test'},body:'{}'}));assert.equal(r.status,503);assert.equal((await r.json()).available,false);
});

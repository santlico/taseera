import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {stores} from '../../store-catalog';
import {isRecommendationReason,parseRecommendation,type RecommendationReason} from '../../../../../packages/core/src/recommendations';
export const version=process.env.VERCEL_DEPLOYMENT_ID||process.env.VERCEL_GIT_COMMIT_SHA||'local-development';
export function redisConfig(){const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;return url&&token?{url,token}:null;}
const cookieName='taseera-recommender';
export function visitor(request:Request,secret:string){
 const raw=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';
 const sign=(id:string)=>createHmac('sha256',secret).update('recommendation-visitor:'+id).digest('hex');
 const [id,signature]=raw.split('.');let valid=false;
 if(/^[a-f0-9-]{36}$/.test(id||'')&&/^[a-f0-9]{64}$/.test(signature||'')){valid=timingSafeEqual(Buffer.from(signature),Buffer.from(sign(id)));}
 const chosen=valid?id:randomUUID();
 return {hash:createHash('sha256').update(chosen).digest('hex'),cookie:valid?undefined:`${cookieName}=${chosen}.${sign(chosen)}; Path=/api/recommendations; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(request.url).protocol==='https:'?'; Secure':''}`};
}
export function productIdentity(value:unknown){const p=value as any;if(!p||!stores.some(s=>s.id===p.store&&s.enabled)||typeof p.id!=='string'||!p.id.trim()||p.id.length>200||/[\u0000-\u001f]/.test(p.id))throw new Error('INVALID_PRODUCT');return {store:p.store as string,id:p.id as string};}
function key(p:{store:string;id:string}){return `taseera:rec:{${version}}:product:${createHash('sha256').update(p.store+'\0'+p.id).digest('hex')}`;}
const readLua=`local function summary(key,visitor)
 local reasons={general=tonumber(redis.call('HGET',key,'c:general') or '0'),value=tonumber(redis.call('HGET',key,'c:value') or '0'),tried=tonumber(redis.call('HGET',key,'c:tried') or '0'),discover=tonumber(redis.call('HGET',key,'c:discover') or '0')}
 return {total=tonumber(redis.call('HGET',key,'total') or '0'),mine=redis.call('HGET',key,'u:'..visitor) or false,reasons=reasons}
end
`;
export const queryScript=readLua+`local result={} for i,key in ipairs(KEYS) do result[i]=summary(key,ARGV[1]) end return cjson.encode(result)`;
export const voteScript=readLua+`
 local rate=redis.call('INCR',KEYS[2]);if rate==1 then redis.call('EXPIRE',KEYS[2],60) end
 if rate>30 then return cjson.encode({error='RATE_LIMIT'}) end
 local field='u:'..ARGV[1];local old=redis.call('HGET',KEYS[1],field);local next=ARGV[2]
 if not old and next~='remove' and tonumber(redis.call('HGET',KEYS[1],'total') or '0')>=10000 then return cjson.encode({error='VOTE_LIMIT'}) end
 if old~=next then
  if old then redis.call('HINCRBY',KEYS[1],'c:'..old,-1);redis.call('HINCRBY',KEYS[1],'total',-1) end
  if next=='remove' then redis.call('HDEL',KEYS[1],field) else redis.call('HSET',KEYS[1],field,next);redis.call('HINCRBY',KEYS[1],'c:'..next,1);redis.call('HINCRBY',KEYS[1],'total',1) end
 end
 redis.call('EXPIRE',KEYS[1],2592000)
 return cjson.encode(summary(KEYS[1],ARGV[1]))`;
async function evalRedis(script:string,keys:string[],args:string[],signal:AbortSignal){
 const c=redisConfig();if(!c)throw new Error('NOT_CONFIGURED');
 const r=await fetch(c.url,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:JSON.stringify(['EVAL',script,String(keys.length),...keys,...args]),signal,cache:'no-store',redirect:'error'});
 const d=await r.json();if(!r.ok||d.error||typeof d.result!=='string')throw new Error('STORAGE_FAILED');return JSON.parse(d.result);
}
export async function readRecommendations(products:unknown[],voter:string,signal:AbortSignal){
 if(!Array.isArray(products)||!products.length||products.length>100)throw new Error('INVALID_PRODUCTS');
 const identities=products.map(productIdentity);const result=await evalRedis(queryScript,identities.map(key),[voter],signal);
 if(!Array.isArray(result)||result.length!==identities.length)throw new Error('STORAGE_FAILED');
 return Object.fromEntries(identities.map((p,i)=>[p.store+':'+p.id,parseRecommendation(result[i])]));
}
export async function saveRecommendation(product:unknown,reason:unknown,voter:string,signal:AbortSignal){
 const p=productIdentity(product);if(!(reason==='remove'||isRecommendationReason(reason)))throw new Error('INVALID_REASON');
 const result=await evalRedis(voteScript,[key(p),`taseera:rec:{${version}}:rate:${voter}`],[voter,reason as RecommendationReason],signal);
 if(result.error)throw new Error(result.error);return parseRecommendation(result);
}

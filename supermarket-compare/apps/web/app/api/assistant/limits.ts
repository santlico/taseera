import {createHash,createHmac} from 'node:crypto';
import {redisConfig} from '../recommendations/storage';
export const assistantAvailable=()=>!!process.env.OPENAI_API_KEY&&(!!redisConfig()||process.env.NODE_ENV==='development');
const local=new Map<string,{count:number;until:number}>();
async function redis(command:unknown[],signal:AbortSignal){const c=redisConfig();if(!c)throw Error('AI_STORAGE_UNAVAILABLE');const r=await fetch(c.url,{method:'POST',headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.any([signal,AbortSignal.timeout(4000)]),cache:'no-store',redirect:'error'});const d=await r.json();if(!r.ok||d.error)throw Error('AI_STORAGE_UNAVAILABLE');return d.result;}
export function cacheKey(input:unknown){return 'taseera:assistant:v1:'+createHash('sha256').update(JSON.stringify([process.env.VERCEL_DEPLOYMENT_ID||'local',process.env.OPENAI_MODEL||'gpt-4.1-mini',input])).digest('hex');}
export async function readCache(key:string,signal:AbortSignal){if(!redisConfig())return null;const raw=await redis(['GET',key],signal);if(!raw)return null;try{return JSON.parse(raw);}catch{return null;}}
export async function writeCache(key:string,answer:unknown,signal:AbortSignal){if(redisConfig())await redis(['SET',key,JSON.stringify(answer),'EX',180],signal);}
export async function reserveUsage(request:Request,signal:AbortSignal){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0].trim()||'local';
 const hash=createHmac('sha256',process.env.OPENAI_API_KEY||'local').update(ip).digest('hex');
 const daily=Number(process.env.AI_DAILY_LIMIT||'100');if(!Number.isInteger(daily)||daily<1||daily>10000)throw Error('AI_STORAGE_UNAVAILABLE');
 const keys=[`taseera:ai:{limits}:visitor:${hash}`,`taseera:ai:{limits}:daily:${day}`];
 if(redisConfig()){
  const script="local a=tonumber(redis.call('GET',KEYS[1]) or '0');local b=tonumber(redis.call('GET',KEYS[2]) or '0');if a>=3 then return 'RATE_LIMIT' end;if b>=tonumber(ARGV[1]) then return 'DAILY_LIMIT' end;local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],300) end;local d=redis.call('INCR',KEYS[2]);if d==1 then redis.call('EXPIRE',KEYS[2],172800) end;return 'OK'";
  const result=await redis(['EVAL',script,'2',...keys,String(daily)],signal);if(result!=='OK')throw Error(result==='DAILY_LIMIT'?'DAILY_LIMIT':'RATE_LIMIT');return;
 }
 if(process.env.NODE_ENV!=='development')throw Error('AI_STORAGE_UNAVAILABLE');
 const now=Date.now();for(const [key,value] of local)if(value.until<=now)local.delete(key);
 const counts=keys.map((key,i)=>local.get(key)||{count:0,until:now+(i?172800000:300000)});
 if(counts[0].count>=3)throw Error('RATE_LIMIT');if(counts[1].count>=daily)throw Error('DAILY_LIMIT');keys.forEach((key,i)=>{counts[i].count++;local.set(key,counts[i]);});
}

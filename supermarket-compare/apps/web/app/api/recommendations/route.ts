import {readRecommendations,redisConfig,saveRecommendation,version,visitor} from './storage';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(){return Response.json({available:!!redisConfig(),version},{headers});}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'INVALID_ORIGIN'},{status:403,headers});
 const config=redisConfig();if(!config)return Response.json({available:false,version,error:'UNAVAILABLE'},{status:503,headers});
 const user=visitor(request,config.token);const responseHeaders={...headers,...(user.cookie?{'Set-Cookie':user.cookie}:{})};
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_BODY');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32000){await reader.cancel();throw new Error('INVALID_BODY');}chunks.push(value);}}finally{reader.releaseLock();}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('INVALID_BODY');}if(!data||!['query','vote'].includes(data.action))throw new Error('INVALID_ACTION');const signal=AbortSignal.any([request.signal,AbortSignal.timeout(6000)]);
  const result=data.action==='query'?{votes:await readRecommendations(data.products,user.hash,signal)}:data.action==='vote'?{vote:await saveRecommendation(data.product,data.reason,user.hash,signal)}:null;
  if(!result)throw new Error('INVALID_ACTION');return Response.json({available:true,version,...result},{headers:responseHeaders});
 }catch(e){const error=e instanceof Error?e.message:'';const status=error==='RATE_LIMIT'?429:error.startsWith('INVALID_')?400:503;return Response.json({error:status===429?'RATE_LIMIT':status===400?'INVALID_REQUEST':'UNAVAILABLE',available:status!==503,version},{status,headers:responseHeaders});}
}

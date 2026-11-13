import {readRecommendations,recommendationConfig,saveRecommendation,version,visitor} from './storage';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(){const config=recommendationConfig();return Response.json({available:!!config,local:!!config&&'local' in config,version},{headers});}
export async function POST(request:Request){
 // Next can normalize 127.0.0.1 to localhost internally; compare the browser's
 // origin with the incoming Host, not that internal URL. A browser cannot forge Host.
 const expected=new URL(request.url),host=request.headers.get('host');if(host)expected.host=host;
 if(request.headers.get('origin')!==expected.origin)return Response.json({error:'INVALID_ORIGIN'},{status:403,headers});
 const config=recommendationConfig();if(!config)return Response.json({available:false,version,error:'UNAVAILABLE'},{status:503,headers});
 const user=visitor(request,config.token);const responseHeaders={...headers,...(user.cookie?{'Set-Cookie':user.cookie}:{})};
 try{
  const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_BODY');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32000){await reader.cancel();throw new Error('INVALID_BODY');}chunks.push(value);}}finally{reader.releaseLock();}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('INVALID_BODY');}if(!data||!['query','vote'].includes(data.action))throw new Error('INVALID_ACTION');const signal=AbortSignal.any([request.signal,AbortSignal.timeout(6000)]);
  const result=data.action==='query'?{votes:await readRecommendations(data.products,user.hash,signal)}:data.action==='vote'?{vote:await saveRecommendation(data.product,data.reason,user.hash,signal)}:null;
  if(!result)throw new Error('INVALID_ACTION');return Response.json({available:true,local:'local' in config,version,...result},{headers:responseHeaders});
 }catch(e){const error=e instanceof Error?e.message:'';const status=error==='RATE_LIMIT'?429:error.startsWith('INVALID_')?400:503;return Response.json({error:status===429?'RATE_LIMIT':status===400?'INVALID_REQUEST':'UNAVAILABLE',available:status!==503,version},{status,headers:responseHeaders});}
}

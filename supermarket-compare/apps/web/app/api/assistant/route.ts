import {assistantAvailable,cacheKey,readCache,reserveUsage,writeCache} from './limits';
import {runAssistant,validateInput} from './engine';
export const runtime='nodejs';export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
export async function GET(){return Response.json({available:assistantAvailable()},{headers});}
export async function POST(request:Request){
 const expected=new URL(request.url),host=request.headers.get('host');if(host)expected.host=host;
 if(request.headers.get('origin')!==expected.origin)return Response.json({error:'طلب غير مسموح.'},{status:403,headers});
 if(!assistantAvailable())return Response.json({error:'مساعد تسعيرة قيد التجهيز حاليًا. البحث والمقارنة متاحان كالمعتاد.'},{status:503,headers});
 try{
  const reader=request.body?.getReader();if(!reader)throw Error('INVALID_INPUT');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw Error('INVALID_INPUT');}chunks.push(value);}}finally{reader.releaseLock();}
  let data;try{data=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('INVALID_INPUT');}
  const input=validateInput(data),signal=AbortSignal.any([request.signal,AbortSignal.timeout(40000)]),key=cacheKey(input);
  const cached=await readCache(key,signal);if(cached)return Response.json({...cached,cached:true},{headers});
  await reserveUsage(request,signal);const answer=await runAssistant(input,signal);
  try{await writeCache(key,answer,signal);}catch{/* A completed answer is still usable if cache write fails. */}
  return Response.json({...answer,cached:false},{headers});
 }catch(error){const code=error instanceof Error?error.message:'';const status=code==='INVALID_INPUT'?400:code==='RATE_LIMIT'||code==='DAILY_LIMIT'?429:503;
  console.warn('Assistant request failed',{code:['INVALID_INPUT','RATE_LIMIT','DAILY_LIMIT','SOURCES_UNAVAILABLE','AI_STORAGE_UNAVAILABLE','AI_UNAVAILABLE','AI_INVALID_OUTPUT'].includes(code)?code:'UNEXPECTED_FAILURE'});
  const message=code==='INVALID_INPUT'?'راجع عبارة البحث والميزانية والمتاجر المحددة.':code==='RATE_LIMIT'?'استخدمت المساعد عدة مرات. حاول بعد خمس دقائق.':code==='DAILY_LIMIT'?'وصل المساعد لحد الاستخدام اليومي. تقدر تكمل البحث والمقارنة.':code==='SOURCES_UNAVAILABLE'?'تعذّر تحديث نتائج المتاجر. حاول لاحقًا؛ نتائج بحثك الحالية ما زالت متاحة.':'تعذّر تجهيز الاقتراحات الآن. نتائج البحث والمقارنة ما زالت متاحة.';
  return Response.json({error:message},{status,headers});
 }
}

export const validGoldenscentImagePath=(path:string)=>/^[a-zA-Z0-9_-]{1,4}\/[a-zA-Z0-9_-]{1,4}\/[a-zA-Z0-9_().-]{1,300}\.(png|jpe?g|webp)$/i.test(path);
import {Agent} from 'undici';
const dispatcher=new Agent({connect:{family:4}});
const maxBytes=2*1024*1024;

/** Fixed CDN/path/transform: this is deliberately not a general URL proxy. */
export async function fetchGoldenscentImage(id:string,signal:AbortSignal):Promise<{bytes:Uint8Array;type:string}> {
  if(!validGoldenscentImagePath(id)) throw new Error('Invalid image ID');
  const url=`https://assets.goldenscent.com/catalog/product/${id}`;
  const response=await fetch(url,{dispatcher,signal,redirect:'error',headers:{Accept:'image/webp,image/png,image/jpeg','User-Agent':'Taseera/1.0'}} as RequestInit & {dispatcher:Agent});
  const type=response.headers.get('content-type')?.split(';')[0].trim();
  if(!response.ok || !['image/webp','image/png','image/jpeg'].includes(type??'') || !response.body || Number(response.headers.get('content-length'))>maxBytes) {
    await response.body?.cancel();throw new Error('Invalid upstream image');
  }
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];let size=0;
  try {
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>maxBytes)throw new Error('Image too large');chunks.push(value);}
  } catch(error){await reader.cancel();throw error;} finally{reader.releaseLock();}
  const bytes=Buffer.concat(chunks,size);
  const valid=type==='image/webp'?bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP':
    type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!valid)throw new Error('Invalid image signature');
  return {bytes:new Uint8Array(bytes),type:type!};
}

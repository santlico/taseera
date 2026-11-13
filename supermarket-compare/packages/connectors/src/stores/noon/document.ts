import https from 'node:https';
import {setTimeout as delay} from 'node:timers/promises';

// Public SSR document via ordinary Node HTTP/1.1. No sessions, challenge
// tokens, or private catalog APIs. Fetch/Undici returned challenge HTML here.
export async function fetchNoonDocument(url:URL,signal:AbortSignal):Promise<string> {
  if(url.origin!=='https://minutes.noon.com' || url.pathname!=='/saudi-ar/search/' || url.username || url.password) throw new Error('Invalid Noon search URL');
  for(let attempt=0;;attempt++) {
    signal.throwIfAborted();
    try {
      return await new Promise<string>((resolve,reject)=>{
        const request=https.get(url,{signal,...(attempt?{family:4}:{}),headers:{Accept:'text/html','Accept-Language':'ar-SA,ar;q=0.9','User-Agent':'Taseera/1.0'}},response=>{
          const chunks:Buffer[]=[];let bytes=0;
          response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>4*1024*1024){response.destroy(new Error('Noon document exceeds size limit'));return;}chunks.push(chunk);});
          response.on('error',reject);
          response.on('end',()=>{
            if(response.statusCode!==200){reject(new Error(`Noon search HTTP ${response.statusCode}`));return;}
            if(!response.headers['content-type']?.includes('text/html')){reject(new Error('Noon search is not HTML'));return;}
            resolve(Buffer.concat(chunks).toString('utf8'));
          });
        });
        request.on('error',reject);
      });
    } catch(error) {
      const code=(error as NodeJS.ErrnoException)?.code;
      if(attempt || signal.aborted || !['ECONNRESET','ETIMEDOUT','EAI_AGAIN'].includes(code??''))throw error;
      await delay(150,undefined,{signal});
    }
  }
}

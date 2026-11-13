import https from 'node:https';
import {setTimeout as delay} from 'node:timers/promises';

// Public Saudi search document, bounded size and caller deadline.
// IPv4 avoids an observed first-connect IPv6 timeout on the development host.
export async function fetchGoldenscentDocument(url:URL,signal:AbortSignal):Promise<string> {
  if(url.origin!=='https://www.goldenscent.com' || url.pathname!=='/search' || url.searchParams.get('___store')!=='ar_sa' || url.username || url.password) throw new Error('Invalid Golden Scent search URL');
  for(let attempt=0;;attempt++) {
    signal.throwIfAborted();
    try {
      return await new Promise<string>((resolve,reject)=>{
        const request=https.get(url,{signal,family:4,headers:{Accept:'text/html','Accept-Language':'ar-SA,ar;q=0.9','User-Agent':'Taseera/1.0'}},response=>{
          const chunks:Buffer[]=[];let bytes=0;
          response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>5*1024*1024){response.destroy(new Error('Golden Scent document exceeds size limit'));return;}chunks.push(chunk);});
          response.on('error',reject);
          response.on('end',()=>{
            if(response.statusCode!==200){reject(new Error(`Golden Scent search HTTP ${response.statusCode}`));return;}
            if(!response.headers['content-type']?.includes('text/html')){reject(new Error('Golden Scent search is not HTML'));return;}
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

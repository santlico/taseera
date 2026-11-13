import https from 'node:https';

/** Ordinary HTTP/1.1 document transport, without Fetch instrumentation. */
export function fetchLemonDocument(url:URL,signal:AbortSignal):Promise<string>{
  return new Promise((resolve,reject)=>{
    const request=https.get(url,{signal,headers:{Accept:'text/html','Accept-Language':'ar-SA,ar;q=0.9','User-Agent':'Taseera/1.0',Cookie:'language=ar; currency=SAR'}},response=>{
      const chunks:Buffer[]=[];let bytes=0;
      response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>4*1024*1024){response.destroy(new Error('Lemon document too large'));return;}chunks.push(chunk);});
      response.on('error',reject);
      response.on('end',()=>{if(response.statusCode!==200){reject(new Error(`Lemon document HTTP ${response.statusCode}`));return;}resolve(Buffer.concat(chunks).toString('utf8'));});
    });
    request.on('error',reject);
  });
}

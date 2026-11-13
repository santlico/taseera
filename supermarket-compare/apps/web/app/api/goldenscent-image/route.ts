import {fetchGoldenscentImage,validGoldenscentImagePath} from '@market/connectors';
export const runtime='nodejs';

export async function GET(request:Request) {
  const id=new URL(request.url).searchParams.get('path')??'';
  if(!validGoldenscentImagePath(id)) return new Response(null,{status:400});
  try {
    const {bytes,type}=await fetchGoldenscentImage(id,AbortSignal.any([request.signal,AbortSignal.timeout(6000)]));
    return new Response(bytes as Uint8Array<ArrayBuffer>,{headers:{'Content-Type':type,'Content-Length':String(bytes.byteLength),
      'Cache-Control':'public, max-age=86400, s-maxage=604800','X-Content-Type-Options':'nosniff'}});
  } catch {
    return new Response(null,{status:502,headers:{'Cache-Control':'no-store'}});
  }
}

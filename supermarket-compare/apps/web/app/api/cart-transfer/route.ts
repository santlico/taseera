import {prepareStoreCart} from '@market/connectors';
export const runtime='nodejs';
export const maxDuration=45;
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'INVALID_ORIGIN'},{status:403,headers});
 try{
  const text=await request.text();if(text.length>8000)return Response.json({error:'INVALID_CART'},{status:400,headers});
  const data=JSON.parse(text);
  return Response.json(await prepareStoreCart(data.store,data.items,AbortSignal.any([request.signal,AbortSignal.timeout(30000)])),{headers});
 }catch(e){
  const message=e instanceof Error?e.message:'';const itemId=message.startsWith('ITEM_REQUIRES_REVIEW:')?message.split(':')[1]:undefined;
  return Response.json({error:message==='INVALID_CART'?'INVALID_CART':'STORE_CART_FAILED',...(itemId?{itemId}:{})},{status:message==='INVALID_CART'?400:502,headers});
 }
}

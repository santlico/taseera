import {parseRecommendation,type ProductRecommendation} from '../../../packages/core/src/recommendations';

export async function loadRecommendationBatch(products:{store:string;id:string}[],signal:AbortSignal){
 let failure:unknown;
 for(let attempt=0;attempt<2;attempt++){
  signal.throwIfAborted();
  try{
   const response=await fetch('/api/recommendations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'query',products}),signal:AbortSignal.any([signal,AbortSignal.timeout(8000)]),cache:'no-store'});
   const data=await response.json();if(!response.ok||!data.available)throw new Error('unavailable');
   const votes:Record<string,ProductRecommendation>={};
   for(const product of products){const key=product.store+':'+product.id;votes[key]=parseRecommendation(data.votes?.[key]);}
   return {votes,local:data.local===true};
  }catch(error){failure=error;signal.throwIfAborted();}
 }
 throw failure;
}

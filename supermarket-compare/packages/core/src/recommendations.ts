export const recommendationReasons={general:'أوصي فيه',value:'سعره مناسب',tried:'جرّبته وأعجبني',discover:'يستحق التجربة'} as const;
export type RecommendationReason=keyof typeof recommendationReasons;
export interface ProductRecommendation {total:number;mine:RecommendationReason|null;reasons:Record<RecommendationReason,number>}
export const emptyRecommendation=():ProductRecommendation=>({total:0,mine:null,reasons:{general:0,value:0,tried:0,discover:0}});
export function isRecommendationReason(value:unknown):value is RecommendationReason{return typeof value==='string'&&Object.hasOwn(recommendationReasons,value);}
export function parseRecommendation(value:unknown):ProductRecommendation{
 const d=value as any;if(!d||!Number.isInteger(d.total)||d.total<0||d.total>10000||!(d.mine===false||d.mine===null||isRecommendationReason(d.mine)))throw new Error('Invalid recommendation');
 const reasons={} as Record<RecommendationReason,number>;
 for(const reason of Object.keys(recommendationReasons) as RecommendationReason[]){const n=d.reasons?.[reason];if(!Number.isInteger(n)||n<0)throw new Error('Invalid recommendation count');reasons[reason]=n;}
 if(Object.values(reasons).reduce((a,b)=>a+b,0)!==d.total||(d.mine&&reasons[d.mine as RecommendationReason]<1))throw new Error('Inconsistent recommendation');
 return {total:d.total,mine:d.mine||null,reasons};
}

// Conservative, local interpretation: never guess a brand, model or medical alternative.
export interface SearchIntent {original:string;query:string;need:string;budget:number|null}
export function parseSearchIntent(value:string):SearchIntent {
 const original=value.trim().slice(0,200);
 const normalized=original.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
 const match=normalized.match(/(?:تحت|أقل من|اقل من|بحد أقصى|بحد اقصى|بميزانية|ميزانيتي|ميزانية)\s*(\d+(?:[.٫]\d{1,2})?)\s*(?:ريال|ر\.س|SAR)?/i);
 const amount=match?Number(match[1].replace('٫','.')):null;
 const budget=amount!==null&&amount>0&&amount<=1000000?amount:null;
 // Retain the original spelling of product names and numbers (e.g. iPhone 17, 256 GB).
 let query=budget!==null?original.slice(0,match!.index)+original.slice(match!.index!+match![0].length):original;
 query=query.replace(/^(?:أبي|ابي|أبغى|ابغى|أريد|اريد|ابحث عن)\s+/,'').trim();
 const usage=query.match(/\s+(?:للدوام|للعمل|للجامعة|للسفر|للرياضة)(?:\s|$)/);
 if(usage)query=query.slice(0,usage.index)+' '+query.slice(usage.index!+usage[0].length);
 query=query.replace(/\s+/g,' ').trim();
 return {original,query:query||original,need:original,budget};
}

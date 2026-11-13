import type { Product } from './index';

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[٠-٩۰-۹]/g, d => String('٠١٢٣٤٥٦٧٨٩'.includes(d) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/٫/g, '.').replace(/[^؀-ۿ\p{L}\d.×*]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

const aliases: [RegExp, string][] = [
  [/\b(almarai|al marai)\b|المراعي/g, 'المراعي'], [/\bsadia\b|ساديا/g, 'ساديا'],
  [/\bpepsi\b|بيبسي/g, 'بيبسي'], [/\b(coca cola|cocacola)\b|كوكا كولا/g, 'كوكاكولا'],
  [/\brainbow\b|رينبو/g, 'رينبو'], [/\bnadec\b|نادك/g, 'نادك'], [/\bnido\b|نيدو/g, 'نيدو'],
  [/\bpanadol\b|بانادول|بنادول/g, 'بانادول'], [/\bcetaphil\b|سيتافيل/g, 'سيتافيل'],
  [/\bmilk\b|حليب/g, 'حليب'], [/\bchicken\b|دجاج/g, 'دجاج'], [/\bbreasts?\b|صدور/g, 'صدور'],
  [/\bfull fat\b|كامل الدسم/g, 'كاملدسم'], [/\blow fat\b|قليل الدسم/g, 'قليلدسم'],
  [/\b(skimmed|skim|fat free)\b|خالي الدسم/g, 'خاليدسم'],
  [/\b(diet|zero sugar|sugar free)\b|دايت|زيرو|خالي من السكر|بدون سكر/g, 'بدونسكر'],
  [/\bfresh\b|طازج[ه]?/g, 'طازج'], [/\bfrozen\b|مجمد[ه]?/g, 'مجمد'],
];

function tokens(value: string): string[] {
  let text = normalizeText(value);
  for (const [pattern, replacement] of aliases) text = text.replace(pattern, replacement);
  return text.split(' ').filter(t => t.length > 1 && !/^(من|مع|في|عبوه|عبوات|the|of|and|pack|قطع[ه]?)$/.test(t));
}

const measurementPattern = /(\d+(?:[.,]\d+)?)\s*(كيلوغرام|كيلوجرام|كيلو|كجم|كغم|kg|جرام|غرام|غم|جم|grams?|g|ملليلترات|مليلترات|مليليترات|ملليلتر|مليلتر|مليليتر|millilit(?:er|re)s?|ml|ملل|مل|ليترات|لترات|ليتر|لتر|lit(?:er|re)s?|ltr|l)(?![a-z؀-ۿ])/gi;

export interface ProductFacts {
  amount?: number;
  unit?: 'kg' | 'l';
  packCount?: number;
  totalAmount?: number;
  label?: string;
  unitPrice?: number;
  unitLabel?: string;
}

/** Conservative extraction: missing or ambiguous quantity is left unknown. */
export function productFacts(product: Pick<Product, 'name' | 'size' | 'price'>): ProductFacts {
  const text = normalizeText((product.size || product.name).replace(/(\d),(\d)/g, '$1.$2'));
  const pattern = measurementPattern;
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return {};
  const quantities = matches.map(m => {
    const raw = m[2];
    const volume = /^(مل|مليل|مليلي|mill|ml|ليتر|ليترات|لتر|لترات|lit|ltr|l$)/i.test(raw);
    const small = /^(جرام|غرام|غم|جم|gram|g$|مل|مليل|مليلي|mill|ml)/i.test(raw);
    return {amount: Number(m[1].replace(',', '.')) / (small ? 1000 : 1), unit: volume ? 'l' as const : 'kg' as const};
  });
  const first = quantities[0];
  if (!Number.isFinite(first.amount) || first.amount <= 0 || quantities.some(q => q.unit !== first.unit || q.amount !== first.amount)) return {};
  const before = text.slice(0, matches[0].index);
  const after = text.slice(matches[0].index! + matches[0][0].length);
  const counts = [
    before.match(/(\d+)\s*[×*x]\s*$/)?.[1], after.match(/^\s*[×*x]\s*(\d+)/)?.[1],
    text.match(/(?:pack of|عبوه من|عبوات من|كرتون من|من)\s*(\d+)\s*(?:قطع|عبو|حبه|bottles|cans|pieces)/)?.[1],
    text.match(/(\d+)\s*(?:عبو[ه]|عبوات|قطع[ه]?|حبات|bottles|cans|pieces|count|ct)/)?.[1],
    text.match(/(?:pack of|عدد العبوات)\s*(\d+)/)?.[1],
  ].filter((c): c is string => !!c).map(Number);
  if (new Set(counts).size > 1) return {};
  // Do not silently treat an uncounted multipack as a single item.
  if (!counts.length && /كرتون|عبوات|حبات|multipack|\bpack\b|\bcartons?\b|\bbottles\b|\bcans\b/.test(text)) return {};
  const packCount = counts[0] ?? 1;
  if (!Number.isInteger(packCount) || packCount < 1 || packCount > 1000) return {};
  const totalAmount = first.amount * packCount;
  const amountLabel = first.unit === 'kg' ? (first.amount < 1 ? `${first.amount * 1000} جم` : `${first.amount} كجم`) : (first.amount < 1 ? `${first.amount * 1000} مل` : `${first.amount} لتر`);
  return {...first, packCount, totalAmount, label: packCount > 1 ? `${packCount} × ${amountLabel}` : amountLabel,
    unitPrice: product.price / totalAmount, unitLabel: first.unit === 'kg' ? 'ر.س / كجم' : 'ر.س / لتر'};
}

/** Relevance is a search aid, never an assertion of identical products. */
export function searchRelevance(product: Product, query: string): number {
  // Pharmacy search is conservative about explicit numbers (strength, count,
  // stage). This is a literal search filter, not clinical equivalence.
  if(product.store==='nahdi'||product.store==='aldawaa'){
    const wanted=normalizeText(query).match(/\d+(?:\.\d+)?/g)??[];
    const present=new Set(normalizeText(product.name).match(/\d+(?:\.\d+)?/g)??[]);
    if(wanted.some(n=>!present.has(n)))return 0;
  }
  const queryTokens = [...new Set(tokens(query).filter(t => !/^\d/.test(t)))];
  const desired = productFacts({name: query, price: 1});
  const actual = productFacts(product);
  if (desired.totalAmount && !actual.totalAmount) return 0.4;
  if (desired.totalAmount && actual.totalAmount && (desired.unit !== actual.unit || Math.abs(desired.totalAmount - actual.totalAmount) > 0.001 || desired.packCount !== actual.packCount || Math.abs(desired.amount! - actual.amount!) > 0.001)) return 0;
  if (!queryTokens.length) return 1;
  const title = tokens(`${product.name} ${product.brand || ''}`).join(' ');
  const matches = queryTokens.filter(t => title.includes(t)).length;
  const brand = queryTokens.find(t => /^(المراعي|ساديا|بيبسي|كوكاكولا|رينبو|نادك|نيدو)$/.test(t));
  if (brand && !title.includes(brand)) return 0;
  return matches / queryTokens.length;
}

export function comparisonWarning(products: Product[]): string {
  const facts = products.map(productFacts);
  if (facts.some(f => !f.totalAmount)) return 'بعض الأحجام غير واضحة. راجع وصف المنتج قبل مقارنة الأسعار.';
  if (new Set(facts.map(f => f.unit)).size > 1) return 'وحدات القياس مختلفة؛ سعر الوحدة لا يصلح للمقارنة بين هذه المنتجات.';
  if (new Set(facts.map(f => `${f.amount}:${f.packCount}`)).size > 1) return 'الأحجام أو عدد العبوات مختلفة. استخدم سعر الوحدة للمقارنة وراجع النوع.';
  const types = products.map(p => tokens(p.name).filter(t => /^(كاملدسم|قليلدسم|خاليدسم|بدونسكر|طازج|مجمد|المراعي|نادك|ساديا|بيبسي|كوكاكولا|رينبو|نيدو)$/.test(t)).sort().join(':'));
  if (new Set(types).size > 1) return 'العلامة أو النوع مختلفان أو غير واضحين. توافق الحجم وحده لا يعني تطابق المنتج.';
  return 'الحجم وعدد العبوات متوافقان حسب الاسم. تأكد من العلامة والنوع قبل الشراء.';
}


/** Search upstream by product words; quantity is verified against returned offers. */
export function sourceSearchTerm(value: string): string {
  if (!productFacts({name:value,price:1}).totalAmount) return value;
  const text = value.replace(/[٠-٩۰-۹]/g, d => String('٠١٢٣٤٥٦٧٨٩'.includes(d) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(d) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٫/g,'.').replace(/(\d),(\d)/g,'$1.$2');
  const broad = text.replace(measurementPattern,' ')
    .replace(/\d+\s*[×*x]|[×*x]\s*\d+/g,' ')
    .replace(/(?:pack of|عبو[هة] من|عبوات من|كرتون من|عدد العبوات)\s*\d+/gi,' ')
    .replace(/\d+\s*(?:عبو[هة]|عبوات|قطع[هة]?|حبات|bottles|cans|pieces|count|ct)/gi,' ')
    .replace(/\s+/g,' ').trim();
  return broad || value;
}

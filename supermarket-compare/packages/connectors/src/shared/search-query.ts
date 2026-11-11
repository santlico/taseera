function normalize(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit) >= 0 ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
}
const weightPattern = /(\d+(?:[.,٫]\d+)?)\s*(كيلوغرام|كيلوجرام|كيلو|كجم|كغم|kg|غرام|جرام|غم|جم|gram|g)(?![a-z])/i;
export function parseWeight(text: string): { grams: number; term: string } | null {
  const normalized = normalize(text);
  const match = normalized.match(weightPattern);
  if (!match) return null;
  const kilograms = /^(كيلو|كجم|كغم|kg)/i.test(match[2]);
  const amount = Number(match[1].replace(/[,٫]/g, '.'));
  return { grams: amount * (kilograms ? 1000 : 1), term: normalized.replace(weightPattern, ' ').replace(/\s+/g, ' ').trim() };
}
export function matchesWeight(name: string, grams: number): boolean {
  const found = parseWeight(name);
  const packCount = normalize(name).match(/(\d+)\s*[*×x]\s*\d/i);
  const totalGrams = found ? found.grams * (packCount ? Number(packCount[1]) : 1) : null;
  return totalGrams !== null && Math.abs(totalGrams - grams) < 0.01;
}

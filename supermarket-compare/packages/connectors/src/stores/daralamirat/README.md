# Dar Al Amirat — beauty retailer

This is a beauty/personal-care retailer, not a pharmacy. Listed in the new
beauty search scope and all sources, never in grocery/pharmacy source scopes.

Uses the exact public Lableb settings/search service called by the storefront's
extension (store 1945128061): settings at
`https://api-debugging.lableb.com/v2/projects/salla_1945128061/settings`, then
`https://api.lableb.com/v2/projects/salla_1945128061/indices/index/search/default`.
The public search key is discovered per search; no login, customer session,
indexing key or feedback/analytics calls. Settings must retain the same project
and isTax:true. Search Arabic q, limit 20, status:sale, is_available:true.

Read is_sale/sale_price versus regular price; no tax multiplication or discount
arithmetic. Verified Cetaphil 453g at 79.60 SAR against the actual product page's
visible price and JSON-LD (valueAddedTaxIncluded:true), 2026-11-13. Hidden and
non-Arabic products are excluded. Product ID must match the observed /ar/.../p<ID>
URL; images must belong to the store's cdn.salla.sa/onqKZz/ prefix.

Scope: first 20 published, available Saudi catalog offers, no delivery address.
Explicit is_available maps stock. API/shape/price failures remain errors;
legitimate empty results return []. Shares normal deadline/retry and validation.

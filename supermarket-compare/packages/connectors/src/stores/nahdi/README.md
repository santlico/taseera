# Nahdi Pharmacy

Public Saudi Arabic search: https://www.nahdionline.com/ar-sa/search?query=...
Verified against native browser listings on 2026-11-13. The SSR HTML includes
20 product cards; no login, Algolia credentials, location cookies, or browser
automation are required by this connector. Use the common bounded/retrying
document transport and preserve the complete query (including strength/volume).

Validate the JSON-LD BreadcrumbList search URL and original query. Read only
`.js-plp-product` cards, their observed `/ar-sa/<slug>/pdp/<numeric ID>` links,
`.line-clamp-3` full product names, and a non-struck price containing the SAR
symbol. Remove SVG/style markup before reading the numeric current price.
Never subtract promotions or mistake the struck regular price for an offer.
Product images use the observed ecombe.nahdionline.com catalog thumbnail URLs.

Scope: first page of the public Saudi online catalog, potentially including
Global products. The delivery address and shipping method are unspecified.
SSR add-to-cart controls are hydration placeholders, so availability stays
unknown. Pricing, stock and shipping eligibility need confirmation at Nahdi.

Missing search context, changed price/link markup and HTTP errors fail visibly.
An empty result requires both valid search context and the explicit visible
Arabic no-results message; a blank page is never a successful empty search.

The UI labels the source as a pharmacy, retains full product names and compares
package prices. Pharmacy comparisons do not assert therapeutic alternatives or
an automatic unit-price winner; users must review strength, form and count.
Numeric search terms are retained and checked literally for search relevance.

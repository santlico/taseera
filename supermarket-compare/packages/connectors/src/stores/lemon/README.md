# Lemon Pharmacy

Uses the public Arabic storefront search route observed in its search handler:
https://lemon.sa/index.php?route=product/search&search=... . No login, API key,
location cookie or browser session. Verified live on 2026-11-13.

Validate `#content h1` against the original query, then read only
`#content .main-products .product-thumb` (not home-page recommendation modules).
Use numeric product_id, full .name link text, and observed same-origin SEO URL
or validated product/product route with matching ID. No upstream scripts run.

Price is .price-new when present, otherwise .price-normal. Strip SVG markup,
parse positive finite numeric SAR, and never use .price-old or .price-tax (the
explicit VAT-exclusive amount). Images use real data-src before placeholder
src; reject transparent loading placeholders and unapproved source hosts.

First result page only. Stock remains unknown because an add-to-cart control
does not establish address-specific inventory. Scope is Saudi public online
catalog without selected address. Full original query retained, including
strength/count; conservative pharmacy comparisons stay unchanged.

Missing context/listing or invalid prices are errors. Empty results require the
explicit visible "لا يوجد أي منتجات تطابق معايير البحث" message. Shares existing
retry/deadline and product validation; source price and delivery confirmed there.

## Deployment status

Temporarily disabled in connector registry and UI catalog at the user's request.
Live storefront parsing works locally; Vercel requests, including normal native
HTTPS and public Arabic/SAR preferences, receive HTTP 403. Do not activate until
an authorized runtime can retrieve the source reliably.

The public autocomplete index was tested as an alternative and rejected for
pricing: product 2474 showed 6.05 SAR there versus 6.95 SAR in the actual
storefront. No autocomplete-price fallback was shipped.

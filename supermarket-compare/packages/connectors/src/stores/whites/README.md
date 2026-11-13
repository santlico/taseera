# Whites Pharmacy

The supplied corporate site https://whites.com.sa/ links "Shop Now" to
https://www.whites.sa/ar-sa. Uses the same public Algolia search-only settings
as that storefront's search/page chunk, module 43152, verified 2026-11-13:
application AHYKO0TELX, index whites_extensions_prod. No customer session,
user token, private credentials, or analytics/view/click events are used.

First 20 results. Preserve original query including strength/count. Use
title_ar (English fallback), sale_price when present, otherwise price; both
must explicitly say SAR. Never derive a discount from original price.
Use explicit absolute_url/url if supplied, otherwise the exact source UI slug
function applied to the English title: lower-case, replace non-ASCII-letter/
digit runs with '-', trim edge hyphens, prefix /ar-sa/ and append '/'.
This was verified against the visible Cetaphil 453g link and 98.84 SAR price
(197.69 regular). Only approved Saudi product URLs and product CDN images.

Stock is the explicit non-negative stock field; shipping eligibility is not
inferred. Scope is the public Saudi catalog without address or delivery mode.
Shares existing retry/deadline/validation and conservative pharmacy comparison
behavior. Changed query/schema or all-invalid offers fails visibly; empty hits
is a valid empty search. Public search-key rotation requires updating settings
from the live storefront, as with any published third-party client integration.

# Al-Dawaa Pharmacy

Uses the exact anonymous catalog endpoint observed in the live storefront on
2026-11-13: `https://stgprevapi.al-dawaa.com/occ/v2/aldawaa/products/search`.
Despite its hostname, this is what the public production storefront actually
calls. Verified the first Cetaphil offer against the UI: 83.95 SAR vs 167.90
regular price. Do not use a guessed alternative API or browser session.

Request the first 16 products with `fields=FULL`, `lang=ar`, `curr=SAR`, and
the original query including strength/count. Validate freeTextSearch and
pagination. Read simulatedDiscountPrice when supplied, otherwise price;
never calculate percentage promotions. Omit hidden-price and invalid offers.
Canonical links use the observed card route `/ar/p/<code>/<urlProductName>`;
images use the Arabic (or English fallback) public `/medias/` URL on the API
host. Only explicit stock fields yield stock status; delivery is not inferred.

Shares the existing retry/deadline, validation, pharmacy selection UI and
conservative comparison behavior. Saudi online catalog scope, no user shipping
address/session. HTTP errors and invalid context fail visibly, not as empty []
unless the source explicitly returned an empty or hidden-price collection.

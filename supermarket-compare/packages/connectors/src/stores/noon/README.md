# noon Minutes (نون ماركت)

The public site at https://minutes.noon.com/saudi-ar/ renders a complete SSR
search listing at `/saudi-ar/search/?q=...`. Verified against the browser UI on
2026-11-13. Generic Fetch/Undici returned challenge HTML during inspection;
ordinary Node `https.get` returned the public HTML with actual product cards.
Use that transport directly with no login, cookies, clearance tokens, JavaScript
execution, or dependency on the site's internal serialized server functions.

Validate Saudi Arabic language and canonical query/path before reading the
`catalog-listing` / `catalog-modules` subtree. Stable data-testid attributes
identify product cards, titles, selling prices and stock notification buttons.
Read only the displayed selling-price `strong`, not the old price or percentage.
Append the separately displayed size so comparison can calculate unit prices.
Keep observed same-origin `now-product` links whose SKU matches the card ID.

Images may be preceded by chilled/category badges. Select an actual product
image belonging to the SKU on f.nooncdn.com, constrained to 320px thumbnails.
Missing images do not discard valid offers. SSR add-to-cart buttons are disabled
before hydration, so disabled does not mean out of stock. Explicit stock-notify
buttons mean out_of_stock; all other availability remains unknown.

Scope: first public Saudi catalog page, including ads and alternatives; no
user delivery address or branch is selected. Disclose this on every offer and
in the source notice. Do not silently use UAE, a user session, or other Noon
marketplace listings. Pricing and delivery eligibility require confirmation
at Noon after address selection.

Bound body to 4 MiB and obey core cancellation/10-second deadline. Retry one
transient transport failure with IPv4 inside that deadline. HTTP denials,
challenges, changed markup/context and invalid prices are errors, not empty
searches. A valid canonical listing with zero product cards returns [].

# HungerStation supermarkets

Uses the public SSR search pages linked from https://hungerstation.com/sa-ar/supermarkets/.
The UI's `?query=` parameter returns `__NEXT_DATA__.props.pageProps.productSearchResult.items`.
No account, location cookies, private API keys, or browser automation are required.

Initial bounded coverage: Al Othaim (141190, Umm Salim), Panda (142447, Al Mathar Ash Shamali),
Tamimi (169971, Al Andalus). These are the site's default Riyadh vendors, not the user's
nearest branches or all HungerStation retailers. Validate chain/vendor/city/query context;
derive and display the district from the response. Reject an unexpected default vendor.

Read up to the first 20 results per retailer (no exhaustive pagination claim). Use `price`
as delivered; never recalculate promotions from `originalPrice` or discount metadata.
Use only observed same-chain product anchors matched by SKU. IDs are vendor-qualified.
Product stock is unknown even when a vendor is open; a closed vendor is disclosed in location.
Delivery fees and address-specific eligibility/pricing must be confirmed at HungerStation.

Three branches execute concurrently with individual 7-second deadlines inside the core's
10-second limit. A failed retailer produces a visible partial-coverage notice; all failures
throw so the UI can offer retry. Legitimate empty `items` is a successful empty search.

Verified against live public search and rendered product links on 2026-11-13.
Parser, pricing, branch drift, unsafe links, partial failure, all failure, and cancellation
are covered by `packages/core/tests/hungerstation.test.ts`.

## Product images

Use the public site's 350px / quality 75 / WebP thumbnail transform rather than
multi-megabyte original assets. The web UI serves these through the same-origin
`/api/hungerstation-image?id=<asset filename>` route because direct browser CDN
connections remained pending in observed testing. The route pins the CDN and path,
rejects redirects and non-image responses, enforces a 512 KiB limit and 6-second
deadline, uses IPv4 transport, and caches successful public thumbnails. It never
forwards cookies or accepts arbitrary upstream URLs. Product image failure does
not discard an offer. Verified native browser decoding at 350x350 on mobile.

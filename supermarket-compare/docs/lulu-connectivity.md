# Lulu connectivity probe

Run `npm run probe:lulu` on a machine with Node.js 20+; optionally pass a query: `npm run probe:lulu -- "رينبو"`.

The probe sends one public search request with the RSC protocol header and ordinary language/accept headers. It identifies itself as a connectivity probe and does not copy a Chrome identity or use any personal cookies, clearance tokens, proxy rotation, retries or challenge solving. It saves only response metadata to `reports/lulu-connectivity.json`, never full response bodies or session headers.

A successful HTTP status alone does not count as success: product data must be present. Denials, network errors and unexpected empty responses stay distinct. A received payload is only a connectivity check, not a verified product mapping or price.

Run the same script on the intended deployment host before enabling the Lulu connector. Local results do not establish that a different hosting provider can access Lulu. If access remains denied, use an authorized source or arrange access with the merchant. Keep the connector disabled until live retrieval is verified.

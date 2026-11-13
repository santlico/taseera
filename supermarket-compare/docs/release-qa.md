# Product release QA — 2026-11-13

## Automated checks
- TypeScript strict check passed.
- 45 tests passed: all six connector mappings and network resilience, independent timeout/error isolation, API input boundaries, client cancellation/store scoping, product validation, Arabic/English quantity parsing, multipack differences, ambiguous quantities, unit comparison warnings, relevance and brands.
- Next.js production build passed.

## Local browser checks (real upstream products)
- Search suggestions execute immediately; results appear incrementally with a distinct state for every store.
- Six live stores returned data for Pepsi and milk; a more specific 1-liter milk search reduced displayed matches.
- Selected two real milk offers (18 × 200 ml versus 2 liters): unit prices 7.22 and 6.25 SAR/liter were displayed, with a quantity warning and explicit user-selected comparison disclaimer.
- Maximum four selections enforced; fifth disabled. Clearing comparison works.
- Store filtering showed only Carrefour offers. Ascending pack prices were monotonic. In-stock filter excluded unknown stock.
- Search without selected stores is disabled; new requests use only selected stores.
- Cancelled search marked pending stores as stopped, not out-of-stock. Retrying Danube alone yielded one completed store and left the other five stopped.
- Simulated offline mode produced six independent failures and a useful retry state; restoring network and retrying recovered six stores. Offline emulation was removed immediately after the test.
- Rapid Pepsi then Sadia search retained the latest query; stale results did not replace it.
- Shared URL copies correctly. Reload restores the query and two explicitly selected stores, without automatically fetching. Recent history and clearing the history work.
- No page horizontal overflow at 390, 768, or 1440 pixels. Comparison, result controls, and store picker tested on mobile.
- Merchant icons loaded; no client runtime errors observed in console inspection.

## Interpretation and limits
Live quantities/prices here are observations from this test run, not permanent prices. A source may change or fail independently. The tests verify bounded behavior and known cases; they do not establish exact-product identity, address-specific stock, or every possible packaging phrase. Hosted acceptance follows the GitHub-triggered Vercel deployment, independently of these local checks.

## Operational rollback
The previous published revision before this release was `3871a34`. A Vercel rollback to that deployment is possible if a production regression is found. Generated captures and reports are ignored and are not included in the source commit.


## Quantity-query retrieval regression
Hosted checking exposed that a literal query containing `1 لتر` could fail in Tamimi and miss BinDawood offers despite both sources returning milk for the base brand query. Source retrieval now removes a confidently parsed quantity, while the public response retains the original query and the UI enforces its unit, per-item amount, and pack count. Unknown quantities do not qualify as close matches to an explicitly sized query. Barcode/model-only queries and original word spelling are preserved. Local combined API verification of `حليب المراعي 1 لتر` returned successful results for all six enabled stores; dedicated regression tests cover retrieval versus comparison intent.

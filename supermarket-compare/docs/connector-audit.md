# Connector audit — 2026-11-13

Baseline: direct Node and localhost intermittently failed on Ninja and BinDawood with `fetch failed`, cause `ECONNRESET`, before parsing or the 10-second deadline. The same queries succeeded on Vercel. Amazon also exhibited local resets during follow-up tests. Explicit IPv6 requests sometimes reset while corresponding IPv4 requests succeeded; this implicates the local network path but does not prove that address family is the only cause.

Changes:
- All six enabled connectors use shared explicit headers and a search-only transport helper.
- At most two retries on known transient network errors (250 ms and 750 ms), including failures while reading the response body. Retries use an isolated IPv4 dispatcher. Normal routing remains on the initial attempt. The original per-store 10-second AbortSignal governs every attempt and delay.
- No automatic retries for HTTP denials, parsing failures, or cancellation. No stale results or placeholder prices are returned on errors.
- Ninja handles product URLs with query strings and multiple/whitespace-separated Flight chunks without executing scripts.
- Danube and BinDawood skip malformed/unsafe individual product links instead of failing an entire search. Store errors include HTTP status where available; orchestration logs include the nested network code.

Final direct-local live check (milk / Pepsi / Sadia chicken breast):
| Store | Milk | Pepsi | Chicken |
| --- | ---: | ---: | ---: |
| Danube | 35 | 32 | 17 |
| Carrefour | 60 | 60 | 60 |
| Tamimi | 34 | 42 | 11 |
| Ninja | 400 | 117 | 374 |
| BinDawood | 37 | 37 | 12 |
| Amazon | 48 | 48 | 48 |

All 18 store/query combinations succeeded. Returned records passed checks for positive finite SAR prices, nonempty IDs/names, HTTPS links, location labels, valid fetch timestamps, and duplicate IDs. The final localhost milk request also succeeded for all six enabled stores. Typecheck, 32 unit tests, and production build passed.

Limits: these checks establish observed behavior and data shape, not continuous upstream availability or independent verification of every price, delivery address, or stock flag. Results remain upstream search matches and may include alternatives and different pack sizes; exact-product matching is not implemented. Othaim, Sadhan, and Lulu remain intentionally disabled. Production comparisons in this audit used the then-current published version. These resilience changes are included in the subsequent product release; see product-plan.md and release-qa.md for release verification.

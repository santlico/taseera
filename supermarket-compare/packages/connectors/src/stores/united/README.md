# United Pharmacy

Reads the public `window.algoliaConfig` JSON literal from the Saudi Arabic
homepage, without executing scripts or persisting the public search key.
Uses the site's public Algolia search index `<indexName>_products` and guest
SAR.default price context. No account, private key, or browser session needed.
Settings are discovered each search so public key rotation is supported.

Initial scope: first 20 visible search products, Jeddah default address declared
in the storefront's instant-search config. Both Saudi guest price context and
city are validated; changed context fails instead of silently switching scope.
Validate visibility_search:1 and any allow_cities:Jeddah restriction locally. Full query retained for
pharmacy strength/count matching. Current price is price.SAR.default, not
bv_default_original or discount/offer-label arithmetic. Only observed Arabic
product URLs and product thumbnails on the approved source hosts are used.
Explicit catalog stock is shown; shipping eligibility still needs an address.

Shares existing deadline/retry/validation and pharmacy UI/comparison behavior.
Invalid payloads are errors; genuine empty hits is successful empty search.
Verified with live Saudi public catalog on 2026-11-13.

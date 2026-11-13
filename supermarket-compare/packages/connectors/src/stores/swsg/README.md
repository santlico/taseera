# Summer & Winter / الشتاء والصيف

The anonymous Arabic storefront uses Klevu search at eucs35v2.ksearchnet.com/cs/v2/search, with its public read-only key. Request only the observed productList query, first 15 records, KLEVU_PRODUCT. Do not send the storefront's wildcard productListFallback or content/analytics queries, visitor IDs, cookies or account data. Direct store pages can reject server requests; this connector uses the separate public catalog service that the storefront itself calls.

Observed 2026-11-13: Hitachi refrigerator listing shows SAR 4999 instead of old SAR 7599. Use salePrice, not price (which can be crossed out), nor monthly installments. Require both currency fields SAR, matching query and query ID, fixed Arabic product origin/path. Match explicit catalog stock values conservatively; shipping/install availability still depends on the user's address.

Klevu image URLs contain /needtochange/media/catalog/product/...; rendered storefront images remove the /needtochange prefix. Apply exactly this path correction only on the fixed swsg.co media host. Image URL was verified to return image/webp. No challenge solving, clearance cookies or proxy is required.

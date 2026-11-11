# Tamimi

Reads the public Arabic search page's `__NEXT_DATA__` JSON and maps collection products and variants. No login or personal browser state required. Uses storeSpecificData store 4 as observed in the default public response; no claim that this is the user's branch or that prices are identical across regions. The UI explicitly labels the price as the default website price, per the user's requested scope.

Selling price is `mrp - discount` (discount is a monetary amount). Stock is preserved, including out-of-stock variants. Links use the observed product slug route with Arabic locale. Missing collections cause an error rather than a false empty search.

Live verification: صدور دجاج ساديا returned 11 variants; the 1 kg reference product was SAR 27.95 and its original product page returned HTTP 200. Remote hosting is not verified. This initial connector returns the upstream first page, without pagination, precise product matching or custom branch selection.

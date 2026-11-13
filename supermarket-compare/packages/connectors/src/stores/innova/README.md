# Innova Pharmacy

Reads the public Saudi Arabic SSR search document at
https://innovapharmacy.com/search?q=... . No account, keys, location cookies,
browser session, or upstream JavaScript execution. Verified 2026-11-13.

Decode JSON strings from Next Flight push records and parse only JSON records.
Validate the root search route and original q before accepting a listing with
products and numberOfHits. First page, up to 32 products. Empty queries can
omit the listing entirely: require both correct route/query and the explicit
visible main-content no-results message in that case, never translation strings
inside scripts or a broken shell.

Use display_price, falling back only when absent to prices_with_tax.price.
These are the current VAT-inclusive single-package prices (verified Cetaphil
453g: 89.01 SAR vs 197.80 original). Do not use discounted_price blindly (it
can be zero on regular offers), rabah membership prices, percentages, or the
discount amount for a second piece. Keep the full original query including
strength/count. Actual product card uses /<innova_url>; thumbnail URLs are
provided on img.innovapharmacy.com/media//catalog/product/.

Explicit stock.is_in_stock maps availability. Scope is the Saudi public online
catalog without selected address or shipping method. Shares existing product
validation, retry/deadline and conservative pharmacy comparison behavior.

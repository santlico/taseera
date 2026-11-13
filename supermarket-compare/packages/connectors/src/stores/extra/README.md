# eXtra / إكسترا

The Saudi Arabic listing calls the public Unbxd search endpoint embedded in its storefront. First page, 24 products, type PRODUCT, Riyadh default ranking. No customer cookies, session tokens, visitor IDs or personalized tracking parameters are copied. The public read-only search key/site identifier are not account credentials.

Observed 2026-11-13: product 100462501 is SAR 5249 including VAT in the rendered Saudi listing, with old price 5699 and installment 251. Use `price`, not `wasPrice`, installments or membership pricing. Marketplace product 100460643 displays 4651 while `sellingPrice` is 4749: the card price is 4651, marked as sold by a partner. Preserve that distinction with retailer `شريك إكسترا`; final seller selection is made on extra.com. Numeric and MP-prefixed marketplace SKU URLs are supported.

Require matching query context, Saudi catalog, Online version, SAR currency and product type. Wrong context or entirely invalid offers fail visibly; explicit zero matches is valid. Images must be observed media.extra.com SKU-specific URLs. Availability remains unknown until address and delivery method are chosen. No automatic equivalence between capacities, colors, guarantees or product condition is implied.

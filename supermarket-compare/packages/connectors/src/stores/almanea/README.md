# Almanea / المنيع

Fetch the public Arabic `/search?q=...` document, then parse `__NEXT_DATA__` without executing scripts. Require page `/search`, locale `ar`, exact query and a valid `searchResults` collection. No handshake, account token, cookies, private API or user location is needed or copied.

Observed 2026-11-13: site `validateProductPrice` rounds `prices_with_tax.discounted_price || prices_with_tax.price` using Math.round. The field `price_incl_tax` is misleading for this search payload and raw `price` may be the original price: neither is used. Example 170111802030092 displays SAR 6099 from raw 6099.002001; original is 6298.998501. Search product 170111802030088 rounds 4749.005501 to displayed SAR 4749. Do not add VAT again or deduct advertised bank/coupon savings. The Saudi storefront uses SAR.

Use the observed frontend link pattern `/product/{rewrite_url}` (matching SKU); internal Magento `url` on m.dev-almanea.com is not the shopper link. Keep the entire name, including international versions and box scratches. Restrict source images to imgs.dev-almanea.com/media/catalog/product/. Stock depends on delivery region, so leave availability unknown without a selected city/address. Return first document page (24 or 32 products depending on query), not the whole catalog.

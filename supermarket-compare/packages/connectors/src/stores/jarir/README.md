# Jarir / جرير

Saudi Arabic storefront uses Constructor public autocomplete (`ac.cnstrc.com/v1/autocomplete/{term}`), with the public read-only storefront key in the connector. No customer session, visitor tracking IDs, private token or CAPTCHA solving is used. We request the same first 20 Products as the storefront autocomplete, not a complete paginated catalog.

Observed on 2026-11-13: product 689731 shows SAR 9499 including VAT, matching `data.price`, `metadata.price` and `GTM_final_price`. Product 689544 shows SAR 599 including VAT with the same agreement. Discounted product 674678 shows SAR 89 against base SAR 189: use `GTM_final_price` as the current price after validating it is positive and no greater than the agreed base fields. Products without matched terms are generic recommendations and excluded. The monthly installment is not the product price. Parse fails on wrong query context; malformed offers are skipped and an entirely invalid collection is an error. Real empty Products is valid. Stock stays unknown because the endpoint does not establish delivery availability at a selected address.

Links must match the numeric SKU on www.jarir.com and images the exact SKU under ak-asset.jarir.com. Full names retain variant/model/capacity details. Electronics comparison warns about specifications and never calculates grocery unit prices.

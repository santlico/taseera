# BinDawood

Public search-page configuration provides the Algolia endpoint and tenant filter; no personal credentials or cookies are used. Independent connector and product domain. Shared weight parsing lives in src/shared/search-query.ts.

Verified scope: district 464 (Al Mursalat, Riyadh) maps to supermarket 207 (Panorama). Price modifier precedence: 207_hd, 207_, _hd, then base price. The first page is limited to 40 hits; exact matching and pagination remain future work.

Reference: Sadia 1 kg chicken breast is SAR 21.99 with the Panorama modifier, versus a base price of 29.99. User screenshot matches the branch price. Remote hosting remains unverified.

# Amazon Saudi Arabia

Fetches the public Amazon.sa search page (`/s?k=...`) with an explicit Taseera user agent and Arabic language preference. Uses Cheerio to read search-result cards; no login, personal cookies, browser sessions, or challenge solving.

Only displayed SAR offer prices are included. Crossed-out list prices are ignored. ASINs are deduplicated; product links must be HTTPS on Amazon.sa and match the card ASIN. Tracking parameters are removed. Unpriced cards and sponsored redirect links without a direct verified product URL are omitted.

Delivery location and seller are not selected or verified. Availability stays unknown unless the card explicitly says unavailable. Prices may represent different pack sizes and marketplace sellers, and exclude shipping. Initial implementation reads only the first result page; exact product matching and pagination are not implemented.

Local verification: milk and Pepsi queries returned 48 priced products each. Saved public-page structure and synthetic edge cases cover Arabic prices, list-price exclusion, duplicate ASINs, missing prices, unsafe URLs, challenge pages, cancellation, and empty results. Hosting must be verified independently after deployment.

Logo: Amazon.sa official favicon.

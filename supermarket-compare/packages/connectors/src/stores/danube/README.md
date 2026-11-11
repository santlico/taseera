# Danube connector

Reads the public search page to discover its browser search configuration, then uses the same Algolia search endpoint. No personal login or Chrome cookies are used. Search is limited to 40 hits per query for the initial version; it is not an exhaustive export.

Scope: Riyadh / Al Rayyan (district 296), served by Al Rawabi supermarket 378, home delivery. The public store selector district mapping was verified. Store changes via the public session did not persist in the probe, so the connector uses the site's own inventory modifier precedence directly: `378_hd`, `378_`, `_hd`, then base fields. The scope is fixed and explicitly returned with each product.

Live verification: search صدور دجاج ساديا returned the reference product 66004 at SAR 21.99, in stock, with its original product link. This matches the user's Riyadh screenshot. Tested through the local Node.js API without personal browser state. Remote hosting access is not yet verified.

Remaining: district selection, pagination, request caching/rate limits, resilience to upstream response changes and deployment verification. Prices and availability can change; fetch timestamps accompany results.

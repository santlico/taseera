# Ninja connector

Fetches the public Arabic search page without personal cookies. Decodes JSON arrays from Next.js inline Flight chunks using JSON.parse only (never eval). Maps the `searchedProducts` array, prices in minor currency units, stock flags and media. Product links are read from actual page anchors, not fabricated from names.

The default site location is not independently selected or verified; the UI labels it accordingly. Search can return broad results, not exact matches. Initial implementation reads products returned in the page, without additional pagination.

Live verification: searching صدور دجاج ساديا returned product 1737 at SAR 22.95 and its original product link. Tested through the local Node.js application without the user's browser session. Remote hosting remains unverified.

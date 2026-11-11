# Carrefour connector

Requests the public Next.js search route with `RSC: 1` and `Accept: text/x-component`. Reads JSON Flight records without executing scripts. Extracts only search `data.sections` product attributes and deduplicates by product ID. An empty or changed response throws instead of masquerading as zero products.

No personal browser cookies, credentials or tokens are used. Scope: upstream default configuration Granada - Riyadh; the connector checks this field and fails if it changes. This confirms the published default location, not independent selection of a delivery branch. The UI labels it explicitly. Other location selection is not supported.

Live local verification: searching صدور دجاج ساديا returns product 531284 at SAR 28.99 with original product URL, matching the user's reference. Tested concurrently with Danube through the application API. Remote hosting is not verified. The first upstream result page contains up to 60 hits; pagination, precise matching and location selection remain future work. Never assume every returned hit is an exact product match.

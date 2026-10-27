# Firecrawl versus basic extraction

Captured October 26, 2026. Two brands, one selected product each. The requested subagent roles were unavailable; the basic and Firecrawl request branches ran concurrently in the local session. Four Firecrawl requests succeeded, each reporting one credit: **four credits total**. No OpenRouter inference was used.

## Product data

| Sample | Direct `products.json` | Firecrawl `product` |
| --- | --- | --- |
| OLIPOP Caramel Apple | 2 variants, 8 images, prices and availability | Same 2 variant IDs and 8 unique images; explicit USD currency |
| Our Place Titanium Always Pan Pro 10.5″ | 3 variants, 3 images, prices and availability | Same 3 variant IDs and 3 unique images; explicit USD currency and image alt text |
| Whole catalog | 47 OLIPOP / 133 Our Place records in the sampled first page (`limit=250`) | Only the selected product page was requested; no catalog coverage claim |

For these two products, Firecrawl did not increase variant or image counts. The picker can also read currency from Shopify's public `cart.js`; it should never infer currency from a bare number. Public catalog data is not automatically curated: the OLIPOP response includes a test product. Confirm the product, variant, and reference image before generation.

## Brand data

| Field | OLIPOP via Firecrawl | Our Place via Firecrawl |
| --- | --- | --- |
| Logo candidate | `OlipopLogo_1_560x.png` | `logo-dark.svg` |
| Primary / secondary / accent | `#14433D` / `#E31A82` / `#034638` | `#465661` / `#6C674D` / `#AF5A3C` |
| Background / primary text | `#FFFFFF` / `#14433D` | `#FCFAF6` / `#35312E` |
| Fonts | Ano (body), WindsorEF (display) | Plaid-XS-Web (body), Chelt (heading) |
| Inferred personality | Playful, high energy, “shoppers” | Modern, low energy, “shoppers” |

The basic homepage fetch found descriptions, social metadata, and 5/6 logo-like image tags respectively, plus many incidental color values. It did **not** map them to a reliable palette or typography system. Firecrawl supplied those roles and logo candidates directly. This baseline was simple HTML inspection, not a custom rendered brand extractor. Logo correctness, font fidelity, and inferred personality have not been independently validated; show them for confirmation/editing.

Firecrawl's accompanying markdown is verbose: roughly 26–33 thousand characters for these homepages and 25–28 thousand for the product pages. The OLIPOP product text contains repeated promotion/subscription material. Do not pass all of it into the generation prompt or treat extracted promotions as approved campaign offers.

## Observed timing

| Brand | Basic homepage + catalog | Firecrawl homepage branding + markdown | Firecrawl selected product + markdown |
| --- | ---: | ---: | ---: |
| OLIPOP | 0.55 s | 14.66 s | 8.29 s |
| Our Place | 0.97 s | 6.86 s | 9.99 s |

These are individual end-to-end observations, not a benchmark. Both Firecrawl product responses were cache hits and reported concurrency throttling, with 6.39 s and 7.93 s in the queue. The Our Place cached product snapshot was about three hours old. Cached age and queue time must remain visible when interpreting freshness or latency.

## Decision supported by this sample

Use direct JSON for fast browsing. Firecrawl adds the most distinct value on homepage branding; selected-product enrichment is optional when the catalog lacks useful context. Retain source URLs, keep merchant intent separate from extracted claims, and confirm brand/logo/variant choices before generating.

## Inspect the actual fields

[extraction-samples.json](extraction-samples.json) contains the selected basic product records, Firecrawl product objects, complete returned branding objects, timing, credits, and cache metadata. Credentials, full homepage HTML, and full markdown are excluded. The raw local responses remain in Git-ignored `.work/extraction-experiment/` for deeper inspection.

Sources: [OLIPOP homepage](https://drinkolipop.com), [Caramel Apple](https://drinkolipop.com/products/caramel-apple), [Our Place homepage](https://fromourplace.com), [Titanium Always Pan Pro](https://fromourplace.com/products/titanium-always-pan-pro). Format reference: [Firecrawl branding and product extraction](https://docs.firecrawl.dev/features/scrape).

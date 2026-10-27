# Superpilot Instagram Ads — working writeup

Started October 26, 2026 at 6:20 PM Pacific. This is a live draft, updated as the work happens. Current decisions and open questions are in [the working plan](docs/PLAN.md); chronology and ownership are in [the session log](docs/SESSIONS.md).

## What I am building

I am building a limited demo that could introduce merchants to Superpilot: enter a Shopify URL, review the extracted brand, choose one product, and create an Instagram image ad. The persistent workspace keeps original scans, merchant edits, and generated outputs. An earlier local OLIPOP flow was live-verified; the finished sample still needs ads for at least three brands.

## Decisions so far

I chose TanStack Start with React and TypeScript, shadcn/ui, and Tabler icons. The interface starts with one centered input and defaults to light mode, with a persistent dark-mode option. These are open-source building blocks that require no special commercial license. Authentication, Meta integration, and deployment would take time away from the core problem, so they are outside the initial scope.

I selected GPT Image 2, direct Shopify `products.json`, and Firecrawl branding. The selected product photo, raster logo when available, and confirmed brand context guide generation. The intended flow collects brand, product, and an explicit creative brief beside the composer, then moves into a studio for comparing options and editing text/logo layout. Conversation and UI should operate on the same saved state throughout. Sonnet 5.5 is selected for creative briefing and copy, with runtime integration pending. That complete flow and separate editable layers remain unimplemented; current lettering is part of the generated image.

Project credentials stay server-side in Git-ignored `.env`. ShieldCN supplies README graphics; Codex assists implementation and documentation; Cheerio parses HTML for the custom extraction experiment. No OpenRouter inference ran in that experiment. Its three Firecrawl branding requests reported three credits; other sessions record their own usage separately.

## What worked, and what did not

The earlier persistent-studio version passed strict types, production builds, and 14 focused checks. Current agent, storage, and creative-studio integration is still changing; those results do not verify the current combined checkout. That version used Motion with reduced-motion support; its mobile/desktop checks covered the continuous flow. In those checks, brand edits and product choice survive reload. Refresh updates untouched extracted fields while preserving merchant edits.

JSON catalog requests took about 0.2–0.3 seconds versus 13.3 seconds for one Firecrawl product page, with the same variants and images for the sampled product. JSON exposed test products; scraped copy included unrelated promotions.

For brand identity, custom extraction took 0.6–0.9 seconds versus Firecrawl's 5.9–7.2 seconds across three stores. Speed was not enough: it chose stale Helvetica defaults for OLIPOP and missed Our Place's colors. Firecrawl's fonts matched rendered checks, but its Glossier logo was a favicon. The app flags icon-only logos. New scans now return homepage basics (195–845 ms in three samples) while a durable Firecrawl job fills visual details in the background. Explicit edited-field markers protect clears, reversions, uploaded logos, and active edits. These are small samples, not general benchmarks.

GPT Image 2 produced a 1024×1024 Caramel Apple creative for $0.070233. Reloading and revisiting brand settings did not interrupt it. That run retained requests, raw responses, and images locally; cached replay made no new generation. A recovery test restores a received image after worker exit. Visual product fidelity still needs systematic review.

## Next

Generate and judge ads for two more brands, settle final 1080px export sizing and editable overlays, then finish the submission. The six-hour clock and session recaps keep the tradeoffs visible.

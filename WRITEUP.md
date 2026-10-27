# Superpilot Instagram Ads — working writeup

Started October 26, 2026 at 6:20 PM Pacific. This is a live draft, updated as the work happens. The detailed chronology is in [the session log](docs/SESSIONS.md).

## What I am building

An app that turns a merchant's brand and product context into Instagram image ads. The finished sample needs actual ad outputs for at least three brands. The first session establishes the interface and development workflow; image generation is not connected yet.

## Decisions so far

I chose TanStack Start with React and TypeScript, shadcn/ui, and Tabler icons. The interface starts with one centered input and defaults to light mode, with a persistent dark-mode option. These are open-source building blocks that require no special commercial license. Authentication, Meta integration, and deployment would take time away from the core problem, so they are outside the initial scope.

The OpenRouter key stays server-side in a local environment file and will be shared with the optional OpenWiki runner. ShieldCN provides the README header/badges; Codex assists with implementation and source-backed documentation. No model, generation technique, or brand has been selected yet. No paid inference has run.

## What worked, and what did not

The initial shell passes strict type checking and a production build. Browser checks cover prompt submission, empty-input handling, and persistent light/dark mode. The setup exposed two small integration issues: TypeScript 7 removed `baseUrl`, and the shadcn CLI added a separate utility package where a local helper was sufficient. Both were resolved. A compact OpenWiki documents the source. Output quality, product fidelity, text accuracy, and inference cost remain untested.

## Next

Choose the brand/product context and generation approach, generate ads for three brands, and evaluate whether the products and brand identity survive generation. Replace this section with measured results, failures, and remaining problems as those experiments run. The six-hour clock and session recaps keep the tradeoffs visible.

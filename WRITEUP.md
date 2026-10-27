# Superpilot Instagram Ads — Writeup

I built a workspace for creating Instagram ads from Shopify stores, with generated examples for OLIPOP, Our Place, and Big Star Lights. The main challenge was keeping the scope small enough to finish and validate.

## Where the scope grew

I wanted an MVP that met the brief and felt like a usable app. About halfway through, I realized I was building an application rather than a bounded feature demonstration. By then, decisions such as supporting both a floating composer and sidebar chat had created substantial iteration. That consumed time needed for generation and review.

Eve seemed like the right foundation because I expected to need a full agent. In hindsight, fewer interactions and less customization could have avoided that framework and much of the session/state complexity. I made choices suited to a longer-term product, which is how I normally work. I also avoided familiar components and code from previous projects, making routine interface work more expensive than usual.

Making it brand-agnostic widened the problem further. Big Star Lights is headless, so testing it required discovering a backing Shopify catalog alongside conventional storefront support. Multiple brands then became workspaces with separate conversations and persistent context. The shared-context model evolved during implementation; it connects the workflow, but users may struggle to understand it.

## What worked, and what needed more attention

The initial breakdown—extract context, generate artwork, place copy, export—was straightforward. Using Pretext with a rough foreground mask was a promising way to fit text around real image content. It needed more visual testing than I gave it. I spent too much time on frontend UX/UI instead.

I kept prioritizing speed, smaller model calls, and visible progress. That led to useful progressive loading, but also caching, loading-state, and orchestration rabbit holes. Generating more complete image variations, or allowing GPT Image 2 to bake in the text, would have been simpler. I wanted in-place text editing; I ultimately cut that scope because I could not properly test it alongside automatic placement.

Late work also exposed structured-output failures, truncated plans, classification outages, and placement recovery problems. Retaining requests and outputs made recovery possible without regenerating artwork, but the testing surface exceeded the time available.

## Outcome and lesson

The result generates real artwork across three brands and supports composition review and PNG export. Focused checks and successful live flows establish parts of the system; they do not establish consistent product fidelity, text placement, or usability.

My main lesson is to define the smallest complete, testable experience before expanding it. I learned a lot, but I would make fewer product and interaction decisions for a timed sample. My estimate is that a better version would take about eight focused hours with tighter scope and protected testing time.

[Implementation history](docs/SESSIONS.md) · [Visual progression](docs/checkpoints/README.md)

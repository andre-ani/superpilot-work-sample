# Superpilot Instagram Ads working plan

Updated October 26, 2026, 7:39 PM America/Vancouver.

Build a limited demo that could become a lead-generation experience for Superpilot: enter a Shopify store URL, collect useful brand/product context, and create an Instagram image ad that looks like it belongs to that brand. Spend the time on useful context, faithful product depiction, and a result the merchant can judge and edit.

This is the current planning record. Update it as the conversation changes decisions; keep proposals separate from accepted choices and implementation evidence. [SESSIONS.md](SESSIONS.md) tracks work and ownership. [WRITEUP.md](../WRITEUP.md) remains the short submission narrative.

## Decisions so far

- Accept a merchant-supplied Shopify URL, including custom domains. Do not hard-code one brand. Support depends on accessible storefront data; an arbitrary URL is not automatically usable.
- Let the merchant browse, search, filter, and sort products, then add any relevant products/variants and image references to context. There is no one-product gate or arbitrary collection-count cap. Creation can use brand-only context.
- Use direct `products.json` for the product picker. The reusable picker is implemented; its owning session is completing interaction verification.
- Use GPT Image 2 for image generation. It accepts text and image inputs. The exact OpenRouter route, access, settings, cost, and latency still need validation before generation.
- Pass the collected products and reference images, confirmed brand context, and any optional ad direction. Do not silently substitute the first product or the entire unselected catalog. Missing creative decisions are prepared from known context.
- Keep Firecrawl as the default brand provider after the three-brand comparison below. Direct JSON owns catalog loading. The limited custom extractor is a fallback for basic identity; its unreliable palette/font defaults are withheld from the editable draft.
- Export a PNG or JPEG. Our working interpretation is that the brief's pixels requirement concerns the final ad: HTML, SVG, or Canvas may be used internally to compose an image. This is an interpretation, not an explicit clarification from the brief's author.

## Intended merchant flow

**Owner direction, October 26:** this is a context-collection workspace. An initial input primes the system; conversation and UI help the merchant gather the pieces needed for an ad. As each piece is collected, it becomes visible alongside the persistent composer. The merchant can review all accumulated context together before generating. These requirements describe the intended experience; complete creative briefing and studio editing are not yet implemented or verified.

1. **Prime the workspace.** Start with a Shopify URL and any initial direction. Normalize and validate the public storefront address.
2. **Collect brand context.** Scan brand and product data together, cache real snapshots, and progressively show editable name, description, logo, colors, typography, and voice. Identify uncertain or missing fields and retain the original extraction separately.
3. **Collect product context.** Add relevant products, visual variants, actual photos and facts without forcing navigation to creation after each addition. Product search/filter/sort must reflect loaded data, with explicit pagination.
4. **Develop the creative.** Answer “what is this ad about?” Brand identity and product data alone yield a generic image. Establish audience, message, hook, supported benefit or offer, headline/supporting copy, and visual concept. The agent can suggest alternatives from known facts; the merchant can choose or revise them through conversation or controls. Keep brand-wide voice separate from this ad's brief.
5. **Review context and generate options.** Make brand, selected product, creative brief, references, and output format visible together. Surface missing decisions without forcing a long questionnaire. Freeze the selected context for each generation; retain earlier options when context changes.
6. **Assemble in the final studio.** Compare image options, apply editable text and the original logo, adjust layout, and prompt visual additions or revisions. Preserve prior versions, then export the composed result as PNG/JPEG.

**Native through both conversation and UI:** every meaningful collection, selection, copy, layout, image-revision, and export action must be available through the agent as well as direct controls. Composer-only use must complete the flow. Both interaction paths update the same saved context and composition; a UI edit is immediately available to the agent, and an agent edit is visible in the UI. The composer stays available throughout. This parity is a requirement, not a claim about current tool coverage.

The website does not determine a specific campaign intent. The merchant may supply one, or Sonnet proposes a plausible brief from confirmed context. Offers and factual claims must remain supported.

## Creative model — Sonnet 5.5 selected

Checked against Anthropic's launch pages on October 26, 2026. Sonnet 5.5 launched September 28; Haiku 5.5 launched October 7. Anthropic describes Sonnet's clearer writing and faster iteration, and Haiku as its fastest standard-speed model for narrowly scoped, high-volume work. These are vendor claims, not project latency measurements or ad-copy evaluations. Opus Fast Mode is an exception to the standard-speed comparison.

**Owner selected Sonnet 5.5** for creative work, including briefing, advertising concepts, copy variations, and refinement. Haiku is not selected for this workflow. Multiplex distinct hooks or angles using the same confirmed context; start with a few options rather than an unnecessary model-review chain.

Actual ad-copy quality and representative latency remain untested. OpenRouter catalog and direct structured calls confirm `anthropic/claude-sonnet-5.5`; project pricing has not been benchmarked. The creative/studio subagent is now pinned to this route. Direct structured Sonnet calls pass; full Eve delegation is blocked by the workflow registration failure documented in session 14.

Sources: [Sonnet 5.5 launch](https://www.anthropic.com/claude-sonnet-5-5), [Haiku 5.5 launch](https://www.anthropic.com/claude-haiku-5-5).

## Agent responsibilities and model pins

Keep one merchant-facing workspace agent and focused specialists. A workflow step does not automatically need its own LLM call. The following map preserves existing runtime models while adding the selected creative model; creative/studio specialist and shared actions are implemented locally; the root delegation path still needs the Eve runtime repair and live verification.

| Role | Steps / responsibility | Model pin | Saved result / boundary |
| --- | --- | --- | --- |
| Workspace agent | Initial input, conversation, missing-context questions, delegation, navigation, and user-selected changes | Existing GPT-6.1 Sol, low reasoning, priority | Coordinates the current workspace; all writes go through shared application actions. |
| Brand specialist | Review extracted identity, voice, evidence, and missing context | Existing GPT-6.1 Sol, low reasoning, priority | Brand draft with provenance; extraction remains deterministic basics plus Firecrawl, not an agent-generated brand. |
| Product specialist | Find, compare, and explain relevant products/variants | Existing GPT-6.1 Sol, low reasoning, priority | Candidate IDs and evidence; selection is applied through the shared action. Uses exact search first, existing GPT-6 Luna Decisions for semantic/visual classification. |
| Creative specialist | Establish ad intent; propose distinct hooks, concepts, headline/supporting copy, and visual direction; refine chosen copy | **Claude Sonnet 5.5 — selected** | Structured creative brief and selectable concepts. Each parallel concept task receives the same frozen brand/product context and a distinct angle; results return independently. |
| Studio specialist | Translate conversational layout edits into composition changes; prepare image-edit instructions and coordinate output selection/export | **Claude Sonnet 5.5 — shared creative agent** | Versioned composition containing artwork, text, original logo, placement, and format. Reuse the creative specialist initially with studio tools; split only if responsibilities require it. |
| Image generation/edit tool | Produce artwork or revise the selected image from a confirmed concept and references | Existing GPT Image 2 | Saved image job/output tied to its exact input version. This is a model-backed tool, not another conversational agent. |
| Composition/export tools | Apply text/logo, move/resize layers, render final PNG/JPEG | No LLM | Deterministic shared actions used by UI and agent; layout-only edits do not trigger image inference. |

**Handoff:** workspace → brand/product context → creative brief/concepts → chosen concept → image job → studio composition → export. Brand and product collection can overlap; concept variants can run independently once enough context is confirmed. Do not run every specialist on every message.

**Shared state:** persist brand draft, selected product/variant, creative brief, concepts, image outputs, and composition versions. UI and agent use the same validated mutations. Bind asynchronous results to the source workspace/context version so late work cannot overwrite newer choices. Specialists return proposals; the workspace applies the chosen result. Confirmed generation requests snapshot their inputs and retain model attribution.

**Pinning rule:** give each role an explicit model setting, even where values match. Preserve current Sol reasoning/service-tier settings; do not copy OpenAI-specific options into Sonnet configuration. Verify Sonnet's provider route and supported options before enabling it, and record the resolved model on creative results. No silent model fallback. Sonnet is selected for creative work; the existing workspace/brand/product pins remain unchanged. The owner approved Sonnet reuse for studio work, now implemented by the same creative specialist.

## What generation needs

| Input | Useful content | Source |
| --- | --- | --- |
| Product | Collected products/variants, relevant features/benefits and selected actual images; price only if needed | Catalog and, when useful, the selected product page |
| Visual identity | Original logo, palette, typography references, representative site imagery | Homepage and its assets |
| Brand voice | Headlines, descriptions, value propositions, examples of the brand's language | Bounded homepage/product copy; About page only when necessary |
| Ad intent | What to communicate, to whom, and any approved offer | Merchant input or an explicit suggested default |

Keep source facts separate from inferred tone, audience, or positioning. Do not turn unrelated promotion text into an offer, infer currency from a number alone, or invent missing claims. One product may need several reference photos.

## Final studio and image composition — implemented locally, owner review pending

Use generated artwork underneath separately editable text and the original logo, then flatten the composition for export. The studio must support option comparison, direct layout adjustments, and equivalent agent commands. Copy or logo placement changes should not require paid image regeneration; changes to the artwork use explicit image revision while preserving the selected layers and prior version. Text inside the generated artwork remains an experiment, not a requirement.

| Layer | Intended treatment |
| --- | --- |
| Artwork | GPT Image 2 creates the visual, with space reserved for overlays. |
| Text | Render the headline separately so copy edits do not require another image generation. |
| Logo | Confirm the extracted asset, then composite that original SVG or suitable PNG without distorting its proportions. |

Selecting the correct logo is separate from rendering it faithfully. Extraction can return the wrong asset or color variant; allow correction. A standalone logo overlay also does not fix altered logos or labels on generated product packaging. Preserving an original product cutout is another proposed experiment where exact product appearance matters. Original-logo composition is implemented in the canvas but awaits owner visual review. Preserving a product cutout remains an untested proposal.

## Product data comparison

Small live check on October 26; these observations are not a general performance benchmark.

| Observation | Direct JSON | Firecrawl |
| --- | --- | --- |
| Coverage checked | Two OLIPOP pages and one Our Place page, two products per request | One OLIPOP Caramel Apple product page |
| Request duration | About 0.2–0.3 seconds per request | 13.3 seconds |
| Same Caramel Apple product | Two variants and eight images | Two variants and eight images |
| Useful additions | Native IDs, options, tags, dates, availability, image associations where supplied | Explicit USD currency and broader page copy |
| Cleanup needed | Test/dummy and unavailable entries appeared; currency absent from the sampled catalog payload | Page copy included numerous unrelated promotional codes |

OLIPOP pagination returned distinct products. Firecrawl's unauthenticated request succeeded and reported one credit used; that does not establish sustained free access or future pricing. No OpenRouter inference ran in these checks.

The evidence supports JSON for fast catalog loading and Firecrawl only where page context adds value. It does not establish universal Shopify coverage, accurate sales rankings, or complete collection filtering. The earlier Shopify Catalog API route was set aside because its image-use rules were a poor fit for generation; it is distinct from the public `products.json` endpoint.

## Brand extraction comparison

**Implemented and tested:** a custom static extractor reads one homepage plus at most two stylesheets with Cheerio. It reuses the catalog's public HTTPS transport, DNS pinning, redirect checks, and response limits. Firecrawl uses the same homepage URL with `branding` and `markdown`; the comparison requested `maxAge: 0`.

| Brand | Custom | Firecrawl | Quality finding |
| --- | --- | --- | --- |
| OLIPOP | 0.712 s | 7.066 s | Custom found the logo but selected stale Helvetica/utility colors. Firecrawl found WindsorEF, Ano, and green #14433D, confirmed on the rendered homepage. |
| Our Place | 0.580 s | 5.934 s | Custom found the logo and navigation font but missed heading font and colors. Firecrawl found Chelt and Plaid-XS-Web; the hero body also uses Calibre, so a single body-font field is incomplete. |
| Glossier | 0.912 s | 7.209 s | Both found Apercu. Custom found no logo; Firecrawl supplied a small favicon rather than the visible wordmark. |

All six requests succeeded. The Firecrawl calls reported three credits total. These are single observations with different capability breadth, not a reliability benchmark; Firecrawl did not return its cache state. Browser checks inspect current visible identity, not official brand guidelines. Glossier redirected the browser to its Canadian locale, so campaign/locale differences also matter. Raw responses and custom source snapshots remain locally retained; [sanitized results](brand-comparison.json) record the original measurements.

**Resulting behavior:** `extractBrand` prefers Firecrawl using only the project `.env` credential. It saves raw provider responses under `.studio-data/brand-extractions` and returns the shared summary to the studio. If unavailable, static extraction can return basic name/description/logo; palette and font defaults are cleared because this experiment found them misleading. Favicon-only results keep the candidate but leave the selected logo empty and ask for the original asset. No model generates a replacement logo.

**Summary contract agreed with the UX chat:** `BrandSummary` preserves source URL/time, name, description, selected logo and candidates, palette, heading/body fonts, source headings, warnings, and provenance. A separate `BrandDraft` holds merchant edits and creative direction. Refresh creates a new snapshot and must preserve genuine user edits. Font names are references, not automatically licensed font files. Homepage colors can reflect a seasonal campaign; review remains necessary with either provider.

Firecrawl's public code combines style measurements, heuristic logo ranking, and model-assisted refinement. A browser-based custom extractor could improve on the static experiment, but would add rendering/cascade work and has not been implemented or timed. The tested static path is fast enough; its quality is the reason it did not replace Firecrawl.

To rerun deliberately: `node --experimental-strip-types scripts/compare-brand.ts` (up to three stores, project Firecrawl credits required). Offline parser/provider tests run through `pnpm test`; they cover unknown fields, unsafe asset URLs, CSS role confusion, provider errors, and favicon handling.

## Progressive extraction implementation

Implemented in the shared checkout: `scanStore` returns homepage basics and catalog data without awaiting Firecrawl. A native Workflow job enriches the saved source scan; Studio polls that scan while remaining usable. Cached scans do not start another provider request. Local runtime is now verified for this path: a real Our Place scan returned basics in 310 ms and completed background enrichment 6.986 seconds later. Deployment verification remains with the Eve owner. The card reserves palette/font slots with skeletons and omits incidental status copy and the redundant site link.

| Stage | Data and behavior | Evidence or target |
| --- | --- | --- |
| Immediate basics | Brand name, description, candidate logo, source link, and real product grid. Leave palette/fonts pending. | The implemented homepage-only pass took 0.195–0.845 seconds across OLIPOP, Our Place, and Glossier; it fetches no CSS and calls no model. It has a two-second deadline. |
| Background enrichment | Start Firecrawl alongside the basic fetch, not after it. Fill proposed colors/fonts and improved logo choices when ready. | Firecrawl provided more useful visual context; completion latency is variable. |
| Optional candidate decision | One bounded Decisions request can rank logo candidates or judge whether extracted style candidates are useful; include “none/insufficient evidence.” | The existing project OpenRouter Decisions probe took 0.300 seconds on a simple test. Brand-candidate quality/latency has not been measured. |
| Later specialist reasoning | Interpret voice, value propositions, and creative direction while the merchant reviews products. | A full subagent is useful for synthesis; it adds model/tool overhead and should not gate initial rendering. |

The early pass overlaps strongly on names/descriptions and found usable logo candidates for OLIPOP and Our Place. It did not reliably identify the active visual styles. Additional reasoning cannot recover a rendered font or logo that was never included in its input; a small, relevant evidence set is still required.

**Firecrawl reduction probe:** two additional OLIPOP calls with a one-day `maxAge` returned `branding + markdown` in **14.925 s** and `branding` alone in **14.507 s**. Both returned the same broad branding field groups and reported one credit; neither exposed `cacheState`. This single sequential pair does not isolate cache/provider variability, but it gives no evidence that removing Markdown solves the latency. Firecrawl's public branding format schema offers no per-field selection and explicitly says its `mode` value is ignored. Cache is useful when a hit occurs, not a first-visit latency guarantee. Keep the app's saved brand results so revisits need no provider call.

**Eve integration:** the installed Eve version exposes `decide` for typed choices/scores/booleans without requiring a complete agent turn. This project already has a separate OpenRouter `openai/gpt-6-luna-decisions` client and successful probe; reuse that project-only route rather than silently using Eve's default Jev/Gateway provider. Do not put a full agent planning round before deterministic URL validation and fetching. A decision pass is an experiment, not yet a substitute for Firecrawl's rendering/analysis.

**Implemented state handling:** the original `baseBrand` and persisted enrichment status stay attached to their source scan. Polling reconnects after navigation/reload; paginated descendants read source enrichment while retaining their catalog. New results update only untouched fields. Explicit edit markers survive reload, clearing, and reverting a value; beginning an inline edit locks the field before committing text. Merchant edits, uploaded logos, creative direction, and confirmed generation inputs remain unchanged. Late results are bound to the correct source scan; failure retains usable basics. The paid Firecrawl step has automatic retries disabled. UI can say “Refining colors and typography” while the merchant proceeds. Generation inputs are copied from the current confirmed draft, not mutated by late enrichment. Restore-after-completion and explicit refresh both apply the same edited-field guards.

Latency evidence is retained under `.work/brand-comparison/latency-2026-10-27T02-12-24-869Z`; the existing Decisions probe is `.work/decisions-provider-probe.json`. No new Decisions or OpenRouter inference was made for this investigation. References: [Firecrawl cache behavior](https://docs.firecrawl.dev/features/fast-scraping), [branding format schema](https://github.com/firecrawl/firecrawl/blob/main/apps/api/src/controllers/v2/types.ts), [Eve Decisions](https://eve.dev/docs/guides/decide).

## Progressive font assets

The UX owner requested actual primary/secondary fonts in the brand card. `loadBrandFonts` now resolves exact `@font-face` family names from the homepage and up to two storefront/Shopify stylesheets, then downloads bounded WOFF2/WOFF/TTF assets through the existing DNS-pinned transport. Binary signatures and hashed asset names are checked; assets use shared local/private Blob storage and a same-origin endpoint. Successful results cache for a day; missing assets retry after a short cache period. No font family is guessed and no font provider was added.

The isolated OLIPOP check loaded the actual WindsorEF (weight 900) and Ano (weight 400) WOFF2 assets in 390 ms and read them back successfully. The UX chat owns applying returned fonts and weights to real card text, with request/store guards. Font loading follows available font names asynchronously and never blocks basic brand display; final visual review belongs to the owner.

## Next decisions and completion criteria

- Owner review of progressive scan, background completion, and the streamed brand card after Eve/runtime integration.
- Implement the creative brief, accumulated context review, and final studio with equivalent composer/UI actions. Choose the minimum controls within the remaining time; this plan does not claim implementation.
- Validate GPT Image 2 through the project's OpenRouter account, including reference-image handling and export sizing.
- Test product and packaging fidelity, text readability, logo correctness, and whether the image communicates a clear advertising idea. These are proposed review criteria, not completed checks.
- Produce actual ads for at least three brands, reproducible run instructions, and an evidence-based one-page writeup.

The persistent studio now implements the full brand-before-product flow with Motion transitions, cached real scans, editable drafts, product/variant selection, generation, and saved-version downloads. The first GPT Image 2 run used the actual OLIPOP Caramel Apple photo and raster logo; it produced a 1024×1024 PNG for $0.070233. Reloading and returning to brand review during generation did not interrupt it. Identical-request replay returned the existing image without another generation. Original extraction snapshots and merchant edits stay separate; refresh preserves edited fields. Raw provider responses and images persist in `.studio-data/`; complete journaled responses recover after worker exit without new inference. Fourteen focused checks and production build pass. Native model dimensions are retained; canvas 1080px export sizing and separate text/logo layers are now implemented locally but await owner review; systematic fidelity review and two more brands remain open.

Work within the shared six-hour active-time limit and October 27, noon America/Vancouver deadline. The $250 is project-only OpenRouter credit; extraction-service charges are separate. Authentication, Meta integration, and deployment are outside required scope. Lead capture itself has not been specified.

## Sources

- [Project brief summary](BRIEF.md)
- [GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2) and [image-generation limitations](https://developers.openai.com/api/docs/guides/image-generation#limitations)
- [Firecrawl branding and product formats](https://docs.firecrawl.dev/features/scrape)
- Firecrawl public source at revision `088afa5`: [branding orchestration](https://github.com/firecrawl/firecrawl/blob/088afa503a8a421ceed7a23e7c65275a4ed0a2a4/apps/api/src/lib/branding/transformer.ts), [style processing](https://github.com/firecrawl/firecrawl/blob/088afa503a8a421ceed7a23e7c65275a4ed0a2a4/apps/api/src/lib/branding/processor.ts), [model enhancement](https://github.com/firecrawl/firecrawl/blob/088afa503a8a421ceed7a23e7c65275a4ed0a2a4/apps/api/src/lib/branding/llm.ts)
- Live samples: [OLIPOP catalog](https://drinkolipop.com/products.json?limit=2&page=1), [second catalog page](https://drinkolipop.com/products.json?limit=2&page=2), [Caramel Apple page](https://drinkolipop.com/products/caramel-apple), [Our Place catalog](https://fromourplace.com/products.json?limit=2&page=1)

## Creative/studio implementation checkpoint

Session 14 added shared validated actions for brief/copy, concept choice, layout, format, output selection, image generation/revision, and export. UI controls and composer tool results share the same reducer and side-effect path. Browser persistence keeps per-output composition edits, while generated jobs retain frozen creative inputs and source-image identity. The new creative agent uses Sonnet 5.5 for both concepts and studio changes. Existing Sol and Luna Decisions settings remain unchanged.

Six focused checks, strict types, and live Sonnet action-schema calls pass. Anthropic rejected `oneOf`; the wire schema now uses supported `anyOf`. No image inference or visual UX check ran in this session. Full composer integration is **not verified**: Eve's local runtime reports `WorkflowNotRegisteredError` for `workflow//eve//workflowEntry`, before model execution. Session 07 owns that runtime repair. See [session 14](SESSIONS.md#14--creativestudio-implementation) for the concise handoff.

## Paired interaction motion

The lanyard reference is visual inspiration only; the card has no literal slot. Enter/exit, open/close, and focus/blur transitions must pair with their reverse, stay subtle and fast, preserve geometry and typography, and respect reduced motion. Inline text editing now crossfades both directions in 160 ms without replacing the text footprint.

## Cached card replay

Settings → Debug tools → Replay cached brand replays the visible loading stages using saved data and the current edited draft. It is a 2.4-second presentation preview, not a rerun or timing benchmark of the extraction workflow. It makes no Firecrawl call and changes no brand fields. Rescan store (live) remains separate and creates a new extraction.

## Brand overview and creative controls

The card introduction should be concise but representative and positive: roughly 35–55 words, grounded in source facts and actual visual evidence. It must not be reduced to a category label or reproduce widget/SEO boilerplate. The newer full-context direction keeps description corrections editable without re-shortening user-authored text. Identity controls correct the logo, palette, and typography. Audience, message, offer, and creative direction belong to the creative brief/studio. Existing saved drafts and original evidence are preserved; cached card descriptions are cleaned for display without another extraction.

## Owner correction — context-first creation

Supersedes the earlier one-product and required-ad-direction plan: gather any number of relevant context items; do not impose an arbitrary product-count limit. Creation accepts optional direction or Go using the collected context, including brand-only context. Missing headline/hook/brief is completed from known brand and product evidence with Sonnet; offers and factual claims remain supported rather than invented. Prepare actual ad copy and a composition with reserved text space before generating artwork. The brand specialist must inspect actual brand imagery and save an editable visual-style interpretation with evidence/uncertainty. Extracted and interpreted context must remain visible and editable by direct controls and equivalent shared agent actions. Saved review remains inference-free.

## Visual brand understanding and shared edits

The brand specialist now receives actual saved PNG/JPEG/WebP pixel parts, not URLs masquerading as vision. Fresh extraction captures a homepage screenshot; existing scans reuse retained representative imagery where available. Evidence images are cached as owned raster assets, and analysis is keyed by immutable source evidence/text. No inference runs on cached replay/reload. Missing pixels leave style explicitly unavailable and preserve usable text facts.

`ensureBrandVisualUnderstanding(snapshotId)` provides cached introduction, visualStyle, visualReferences and uncertainty for deterministic pre-creative Go preparation. It uses the existing Sol brand-model pin. User visual edits override extracted defaults; absent legacy optional fields are not marked edited, while explicit clears/reversions remain protected. Shared `brand-update` actions distinguish suggested defaults from explicit merchant edits, so manual and agent changes address the same fields. Runtime owns Go/action integration, Context owns visible editors. Generic creative instructions are not detached floating inputs; composer actions/menus own intentional ad-direction interactions.

## Visual style settings

The compact brand card exposes Visual style as an action. It expands into an accessible modal retaining brand identity on the left and placing longer style/reference controls on the right. Outside click, Escape and Close reverse the same fast transition back to the card. Smaller screens stack the panes; saved data and edit protection use the same controls.

### Context-first implementation status

Implemented locally: persistent multiple-product context without a count gate; brand-only Go; exact selected product/inspiration references; cached real-pixel brand understanding; editable style/source evidence through shared UI/agent actions; cached Sonnet automatic brief and text-safe composition; durable preparation before artwork; field-aware and stale-result protection. Provider prompts use the active brief/composition/layers, not unselected concept options. Native composer uploads become persisted context before agent execution. Saved review stays model-free. Strict types, focused context/preparation checks and real model/cache probes pass; no new artwork/fidelity review was performed for this change.

## Composer identity and controls

Idle composer shows Message superpilot; only live processing state may replace that placeholder. Assistant replies stay in conversation/preview surfaces. The original Superpilot box mark sits left; plus/context and sidebar controls sit inside the pill on the right. No microphone or visible send button; Enter sends and Shift+Enter adds a line. Stop remains available during active work.

## Final composing flow — local first pass

After generation, choose artwork and one of three bounded copy options independently. Headlines are limited to 80 characters and supporting copy to 140 for generated options; manual text remains editable. Copy changes use shared actions and do not regenerate artwork. Pretext measures the loaded brand font, and the renderer finds the largest type size fitting each bounded width/height and maximum line count. Two-line headlines can grow larger than a one-line treatment. Auto-fill is the default, with manual size/alignment controls and explicit overflow recovery. Preview and export share layout; on-screen text guides do not appear in the PNG. A genuine saved copy-preparation record supports inference-free composing review. Types and focused fitting/state checks pass; visual review remains with the owner.

## New flow and staged profile loading

Start-screen submission begins a fresh URL-led session with empty chat/context; brand extraction cache is independent and may be reused. Previous conversations belong only to explicit session/project selection. A cached brand profile must not reopen an older failed snapshot simply because it was last remembered by the browser. Multiple retained sessions per brand are a later product decision.

Cold extraction streams basics, then Firecrawl palette/font names, then image-backed visual understanding. Intermediate stages merge into untouched fields while the workflow remains running. Stable skeleton slots and short bounded reveal transitions reserve the layout. Font fetch failures caused by preview restarts may retry; failed promises do not remain cached indefinitely. The provider itself can still take many seconds, so completed profiles should be reused rather than re-extracted on a new conversation.

## Composing correction — current authority

The large base image sits above four complete composed variations. Selection supplies context to the existing composer; text editing/alignment stays on the selected text. No slider panel or separate image-change input. Generated artwork is text-free apart from authentic packaging. Source images are inspected for natural quiet opportunities (sky/lawn/walls/shadow) and protected products/lights; generation follows that reasoning and a separate actual-output pixel analysis chooses final placements. This supersedes fixed top/bottom template assumptions. Unsafe placements are rejected instead of silently overlaying subjects. Image, analysis and text preparation are cached; only explicit user requests start new work.

The saved composing review now permits explicit manual composer turns in an isolated per-generation chat/flow. This supersedes the old blanket disabled-chat review rule: loading is still model-free, while deliberate user sends may edit copy/layout or request image revisions. No secondary image-change input is used. The agent can read actual saved artwork pixels before visual changes.

## Mobile composing authority

Base-left/4-grid-right on desktop; headline minimum84px and supporting minimum42px at1080px, with8% edge-safe inset. Text is shortened or omitted when necessary; the renderer never uses tiny text to force a fit. Foreground segmentation is internal: cached raw mask + hole fill + distance padding/soft penalty + vision-protected regions determine per-line Pretext spans, while the original displayed image stays unchanged. Local model worker/caches are verified; uncached deployment worker support remains a separate runtime task.

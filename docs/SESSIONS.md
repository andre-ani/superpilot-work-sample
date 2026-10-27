# Development summary

The project began on October 26, 2026. This page summarizes the work; detailed agent notes are preserved in the [historical archive](SESSIONS-ARCHIVE.md). The [final writeup](../WRITEUP.md) explains the scope decisions and lessons in the author's own terms.

## How the work developed

| Phase | Main work | What it revealed |
| --- | --- | --- |
| Initial generation path | Storefront input, product catalog, brand extraction, first saved image | A complete generation path was feasible; extracted identity still needed review. |
| Persistent workspace | Brand corrections, product references, saved outputs, agent tools and conversations | Supporting both conversation and direct controls added substantial state and interaction complexity. |
| Broader storefront support | Multiple brands, headless Shopify discovery, variants and exact image references | Brand-agnostic behavior required more than changing a store URL. |
| Creative workflow | Ad ideas, separate artwork/copy, Pretext layout and foreground masking | Editable composition needed more visual testing than the remaining time allowed. |
| Reliability and delivery | Provider grammar/truncation fixes, bounded recovery, retained outputs, selection and PNG export | Focused checks protected individual contracts; they did not replace full user-flow validation. |

## Results and evidence

- Generated artwork exists for OLIPOP, Our Place, and Big Star Lights. See the [example gallery](../examples/README.md).
- The latest repaired Big Star Lights execution completed planning, image generation, and four composed variations. The local gallery and full-size review rendered with export enabled; the saved base image remained unchanged during placement repair.
- Earlier OLIPOP reviews exposed supporting-copy fit warnings and preview-loading issues. These observations are retained in the [visual history](checkpoints/README.md), with source revision and dirty-checkout context.
- The [three-brand extraction experiment](brand-comparison.json) and [earlier two-brand comparison](EXTRACTION-COMPARISON.md) document why fast homepage parsing was insufficient for reliable visual identity.
- Original requests, responses, and generated images remain in private project storage. They are not bundled into the repository. The gallery contains selected image artifacts only.

## Reading the verification record

The archive distinguishes implementation, focused checks, live provider calls, rendered review, and unverified behavior. A passing typecheck or unit test does not prove product fidelity, typography, mobile behavior, or a downloaded export's appearance. Screenshots of a dirty checkout document what was visible at that moment; they do not mean that the associated partial checkpoint reproduces the whole app.

The [activity journal](activity-log.jsonl) preserves timestamped milestones. The separate [work clock](time-log.json) records user-work intervals; concurrent agent time must not be added to it. The eight-hour figure in the writeup is the author's estimate for a better-scoped version, not a measured duration.

## Final publication

Production target: [Superpilot work sample](https://superpilot-work-sample.vercel.app). Final local verification includes strict TypeScript and 19 focused planning, retry, context, and review checks; deployment runs the configured type/build gate. Git history identifies the published revision. These checks do not replace human visual review. No submission email has been sent.

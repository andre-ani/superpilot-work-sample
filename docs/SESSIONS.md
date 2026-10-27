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

## Production scan repair

Production enrichment failed with “The saved scan is busy” because compressed private-Blob JSON reads returned weak HTTP ETags. The storage compare-and-swap sent the weak prefix to a strong conditional write; real large records reproduced the failure while small records passed. The fix removes only W/ and retains the object version condition. A network-disabled SDK regression covers weak and strong tags; five storage checks and a real isolated 140 KB cloud update pass. The reservation test now asserts the actual concurrent winner rather than assuming call order. No merchant scan was overwritten by diagnostics and no image generation was requested.

## Production product-dialog positioning

Production render confirmed double centering: independent Tailwind translate and animation transform each shifted the dialog by half its size. The compiled CSS had removed the local reset. Product flip keyframes now animate only card-origin offset, rotation and scale; canonical DialogContent retains centering, including reduced motion. This is a CSS-only repair; production geometry will be checked after deployment.

## Saved-artwork preview continuity

Four copy options were present, but a per-variant text-fit/render error left its opacity wrapper hidden and its loading placeholder running indefinitely. Variations now retain the saved base artwork with a pulse while copy is prepared/rendered, and show a terminal fit error beside that specific option. Successful options remain independently usable; no new image is generated for a text-only render failure. Strict types pass. Six authorized new production image jobs across three brands completed preparation, image generation and placement; final export review is in progress.

# Variant checkpoint — October 26, 2026, 22:20 Pacific

Five distinct 1280×720 views, same OLIPOP/Caramel Apple/12 Pack context. Saved-review execution changed to the genuine clean-base job `ec8da9e1a56d51236c8d6486e9a79c871558b6ead02beeadccfde18a8bc0815c`, replacing the historical baked-lettering job for future comparisons. No new inference or context edits. Per-image route/selection/time: [captures.json](captures.json). Base `796c901` plus dirty checkout; the partial source checkpoint is not a reproducible whole-app release.

## Compared with 21:50

New saved artwork has a cream scene without additional ad lettering beyond the package. The review currently renders no composed variations: it says “Artwork is saved. Ask the agent for more space for the copy.” This materially differs from the owner's completed-source report; no agent request was sent to resolve it. Composition remains unverified for this saved execution. Brand card now has a floating logo, updated introduction and font-role icons. Brand settings contains primary/secondary palette controls. Product context reports the 12 Pack has no linked photo and preserves the selected reference; no variant/image choice was changed. Review composer is now enabled for deliberate manual requests, but capture sent none.

## Committed source and checks

Completed session 32 subset: `catalog.ts`, `catalog.test.ts`, `product-selection.ts`, `product-selection.test.ts`. Shopify image IDs/variant associations survive normalization; exact variant images do not silently substitute an unannotated multi-variant gallery. Selection helpers preserve explicit whole-gallery/all-variant intent, exact references, multi-product save/restore and omitted-field refinement. Eight focused offline catalog/selection checks passed. Source diff/imports reviewed; stable hashes, JSON, whitespace, credential scan and explicit-index guards precede commit. No build/provider calls.

Deferred: generation-context/type/agent contract and composition/runtime/UI integration remain outside this bounded subset. The new composition view's missing variations is an observed gap, not proof of a failed provider call. Existing generated OpenWiki is stale; no lifecycle update claimed. Prior description-helper failure remains separately deferred. Three-brand outputs and final exported/fidelity review remain open. No push/deploy or external messages.

## Captures

### 01-clean-base.png

New saved clean-base execution; status says artwork is saved and asks for more copy space; no composed variations visible. No agent request sent. Captured 22:20:51 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; new clean-base saved-review route; `796c901` + dirty.

![New saved clean-base execution; status says artwork is saved and asks for more copy space; no composed variations visible. No agent request sent.](01-clean-base.png)

### 02-brand.png

Updated brand card with font-role icons and Brand settings; selected product retained, no edits. Captured 22:21:01 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; new clean-base saved-review route; `796c901` + dirty.

![Updated brand card with font-role icons and Brand settings; selected product retained, no edits.](02-brand.png)

### 03-brand-settings.png

Brand settings modal with saved visual context and references; no settings changed. Captured 22:21:09 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; new clean-base saved-review route; `796c901` + dirty.

![Brand settings modal with saved visual context and references; no settings changed.](03-brand-settings.png)

### 04-products.png

Updated product grid selection styling and persistent context; cached catalog, no selection change. Captured 22:21:19 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; new clean-base saved-review route; `796c901` + dirty.

![Updated product grid selection styling and persistent context; cached catalog, no selection change.](04-products.png)

### 05-product-context.png

Current exact-image selection panel: one image selected; variant-aware helper checked offline, no panel choices changed. Captured 22:21:29 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; new clean-base saved-review route; `796c901` + dirty.

![Current exact-image selection panel: one image selected; variant-aware helper checked offline, no panel choices changed.](05-product-context.png)

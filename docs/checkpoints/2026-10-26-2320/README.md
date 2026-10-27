# Typography checkpoint — October 26, 2026, 23:20 Pacific

Four useful desktop states at 1280×720 from the same clean-base saved execution: composing with unified conversation panel, full-width composing, brand context popover and product-reference popover. Exact route/selection/timestamps/source state: [captures.json](captures.json). Base `541ff48` plus dirty source; partial checkpoint is not a complete reproducible app release.

## Since 22:50

Conversation/context/composer can now occupy a single left panel with the artwork area offset alongside it. Closed-panel composing retains the floating composer. Four headlines render; supporting-copy fit warnings remain. The brand entry is now Brand information. Independent full brand/product browsing views could not be reliably archived: during two attempts the review returned to Create before capture; stopped repeating navigation and used actual available context popovers. The first screenshot records the expanded conversation; second records its closed/full-width state. No input, manual agent turn, context edit, paid inference or export. Mobile remains unsupported by the available in-app capture API.

## Scope/checks

Completed composing owner's pure `ad-typography.ts` contract: 8% safe inset, 84px headline floor and 42px body floor at output scale. Source reviewed; three direct offline assertions passed for full-image inset, opportunity intersection and exact constants. These checks do not prove rendered font fit or mobile appearance. Associated integration tests import active creative source and remain outside this small checkpoint. All font/runtime/research/uncached extraction and UI changes remain with their owners.

Stable hashes, JSON, whitespace, credential-pattern and explicit-index guards gate commit. Activity logger runs directly because the previous pnpm wrapper attempted dependency preflight; no dependency/install approval changed. Source churn and reset behavior are documented, not repaired here. Generated OpenWiki remains stale for integrated behavior; no refresh claimed. Prior description-helper assertion remains deferred; final composition/body fit/mobile/three-brand deliverables remain open. No push/deploy/external message.

## Captures

### 01-composing.png

Composing with unified left conversation/context/composer panel; body-fit warnings remain. Captured 23:21:21 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; clean-base saved-review route; `541ff48` + dirty.

![Composing with unified left conversation/context/composer panel; body-fit warnings remain.](01-composing.png)

### 02-composing-wide.png

Full-width composition after review reset to Create; intended Brand view was not captured. Captured 23:21:49 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; clean-base saved-review route; `541ff48` + dirty.

![Full-width composition after review reset to Create; intended Brand view was not captured.](02-composing-wide.png)

### 03-brand-context.png

Available brand context popover over saved composition; typography identity retained, no edits. Captured 23:22:35 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; clean-base saved-review route; `541ff48` + dirty.

![Available brand context popover over saved composition; typography identity retained, no edits.](03-brand-context.png)

### 04-product-context.png

Available product context popover over saved composition; one selected image, no changes submitted. Captured 23:22:47 PDT; 1280×720; OLIPOP / Caramel Apple / 12 Pack; clean-base saved-review route; `541ff48` + dirty.

![Available product context popover over saved composition; one selected image, no changes submitted.](04-product-context.png)

---
type: quickstart
title: Run and review the work sample
description: Local setup, current ownership and evidence navigation for the Superpilot Instagram ad workspace.
tags: [setup, workflow, documentation]
verified:
  - by: openwiki/0.5.2
    at: 2026-10-27T08:45:34.663Z
sources:
  - id: openwiki-source-c10e48423012bb8da0ed7dd9
    resource: repo://examples/provenance.json
  - id: openwiki-source-c8b39dcd2a245cd9301a976a
    resource: repo://examples/README.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-41f7bcdf024dd56e4fbc6834
    resource: repo://src/lib/project-env.server.ts
  - id: openwiki-source-e3c286acf310f336267fc752
    resource: repo://src/lib/studio-preview.server.ts
  - id: openwiki-source-8ff0cbecfec56f96bee55e8b
    resource: repo://src/routes/studio-review.tsx
  - id: openwiki-source-5e1b077422a94ae165e88e4e
    resource: repo://vite.config.ts
generated: { by: "codex", at: "2026-10-27T08:45:34.663Z" }
---

# Run and review the work sample

Start with [README](../README.md), the [final writeup](../WRITEUP.md), and the [generated examples](../examples/README.md). The examples are selected real model outputs; they are not a claim that every composed export or product detail has been independently verified.

## Local setup

Use Node.js 24.x and pnpm 11.24.0. Install with `pnpm install --frozen-lockfile`. Put project OpenRouter and Firecrawl credentials in Git-ignored `.env`, then run `pnpm dev`. It binds to `127.0.0.1:3000` with a strict port. Credentials stay on the server; do not use a `VITE_` prefix.

`pnpm typecheck` checks TypeScript, `pnpm build` creates the production bundle, and `pnpm check` runs both. Focused existing tests are available through `pnpm test`; follow the repository's proportional-verification instructions rather than repeating broad checks for every reversible UI edit.

`.studio-data/` holds local scans, requests, responses and images and is excluded from Git. A fresh clone has no saved generations. The development-only `/studio-review` route loads an actual retained execution without starting inference; deliberate manual review requests are separate actions. Production uses the configured private storage adapter.

## Find the owner

| Concern | Source |
| --- | --- |
| Workspace/context/actions | `src/components/studio.tsx`, `src/lib/studio-functions.ts` |
| Agent connection and conversation | `src/components/agent-workspace.tsx`, `agent/` |
| Product identity and references | `src/lib/catalog.ts`, `src/lib/product-selection.ts` |
| Extraction and enrichment | `src/lib/brand*`, `workflows/brand-enrichment.ts` |
| Generation and retained jobs | `src/lib/image-generation.server.ts`, `studio-storage.server.ts`, `workflows/image-generation.ts` |
| Composition and export | `src/lib/composition*`, `src/components/composition-preview.tsx`, `export-actions.tsx` |
| Shared UI and appearance | `src/components/ui/`, `src/styles.css`, `src/routes/__root.tsx` |

The [architecture page](architecture/chat-shell.md) describes current flow and persistence boundaries.

## Evidence

<!-- openwiki: broken internal link [../docs/SESSIONS.md] file "../docs/SESSIONS.md" does not exist. Fix the href or restore the target, then delete this comment. -->
[Development summary](../docs/SESSIONS.md) is the concise entry point. Its historical archive retains detailed notes, while the linked activity journal and visual history distinguish implementation, checks, provider calls and observed UI. Old dirty-checkout screenshots and partial checkpoints do not prove the current complete release. The private source brief and provider logs are not repository deliverables.

---
type: architecture
title: Workspace, agent and durable generation
description: Ownership and runtime flow for shared merchant context, agent actions, retained image jobs, review and appearance.
tags: [workspace, agent, persistence, generation, theme]
verified:
  - by: openwiki/0.5.2
    at: 2026-10-27T08:45:34.663Z
sources:
  - id: openwiki-source-5e1a834885adddf459e37710
    resource: repo://agent/agent.ts
  - id: openwiki-source-0c9a20a926b61cd027fa43b2
    resource: repo://agent/lib/openrouter-model.ts
  - id: openwiki-source-233fd6a0c29896e7219c0df4
    resource: repo://src/components/agent-workspace.tsx
  - id: openwiki-source-0a9231e0b6e4334e45978f58
    resource: repo://src/components/studio.tsx
  - id: openwiki-source-cd2a7cee601f1af75e351684
    resource: repo://src/components/theme-toggle.tsx
  - id: openwiki-source-7d3296704b782eb684734580
    resource: repo://src/components/ui/button.tsx
  - id: openwiki-source-e3c286acf310f336267fc752
    resource: repo://src/lib/studio-preview.server.ts
  - id: openwiki-source-db982063e71038cc61af28b7
    resource: repo://src/lib/studio-storage.server.ts
  - id: openwiki-source-85ad1858164990828940180c
    resource: repo://src/routes/__root.tsx
  - id: openwiki-source-0c6f53ed9d154e5c61b75244
    resource: repo://src/routes/index.tsx
  - id: openwiki-source-8ff0cbecfec56f96bee55e8b
    resource: repo://src/routes/studio-review.tsx
  - id: openwiki-source-146419bb9b2415894a6bd677
    resource: repo://src/styles.css
  - id: openwiki-source-e46f98928b31ee60f03ed2b5
    resource: repo://workflows/image-generation.ts
generated: { by: "codex", at: "2026-10-27T08:45:34.663Z" }
---

# Workspace, agent and durable generation

The `/` route mounts `Studio`. `src/components/studio.tsx` owns merchant context, stage/navigation, product references and generation selection; `agent-workspace.tsx` connects Eve messages and tool results to application actions. The application is no longer a local acknowledgement shell. Direct controls and agent results operate on the workspace rather than a separate demo conversation.

## Ownership and state

`agent/` contains the root agent, brand/product/creative specialists and tools. The root model uses the shared Sol transport with priority/low settings; creative work has its own configured provider. `agent-workspace.tsx` owns live agent connections, persisted conversation projection and composer placement. `project-chats.ts` supplies the browser registry/history boundary. Shared controls remain in `src/components/ui/`; semantic appearance tokens are in `src/styles.css`.

`studio-storage.server.ts` stores original scans and generation records separately from browser drafts. Local storage files live under `.studio-data/`; Vercel mode uses private Blob. Exclusive reservation avoids duplicate jobs, and retained image responses can recover a paid result after worker interruption. It must not silently regenerate an image to repair placement.

## Generation and review

`workflows/image-generation.ts` waits for usable brand context, prepares the job, invokes image generation, then analyzes generated composition. Image/preparation failure is recorded separately from unavailable placement, preserving saved artwork. Placement-only retry is a distinct path.

The development-only `/studio-review` loader reads an actual completed execution and validates its context and image signature. Loading the review does not start or repair a job. Deliberate manual review actions are separate from passive loading. `composition-preview.tsx` and `composition.ts` own canvas rendering; export uses the reviewed composition. Successful source/type checks do not establish visual fidelity or every font/layout case.

## Document shell and theme

`__root.tsx` owns metadata, root error/not-found surfaces, hydration and the global grid. Its pre-hydration script and the theme switch persist `superpilot-theme-v1`; a new visitor defaults to light. Explicit dark and legacy system preference are handled without requiring browser storage to succeed. The conversation sidebar can have scoped dark surfaces independently of the main page.

## Checks and navigation

Focused tests cover catalog safety, selection/edit preservation, generation/recovery and placement contracts. Use `pnpm typecheck` for types and `pnpm build` for the production bundle. The [quickstart](../quickstart.md) links reviewer instructions and evidence; historical checkpoints document observed states rather than complete releases.

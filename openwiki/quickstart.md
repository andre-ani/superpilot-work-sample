---
type: quickstart
title: Quickstart
description: Run the local ad-studio shell, find implementation owners, track active work, and configure optional OpenWiki inference.
tags: [setup, workflow, documentation]
verified:
  - by: openwiki/0.5.2
    at: 2026-10-27T01:27:18.577Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-19c2f938d78b759c2275c5f8
    resource: repo://scripts/clock.mjs
  - id: openwiki-source-a968c4d23f2e02f9e4e8ff4e
    resource: repo://scripts/wiki.mjs
generated: { by: "codex", at: "2026-10-27T01:27:18.577Z" }
---

# Quickstart

This repository currently contains the initial chat interface for an Instagram ad work sample. It does not yet generate images. See [Chat shell and theme ownership](architecture/chat-shell.md) before extending the UI.

## Run and check

With Node.js 22.12+ and pnpm 11.24.0:

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

The development script binds to `127.0.0.1:3000` with a strict port. The scaffold runs without a model key. Keep the server running for local review. `pnpm check` runs TypeScript followed by a production build; `pnpm build` also generates the TanStack route tree.

## Find the owner

| Change | Owner |
| --- | --- |
| Chat and local submission | `src/routes/index.tsx` |
| Document shell and pre-hydration theme | `src/routes/__root.tsx` |
| Shared button/input | `src/components/ui/` |
| Theme preference | `src/components/theme-toggle.tsx` |
| Colors, radii, typography | `src/styles.css` |
| Session evidence and decisions | `docs/SESSIONS.md`, `WRITEUP.md` |

## Time and checkpoints

`pnpm clock` reports the sum of recorded active intervals in `docs/time-log.json`. `pnpm clock pause` closes the open interval; `pnpm clock start` opens a new one only if the clock is paused. The six-hour project clock is shared across concurrent chats. Paused time is excluded, but idle time is not detected automatically. Use the user-directed work/pause boundaries.

The author's local Codex automation checks for safe commits about every 30 minutes. It is not installed by cloning this repository. Consult `AGENTS.md` and session ownership before editing or checkpointing.

## OpenWiki and the project key

The initial wiki is authored through the Codex OpenWiki lifecycle. The optional `pnpm wiki` runner reads `OPENROUTER_API_KEY` and `OPENWIKI_MODEL_ID` directly from the project's Git-ignored `.env.local`. If that file or either value is missing, it exits before launching the CLI, even when the shell contains other credentials. It then invokes the installed OpenWiki CLI with OpenRouter explicitly selected. Do not run paid generation until the project key and model are deliberately selected.

The initializer's daily GitHub workflow is Git-ignored and not published. The local commit heartbeat is the only configured schedule for this project.

The brief summary in `docs/BRIEF.md` identifies the still-missing deliverables: real ads for at least three brands and a final evidence-based one-page writeup. The original PDF is not part of the repository.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/transparent.svg?title=Superpilot&subtitle=Instagram+ad+studio&align=left&mode=dark" />
  <img alt="Superpilot — Instagram ad studio" src="https://shieldcn.dev/header/transparent.svg?title=Superpilot&subtitle=Instagram+ad+studio&align=left&mode=light" />
</picture>

[![TanStack Start](https://shieldcn.dev/badge/stack-TanStack%20Start-blue.svg?variant=secondary)](https://tanstack.com/start)
[![TypeScript](https://shieldcn.dev/badge/types-TypeScript-blue.svg?variant=secondary)](https://www.typescriptlang.org/)
[![shadcn/ui](https://shieldcn.dev/badge/ui-shadcn-black.svg?variant=secondary)](https://ui.shadcn.com/)

A work sample for creating Instagram image ads from brand and product context.

**Current state:** a centered, single-line chat shell with light/dark mode. Submitting a prompt displays a local acknowledgement. AI generation, exports, and the three-brand output gallery are not implemented yet.

## Run locally

Requires Node.js 22.12+ and pnpm 11.24.0. Development uses port 3000 on localhost.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Put the project-only OpenRouter key in `OPENROUTER_API_KEY` in `.env.local` when ready. The shell runs without a key. Never commit that file or expose the key through a `VITE_` variable. Prompts currently live in component memory and clear on reload; the theme preference persists in browser storage.

```sh
pnpm check          # TypeScript and production build
pnpm clock          # Shared active-work clock
pnpm clock pause    # Stop counting when work pauses
pnpm clock start    # Resume; safe if already running
```

## Project notes

- [Working writeup](WRITEUP.md): approach, results, and unresolved problems.
- [Sessions](docs/SESSIONS.md): decisions, ownership, and verification as the project develops.
- [Brief summary](docs/BRIEF.md): final deliverables and constraints.
- [Agent instructions](AGENTS.md): project exceptions and safe checkpoints.

The project started October 26, 2026 at 18:20 America/Vancouver. It has a six-hour active-work budget and is due October 27 at noon. A local Codex heartbeat checks for safe commits approximately every 30 minutes. This schedule is local to the author's app; cloning the repository does not install an automation.

## OpenWiki

The installed Codex integration maintains a small [source-backed wiki](openwiki/quickstart.md). To run OpenWiki independently, install its CLI, set `OPENWIKI_MODEL_ID` to an OpenRouter model in `.env.local`, and run `pnpm wiki`. The command reads the key and model directly from that project file, explicitly selects OpenRouter, and refuses to run without both values; ambient credentials are not a fallback. Standalone generation is pending that configuration and consumes the same project inference budget. The initializer's daily GitHub workflow is excluded; no remote wiki schedule is active.

## Stack

TanStack Start/Router, React, TypeScript, Vite, Tailwind, shadcn/ui, and Tabler. Geist is self-hosted through Fontsource. No ReUI, Nucleo, WRB App SDK, special-license UI packages, or deployment is required.

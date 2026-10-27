<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/transparent.svg?title=Superpilot&subtitle=Instagram+ad+studio&align=left&mode=dark" />
  <img alt="Superpilot — Instagram ad studio" src="https://shieldcn.dev/header/transparent.svg?title=Superpilot&subtitle=Instagram+ad+studio&align=left&mode=light" />
</picture>

[![TanStack Start](https://shieldcn.dev/badge/stack-TanStack%20Start-blue.svg?variant=secondary)](https://tanstack.com/start)
[![TypeScript](https://shieldcn.dev/badge/types-TypeScript-blue.svg?variant=secondary)](https://www.typescriptlang.org/)
[![shadcn/ui](https://shieldcn.dev/badge/ui-shadcn-black.svg?variant=secondary)](https://ui.shadcn.com/)

An agent-led workspace for creating Instagram image ads from a Shopify store: collect brand and product context, develop a creative brief, then generate and compose an ad.

The interface combines conversation with direct controls for brand review, product references, creative direction, and saved outputs. See [WRITEUP.md](WRITEUP.md) for the approach, experiments, results, and remaining limitations.

## Run locally

Requires **Node.js 24+** and **pnpm 11.24.0**.

```sh
pnpm install --frozen-lockfile
```

Create `.env` in the repository root:

```dotenv
OPENROUTER_API_KEY=your_openrouter_key
FIRECRAWL_API_KEY=your_firecrawl_key
```

OpenRouter supplies the conversational models and image generation; Firecrawl supplies visual brand extraction. Provider calls use your configured accounts and may incur charges. Keep credentials server-side; `.env` is Git-ignored.

```sh
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The server uses a strict port; stop another process on port 3000 or choose a different port explicitly.

## Try the workflow

1. Enter a public Shopify storefront URL, such as `drinkolipop.com`.
2. Review the extracted brand identity. Basic context arrives first; visual enrichment fills in colors and typography. Correct uncertain details and add creative direction.
3. Add product context and refine the reference images or variants.
4. Develop the ad brief, generate artwork, and review it in the studio alongside copy and layout controls.

Saved scans and outputs are reused where available. In development, `/studio-review` opens a genuine saved generation with isolated review edits and inference disabled. It requires an existing completed generation in local storage; a fresh clone does not include one.

## Project notes and evidence

- [Writeup](WRITEUP.md): approach, experiments, results, tradeoffs, and unresolved problems.
- [Session summaries](docs/SESSIONS.md): implementation chronology, decisions, ownership, and recorded verification.
- [Brief summary](docs/BRIEF.md): deliverables, scope, and constraints.
- [Working plan](docs/PLAN.md): accepted decisions, intended workflow, and open questions.

## Architecture

- **Application:** React, TanStack Start/Router, strict TypeScript, Vite, and Nitro.
- **Interface:** Tailwind, shadcn/ui, Tabler icons, and Motion; light/dark preference persists.
- **Agent:** Eve coordinates conversation and tools; native Workflow handles durable background work.
- **Context:** Shopify's public catalog provides product data; a bounded homepage parser provides initial brand context, followed by Firecrawl enrichment.
- **Images:** GPT Image 2 receives product references and confirmed context. The studio composes artwork with editable text and logo layers.
- **Persistence:** local `.studio-data/` stores scan evidence, generation requests/responses, and image files. Browser storage keeps editable workspace state. Private Vercel Blob storage is also supported by the storage adapter.

Original extraction evidence stays separate from merchant edits. Background enrichment preserves explicitly edited fields, and generation requests retain their input context. Keep `.studio-data/` to preserve local scans and outputs; it is excluded from Git.

Source entry points:

| Area | Location |
| --- | --- |
| Workspace and controls | `src/components/studio*`, `src/components/agent-workspace.tsx` |
| Routes and server endpoints | `src/routes/` |
| Agent configuration and tools | `agent/` |
| Extraction, catalog, generation, and storage | `src/lib/` |
| Durable background jobs | `workflows/` |

## Checks

```sh
pnpm typecheck  # Strict TypeScript
pnpm test       # Data integrity, input safety, and recovery checks
pnpm build      # Production build
pnpm check      # Typecheck followed by production build
```

## Current limitations

This is an evolving prototype. One OLIPOP image-generation flow has been verified; the three-brand output set is still incomplete. The latest conversation, product-reference, and creative-studio integrations require end-to-end verification. Existing generated lettering is baked into the artwork; additional studio text remains separately editable. Composed export behavior and product fidelity still need final review.

Authentication and Meta publishing are outside this prototype's scope.

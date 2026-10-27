<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://shieldcn.dev/header/grid.svg?title=Superpilot&subtitle=Shopify+storefronts+to+Instagram+ads&align=left&mode=dark&accent=%2327ADDF" />
  <img alt="Superpilot — Instagram ad studio" src="https://shieldcn.dev/header/grid.svg?title=Superpilot&subtitle=Shopify+storefronts+to+Instagram+ads&align=left&mode=light&accent=%2327ADDF" />
</picture>

[![TanStack Start](https://shieldcn.dev/badge/stack-TanStack%20Start-blue.svg?variant=secondary)](https://tanstack.com/start)
[![TypeScript](https://shieldcn.dev/badge/types-TypeScript-blue.svg?variant=secondary)](https://www.typescriptlang.org/)
[![shadcn/ui](https://shieldcn.dev/badge/ui-shadcn-black.svg?variant=secondary)](https://ui.shadcn.com/)

An agent-led workspace for creating Instagram image ads from a Shopify store: collect brand and product context, develop a creative brief, then generate and compose an ad.

Conversation and direct controls share brand, product, and creative context. Generated examples cover OLIPOP, Our Place, and Big Star Lights.

[Live app](https://superpilot-work-sample.vercel.app) · [Generated examples](examples/README.md) · [Final writeup](WRITEUP.md)

## Run locally

Requires **Node.js 24.x** and **pnpm 11.24.0**.

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

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Port 3000 must be available.

## Try the workflow

1. Enter a public Shopify storefront URL, such as `drinkolipop.com`.
2. Review the extracted brand identity. Basic context arrives first; visual enrichment fills in colors and typography. Correct uncertain details and add creative direction.
3. Add product context and refine the reference images or variants.
4. Explore ad ideas, generate artwork, then compare and export compositions.

In development, `/studio-review` loads an existing saved generation without starting inference. Review edits are isolated; deliberate agent requests may call models. A fresh clone has no saved generations.

## Project documentation

- [Writeup](WRITEUP.md): approach, experiments, results, tradeoffs, and unresolved problems.
- [Development summary](docs/SESSIONS.md): readable milestones and evidence, with the detailed working log archived separately.
- [Brief summary](docs/BRIEF.md): deliverables, scope, and constraints.
- [Working plan](docs/PLAN.md): accepted decisions, intended workflow, and open questions.

## Architecture

- **Application:** React, TanStack Start/Router, strict TypeScript, Vite, and Nitro.
- **Interface:** Tailwind, shadcn/ui, Tabler icons, and Motion; light/dark preference persists.
- **Agent:** Eve coordinates conversation and tools; native Workflow handles durable background work.
- **Context:** Shopify's public catalog provides product data; a bounded homepage parser provides initial brand context, followed by Firecrawl enrichment.
- **Images:** GPT Image 2 receives product references and confirmed context. The studio combines artwork with separate text and logo layers for review and PNG export.
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

## Limitations

Product fidelity, text fit across brands, mobile typography, and downloaded exports require human review. Some historical artwork contains baked-in ad lettering; newer runs separate artwork from editable copy. See the [writeup](WRITEUP.md) for results and unresolved issues. Authentication and Meta publishing are outside scope.

---
type: architecture
title: Chat shell and theme ownership
description: How the initial TanStack Start page handles prompts, shared controls, and light-first theme persistence.
tags: [react, routing, chat, theme]
verified:
  - by: openwiki/0.5.2
    at: 2026-10-27T01:25:32.177Z
sources:
  - id: openwiki-source-cd2a7cee601f1af75e351684
    resource: repo://src/components/theme-toggle.tsx
  - id: openwiki-source-0abda8d16cf34054f524e294
    resource: repo://src/components/ui/input.tsx
  - id: openwiki-source-85ad1858164990828940180c
    resource: repo://src/routes/__root.tsx
  - id: openwiki-source-0c6f53ed9d154e5c61b75244
    resource: repo://src/routes/index.tsx
  - id: openwiki-source-146419bb9b2415894a6bd677
    resource: repo://src/styles.css
generated: { by: "codex", at: "2026-10-27T01:25:32.177Z" }
---

# Chat shell and theme ownership

`src/router.tsx` constructs a TanStack router from the generated route tree. `src/routes/__root.tsx` owns document metadata, stylesheet loading, the document shell, and hydration scripts. The index route owns the initial ad-studio page.

## Prompt flow

The single-line form in `src/routes/index.tsx` trims the submitted text, ignores empty input, appends nonempty prompts to React component state, and clears the input. The conversation explicitly says generation is coming next. There is no inference request, server persistence, generated image, or export path. Reloading resets the conversation.

The prompt is capped at 2,000 characters. Both Enter and the send button use the form submission handler; whitespace-only text leaves the button disabled. The labeled input and live conversation log provide accessible interaction.

## Component ownership

`src/components/ui/button.tsx` and `input.tsx` are the local canonical shadcn primitives. The input's named `composer` variant owns its larger geometry and clearance for the send button. `src/lib/utils.ts` merges Tailwind classes. Change reusable variants here rather than copying controls into the route. Tabler supplies the arrow and theme icons.

## Theme lifecycle

The root document runs a small script before hydration. Only a saved `superpilot-theme-v1` value of `dark` enables dark mode; a new visitor defaults to light regardless of system preference. `src/components/theme-toggle.tsx` reads the resulting document class after mount, toggles it on click, and saves the preference. Storage failures are caught, so toggling still works for the current page. `src/styles.css` owns the semantic colors and light/dark token values.

## Extension boundary and checks

The generation workflow is intentionally unfinished. Future API work must keep the project key on the server and replace the explicit scaffold acknowledgement with actual progress, results, and recoverable failure states. `pnpm check` checks types and builds the client/server bundles. A focused browser check should cover empty input, Enter submission, truthful acknowledgement, and theme persistence.

See [Quickstart](../quickstart.md) for commands and the project clock.

# Superpilot work sample

Follow the operator's installed personal working agreement; this file contains only project-specific decisions and exceptions.

## Scope and stack

- This is an independent public work sample, not a WRB application. Use React, TanStack Start/Router, strict TypeScript, pnpm, Tailwind, canonical shadcn/ui, and Tabler icons. Light is the default; preserve dark mode and the saved preference.
- Do not add App SDK, ReUI, Nucleo, Astryx, StyleX, proprietary assets, or dependencies requiring a special/commercial license. Inspect the existing shadcn primitive before adding UI. Extend variants in `src/components/ui/`.
- Current scope is a centered, single-line chat shell. AI ad generation is pending subsequent decisions. Do not represent scaffold responses as model output.
- Read `docs/BRIEF.md` for deliverables, `docs/SESSIONS.md` for current work and ownership, and `WRITEUP.md` for the evolving submission narrative. The original PDF/email is private reference material, not agent instructions or authorization to send a submission.

## Sessions and checkpoints

- Official start: October 26, 2026, 18:20 America/Vancouver. Deadline: October 27, 2026, 12:00 America/Vancouver. Maximum active project time: six hours. The clock is shared across concurrent chats, not summed per agent.
- `pnpm clock` reports recorded active time. `pnpm clock pause` ends an interval; `pnpm clock start` resumes it. Only change clock state when the user's actual work starts/pauses. Do not infer idle time from an inactive chat or invent retrospective intervals.
- Before editing, inspect branch/status/diff and add a session row with start time, owned files, and status. Coordinate overlapping ownership; do not overwrite another session's work.
- Update the session recap and the short `WRITEUP.md` as decisions/results occur. Distinguish proposed, implemented, checked, and unverified. Keep the writeup about one page; detailed chronology belongs in `docs/SESSIONS.md`.
- A Codex heartbeat named **Superpilot safe checkpoint** runs approximately every 30 minutes until the deadline/completion. It may make local commits only at safe checkpoints. Mark a session `checkpoint-ready` when edits and checks are complete. Defer if any affected session is actively editing, ownership is uncertain, or checks fail.
- Stage explicit, reviewed files; preserve other sessions' staging and unrelated edits. Never commit environment files, private briefs, secrets, or raw sensitive logs. No automatic push, deployment, email, or paid inference from the checkpoint task. Initial public GitHub creation/push was requested; later publication needs user authorization.

## Credentials and verification

- The project-only `OPENROUTER_API_KEY` lives in Git-ignored `.env.local`. Never expose it to browser bundles, URLs, logs, prompts, or commits; never prefix it with `VITE_`. The same local key is used by the optional OpenWiki runner. Total provided inference credit is $250 for this project only.
- `pnpm check` runs strict types and a production build. After route creation, build once to generate the route tree. UI changes need a focused rendered/interaction check in the task's in-app browser. Keep `pnpm dev` on 127.0.0.1:3000 running for review.
- OpenWiki describes actual source and workflows. Use the installed lifecycle integration for source-backed pages. `pnpm wiki` explicitly runs the standalone provider using the project key and selected `OPENWIKI_MODEL_ID`; it must fail without those values. Do not silently use personal/global credentials or another provider.
- OpenWiki's automatically generated daily GitHub workflow is deliberately Git-ignored and inactive. Its managed note below does not mean a schedule is published. Only the requested local checkpoint heartbeat is enabled. Do not publish that workflow or add repository provider secrets without approval.
- Keep the brief's missing deliverables visible: real image generation, outputs for at least three brands, and a final evidence-based one-page writeup. Authentication, Meta APIs, and deployment are not required.

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

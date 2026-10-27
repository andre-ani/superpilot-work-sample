# Session log

All human-facing times use America/Vancouver. The project clock is in `time-log.json`; concurrent sessions share elapsed project time. Do not sum agent durations or count a paused interval as active work.

| Session | Started | Status | Ownership |
| --- | --- | --- | --- |
| 01 — Initialization | 2026-10-26 18:20 | checkpoint-ready | Initial app, configuration, documentation, clock, repository setup |

## 01 — Initialization

**Request:** initialize the project, start the clock, prepare a public repository, keep a running writeup, and arrange safe commits about every 30 minutes. Begin with a centered, single-line chat.

**Decisions:** TanStack Start, React, strict TypeScript, pnpm, shadcn/ui, Tabler, light-first persistent theming. Use no WRB packages or specially licensed dependencies. Keep the supplied brief and project key out of Git. Keep image-generation/model decisions open until the next session. SnapCN was consulted; its Remotion components are not needed for this static application.

**Implementation:** scaffold with an honest local chat placeholder; project-local credential template; ShieldCN README; shared clock; checkpoint heartbeat. OpenWiki's two-page source-backed wiki is complete. Its optional provider runner reads only the project key/model file; personal OpenWiki settings are unchanged. The initializer's automatic daily provider workflow is excluded from Git; only the requested local commit heartbeat is enabled.

**Verification (18:28):** `pnpm check` passed strict TypeScript and both client/server production builds. In-app browser checks confirmed prompt submission, empty-input disabling, light/dark rendering, theme persistence across reload, and no captured console warnings/errors. The dev server is running at `http://127.0.0.1:3000`. The optional wiki runner refuses missing project credentials even when dummy ambient credentials exist; no inference was sent. OpenWiki finalized successfully against the initial Git commit. Dependency metadata shows standard open-source licenses; no specially licensed UI packages were added. ShieldCN header and badge URLs returned HTTP 200.

**Setup fixes:** TypeScript 7 removed `baseUrl`; adjusted the config to relative `paths`. The shadcn generator added a separate `cn` package; used the local utility and removed that redundant dependency. OpenWiki needed a Git baseline before its final provenance checkpoint; this is now recorded correctly.

**Repository:** `https://github.com/andre-ani/superpilot-work-sample` created public. Initial source checkpoint: `811f00a`. Publication/readback is the final initialization step. The clock remains running across the user's next sessions; pause explicitly when work stops.

**Next:** provide the project key locally; choose the brand context and image-generation approach; produce and evaluate ads for three brands. No paid inference or generated ad outputs yet.

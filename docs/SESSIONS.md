# Session log

All human-facing times use America/Vancouver. The project clock is in `time-log.json`; concurrent sessions share elapsed project time. Do not sum agent durations or count a paused interval as active work.

| Session | Started | Status | Ownership |
| --- | --- | --- | --- |
| 01 — Initialization | 2026-10-26 18:20 | active | Initial app, configuration, documentation, clock, repository setup |

## 01 — Initialization

**Request:** initialize the project, start the clock, prepare a public repository, keep a running writeup, and arrange safe commits about every 30 minutes. Begin with a centered, single-line chat.

**Decisions:** TanStack Start, React, strict TypeScript, pnpm, shadcn/ui, Tabler, light-first persistent theming. Use no WRB packages or specially licensed dependencies. Keep the supplied brief and project key out of Git. Keep image-generation/model decisions open until the next session. SnapCN was consulted; its Remotion components are not needed for this static application.

**Implementation:** scaffold with an honest local chat placeholder; project-local credential template; ShieldCN README; shared clock; checkpoint heartbeat. OpenWiki provider preparation uses the same project key without changing personal OpenWiki configuration.

**Verification:** production build passed. TypeScript 7 removed `baseUrl`; adjusted the config to use relative `paths`. The shadcn generator emitted an incorrect `cn` import; corrected it to the local utility. Final type, browser, GitHub, and wiki checks are pending.

**Next:** provide the project key locally; choose the brand context and image-generation approach; produce and evaluate ads for three brands. No paid inference or generated ad outputs yet.

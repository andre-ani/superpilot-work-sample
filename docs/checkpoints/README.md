# Checkpoint ledger

Local checkpoints only. Never infer that a documentation checkpoint verifies or contains the working application.

## Latest checkpoint

Prepared October 26, 2026, 19:48 America/Vancouver: [snapshot and scope](2026-10-26-1948/README.md). Successful commit hash/time will be recorded immediately after Git confirms it. Previous successful commit: `d8dc14d`, October 26 at 18:28:47 Pacific.

## Deferred groups

- `src/`, `agent/`, `workflows/`, `public/`, generation scripts, package/lock/build/deployment configuration: active runtime, UX, and creative ownership; no stable combined handoff yet.
- `README.md`, generated `openwiki/`: stale runtime descriptions; refresh against stable source using the installed OpenWiki lifecycle, then checkpoint separately. No paid standalone runner.
- `docs/PLAN.md`, extraction comparison records, `docs/time-log.json`, ignore/config changes outside this checkpoint: preserve concurrent ownership; review separately. User clock is unchanged by checkpoint work.
- Environment files: never staged.

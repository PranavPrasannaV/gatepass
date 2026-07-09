# Eval repo: vulnerable-nextjs-mcp

A deliberately vulnerable fixture app used by quickstart Scenario 1 (SC-003). Planted issues
below. Classes marked (deferred) require detectors not yet implemented in the MVP slice.

| # | File | Class | Tier | Detected by MVP? |
|---|------|-------|------|------------------|
| 1 | dist/app.bundle.js | exposed-secret | verified | ✅ |
| 2 | mcp/server.ts | unauth-mcp-transport | verified | ✅ |
| 3 | mcp/tools.json | tool-poisoning | research | ✅ |
| 4 | supabase/policies.sql | rls-gap | verified | ⏳ deferred (detector T023) |
| 5 | mcp/tools.json + src/db.ts | cross-surface (scoped tool / unscoped client) | research | ⏳ deferred (correlation T025) |

Do NOT use these values anywhere real — they are non-functional test fixtures.

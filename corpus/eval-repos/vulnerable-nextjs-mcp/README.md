# Eval repo: vulnerable-nextjs-mcp

A deliberately vulnerable fixture app used by quickstart Scenario 1 (SC-003). All planted
issues below are now detected by the implemented detector set.

| # | File | Class | Tier | Detected? |
|---|------|-------|------|-----------|
| 1 | dist/app.bundle.js | exposed-secret | verified | ✅ |
| 2 | mcp/server.ts | unauth-mcp-transport | verified | ✅ |
| 3 | mcp/tools.json | tool-poisoning | research | ✅ |
| 4 | supabase/policies.sql | rls-gap | verified | ✅ |
| 5 | mcp/tools.json | unbounded-tool-param | verified | ✅ |
| 6 | mcp/tools.json + src/db.ts | cross-surface-scope-mismatch | research | ✅ (spans two surfaces) |

`pnpm scan corpus/eval-repos/vulnerable-nextjs-mcp` reports 4 verified + 2 research findings.
Do NOT use these values anywhere real — they are non-functional test fixtures.

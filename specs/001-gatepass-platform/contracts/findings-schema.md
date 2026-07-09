# Contract: Findings Schema (canonical JSON)

The single findings format emitted by engine, CLI, runner, and hosted workers; consumed by
dashboard, PR commenter, gate, evidence, and benchmark. Versioned with the ruleset.

```jsonc
{
  "schema": "gatepass.findings/1",
  "scan": {
    "id": "uuid",
    "rulesetVersion": "2026.07.0",
    "executionMode": "hosted | runner | cli",
    "commitSha": "…",
    "surfacesScanned": ["app_code", "agent_code", "mcp_server", "tool_defs", "permission_scopes"]
  },
  "findings": [
    {
      "fingerprint": "sha256:…",              // stable across scans for dedupe
      "tier": "verified",                       // closed enum: verified | research
      "classId": "exposed-secret",
      "severity": "critical",
      "surfaces": ["app_code"],
      "locations": [{ "path": "…", "startLine": 1, "endLine": 3, "surface": "app_code" }],
      "explanation": "plain-language, always present",
      "reproduction": {                          // REQUIRED iff tier=verified (FR-008)
        "kind": "command | http | inspection",
        "steps": ["…"],                          // secrets redacted (edge case: redaction)
        "expected": "what confirms the issue"
      },
      "confidence": null,                        // REQUIRED (0.000–1.000) iff tier=research
      "suggestedFix": { "kind": "diff", "content": "unified diff" }   // optional
    }
  ]
}
```

**Validation rules (enforced by `packages/findings` on every producer and consumer):**

1. `tier=verified` ⇒ `reproduction` present ∧ `confidence` null.
2. `tier=research` ⇒ `confidence` present ∧ rendered UIs must display it (FR-010).
3. Unknown `tier` values are a hard parse error — no third state can enter the system.
4. `surfaces.length ≥ 2` marks a cross-surface finding (FR-002 reporting).
5. Reproduction steps must pass the redaction linter (no secret values verbatim).

**Exports**: lossless JSON (above), SARIF 2.1.0 (tier encoded via `properties.tier`,
confidence via `properties.confidence`) for GitHub code-scanning ingestion.

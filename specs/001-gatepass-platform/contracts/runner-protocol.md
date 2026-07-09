# Contract: Self-Hosted Runner Protocol (Scale tier)

The runner embeds the same engine+detectors as hosted workers. Code never leaves customer
infrastructure; only this protocol's payloads do (clarification Q1, FR-006a).

## Authentication

- Org-scoped runner token (`RunnerToken`), sent as `Authorization: Bearer`; revocable;
  hashed at rest.

## Endpoints used by the runner (subset of `/v1`)

| Method & Path | Direction | Payload |
|---|---|---|
| POST /runner/handshake | runner → platform | runner version, embedded rulesetVersion. Response: accept, or `426 upgrade_required` if below org's `min_ruleset_version` (version floor, R10) |
| GET /runner/config/:repoOrServer | runner → platform | scan settings, enabled rulesets, LLM flag |
| POST /runner/results | runner → platform | **canonical findings JSON + posture snapshot only** — schema-validated; any payload containing file contents is rejected |
| POST /runner/heartbeat | runner → platform | liveness for fleet scheduling |

## Hard guarantees

1. The results endpoint's schema has no field capable of carrying source code; oversized
   `locations`/`explanation` fields are truncated server-side and flagged.
2. Runner LLM calls (if org has LLM analysis enabled) go through the same Gatepass gateway
   with zero-retention — or are disabled entirely for air-gapped mode (static-only, reduced
   research-tier coverage per FR-011a).
3. Every accepted results upload writes an AuditEvent with runner token identity.
4. Determinism: same ruleset version + same input tree ⇒ byte-identical findings
   (fingerprints), hosted or runner — enforced by parity tests in CI (FR-006a).

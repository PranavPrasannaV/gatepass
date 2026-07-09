# Contract: GitHub Integration

## App permissions (scope-level enforcement of FR-015 / Principle III)

| Permission | Level | Why |
|---|---|---|
| contents | **read** | clone for scanning — never write |
| pull_requests | write | review comments + suggested-change blocks only |
| checks | write | CI gate check runs |
| metadata | read | repo listing |

The App requests **no** commit, workflow, or administration write scopes. There is no code
path that creates commits, branches, or PRs (SC-005 auditable via AuditEvent).

## Webhooks consumed

| Event | Action |
|---|---|
| pull_request (opened, synchronize) | enqueue incremental scan (FR-006) |
| push (default branch) | enqueue full/incremental scan |
| installation / installation_repositories | connect/disconnect repos |

## PR remediation delivery (FR-012)

- One review per scan, containing per-finding comments: finding summary, tier badge
  (verified reproduction inline; research confidence shown — FR-010), and a
  ```suggestion``` block with the diff where available.
- Never more than one review per scan; no unsolicited PRs (spec US2 scenario 5).

## CI gate as Check Run (FR-016, FR-016a)

| Situation | Check conclusion |
|---|---|
| No findings over threshold | success |
| Findings over threshold | **failure** with explanation + links (blocks via branch protection) |
| Scan failed / timed out, repo fail_open (default) | **neutral** + "scan unavailable" annotation |
| Scan failed / timed out, repo fail_closed | failure with outage explanation |

Threshold configured per repo (`gate_mode`): off / block_verified / block_threshold
(severity+count matrix).

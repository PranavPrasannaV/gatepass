# Contract: Open-Source Scanner CLI (Free tier)

The CLI embeds `@gatepass/engine` + `@gatepass/detectors` unchanged, so its findings match
hosted/runner output for the same ruleset version (FR-006a). Research-tier (LLM-assisted)
analysis is available only when authenticated; offline it runs static-only.

## Usage

```
gatepass scan <path> [options]
gatepass <path> [options]        # `scan` is optional
```

## Options

| Flag | Effect |
|---|---|
| `-o, --output <file>` | Write canonical findings JSON (`gatepass.findings/1`) to file |
| `--json` | Print findings JSON to stdout |
| `--no-semantic` | Disable research-tier analysis (static-only, reduced coverage — FR-011a) |
| `--fail-on <mode>` | Exit non-zero when findings exist: `none` (default) / `verified` / `any` |
| `-h, --help` | Help |

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success; no findings over the `--fail-on` threshold |
| 1 | Findings exceeded the `--fail-on` threshold (CI-gate use) |
| 2 | Usage error or unreadable scan path |

## Output

Human-readable by default (verified block first with reproductions, research block with
confidence). `--json`/`--output` emit the canonical findings document, validated through
`@gatepass/findings` — a malformed or mislabeled finding cannot be produced.

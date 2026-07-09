# Gatepass

**Precision application security for the AI-native stack.** Gatepass scans the code AI writes
and the agents it powers — AI-generated application code and agentic infrastructure (MCP servers,
tool definitions, permission scopes, autonomous loops) — and reports findings in two honestly
separated tiers: **verified** (deterministic, each with a runnable reproduction) and
**research-tier** (semantic agentic classes, confidence-scored). Fixes are delivered inside the
developer's own workflow; Gatepass never mutates customer code or CI.

> **New here / taking over the project? Read [HANDOFF.md](HANDOFF.md) first** — it is the complete
> context (what's built, what's deferred and why, how to run and continue everything).

## Quick start

```bash
# Node >=22, pnpm 9 (npm i -g pnpm@9)
pnpm install

pnpm test                                   # unit + integration tests
pnpm lint && pnpm format:check              # ESLint + Prettier
pnpm corpus:measure --corpus corpus-v1      # precision + reproduction gate (must PASS)

pnpm scan corpus/eval-repos/vulnerable-nextjs-mcp   # scan a sample repo (the OSS CLI)
pnpm --filter @gatepass/api start                   # run the API on :3000
```

## Status

- **131 tests pass** · all packages typecheck · lint 0 errors · Prettier clean
- **Corpus gate:** 12 vulnerability classes, **100% TP / 0% FP**, all reproductions confirmable
- **Self-scan:** Gatepass passes its own scan
- The analysis core and platform logic are complete and tested. Remaining work needs live
  infrastructure (Postgres, GitHub App, Vanta, Anthropic key, cloud deploy, dashboard) — see
  the blockers table in [HANDOFF.md §5](HANDOFF.md).

## How it's organized

Built with [GitHub Spec-Kit](https://github.com/github/spec-kit). The spec, plan, contracts, and
task ledger live in [`specs/001-gatepass-platform/`](specs/001-gatepass-platform/); the governing
[constitution](.specify/memory/constitution.md) is non-negotiable. The `/speckit-*` commands are
vendored in [`.claude/skills/`](.claude/skills/) so you can continue the workflow directly
(`/speckit-converge` → `/speckit-implement`).

```
packages/{findings,rules-registry,engine,detectors,semantic,github,evidence,shared}
apps/{api,workers}   cli/   runner/   benchmark/   corpus/
```

See [CLAUDE.md](CLAUDE.md) for the hard rules any contributor (human or AI) must follow.

## License

Proprietary — © ZiliconCloud. All rights reserved.

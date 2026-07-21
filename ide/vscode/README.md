# Gatepass — VS Code extension

Shows Gatepass findings inline in the editor's **Problems** panel: verified findings as
errors/warnings (with reproductions), research-tier findings as information with their
confidence — the two-tier honesty carried into the IDE.

## How it works

- `src/diagnostics.ts` — the pure findings→diagnostics conversion (unit-tested, no `vscode`
  dependency). This is what CI covers.
- `src/extension.ts` — the VS Code host code (`activate`): reads the findings JSON configured
  by `gatepass.findingsPath` (default `gatepass.findings.json`) and publishes diagnostics.

## Building the VSIX

```bash
cd ide/vscode
pnpm install
pnpm build     # esbuild bundles extension.ts + @gatepass/findings → dist/extension.js
pnpm package   # produces gatepass-vscode-0.0.1.vsix
```

Then install the `.vsix` in VS Code (Extensions → … → Install from VSIX). Produce a findings
file with the CLI (`pnpm scan <path> --output gatepass.findings.json`) at the workspace root,
then run **Gatepass: Load findings into Problems**.

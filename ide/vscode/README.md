# Gatepass — VS Code extension

Shows Gatepass findings inline in the editor's **Problems** panel: verified findings as
errors/warnings (with reproductions), research-tier findings as information with their
confidence — the two-tier honesty carried into the IDE.

## How it works

- `src/diagnostics.ts` — the pure findings→diagnostics conversion (unit-tested, no `vscode`
  dependency). This is what CI covers.
- `src/extension.ts` — the VS Code host code (`activate`): reads the findings JSON configured
  by `gatepass.findingsPath` (default `gatepass.findings.json`) and publishes diagnostics.

## Building the VSIX (needs the VS Code toolchain)

The extension host code is not part of the repo's CI build (it depends on the editor-provided
`vscode` module). To package it:

```bash
cd ide/vscode
npm i -D @vscode/vsce @types/vscode typescript
npx tsc -p tsconfig.json --noEmit false --outDir dist   # compile src → dist
npx vsce package                                          # produces gatepass-vscode-0.0.1.vsix
```

Then install the `.vsix` in VS Code (Extensions → … → Install from VSIX). Produce a findings
file with the CLI (`pnpm scan <path> --output gatepass.findings.json`) at the workspace root,
then run **Gatepass: Load findings into Problems**.

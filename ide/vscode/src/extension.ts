// @ts-nocheck — VS Code host code. `vscode` is provided by the editor at runtime; building the
// VSIX needs the VS Code extension toolchain (@vscode/vsce), which isn't part of the CI build.
// The pure conversion it relies on (diagnostics.ts) is fully unit-tested.
import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import path from "node:path";
import { findingsToDiagnostics } from "./diagnostics.js";
import { parseFindingsDocument } from "@gatepass/findings";

const SEVERITY = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  information: vscode.DiagnosticSeverity.Information,
};

export function activate(context: vscode.ExtensionContext): void {
  const collection = vscode.languages.createDiagnosticCollection("gatepass");
  context.subscriptions.push(collection);

  const load = async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) return;
    const rel = vscode.workspace.getConfiguration("gatepass").get<string>("findingsPath", "gatepass.findings.json");
    const file = path.join(folder.uri.fsPath, rel);
    let doc;
    try {
      doc = parseFindingsDocument(JSON.parse(await fs.readFile(file, "utf8")));
    } catch (err) {
      vscode.window.showWarningMessage(`Gatepass: could not read findings at ${rel}: ${(err as Error).message}`);
      return;
    }

    const byFile = new Map<string, vscode.Diagnostic[]>();
    for (const d of findingsToDiagnostics(doc)) {
      const range = new vscode.Range(Math.max(0, d.startLine - 1), 0, Math.max(0, d.endLine - 1), 200);
      const diag = new vscode.Diagnostic(range, d.message, SEVERITY[d.severity]);
      diag.source = d.source;
      diag.code = d.code;
      const uri = path.join(folder.uri.fsPath, d.path);
      const list = byFile.get(uri) ?? [];
      list.push(diag);
      byFile.set(uri, list);
    }
    collection.clear();
    for (const [uri, diags] of byFile) collection.set(vscode.Uri.file(uri), diags);
    vscode.window.showInformationMessage(`Gatepass: loaded ${doc.findings.length} finding(s).`);
  };

  context.subscriptions.push(vscode.commands.registerCommand("gatepass.showFindings", load));
  void load();
}

export function deactivate(): void {}

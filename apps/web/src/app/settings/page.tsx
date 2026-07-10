"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/providers/OrgProvider";
import { api } from "@/lib/api-client";
import { ORG_ID } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { RepoRecord } from "@/lib/types";

export default function SettingsPage() {
  const { org, loading: orgLoading, error: orgError } = useOrg();
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [repos, setRepos] = useState<RepoRecord[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (org) setLlmEnabled(org.llmEnabled);
    api
      .getRepos(ORG_ID)
      .then(setRepos)
      .catch(() => {});
  }, [org]);

  async function toggleLlm() {
    const next = !llmEnabled;
    setLlmEnabled(next);
    setSaving("org");
    try {
      await api.patchOrgSettings(ORG_ID, { llm_analysis_enabled: next });
      setMessage({ type: "success", text: "Settings saved" });
    } catch {
      setLlmEnabled(!next);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(null);
    }
  }

  async function toggleAgentLoop(repoName: string, enabled: boolean) {
    setSaving(repoName);
    try {
      await api.patchRepoSettings(ORG_ID, repoName, { agent_loop_enabled: enabled });
      setRepos(repos.map((r) => (r.name === repoName ? ({ ...r, agentLoopEnabled: enabled } as never) : r)));
      setMessage({ type: "success", text: "Repo settings saved" });
    } catch {
      setMessage({ type: "error", text: "Failed to save repo settings" });
    } finally {
      setSaving(null);
    }
  }

  if (orgLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gatepass-400" />
      </div>
    );
  }

  if (orgError && !org) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">Could not load settings: {orgError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gatepass-500">Manage organization and repository settings</p>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"}`}
        >
          {message.text}
        </div>
      )}

      {/* Org settings */}
      <Card>
        <h2 className="mb-4 font-medium text-gatepass-900 dark:text-white">Organization Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gatepass-900 dark:text-white">LLM Analysis</p>
              <p className="text-xs text-gatepass-500">Enable research-tier semantic analysis</p>
            </div>
            <button
              onClick={toggleLlm}
              disabled={saving === "org"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${llmEnabled ? "bg-blue-600" : "bg-gatepass-300 dark:bg-gatepass-600"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${llmEnabled ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gatepass-900 dark:text-white">Plan</p>
              <p className="text-xs text-gatepass-500">{org?.planTier ?? "N/A"}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Per-repo settings */}
      {repos.length > 0 && (
        <Card>
          <h2 className="mb-4 font-medium text-gatepass-900 dark:text-white">Repository Settings</h2>
          <div className="space-y-6">
            {repos.map((repo) => (
              <div key={repo.name} className="rounded-lg border border-gatepass-200 p-4 dark:border-gatepass-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gatepass-900 dark:text-white">{repo.name}</p>
                    <p className="text-xs text-gatepass-500">
                      {repo.visibility} &middot; {(repo.frameworks ?? []).join(", ")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gatepass-700 dark:text-gatepass-300">Agent Loop</p>
                    <p className="text-xs text-gatepass-500">Opt-in fix guidance</p>
                  </div>
                  <button
                    onClick={() =>
                      toggleAgentLoop(
                        repo.name,
                        !(repo as unknown as Record<string, unknown>).agentLoopEnabled !== true,
                      )
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(repo as unknown as Record<string, unknown>).agentLoopEnabled ? "bg-blue-600" : "bg-gatepass-300 dark:bg-gatepass-600"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${(repo as unknown as Record<string, unknown>).agentLoopEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { ORG_ID } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader2, AlertTriangle, Lightbulb, Lock } from "lucide-react";

export default function AgentGuidancePage() {
  const [scanId, setScanId] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<{ content: string; kind: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scanId || !fingerprint) return;
    setLoading(true);
    setError(null);
    setGuidance(null);
    try {
      const result = await api.getAgentGuidance(ORG_ID, scanId, fingerprint);
      setGuidance(result.guidance);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Forbidden")) {
        setError("Agent-loop guidance is not enabled for this repository.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch guidance");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">Agent-Loop Guidance</h1>
        <p className="mt-1 text-sm text-gatepass-500">Retrieve structured fix guidance for a specific finding</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gatepass-700 dark:text-gatepass-300">Scan ID</label>
              <input
                type="text"
                value={scanId}
                onChange={(e) => setScanId(e.target.value)}
                placeholder="Enter scan ID..."
                className="mt-1 block w-full rounded-lg border border-gatepass-300 bg-white px-4 py-2.5 text-sm text-gatepass-900 placeholder-gatepass-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gatepass-600 dark:bg-gatepass-900 dark:text-white dark:placeholder-gatepass-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gatepass-700 dark:text-gatepass-300">
                Finding Fingerprint
              </label>
              <input
                type="text"
                value={fingerprint}
                onChange={(e) => setFingerprint(e.target.value)}
                placeholder="sha256:..."
                className="mt-1 block w-full rounded-lg border border-gatepass-300 bg-white px-4 py-2.5 text-sm text-gatepass-900 placeholder-gatepass-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gatepass-600 dark:bg-gatepass-900 dark:text-white dark:placeholder-gatepass-500"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !scanId || !fingerprint}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Lightbulb size={16} />
                Get Guidance
              </>
            )}
          </button>
        </form>
      </Card>

      {/* Error / 403 state */}
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            {error.includes("not enabled") ? (
              <Lock className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
            )}
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {error.includes("not enabled") ? "Feature Not Available" : "Error"}
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Guidance result */}
      {guidance && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-medium text-gatepass-900 dark:text-white">Fix Guidance</h2>
          </div>
          <div className="rounded-lg border border-gatepass-200 bg-gatepass-50 p-4 dark:border-gatepass-700 dark:bg-gatepass-800">
            <p className="mb-2 text-xs font-medium uppercase text-gatepass-500">{guidance.kind}</p>
            <pre className="whitespace-pre-wrap text-sm text-gatepass-700 dark:text-gatepass-300 font-mono">
              {guidance.content}
            </pre>
          </div>
        </Card>
      )}

      {!guidance && !error && !loading && (
        <EmptyState
          icon={<Lightbulb size={48} />}
          title="Enter finding details"
          description="Provide a scan ID and finding fingerprint to retrieve guidance"
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Finding } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search, AlertTriangle, ChevronDown, ChevronRight, ShieldCheck, FlaskConical } from "lucide-react";
import { severityColor, tierColor, confidencePercent } from "@/lib/utils";

interface Props {
  findings: Finding[];
  error: string | null;
}

type TierFilter = "all" | "verified" | "research";
type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

export default function FindingsClient({ findings, error }: Props) {
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [expandedFingerprint, setExpandedFingerprint] = useState<string | null>(null);
  const [disputing, setDisputing] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeModal, setDisputeModal] = useState<string | null>(null);

  const filtered = findings.filter((f) => {
    if (tierFilter !== "all" && f.tier !== tierFilter) return false;
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    return true;
  });

  async function handleDispute(fingerprint: string) {
    setDisputing(fingerprint);
    try {
      // Find the scanId for this finding from context
      const { ORG_ID } = await import("@/lib/constants");
      const { api } = await import("@/lib/api-client");
      // For dispute we need scanId — use the latest one
      const repos = await api.getRepos(ORG_ID);
      const lastScanId = repos.find(r => r.lastScanId)?.lastScanId;
      if (lastScanId) {
        await api.disputeFinding(fingerprint, lastScanId, disputeReason || "Disputed");
        // Remove from local state
        setDisputeModal(null);
        setDisputeReason("");
      }
    } catch (e) {
      console.error("Dispute failed", e);
    } finally {
      setDisputing(null);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <EmptyState
        icon={<Search size={48} />}
        title="No findings yet"
        description="Run a scan on a repository to see security findings here"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">Findings</h1>
        <p className="mt-1 text-sm text-gatepass-500">
          {findings.length} total &middot; {findings.filter(f => f.tier === "verified").length} verified &middot; {findings.filter(f => f.tier === "research").length} research
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex rounded-lg border border-gatepass-200 dark:border-gatepass-700 overflow-hidden">
          {(["all", "verified", "research"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tierFilter === t
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gatepass-600 hover:bg-gatepass-50 dark:bg-gatepass-800 dark:text-gatepass-400 dark:hover:bg-gatepass-700"
              }`}
            >
              {t === "all" ? "All" : t === "verified" ? "Verified" : "Research"}
            </button>
          ))}
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          className="rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm text-gatepass-700 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-300"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Findings list */}
      <div className="space-y-3">
        {filtered.map((finding) => (
          <Card key={finding.fingerprint} padding={false}>
            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Tier badge */}
                  {finding.tier === "verified" ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                      <FlaskConical size={14} className="text-blue-600 dark:text-blue-400" />
                    </span>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gatepass-900 dark:text-white">{finding.classId}</span>
                      {/* Severity badge */}
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${severityColor(finding.severity)}`}>
                        {finding.severity}
                      </span>
                      {/* Tier label */}
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${tierColor(finding.tier)}`}>
                        {finding.tier}
                        {finding.tier === "research" && finding.confidence !== undefined && (
                          ` · ${confidencePercent(finding.confidence)}`
                        )}
                      </span>
                    </div>
                    
                    {/* Confidence bar for research */}
                    {finding.tier === "research" && finding.confidence !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gatepass-200 dark:bg-gatepass-700">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${finding.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gatepass-500">{confidencePercent(finding.confidence)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setDisputeModal(finding.fingerprint)}
                    className="rounded px-3 py-1.5 text-xs font-medium text-gatepass-500 hover:bg-gatepass-100 hover:text-gatepass-700 dark:hover:bg-gatepass-800 transition-colors"
                  >
                    Dispute
                  </button>
                  <button
                    onClick={() => setExpandedFingerprint(expandedFingerprint === finding.fingerprint ? null : finding.fingerprint)}
                    className="rounded p-1.5 text-gatepass-400 hover:bg-gatepass-100 dark:hover:bg-gatepass-800 transition-colors"
                  >
                    {expandedFingerprint === finding.fingerprint ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedFingerprint === finding.fingerprint && (
                <div className="mt-4 border-t border-gatepass-200 pt-4 dark:border-gatepass-700">
                  <p className="text-sm text-gatepass-600 dark:text-gatepass-400">{finding.explanation}</p>

                  {/* Locations */}
                  {finding.locations.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-xs font-medium uppercase text-gatepass-500 mb-2">Locations</h4>
                      <div className="space-y-1">
                        {finding.locations.map((loc, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gatepass-600 dark:text-gatepass-400">
                            <span className="font-mono">{loc.path}:{loc.startLine}-{loc.endLine}</span>
                            <span className="rounded bg-gatepass-100 px-1.5 py-0.5 text-[10px] dark:bg-gatepass-800">{loc.surface}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Surfaces */}
                  <div className="mt-3">
                    <h4 className="text-xs font-medium uppercase text-gatepass-500 mb-2">Surfaces Affected</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {finding.surfaces.map((s) => (
                        <span key={s} className="rounded bg-gatepass-100 px-2 py-0.5 text-xs text-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-400">{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Reproduction (verified only) */}
                  {finding.tier === "verified" && finding.reproduction && (
                    <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Reproduction Steps</h4>
                      </div>
                      <p className="mb-2 text-xs text-emerald-700 dark:text-emerald-400">Kind: {finding.reproduction.kind}</p>
                      <ol className="list-inside list-decimal space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
                        {finding.reproduction.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                      <div className="mt-3 rounded bg-emerald-100 p-3 text-sm dark:bg-emerald-900">
                        <span className="font-medium text-emerald-800 dark:text-emerald-300">Expected: </span>
                        <span className="text-emerald-700 dark:text-emerald-400">{finding.reproduction.expected}</span>
                      </div>
                    </div>
                  )}

                  {/* Suggested fix */}
                  {finding.suggestedFix && (
                    <div className="mt-3">
                      <h4 className="text-xs font-medium uppercase text-gatepass-500 mb-2">Suggested Fix</h4>
                      <pre className="rounded-lg bg-gatepass-100 p-3 text-xs text-gatepass-700 dark:bg-gatepass-800 dark:text-gatepass-300 overflow-x-auto">
                        {finding.suggestedFix.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dispute modal */}
            {disputeModal === finding.fingerprint && (
              <div className="border-t border-gatepass-200 p-4 dark:border-gatepass-700">
                <label className="block text-sm font-medium text-gatepass-700 dark:text-gatepass-300">
                  Reason for dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="mt-2 block w-full rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm text-gatepass-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gatepass-600 dark:bg-gatepass-900 dark:text-white"
                  rows={3}
                  placeholder="Explain why this finding should be suppressed..."
                />
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => handleDispute(finding.fingerprint)}
                    disabled={disputing === finding.fingerprint || !disputeReason}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {disputing === finding.fingerprint ? "Submitting..." : "Submit dispute"}
                  </button>
                  <button
                    onClick={() => { setDisputeModal(null); setDisputeReason(""); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gatepass-500 hover:bg-gatepass-100 dark:hover:bg-gatepass-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { BenchmarkData } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { Download, BarChart3, Database, Target, Crosshair } from "lucide-react";

interface Props {
  data: BenchmarkData[];
  error: string | null;
}

function precisionColor(p: number): string {
  if (p >= 0.9) return "text-emerald-600";
  if (p >= 0.7) return "text-amber-600";
  return "text-red-600";
}

export default function BenchmarkClient({ data, error }: Props) {
  const [selectedVersion, setSelectedVersion] = useState<string>(data[0]?.corpusVersion ?? "");

  const current = data.find((d) => d.corpusVersion === selectedVersion) ?? data[0];

  // Compute summary metrics across the selected corpus version
  const totalClasses = current?.runs[0]?.perClass.length ?? 0;

  const avgPrecision =
    current && current.runs.length > 0
      ? current.runs.reduce(
          (sum, run) =>
            sum +
            (run.perClass.length > 0
              ? run.perClass.reduce((s, pc) => s + pc.precision, 0) / run.perClass.length
              : 0),
          0,
        ) / current.runs.length
      : 0;

  const avgRecall =
    current && current.runs.length > 0
      ? current.runs.reduce(
          (sum, run) =>
            sum +
            (run.perClass.length > 0
              ? run.perClass.reduce((s, pc) => s + pc.recall, 0) / run.perClass.length
              : 0),
          0,
        ) / current.runs.length
      : 0;

  function handleDownload() {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmark-${current.corpusVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 size={48} />}
        title="No benchmark data"
        description="Benchmark results will appear here once published"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gatepass-900">Precision Benchmark</h1>
          <p className="mt-1 text-sm text-gatepass-500">
            Measured accuracy across vulnerability classes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="rounded-lg border border-gatepass-200 bg-white px-4 py-2 text-sm text-gatepass-700 transition-colors hover:border-gatepass-300"
          >
            {data.map((d) => (
              <option key={d.corpusVersion} value={d.corpusVersion}>
                {d.corpusVersion}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-gatepass-200 bg-white px-4 py-2 text-sm font-medium text-gatepass-700 transition-colors hover:bg-gatepass-50 hover:border-gatepass-300"
          >
            <Download size={16} />
            Raw JSON
          </button>
        </div>
      </div>

      {/* Summary metrics row */}
      {current && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Classes */}
          <div className="rounded-lg border border-gatepass-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0891b2]/10">
                <Database size={20} className="text-[#0891b2]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gatepass-900">{totalClasses}</p>
                <p className="text-xs text-gatepass-500">Total Classes</p>
              </div>
            </div>
          </div>

          {/* Average Precision */}
          <div className="rounded-lg border border-gatepass-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0891b2]/10">
                <Target size={20} className="text-[#0891b2]" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${precisionColor(avgPrecision)}`}>
                  {(avgPrecision * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gatepass-500">Average Precision</p>
              </div>
            </div>
          </div>

          {/* Average Recall */}
          <div className="rounded-lg border border-gatepass-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0891b2]/10">
                <Crosshair size={20} className="text-[#0891b2]" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${precisionColor(avgRecall)}`}>
                  {(avgRecall * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gatepass-500">Average Recall</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-tool tables */}
      {current && (
        <div className="space-y-4">
          <p className="text-sm text-gatepass-500">
            Published: {new Date(current.publishedAt).toLocaleDateString()} &middot;{" "}
            {current.runs.length} tool run(s)
          </p>

          {current.runs.map((run, ri) => (
            <div
              key={ri}
              className="rounded-lg border border-gatepass-200 bg-white"
            >
              <div className="border-b border-gatepass-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-gatepass-900">{run.tool}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gatepass-50 border-b border-gatepass-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                        Class
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                        TP
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                        FP
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                        FN
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                        Precision
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                        Recall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.perClass.map((pc) => (
                      <tr
                        key={pc.classId}
                        className="border-b border-gatepass-100 last:border-b-0 transition-colors hover:bg-gatepass-50/50"
                      >
                        <td className="px-4 py-2.5 font-mono text-sm text-gatepass-900">
                          {pc.classId}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-emerald-600">
                          {pc.tp}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-red-600">
                          {pc.fp}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm text-gatepass-500">
                          {pc.fn}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${precisionColor(pc.precision)}`}>
                          {(pc.precision * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm font-medium text-gatepass-900">
                          {(pc.recall * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { BenchmarkData } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Download, BarChart3 } from "lucide-react";

interface Props {
  data: BenchmarkData[];
  error: string | null;
}

export default function BenchmarkClient({ data, error }: Props) {
  const [selectedVersion, setSelectedVersion] = useState<string>(data[0]?.corpusVersion ?? "");

  const current = data.find((d) => d.corpusVersion === selectedVersion) ?? data[0];

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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">Precision Benchmark</h1>
          <p className="mt-1 text-sm text-gatepass-500">Per-class true positive / false positive rates</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm text-gatepass-700 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-300"
          >
            {data.map((d) => (
              <option key={d.corpusVersion} value={d.corpusVersion}>
                {d.corpusVersion}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm font-medium text-gatepass-700 hover:bg-gatepass-50 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-300 dark:hover:bg-gatepass-700 transition-colors"
          >
            <Download size={16} />
            Raw JSON
          </button>
        </div>
      </div>

      {current && (
        <div className="space-y-4">
          <p className="text-sm text-gatepass-500">
            Published: {new Date(current.publishedAt).toLocaleDateString()} &middot; {current.runs.length} tool run(s)
          </p>

          {current.runs.map((run, ri) => (
            <Card key={ri}>
              <h3 className="mb-4 font-medium text-gatepass-900 dark:text-white">{run.tool}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gatepass-200 dark:border-gatepass-700">
                      <th className="pb-2 text-left font-medium text-gatepass-500">Class</th>
                      <th className="pb-2 text-right font-medium text-gatepass-500">TP</th>
                      <th className="pb-2 text-right font-medium text-gatepass-500">FP</th>
                      <th className="pb-2 text-right font-medium text-gatepass-500">FN</th>
                      <th className="pb-2 text-right font-medium text-gatepass-500">Precision</th>
                      <th className="pb-2 text-right font-medium text-gatepass-500">Recall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.perClass.map((pc) => (
                      <tr key={pc.classId} className="border-b border-gatepass-100 dark:border-gatepass-800">
                        <td className="py-2 text-gatepass-900 dark:text-white">{pc.classId}</td>
                        <td className="py-2 text-right text-emerald-600">{pc.tp}</td>
                        <td className="py-2 text-right text-red-600">{pc.fp}</td>
                        <td className="py-2 text-right text-gatepass-500">{pc.fn}</td>
                        <td className="py-2 text-right font-medium text-gatepass-900 dark:text-white">
                          {(pc.precision * 100).toFixed(1)}%
                        </td>
                        <td className="py-2 text-right font-medium text-gatepass-900 dark:text-white">
                          {(pc.recall * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

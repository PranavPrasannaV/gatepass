"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileCheck, Upload, ExternalLink } from "lucide-react";

export default function CompliancePage() {
  const [_uploads] = useState<Array<{ id: string; name: string; status: string }>>([]);

  // Demo evidence exports (mock — API evidence endpoint returns posture data)
  const evidenceExports: Array<{ id: string; scanId: string; format: string; date: string }> = [];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">
          Compliance
        </h1>
        <p className="mt-1 text-sm text-gatepass-500">
          Evidence exports and questionnaire management for security audits.
        </p>
      </div>

      {/* Card 1 — Integrations */}
      <div className="rounded-lg border border-gatepass-200 bg-white dark:bg-gatepass-800/50 dark:border-gatepass-700 p-6">
        <h2 className="text-lg font-semibold text-gatepass-900 dark:text-white">
          Integrations
        </h2>
        <div className="mt-4 flex flex-wrap gap-4">
          <button
            onClick={() => alert("Vanta integration coming soon")}
            className="inline-flex items-center gap-2 rounded-md border border-gatepass-300 px-4 py-2.5 text-sm font-medium text-gatepass-700 hover:bg-gatepass-50 dark:border-gatepass-600 dark:text-gatepass-300 dark:hover:bg-gatepass-700 transition-colors"
          >
            <ExternalLink size={16} />
            Connect Vanta
          </button>
          <button
            onClick={() => alert("Drata integration coming soon")}
            className="inline-flex items-center gap-2 rounded-md border border-gatepass-300 px-4 py-2.5 text-sm font-medium text-gatepass-700 hover:bg-gatepass-50 dark:border-gatepass-600 dark:text-gatepass-300 dark:hover:bg-gatepass-700 transition-colors"
          >
            <ExternalLink size={16} />
            Connect Drata
          </button>
        </div>
      </div>

      {/* Card 2 — Evidence Export History */}
      <div className="rounded-lg border border-gatepass-200 bg-white dark:bg-gatepass-800/50 dark:border-gatepass-700 p-6">
        <h2 className="text-lg font-semibold text-gatepass-900 dark:text-white">
          Evidence Export History
        </h2>
        <p className="mt-1 text-sm text-gatepass-500">
          Download compliance evidence packages from completed scans.
        </p>
        <div className="mt-6">
          {evidenceExports.length === 0 ? (
            <EmptyState
              icon={<FileCheck size={32} />}
              title="No exports yet"
              description="Run a scan and export evidence to see it here"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gatepass-200 dark:border-gatepass-700">
                  <th className="pb-2 text-left font-medium text-gatepass-500">ID</th>
                  <th className="pb-2 text-left font-medium text-gatepass-500">Scan</th>
                  <th className="pb-2 text-left font-medium text-gatepass-500">Format</th>
                  <th className="pb-2 text-left font-medium text-gatepass-500">Date</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          )}
        </div>
      </div>

      {/* Card 3 — Questionnaire Upload */}
      <div className="rounded-lg border border-gatepass-200 bg-white dark:bg-gatepass-800/50 dark:border-gatepass-700 p-6">
        <h2 className="text-lg font-semibold text-gatepass-900 dark:text-white">
          Questionnaire Upload
        </h2>
        <p className="mt-1 text-sm text-gatepass-500">
          Upload a security questionnaire for automated completion.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <input
            type="file"
            accept=".csv,.xlsx"
            className="block w-full text-sm text-gatepass-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-400"
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-[#0891b2] px-4 py-2 text-sm font-medium text-white hover:bg-[#0e7490] transition-colors"
          >
            <Upload size={16} />
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

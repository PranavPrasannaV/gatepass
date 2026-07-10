"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileCheck, Upload, ExternalLink } from "lucide-react";

export default function CompliancePage() {
  const [_uploads] = useState<Array<{ id: string; name: string; status: string }>>([]);

  // Demo evidence exports (mock — API evidence endpoint returns posture data)
  const evidenceExports: Array<{ id: string; scanId: string; format: string; date: string }> = [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">Compliance</h1>
        <p className="mt-1 text-sm text-gatepass-500">Evidence exports and questionnaire management</p>
      </div>

      {/* Integration connect */}
      <Card>
        <h2 className="mb-4 font-medium text-gatepass-900 dark:text-white">Integrations</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => alert("Vanta integration coming soon")}
            className="inline-flex items-center gap-2 rounded-lg border border-gatepass-300 bg-white px-4 py-2.5 text-sm font-medium text-gatepass-700 hover:bg-gatepass-50 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-300 transition-colors"
          >
            <ExternalLink size={16} />
            Connect Vanta
          </button>
          <button
            onClick={() => alert("Drata integration coming soon")}
            className="inline-flex items-center gap-2 rounded-lg border border-gatepass-300 bg-white px-4 py-2.5 text-sm font-medium text-gatepass-700 hover:bg-gatepass-50 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-300 transition-colors"
          >
            <ExternalLink size={16} />
            Connect Drata
          </button>
        </div>
      </Card>

      {/* Evidence export history */}
      <Card>
        <h2 className="mb-4 font-medium text-gatepass-900 dark:text-white">Evidence Export History</h2>
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
      </Card>

      {/* Questionnaire upload */}
      <Card>
        <h2 className="mb-4 font-medium text-gatepass-900 dark:text-white">Questionnaire Upload</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv,.xlsx"
            className="block w-full text-sm text-gatepass-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-400"
          />
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            <Upload size={16} />
            Upload
          </button>
        </div>
      </Card>
    </div>
  );
}

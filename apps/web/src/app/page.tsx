"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ORG_ID } from "@/lib/constants";
import {
  Loader2,
  Plus,
  Clock,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Shield,
  FileText,
  Zap,
  ArrowUpRight,
  ArrowDown,
} from "lucide-react";

/** Mock trend data for the Analysis Trends bar chart (30 days). */
const TREND_DATA = [
  { day: "01 Oct", critical: 4, high: 7, medium: 12, low: 3 },
  { day: "03 Oct", critical: 6, high: 5, medium: 10, low: 4 },
  { day: "05 Oct", critical: 3, high: 8, medium: 15, low: 2 },
  { day: "07 Oct", critical: 8, high: 10, medium: 9, low: 5 },
  { day: "09 Oct", critical: 5, high: 6, medium: 14, low: 3 },
  { day: "11 Oct", critical: 7, high: 9, medium: 11, low: 6 },
  { day: "13 Oct", critical: 2, high: 4, medium: 8, low: 2 },
  { day: "15 Oct", critical: 9, high: 12, medium: 13, low: 4 },
  { day: "17 Oct", critical: 4, high: 7, medium: 10, low: 5 },
  { day: "19 Oct", critical: 6, high: 8, medium: 12, low: 3 },
  { day: "21 Oct", critical: 3, high: 5, medium: 9, low: 2 },
  { day: "23 Oct", critical: 5, high: 6, medium: 11, low: 4 },
  { day: "25 Oct", critical: 7, high: 10, medium: 14, low: 6 },
  { day: "27 Oct", critical: 4, high: 7, medium: 10, low: 3 },
  { day: "29 Oct", critical: 6, high: 9, medium: 13, low: 5 },
];

/** Mock recent findings for the table. */
const RECENT_FINDINGS = [
  { id: "CGAI-RES-942", type: "SQL Injection", path: "src/api/routes/users.ts", severity: "critical", risk: "Critical", time: "2m ago" },
  { id: "CGAI-RES-891", type: "CORS Misconfig", path: "src/middleware/cors.ts", severity: "high", risk: "High", time: "15m ago" },
  { id: "CGAI-RES-877", type: "XSS Reflected", path: "src/components/Form.tsx", severity: "high", risk: "High", time: "1h ago" },
  { id: "CGAI-RES-803", type: "Path Traversal", path: "src/lib/file-utils.ts", severity: "medium", risk: "Medium", time: "3h ago" },
  { id: "CGAI-RES-754", type: "Insecure Crypto", path: "src/lib/encrypt.ts", severity: "medium", risk: "Medium", time: "6h ago" },
];

const MAX_BAR_HEIGHT = 160;

export default function Home() {
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .getOrg(ORG_ID)
      .then(() => setReady(true))
      .catch(() => setReady(false));
  }, []);

  if (ready === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gatepass-400" />
      </div>
    );
  }

  if (!ready) {
    return (
      <main className="px-6 py-10">
        <h1 className="text-2xl font-bold text-gatepass-900">
          Gatepass Dashboard
        </h1>
        <p className="mt-1 text-sm text-gatepass-500">
          Monitor and manage your organization&apos;s application security posture
        </p>

        <div className="mt-12 mx-auto max-w-lg rounded-lg border border-gatepass-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gatepass-100">
            <ClipboardList size={40} className="text-gatepass-400" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-gatepass-900">
            No Active Passes
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-gatepass-500">
            Your organization doesn&apos;t have any active security passes. Start
            by requesting a new analysis pass or reviewing your scan history.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-[#0891b2] px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus size={16} />
              Request New Pass
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-gatepass-300 px-6 py-2.5 text-sm font-medium text-gatepass-700 hover:bg-gatepass-50"
            >
              <Clock size={16} />
              View History
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gatepass-900">
          Gatepass Dashboard
        </h1>
        <p className="mt-1 text-sm text-gatepass-500">
          Monitor and manage your organization&apos;s application security posture
        </p>
      </div>

      {/* ── Row 1: Posture Score + SOC2 Compliance ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Security Posture Score */}
        <div className="rounded-lg border border-gatepass-200 bg-white p-6 sm:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gatepass-500">Security Posture Score</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gatepass-900">84</span>
                <span className="text-lg text-gatepass-400">/100</span>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              MODERATE RISK
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-gatepass-100 pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">12</p>
              <p className="text-xs text-gatepass-500">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">45</p>
              <p className="text-xs text-gatepass-500">Warnings</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gatepass-700">1,204</p>
              <p className="text-xs text-gatepass-500">Scanned</p>
            </div>
          </div>
        </div>

        {/* SOC2 Compliance */}
        <div className="rounded-lg border border-gatepass-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gatepass-500">SOC2 Compliance</p>
            <Shield size={18} className="text-gatepass-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-emerald-600">92</span>
            <span className="text-sm text-gatepass-400">%</span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gatepass-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: "92%" }}
            />
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <ArrowUpRight size={12} />
            <span>+3% this week</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: AI Code Smells + Analysis Trends ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* AI Code Smells */}
        <div className="rounded-lg border border-gatepass-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gatepass-500">AI Code Smells</p>
            <Zap size={18} className="text-gatepass-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-amber-600">28</span>
            <span className="text-sm text-gatepass-400">items</span>
          </div>
          <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
            Needs Review
          </span>
          <div className="mt-4 flex items-center gap-1 text-xs text-gatepass-500">
            <AlertTriangle size={12} />
            <span>4 require immediate attention</span>
          </div>
        </div>

        {/* Analysis Trends — Bar Chart */}
        <div className="rounded-lg border border-gatepass-200 bg-white p-6 sm:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-gatepass-400" />
              <p className="text-sm font-medium text-gatepass-700">Analysis Trends (30 Days)</p>
            </div>
            <button className="rounded-md border border-gatepass-300 px-3 py-1.5 text-xs font-medium text-gatepass-600 hover:bg-gatepass-50 transition-colors">
              Export Report
            </button>
          </div>

          {/* SVG bar chart */}
          <div className="mt-4" style={{ height: MAX_BAR_HEIGHT + 40 }}>
            <svg
              viewBox={`0 0 ${TREND_DATA.length * 40} ${MAX_BAR_HEIGHT + 40}`}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              {TREND_DATA.map((d, i) => {
                const x = i * 40 + 10;
                const barWidth = 22;
                const total = d.critical + d.high + d.medium + d.low;
                const maxVal = Math.max(...TREND_DATA.map((t) => t.critical + t.high + t.medium + t.low));
                const scale = MAX_BAR_HEIGHT / maxVal;

                let yOffset = 0;
                const segments = [
                  { value: d.low, color: "#CBD5E1" },
                  { value: d.medium, color: "#F59E0B" },
                  { value: d.high, color: "#F97316" },
                  { value: d.critical, color: "#DC2626" },
                ];

                return segments.map((seg) => {
                  const h = seg.value * scale;
                  const y = MAX_BAR_HEIGHT - yOffset - h + 10;
                  yOffset += h;
                  return (
                    <rect
                      key={`${i}-${seg.color}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(h, 1)}
                      fill={seg.color}
                      rx={2}
                    />
                  );
                });
              })}
              {/* X-axis labels — show every 4th label to avoid crowding */}
              {TREND_DATA.map((d, i) =>
                i % 4 === 0 ? (
                  <text
                    key={`label-${i}`}
                    x={i * 40 + 21}
                    y={MAX_BAR_HEIGHT + 28}
                    textAnchor="middle"
                    className="fill-gatepass-400"
                    style={{ fontSize: 9 }}
                  >
                    {d.day}
                  </text>
                ) : null,
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gatepass-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
              Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />
              High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
              Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gatepass-200" />
              Low
            </span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent Findings Table ── */}
      <div className="rounded-lg border border-gatepass-200 bg-white">
        <div className="flex items-center justify-between border-b border-gatepass-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-gatepass-400" />
            <h2 className="text-sm font-semibold text-gatepass-900">Recent Findings</h2>
          </div>
          <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-[#0891b2] hover:bg-gatepass-50 transition-colors">
            View all
            <ArrowDown size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gatepass-50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                  Vulnerability
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                  Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                  Risk
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gatepass-500">
                  Time
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {RECENT_FINDINGS.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-gatepass-100 last:border-b-0 transition-colors hover:bg-gatepass-50/50"
                >
                  <td className="px-6 py-3 font-mono text-xs text-gatepass-700">{f.id}</td>
                  <td className="px-6 py-3 font-medium text-gatepass-900">{f.type}</td>
                  <td className="px-6 py-3 font-mono text-xs text-gatepass-500">{f.path}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        f.risk === "Critical"
                          ? "bg-red-50 text-red-700"
                          : f.risk === "High"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {f.risk}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gatepass-500">{f.time}</td>
                  <td className="px-6 py-3 text-right">
                    <button className="text-xs font-medium text-[#0891b2] hover:underline">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

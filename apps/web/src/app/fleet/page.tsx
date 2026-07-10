"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ORG_ID } from "@/lib/constants";
import type { FleetView } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Server, Loader2, Plus, RefreshCw } from "lucide-react";

const POSTURE_COLORS: Record<string, string> = {
  unscanned: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  passing: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400",
  findings_open: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400",
  critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400",
};

export default function FleetPage() {
  const [data, setData] = useState<FleetView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", endpointOrRepo: "", configHash: "" });

  async function loadFleet() {
    setLoading(true);
    try {
      const result = await api.getFleet(ORG_ID);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFleet();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.registerFleetServer(ORG_ID, formData);
      setShowForm(false);
      setFormData({ name: "", endpointOrRepo: "", configHash: "" });
      loadFleet();
    } catch (err) {
      console.error("Failed to register server", err);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gatepass-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  const rollup = data?.rollup;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gatepass-900 dark:text-white">Fleet</h1>
          <p className="mt-1 text-sm text-gatepass-500">MCP server fleet posture</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadFleet}
            className="rounded-lg border border-gatepass-300 bg-white p-2 text-gatepass-500 hover:bg-gatepass-50 dark:border-gatepass-600 dark:bg-gatepass-800 dark:hover:bg-gatepass-700"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Add server
          </button>
        </div>
      </div>

      {/* Rollup */}
      {rollup && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total", value: rollup.total, color: "text-gatepass-900 dark:text-white" },
            { label: "Unscanned", value: rollup.unscanned, color: "text-slate-500" },
            { label: "Passing", value: rollup.passing, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Critical", value: rollup.critical, color: "text-red-600 dark:text-red-400" },
          ].map((item) => (
            <Card key={item.label}>
              <p className="text-sm text-gatepass-500">{item.label}</p>
              <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Register form */}
      {showForm && (
        <Card>
          <form onSubmit={handleRegister} className="space-y-4">
            <h3 className="font-medium text-gatepass-900 dark:text-white">Register MCP Server</h3>
            <div>
              <label className="block text-sm font-medium text-gatepass-700 dark:text-gatepass-300">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm dark:border-gatepass-600 dark:bg-gatepass-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gatepass-700 dark:text-gatepass-300">
                Endpoint or repo path
              </label>
              <input
                type="text"
                value={formData.endpointOrRepo}
                onChange={(e) => setFormData({ ...formData, endpointOrRepo: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm dark:border-gatepass-600 dark:bg-gatepass-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gatepass-700 dark:text-gatepass-300">
                Config hash (optional)
              </label>
              <input
                type="text"
                value={formData.configHash}
                onChange={(e) => setFormData({ ...formData, configHash: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gatepass-300 bg-white px-4 py-2 text-sm dark:border-gatepass-600 dark:bg-gatepass-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Register
            </button>
          </form>
        </Card>
      )}

      {/* Server cards */}
      {data?.servers && data.servers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.servers.map((server) => (
            <Card key={server.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gatepass-900 dark:text-white">{server.name}</h3>
                  <p className="mt-1 text-xs text-gatepass-500 font-mono">{server.endpointOrRepo}</p>
                </div>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${POSTURE_COLORS[server.posture] ?? POSTURE_COLORS.unscanned}`}
                >
                  {server.posture}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gatepass-500">
                <span>Config: {server.configHash.slice(0, 8)}</span>
                {server.lastScanId && <span>Scan: {server.lastScanId.slice(0, 8)}</span>}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Server size={48} />}
          title="No servers registered"
          description="Register an MCP server to start monitoring its security posture"
        />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Search,
  Server,
  BarChart3,
  FileCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Lightbulb,
} from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/findings", label: "Findings", icon: Search },
  { href: "/agent-guidance", label: "Guidance", icon: Lightbulb },
  { href: "/fleet", label: "Fleet", icon: Server },
  { href: "/benchmark", label: "Benchmark", icon: BarChart3 },
  { href: "/compliance", label: "Compliance", icon: FileCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { org } = useOrg();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const planColors: Record<string, string> = {
    free: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    team: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    scale: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg p-2 bg-white shadow-md border border-gatepass-200 dark:bg-gatepass-800 dark:border-gatepass-700 lg:hidden"
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r border-gatepass-200 bg-white dark:border-gatepass-700 dark:bg-gatepass-900 transition-all duration-200 ${
          collapsed ? "w-16" : "w-60"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 border-b border-gatepass-200 px-4 py-4 dark:border-gatepass-700">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Shield size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gatepass-900 dark:text-white">Gatepass</span>
              {org && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${planColors[org.planTier] ?? planColors.free}`}
                >
                  {org.planTier}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Org info */}
        {!collapsed && org && (
          <div className="border-b border-gatepass-200 px-4 py-3 dark:border-gatepass-700">
            <p className="text-sm font-medium text-gatepass-900 dark:text-white">{org.id}</p>
            <div className="mt-1 flex gap-2 text-xs text-gatepass-500">
              <span className={org.llmEnabled ? "text-emerald-600" : "text-gatepass-400"}>
                {org.llmEnabled ? "LLM enabled" : "LLM off"}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        : "text-gatepass-600 hover:bg-gatepass-100 hover:text-gatepass-900 dark:text-gatepass-400 dark:hover:bg-gatepass-800 dark:hover:text-white"
                    }`}
                  >
                    <item.icon size={18} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom: theme toggle + collapse */}
        <div className="border-t border-gatepass-200 p-2 dark:border-gatepass-700">
          <div className="flex items-center justify-between px-2">
            <ThemeToggle />
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block rounded-lg p-2 text-gatepass-500 hover:bg-gatepass-100 hover:text-gatepass-700 dark:text-gatepass-400 dark:hover:bg-gatepass-800 transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

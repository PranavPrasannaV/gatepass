"use client";

import { Search, Bell, Shield, User } from "lucide-react";

export function TopNavBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gatepass-200 bg-white px-6 dark:border-gatepass-700 dark:bg-gatepass-900">
      {/* ── Search ── */}
      <div className="relative w-full max-w-[400px]">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gatepass-400"
        />
        <input
          type="text"
          placeholder="Search vulnerabilities, repos, authors..."
          className="h-9 w-full rounded-md border border-gatepass-300 bg-white pl-9 pr-3 text-sm text-gatepass-900 placeholder:text-gatepass-400 focus:outline-2 focus:outline-offset-2 focus:outline-accent-600 dark:border-gatepass-600 dark:bg-gatepass-800 dark:text-gatepass-100 dark:placeholder:text-gatepass-500"
        />
      </div>

      {/* ── Right icons ── */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex items-center justify-center rounded-lg p-1.5 text-gatepass-500 transition-colors hover:bg-gatepass-100 hover:text-gatepass-700 dark:text-gatepass-400 dark:hover:bg-gatepass-800 dark:hover:text-gatepass-200"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>

        <button
          type="button"
          className="flex items-center justify-center rounded-lg p-1.5 text-gatepass-500 transition-colors hover:bg-gatepass-100 hover:text-gatepass-700 dark:text-gatepass-400 dark:hover:bg-gatepass-800 dark:hover:text-gatepass-200"
          aria-label="Security overview"
        >
          <Shield size={20} />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gatepass-100 text-gatepass-500 dark:bg-gatepass-800 dark:text-gatepass-400">
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
